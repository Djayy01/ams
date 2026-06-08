"""Pure helpers: timestamps, status stamping, row mapping, spam protection."""
import time
import json
from datetime import datetime, timezone

from flask import request

from config import RATE_MAX, RATE_WINDOW
from db import cfg_get

# Naive in-memory sliding window. Resets on restart; assumes a single worker.
_RATE = {}


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
        "status": r["status"], "notes": r.get("notes") or "",
        "price": r.get("price") or "", "cost": r.get("cost") or "", "tip": r.get("tip") or "",
        "eta": r.get("eta") or "", "statusTimes": times,
        "submittedAt": r["submitted_at"],
    }


def get_blocked_dates():
    try:
        return json.loads(cfg_get("blocked_dates") or "[]")
    except (ValueError, TypeError):
        return []


def client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def rate_limited(ip):
    now = time.time()
    hits = [t for t in _RATE.get(ip, []) if now - t < RATE_WINDOW]
    if len(hits) >= RATE_MAX:
        _RATE[ip] = hits
        return True
    hits.append(now)
    _RATE[ip] = hits
    return False