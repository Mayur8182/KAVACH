"""
Seed canonical SQL Injection finding for Remediation UI screenshot verification.
Strict compliance with THING UI Screenshot → Real Production Feature Implementation Contract.
"""
import sqlite3
import json
import uuid
import os
from datetime import datetime, timezone

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../dev.db"))

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get a valid scan_id and execution_id
    c.execute("SELECT id, scan_id, scanner_execution_id FROM security_findings LIMIT 1")
    row = c.fetchone()
    if row:
        _, scan_id, exec_id = row
    else:
        scan_id = uuid.uuid4().hex
        exec_id = uuid.uuid4().hex

    canonical_id = "89898989-8989-8989-8989-898989898989"
    canonical_hex = uuid.UUID(canonical_id).hex

    raw_metadata = {
        "cwe": "CWE-89",
        "cvss_score": 9.8,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "language": "Python",
        "issue_type": "SQL Injection",
        "finding_code": "#F-2026-0929-0042",
        "scanner_name": "Trivy (SAST)",
        "first_detected_text": "2 hours ago",
        "last_seen_text": "2 hours ago",
        "occurrences": 3,
        "branch": "main",
        "commit_hash": "a1b2c3d",
        "owasp": "A03:2021 - Injection",
        "recommendation": "Use parameterized queries or an ORM to safely handle user input. Avoid string concatenation when constructing SQL queries.",
        "remediation_description": "Use parameterized queries or an ORM to safely handle user input. Avoid string concatenation when constructing SQL queries.",
        "risk_items": [
            {"title": "Data Breach", "description": "High risk of sensitive data exposure", "type": "breach"},
            {"title": "Data Integrity", "description": "Attackers can modify or delete data", "type": "integrity"},
            {"title": "Account Takeover", "description": "Potential user account compromise", "type": "takeover"}
        ],
        "affected_assets": {
            "repository": "frontend-app",
            "file": "src/routes/user.py",
            "branch": "main",
            "service": "web",
            "environment": "production"
        },
        "references": [
            {"title": "OWASP SQL Injection Prevention Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"},
            {"title": "CWE-89: SQL Injection", "url": "https://cwe.mitre.org/data/definitions/89.html"},
            {"title": "Python DB-API Parameterization", "url": "https://peps.python.org/pep-0249/#paramstyle"}
        ],
        "similar_findings": [
            {"title": "SQL Injection in /src/routes/admin.py", "severity": "Critical", "path": "/src/routes/admin.py"},
            {"title": "SQL Injection in /src/services/db.py", "severity": "High", "path": "/src/services/db.py"},
            {"title": "SQL Injection in /src/routes/order.py", "severity": "Medium", "path": "/src/routes/order.py"}
        ],
        "activity_logs": [
            {"title": "Finding detected", "subtitle": "2 hours ago by Trivy (SAST)", "type": "detection", "time": "2 hours ago"},
            {"title": "Comment added", "subtitle": "1 hour ago by Mayur K.", "type": "comment", "time": "1 hour ago"},
            {"title": "Status changed to Open", "subtitle": "2 hours ago", "type": "status", "time": "2 hours ago"}
        ],
        "remediation": {
            "title": "Use parameterized queries",
            "description": "Replace string concatenation with parameterized queries to prevent SQL injection.",
            "original_code": (
                "@app.route('/user', methods=['GET'])\n"
                "def get_user():\n"
                "    user_id = request.args.get('id')\n\n"
                "    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n\n"
                "    cursor = db.execute(query)\n\n"
                "    user = cursor.fetchone()\n"
                "    if user:\n"
                "        return jsonify(user)\n"
                "    else:\n"
                "        return jsonify({'error': 'User not found'}), 404"
            ),
            "patched_code": (
                "@app.route('/user', methods=['GET'])\n"
                "def get_user():\n"
                "    user_id = request.args.get('id')\n\n"
                "    query = \"SELECT * FROM users WHERE id = %s\"\n\n"
                "    cursor = db.execute(query, (user_id,))\n\n"
                "    user = cursor.fetchone()\n"
                "    if user:\n"
                "        return jsonify(user)\n"
                "    else:\n"
                "        return jsonify({'error': 'User not found'}), 404"
            ),
            "unified_diff": (
                "@@ -36,15 +36,15 @@\n"
                " @app.route('/user', methods=['GET'])\n"
                " def get_user():\n"
                "     user_id = request.args.get('id')\n"
                "-    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n"
                "-    cursor = db.execute(query)\n"
                "+    query = \"SELECT * FROM users WHERE id = %s\"\n"
                "+    cursor = db.execute(query, (user_id,))\n"
                "     user = cursor.fetchone()\n"
                "     if user:\n"
                "         return jsonify(user)\n"
                "     else:\n"
                "         return jsonify({'error': 'User not found'}), 404"
            )
        }
    }

    # Delete existing if present
    c.execute("DELETE FROM security_findings WHERE id = ? OR id = ? OR rule_id = 'sql-injection'", (canonical_id, canonical_hex))

    # Insert canonical finding
    c.execute("""
        INSERT INTO security_findings (
            id, scan_id, scanner_execution_id, scanner_name, rule_id,
            title, description, severity, file_path, line_number, column_number,
            snippet, fingerprint, raw_metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        canonical_id,
        scan_id,
        exec_id,
        "Trivy (SAST)",
        "sql-injection",
        "SQL Injection in /src/routes/user.py",
        "User input is directly concatenated into an SQL query, which can allow an attacker to execute arbitrary SQL commands. This can lead to unauthorized data access, modification, or deletion.",
        "CRITICAL",
        "src/routes/user.py",
        42,
        8,
        "@app.route('/user', methods=['GET'])\ndef get_user():\n    user_id = request.args.get('id')\n    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n    cursor = db.execute(query)",
        "fp-sql-inj-user-py-42",
        json.dumps(raw_metadata),
        datetime.now(timezone.utc).isoformat()
    ))

    conn.commit()
    conn.close()
    print(f"Successfully seeded canonical finding {canonical_id} (hex: {canonical_hex}) into {DB_PATH}")

if __name__ == "__main__":
    seed()
