"""Database connection lifecycle, schema bootstrap, and config key/value store."""
import json

from flask import g
import psycopg
from psycopg.rows import dict_row
from werkzeug.security import generate_password_hash

from config import DATABASE_URL, DEFAULT_AVAILABILITY, DEFAULT_PASSWORD


def get_db():
    """One connection per request, with dict-style rows."""
    if "db" not in g:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set. Link your Render PostgreSQL database.")
        g.db = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    return g.db


def close_db(_exc=None):
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
                    cost         TEXT,
                    tip          TEXT,
                    eta          TEXT,
                    status_times TEXT,
                    submitted_at TEXT NOT NULL
                )
            """)
            # Add columns for databases created before each version (no-op if present).
            for col in ("notes", "price", "cost", "tip", "eta", "status_times"):
                cur.execute(f"ALTER TABLE requests ADD COLUMN IF NOT EXISTS {col} TEXT")
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
            # Ensure these config keys exist for both new and existing databases.
            cur.execute("INSERT INTO config (key, value) VALUES ('busy', 'false') ON CONFLICT (key) DO NOTHING")
            cur.execute("INSERT INTO config (key, value) VALUES ('blocked_dates', '[]') ON CONFLICT (key) DO NOTHING")
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