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

    url = "http://127.0.0.1:8000/api/v1/github/security-jobs/history"
    print(f"Requesting {url}...")
    headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        print("Status code:", resp.status)
        data = json.loads(resp.read().decode("utf-8"))
        print("total_runs:", data.get("total_runs"), f"(Trend: {data.get('total_trend')})")
        print("successful_runs:", data.get("successful_runs"), f"({data.get('successful_rate')}%)")
        print("failed_runs:", data.get("failed_runs"), f"({data.get('failed_rate')}%)")
        print("cancelled_runs:", data.get("cancelled_runs"), f"({data.get('cancelled_rate')}%)")
        print("skipped_runs:", data.get("skipped_runs"), f"({data.get('skipped_rate')}%)")
        print("duration_info:", data.get("duration_info"))
        print("trend_data count:", len(data.get("trend_data", [])))
        for t in data.get("trend_data", []):
            print("  ", t)
        print("scan_type_distribution:")
        for s in data.get("scan_type_distribution", []):
            print("  ", s)
        print("runs on page 1:", len(data.get("runs", [])))
        first_run = data.get("runs", [])[0]
        print("First run:", first_run.get("job_number"), first_run.get("job_name"), first_run.get("status"), first_run.get("findings_count"))

        # Test CSV export
        export_url = "http://127.0.0.1:8000/api/v1/github/security-jobs/history/export"
        export_req = urllib.request.Request(export_url, headers=headers)
        with urllib.request.urlopen(export_req) as exp_resp:
            print("CSV Export status:", exp_resp.status)
            csv_lines = exp_resp.read().decode("utf-8").strip().split("\n")
            print(f"CSV exported {len(csv_lines)} lines (header + 128 rows)")

if __name__ == "__main__":
    test()
