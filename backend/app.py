"""
AMS — Mobile Mechanic & Towing :: Backend entry point.
Wires the app together; the actual logic lives in the modules it imports.
Run in production with: gunicorn app:app
"""
import os

from flask import Flask, jsonify

from config import ALLOWED_ORIGIN
from db import init_db, close_db
from routes_public import public
from routes_mechanic import mechanic

app = Flask(__name__)


@app.after_request
def add_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    return resp


app.teardown_appcontext(close_db)
app.register_blueprint(public)
app.register_blueprint(mechanic)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


# Create tables whether started by gunicorn (production) or run directly (local).
init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)