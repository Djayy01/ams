"""
AMS — Mobile Mechanic & Towing  ::  Backend API  (PostgreSQL version)
Stack: Flask + PostgreSQL (psycopg 3)

────────────────────────────────────────────────────────
WHY THIS VERSION
    Data lives in a separate PostgreSQL database, so redeploying or
    restarting the app NEVER erases your requests, hours, or password.

WHAT YOU NEED (all set in Part 3-D of the guide)
    Environment variables on Render:
      DATABASE_URL   ← auto-filled when you link the Render database
      AMS_SECRET     ← a long random string (protects logins)
      AMS_ORIGIN     ← your frontend URL, e.g. https://ams.onrender.com

LOCAL TESTING (optional)
    You need a local Postgres OR just point DATABASE_URL at your Render DB's
    "External Database URL". Then:
        pip install -r requirements.txt
        python app.py
────────────────────────────────────────────────────────
"""

import os
import json
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

import psycopg
from psycopg.rows import dict_row

# ───────────────────────── Config ─────────────────────────
DATABASE_URL   = os.environ.get("DATABASE_URL", "")
SECRET_KEY     = os.environ.get("AMS_SECRET", "CHANGE-ME-IN-PRODUCTION")
ALLOWED_ORIGIN = os.environ.get("AMS_ORIGIN", "*")
TOKEN_MAX_AGE  = 60 * 60 * 12            # mechanic stays logged in 12h
DEFAULT_PASSWORD = "mechanic123"

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DEFAULT_AVAILABILITY = {d: {"on": d != "Sunday", "open": "08:00", "close": "18:00"} for d in DAYS}
VALID_STATUS = {"pending", "accepted", "onway", "done", "dismissed"}

# Render sometimes provides a URL starting with "postgres://"; psycopg wants "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app = Flask(__name__)
signer = URLSafeTimedSerializer(SECRET_KEY)


# ──────────────────────── Database ────────────────────────
def get_db():
    """One connection per request, with dict-style rows."""
    if "db" not in g:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set. Link your Render PostgreSQL database.")
        g.db = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create tables and seed default config on first run. Safe to run every startup."""
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS requests (
                    id           SERIAL PRIMARY KEY,
                    name         TEXT NOT NULL,
                    phone        TEXT NOT NULL,
                    loc          TEXT NOT NULL,
                    year         TEXT,
                    make         TEXT,
                    model        TEXT,
                    issue        TEXT,
                    svc          TEXT NOT NULL,
                    urg          TEXT NOT NULL,
                    sched_time   TEXT,
                    status       TEXT NOT NULL DEFAULT 'pending',
                    submitted_at TEXT NOT NULL
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS config (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
            cur.execute("SELECT COUNT(*) AS n FROM config")
            if cur.fetchone()["n"] == 0:
                seed = {
                    "business_name": "AMS",
                    "password_hash": generate_password_hash(DEFAULT_PASSWORD),
                    "availability":  json.dumps(DEFAULT_AVAILABILITY),
                }
                for k, v in seed.items():
                    cur.execute("INSERT INTO config (key, value) VALUES (%s, %s)", (k, v))
        conn.commit()


def cfg_get(key):
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT value FROM config WHERE key = %s", (key,))
        row = cur.fetchone()
    return row["value"] if row else None


def cfg_set(key, value):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO config (key, value) VALUES (%s, %s) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            (key, value),
        )
    db.commit()


def row_to_request(r):
    return {
        "id": r["id"], "name": r["name"], "phone": r["phone"], "loc": r["loc"],
        "year": r["year"], "make": r["make"], "model": r["model"], "issue": r["issue"],
        "svc": r["svc"], "urg": r["urg"], "schedTime": r["sched_time"] or "",
        "status": r["status"], "submittedAt": r["submitted_at"],
    }


# ──────────────────────── Auth ────────────────────────
def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else ""
        try:
            signer.loads(token, max_age=TOKEN_MAX_AGE)
        except (BadSignature, SignatureExpired):
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ──────────────────────── CORS ────────────────────────
@app.after_request
def add_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, OPTIONS"
    return resp


# ════════════════════ PUBLIC ENDPOINTS ════════════════════

@app.post("/api/requests")
def create_request():
    """Customer submits a service request."""
    d = request.get_json(force=True, silent=True) or {}
    for field in ("name", "phone", "loc", "svc", "urg"):
        if not str(d.get(field, "")).strip():
            return jsonify({"error": f"Missing field: {field}"}), 400

    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    with db.cursor() as cur:
        cur.execute(
            """INSERT INTO requests
               (name, phone, loc, year, make, model, issue, svc, urg, sched_time, status, submitted_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s)
               RETURNING *""",
            (d.get("name", "").strip(), d.get("phone", "").strip(), d.get("loc", "").strip(),
             d.get("year", ""), d.get("make", ""), d.get("model", ""), d.get("issue", ""),
             d.get("svc", "Towing"), d.get("urg", "ASAP"), d.get("schedTime", ""), now),
        )
        row = cur.fetchone()
    db.commit()
    return jsonify(row_to_request(row)), 201


@app.get("/api/requests/<int:req_id>")
def get_request(req_id):
    """Customer polls this to track their job status live."""
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT * FROM requests WHERE id = %s", (req_id,))
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(row_to_request(row))


@app.get("/api/availability")
def get_availability():
    """Public — the customer form checks this to show the after-hours notice."""
    return jsonify(json.loads(cfg_get("availability")))


@app.get("/api/settings")
def get_settings():
    """Public-safe — returns the business name only, never the password."""
    return jsonify({"bizName": cfg_get("business_name")})


@app.post("/api/login")
def login():
    d = request.get_json(force=True, silent=True) or {}
    if check_password_hash(cfg_get("password_hash"), d.get("password", "")):
        return jsonify({"token": signer.dumps("mechanic")})
    return jsonify({"error": "Incorrect password"}), 401


# ══════════════════ PROTECTED (MECHANIC) ══════════════════

@app.get("/api/requests")
@require_auth
def list_requests():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT * FROM requests ORDER BY id DESC")
        rows = cur.fetchall()
    return jsonify([row_to_request(r) for r in rows])


@app.patch("/api/requests/<int:req_id>")
@require_auth
def update_request_status(req_id):
    d = request.get_json(force=True, silent=True) or {}
    status = d.get("status")
    if status not in VALID_STATUS:
        return jsonify({"error": "Invalid status"}), 400
    db = get_db()
    with db.cursor() as cur:
        cur.execute("UPDATE requests SET status = %s WHERE id = %s RETURNING *", (status, req_id))
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    db.commit()
    return jsonify(row_to_request(row))


@app.put("/api/availability")
@require_auth
def update_availability():
    d = request.get_json(force=True, silent=True) or {}
    cleaned = {}
    for day in DAYS:
        v = d.get(day, DEFAULT_AVAILABILITY[day])
        cleaned[day] = {
            "on": bool(v.get("on", False)),
            "open": str(v.get("open", "08:00")),
            "close": str(v.get("close", "18:00")),
        }
    cfg_set("availability", json.dumps(cleaned))
    return jsonify(cleaned)


@app.put("/api/settings/business-name")
@require_auth
def update_business_name():
    d = request.get_json(force=True, silent=True) or {}
    name = str(d.get("bizName", "")).strip() or "AMS"
    cfg_set("business_name", name)
    return jsonify({"bizName": name})


@app.post("/api/change-password")
@require_auth
def change_password():
    d = request.get_json(force=True, silent=True) or {}
    if not check_password_hash(cfg_get("password_hash"), d.get("current", "")):
        return jsonify({"error": "Current password incorrect"}), 400
    if len(d.get("new", "")) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    cfg_set("password_hash", generate_password_hash(d["new"]))
    return jsonify({"ok": True})


# ──────────────────────── Health check ────────────────────────
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


# ──────────────────────── Startup ────────────────────────
# Create tables whether started by gunicorn (production) or run directly (local).
init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
