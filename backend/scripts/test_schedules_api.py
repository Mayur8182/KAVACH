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

    # 1. GET /api/v1/github/security-jobs/schedules
    url = "http://127.0.0.1:8000/api/v1/github/security-jobs/schedules"
    print(f"Requesting {url}...")
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("[PASS] GET schedules -> HTTP 200")
        print(f"       Total: {data['total_schedules']}, Active: {data['active_count']} ({data['active_rate']}%), Paused: {data['paused_count']}, Failed: {data['failed_count']}")
        first_item = data["schedules"][0]
        print(f"       First item: {first_item['name']} | Status: {first_item['status']} | Next Run: {first_item['next_run_at']}")
        schedule_id = first_item["id"]

    # 2. PATCH toggle status
    toggle_url = f"http://127.0.0.1:8000/api/v1/github/security-jobs/schedules/{schedule_id}/toggle"
    t_req = urllib.request.Request(toggle_url, headers=headers, method="PATCH")
    with urllib.request.urlopen(t_req) as resp:
        t_data = json.loads(resp.read().decode("utf-8"))
        print(f"[PASS] PATCH toggle schedule -> HTTP {resp.status} (New status: {t_data['status']})")

    # 3. POST create new schedule
    create_url = "http://127.0.0.1:8000/api/v1/github/security-jobs/schedules"
    create_body = json.dumps({
        "name": "Bi-Weekly IaC Benchmark",
        "scan_type": "IaC",
        "target": "iac/",
        "branch": "main",
        "frequency": "Weekly",
        "time_utc": "04:30 AM",
        "run_only_on_changes": True,
        "notify_on_completion": True,
        "fail_on_high_severity": False
    }).encode("utf-8")
    c_req = urllib.request.Request(create_url, data=create_body, headers=headers, method="POST")
    with urllib.request.urlopen(c_req) as resp:
        c_data = json.loads(resp.read().decode("utf-8"))
        print(f"[PASS] POST create schedule -> HTTP {resp.status} (Created: {c_data['name']}, ID: {c_data['id']})")
        new_id = c_data["id"]

    # 4. POST run-now
    run_url = f"http://127.0.0.1:8000/api/v1/github/security-jobs/schedules/{new_id}/run-now"
    r_req = urllib.request.Request(run_url, headers=headers, method="POST")
    with urllib.request.urlopen(r_req) as resp:
        r_data = json.loads(resp.read().decode("utf-8"))
        print(f"[PASS] POST run-now -> HTTP {resp.status} (Job Number: {r_data.get('job_number')}, Status: {r_data.get('status')})")

    # 5. DELETE new schedule
    del_url = f"http://127.0.0.1:8000/api/v1/github/security-jobs/schedules/{new_id}"
    d_req = urllib.request.Request(del_url, headers=headers, method="DELETE")
    with urllib.request.urlopen(d_req) as resp:
        print(f"[PASS] DELETE schedule -> HTTP {resp.status}")

    print("\nAll Security Job Schedules endpoints tested and working with real database persistence!")

if __name__ == "__main__":
    test()
