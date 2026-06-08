"""Auth-protected endpoints used by the mechanic dashboard."""
import re
import json

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from db import get_db, cfg_get, cfg_set
from helpers import row_to_request, stamp_status
from auth import require_auth
from config import DAYS, DEFAULT_AVAILABILITY, VALID_STATUS

mechanic = Blueprint("mechanic", __name__)


@mechanic.get("/api/requests")
@require_auth
def list_requests():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("SELECT * FROM requests ORDER BY id DESC")
        rows = cur.fetchall()
    return jsonify([row_to_request(r) for r in rows])


@mechanic.patch("/api/requests/<int:req_id>")
@require_auth
def update_request(req_id):
    """Update any of: status, notes, price, cost, tip, eta. Send only what you want changed.
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
    for col in ("notes", "price", "cost", "tip", "eta"):
        if col in d:
            fields.append(f"{col} = %s"); values.append(str(d.get(col, "")))
    if not fields:
        return jsonify({"error": "Nothing to update"}), 400

    values.append(req_id)
    with db.cursor() as cur:
        cur.execute(f"UPDATE requests SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
        updated = cur.fetchone()
    db.commit()
    return jsonify(row_to_request(updated))


@mechanic.delete("/api/requests/<int:req_id>")
@require_auth
def delete_request(req_id):
    """Permanently delete a request (e.g. to clear out test submissions)."""
    db = get_db()
    with db.cursor() as cur:
        cur.execute("DELETE FROM requests WHERE id = %s RETURNING id", (req_id,))
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    db.commit()
    return jsonify({"ok": True, "id": req_id})


@mechanic.put("/api/availability")
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


@mechanic.put("/api/settings/business-name")
@require_auth
def update_business_name():
    d = request.get_json(force=True, silent=True) or {}
    name = str(d.get("bizName", "")).strip() or "AMS"
    cfg_set("business_name", name)
    return jsonify({"bizName": name})


@mechanic.put("/api/settings/busy")
@require_auth
def update_busy():
    """Flip the 'we'll call you back' mode on or off."""
    d = request.get_json(force=True, silent=True) or {}
    cfg_set("busy", "true" if d.get("busy") else "false")
    return jsonify({"busy": (cfg_get("busy") or "false") == "true"})


@mechanic.put("/api/settings/blocked-dates")
@require_auth
def update_blocked_dates():
    """Set the list of days the mechanic is off (vacation mode). Expects {"dates": ["YYYY-MM-DD", ...]}."""
    d = request.get_json(force=True, silent=True) or {}
    raw = d.get("dates", [])
    clean = sorted({s for s in raw if isinstance(s, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", s)})
    cfg_set("blocked_dates", json.dumps(clean))
    return jsonify({"blockedDates": clean})


@mechanic.post("/api/change-password")
@require_auth
def change_password():
    d = request.get_json(force=True, silent=True) or {}
    if not check_password_hash(cfg_get("password_hash"), d.get("current", "")):
        return jsonify({"error": "Current password incorrect"}), 400
    if len(d.get("new", "")) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    cfg_set("password_hash", generate_password_hash(d["new"]))
    return jsonify({"ok": True})