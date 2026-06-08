"""Public, unauthenticated endpoints used by the customer site."""
import re
import json

from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash

from db import get_db, cfg_get
from helpers import row_to_request, now_iso, stamp_status, client_ip, rate_limited, get_blocked_dates
from auth import signer

public = Blueprint("public", __name__)


@public.post("/api/requests")
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


@public.get("/api/requests/lookup")
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


@public.get("/api/requests/<int:req_id>")
def get_request(req_id):
    """Customer polls this to track their job status live."""
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT * FROM requests WHERE id = %s", (req_id,))
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(row_to_request(row))


@public.post("/api/requests/<int:req_id>/cancel")
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


@public.get("/api/availability")
def get_availability():
    """Public — the customer form checks this to show the after-hours notice."""
    return jsonify(json.loads(cfg_get("availability")))


@public.get("/api/settings")
def get_settings():
    """Public-safe — business name, busy flag, and blocked dates. Never the password."""
    return jsonify({
        "bizName": cfg_get("business_name"),
        "busy": (cfg_get("busy") or "false") == "true",
        "blockedDates": get_blocked_dates(),
    })


@public.post("/api/login")
def login():
    d = request.get_json(force=True, silent=True) or {}
    if check_password_hash(cfg_get("password_hash"), d.get("password", "")):
        return jsonify({"token": signer.dumps("mechanic")})
    return jsonify({"error": "Incorrect password"}), 401