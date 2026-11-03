import os
import sys
import sqlite3
import json
import urllib.request

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.security import create_access_token

def test():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dev.db"))
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id FROM users LIMIT 1")
    row = c.fetchone()
    user_id = str(row[0]) if row else "dev-user"
    token = create_access_token(subject=user_id)

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. GET /api/v1/github/security-jobs/reports
    url = "http://127.0.0.1:8000/api/v1/github/security-jobs/reports"
    print(f"Requesting {url}...")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("[PASS] GET reports -> HTTP 200")
        print(f"       Total Reports: {data['total_reports']}, Passed: {data['passed_reports']} ({data['passed_rate']}%), With Findings: {data['reports_with_findings']} ({data['findings_rate']}%), In Progress: {data['in_progress_reports']}")
        print(f"       Severity Findings Total: {data['severity_distribution']['total_findings']}")
        assert len(data['reports']) > 0
        first_report = data['reports'][0]
        print(f"       First item: {first_report['report_number']} | {first_report['name']} | Status: {first_report['status']} | Risk: {first_report['risk_score']}")

    # 2. POST /api/v1/github/security-jobs/reports/generate
    gen_url = "http://127.0.0.1:8000/api/v1/github/security-jobs/reports/generate"
    gen_body = json.dumps({
        "name": "Live Sprint Security Audit",
        "scan_type": "SAST",
        "branch": "main",
        "format": "PDF"
    }).encode("utf-8")
    req = urllib.request.Request(gen_url, data=gen_body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        new_report = json.loads(resp.read().decode("utf-8"))
        print(f"[PASS] POST generate report -> HTTP 200 ({new_report['report_number']} - {new_report['name']})")
        new_id = new_report["id"]

    # 3. GET /api/v1/github/security-jobs/reports/export
    exp_url = "http://127.0.0.1:8000/api/v1/github/security-jobs/reports/export"
    req = urllib.request.Request(exp_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        csv_text = resp.read().decode("utf-8")
        assert "Report ID,Report Name" in csv_text
        print(f"[PASS] GET export reports CSV -> HTTP 200 ({len(csv_text)} bytes)")

    # 4. GET /api/v1/github/security-jobs/reports/{id}/download
    dl_url = f"http://127.0.0.1:8000/api/v1/github/security-jobs/reports/{new_id}/download"
    req = urllib.request.Request(dl_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        file_text = resp.read().decode("utf-8")
        assert "THING SECURITY PLATFORM — AUDIT REPORT" in file_text
        print(f"[PASS] GET download report file -> HTTP 200 ({len(file_text)} bytes report text)")

    # 5. POST /api/v1/github/security-jobs/reports/{id}/regenerate
    regen_url = f"http://127.0.0.1:8000/api/v1/github/security-jobs/reports/{new_id}/regenerate"
    req = urllib.request.Request(regen_url, data=b"{}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        assert resp.getcode() == 200
        print(f"[PASS] POST regenerate report -> HTTP 200")

    # 6. DELETE /api/v1/github/security-jobs/reports/{id}
    del_url = f"http://127.0.0.1:8000/api/v1/github/security-jobs/reports/{new_id}"
    req = urllib.request.Request(del_url, headers=headers, method="DELETE")
    with urllib.request.urlopen(req) as resp:
        assert resp.getcode() == 200
        print(f"[PASS] DELETE report -> HTTP 200")

    print("\nAll Security Job Reports API endpoints tested and verified with real database operations!")
    return True

if __name__ == "__main__":
    test()
