"""Environment variables and app-wide constants."""
import os

DATABASE_URL     = os.environ.get("DATABASE_URL", "")
SECRET_KEY       = os.environ.get("AMS_SECRET", "CHANGE-ME-IN-PRODUCTION")
ALLOWED_ORIGIN   = os.environ.get("AMS_ORIGIN", "*")
TOKEN_MAX_AGE    = 60 * 60 * 12            # mechanic stays logged in 12h
DEFAULT_PASSWORD = "mechanic123"

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DEFAULT_AVAILABILITY = {d: {"on": d != "Sunday", "open": "08:00", "close": "18:00"} for d in DAYS}
VALID_STATUS = {"pending", "accepted", "onway", "done", "dismissed", "cancelled"}

# Simple per-IP rate limit for the public submit form (in-memory, single worker).
RATE_MAX    = 6      # max submissions...
RATE_WINDOW = 600    # ...per this many seconds (10 minutes)

# Render sometimes provides a URL starting with "postgres://"; psycopg wants "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)