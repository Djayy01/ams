"""
AMS — Mobile Mechanic & Towing  ::  Backend API  (PostgreSQL version)
Stack: Flask + PostgreSQL (psycopg 3)

────────────────────────────────────────────────────────
WHAT'S NEW IN THIS VERSION
    • status_times: a timestamp is recorded for every status change
      (powers "Accepted 2:41 · On the Way 2:55" + exact completion time)
    • eta column: mechanic can set an arrival estimate ("~15 min")
    • POST /api/requests/<id>/cancel  → customer cancels their own job
      (verified by matching the phone number on the request)
    • 'cancelled' status added; mechanics can reactivate any job by
      PATCHing its status back (e.g. to 'pending' or 'accepted')
    • Spam protection on the public form: a honeypot field + a simple
      per-IP rate limit.
    • All schema changes use IF NOT EXISTS, so existing data is preserved.
────────────────────────────────────────────────────────
"""

import os
import re
import time
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
VALID_STATUS = {"pending", "accepted", "onway", "done", "dismissed", "cancelled"}

# Simple per-IP rate limit for the public submit form (in-memory).
RATE_MAX    = 6      # max submissions...
RATE_WINDOW = 600    # ...per this many seconds (10 minutes)
_RATE = {}

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
                    notes        TEXT,
                    price        TEXT,
                    eta          TEXT,
                    status_times TEXT,
                    submitted_at TEXT NOT NULL
                )
            """)
            # Add columns for databases created before each version (no-op if present).
            cur.execute("ALTER TABLE requests ADD COLUMN IF NOT EXISTS notes TEXT")
            cur.execute("ALTER TABLE requests ADD COLUMN IF NOT EXISTS price TEXT")
            cur.execute("ALTER TABLE requests ADD COLUMN IF NOT EXISTS eta TEXT")
            cur.execute("ALTER TABLE requests ADD COLUMN IF NOT EXISTS status_times TEXT")
            # Backfill a 'pending' timestamp for older rows so their tracker has a start time.
            cur.execute(
                "UPDATE requests SET status_times = json_build_object('pending', submitted_at)::text "
                "WHERE status_times IS NULL OR status_times = ''"
            )

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
            cur.execute("INSERT INTO config (key, value) VALUES ('busy', 'false') ON CONFLICT (key) DO NOTHING")
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


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def stamp_status(times_json, status):
    """Return an updated status_times JSON string with `status` set to now."""
    try:
        times = json.loads(times_json) if times_json else {}
    except (ValueError, TypeError):
        times = {}
    times[status] = now_iso()
    return json.dumps(times)


def row_to_request(r):
    try:
        times = json.loads(r.get("status_times") or "{}")
    except (ValueError, TypeError):
        times = {}
    return {
        "id": r["id"], "name": r["name"], "phone": r["phone"], "loc": r["loc"],
        "year": r["year"], "make": r["make"], "model": r["model"], "issue": r["issue"],
        "svc": r["svc"], "urg": r["urg"], "schedTime": r["sched_time"] or "",
        "status": r["status"], "notes": r.get("notes") or "", "price": r.get("price") or "",
        "eta": r.get("eta") or "", "statusTimes": times,
        "submittedAt": r["submitted_at"],
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


# ──────────────────────── Spam protection helpers ────────────────────────
def client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def rate_limited(ip):
    """Naive in-memory sliding window. Resets on restart; assumes a single worker."""
    now = time.time()
    hits = [t for t in _RATE.get(ip, []) if now - t < RATE_WINDOW]
    if len(hits) >= RATE_MAX:
        _RATE[ip] = hits
        return True
    hits.append(now)
    _RATE[ip] = hits
    return False


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

    # Honeypot: bots fill hidden fields; real users never do.
    if str(d.get("company", "")).strip():
        return jsonify({"error": "Submission rejected."}), 400

    for field in ("name", "phone", "loc", "svc", "urg"):
        if not str(d.get(field, "")).strip():
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Rate limit only well-formed submissions, so a fumbling user isn't penalized.
    if rate_limited(client_ip()):
        return jsonify({"error": "Too many requests — please wait a few minutes and try again."}), 429

    db = get_db()
    now = now_iso()
    times = json.dumps({"pending": now})
    with db.cursor() as cur:
        cur.execute(
            """INSERT INTO requests
               (name, phone, loc, year, make, model, issue, svc, urg, sched_time, status, status_times, submitted_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s, %s)
               RETURNING *""",
            (d.get("name", "").strip(), d.get("phone", "").strip(), d.get("loc", "").strip(),
             d.get("year", ""), d.get("make", ""), d.get("model", ""), d.get("issue", ""),
             d.get("svc", "Towing"), d.get("urg", "ASAP"), d.get("schedTime", ""), times, now),
        )
        row = cur.fetchone()
    db.commit()
    return jsonify(row_to_request(row)), 201


@app.get("/api/requests/lookup")
def lookup_requests():
    """Public — a customer looks up their own request(s) by phone number.
       Phone match ignores formatting (spaces, dashes, parens)."""
    phone = (request.args.get("phone") or "").strip()
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 7:
        return jsonify({"error": "Enter a valid phone number"}), 400
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "SELECT * FROM requests WHERE regexp_replace(phone, '\\D', '', 'g') = %s ORDER BY id DESC",
            (digits,),
        )
        rows = cur.fetchall()
    return jsonify([row_to_request(r) for r in rows])


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


@app.post("/api/requests/<int:req_id>/cancel")
def cancel_request(req_id):
    """Public — a customer cancels their own request, verified by phone number."""
    d = request.get_json(force=True, silent=True) or {}
    digits = re.sub(r"\D", "", str(d.get("phone", "")))
    if len(digits) < 7:
        return jsonify({"error": "Enter the phone number on your request to cancel."}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT * FROM requests WHERE id = %s", (req_id,))
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    if re.sub(r"\D", "", row["phone"]) != digits:
        return jsonify({"error": "That phone number doesn't match this request."}), 403
    if row["status"] in ("done", "dismissed", "cancelled"):
        return jsonify({"error": "This request can no longer be cancelled."}), 400

    new_times = stamp_status(row.get("status_times"), "cancelled")
    with db.cursor() as cur:
        cur.execute(
            "UPDATE requests SET status = 'cancelled', status_times = %s WHERE id = %s RETURNING *",
            (new_times, req_id),
        )
        updated = cur.fetchone()
    db.commit()
    return jsonify(row_to_request(updated))


@app.get("/api/availability")
def get_availability():
    """Public — the customer form checks this to show the after-hours notice."""
    return jsonify(json.loads(cfg_get("availability")))


@app.get("/api/settings")
def get_settings():
    """Public-safe — business name + busy flag. Never returns the password."""
    return jsonify({
        "bizName": cfg_get("business_name"),
        "busy": (cfg_get("busy") or "false") == "true",
    })


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
def update_request(req_id):
    """Update any of: status, notes, price, eta. Send only what you want changed.
       Changing status also records a timestamp for that status."""
    d = request.get_json(force=True, silent=True) or {}

    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT * FROM requests WHERE id = %s", (req_id,))
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404

    fields, values = [], []
    if "status" in d:
        if d["status"] not in VALID_STATUS:
            return jsonify({"error": "Invalid status"}), 400
        fields.append("status = %s"); values.append(d["status"])
        fields.append("status_times = %s"); values.append(stamp_status(row.get("status_times"), d["status"]))
    if "notes" in d:
        fields.append("notes = %s"); values.append(str(d.get("notes", "")))
    if "price" in d:
        fields.append("price = %s"); values.append(str(d.get("price", "")))
    if "eta" in d:
        fields.append("eta = %s"); values.append(str(d.get("eta", "")))
    if not fields:
        return jsonify({"error": "Nothing to update"}), 400

    values.append(req_id)
    with db.cursor() as cur:
        cur.execute(f"UPDATE requests SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
        updated = cur.fetchone()
    db.commit()
    return jsonify(row_to_request(updated))


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


@app.put("/api/settings/busy")
@require_auth
def update_busy():
    """Flip the 'we'll call you back' mode on or off."""
    d = request.get_json(force=True, silent=True) or {}
    cfg_set("busy", "true" if d.get("busy") else "false")
    return jsonify({"busy": (cfg_get("busy") or "false") == "true"})


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