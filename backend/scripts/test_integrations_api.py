"""
Automated validation of Security Job Integrations endpoints
"""
import urllib.request
import json
import sqlite3
import os
import sys

# Ensure backend root in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.security import create_access_token

def run_tests():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dev.db"))
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id FROM users LIMIT 1")
    row = c.fetchone()
    if not row:
        print("[FAIL] No user found in dev.db")
        return False
    user_id = str(row[0])
    token = create_access_token(subject=user_id)

    def req(name, url, method="GET", body=None):
        headers = {"Authorization": f"Bearer {token}"}
        data = json.dumps(body).encode("utf-8") if body else None
        if body:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(request) as resp:
            content = json.loads(resp.read().decode("utf-8"))
            print(f"[PASS] {name:25} -> HTTP {resp.status}")
            return content

    # 1. Overview initially has 0 connected (authentic initial state)
    overview = req("GET Integrations Overview", "http://127.0.0.1:8000/api/v1/github/security-jobs/integrations")
    print(f"       -> Connected: {overview['connected_count']}, Disconnected: {overview['disconnected_count']}, Available: {overview['available_count']}")
    assert overview["connected_count"] == 0, f"Expected 0 connected initially, got {overview['connected_count']}"

    # Find GitHub
    github_item = next(i for i in overview["configured_integrations"] if i["provider_key"] == "github")
    item_id = github_item["id"]

    # 2. Connect with valid authentic credentials
    connected = req("POST Connect GitHub", f"http://127.0.0.1:8000/api/v1/github/security-jobs/integrations/{item_id}/connect", method="POST", body={
        "api_token": "ghp_realtoken1234567890abcdef",
        "repository_name": "frontend-app",
        "branch_filter": "main"
    })
    print("Connected result:", json.dumps(connected, indent=2))
    assert connected["status"] == "Connected"
    if connected.get("config"):
        print("Config content:", connected["config"])

    # 3. Test Connection
    test_result = req("POST Test Connection", f"http://127.0.0.1:8000/api/v1/github/security-jobs/integrations/{item_id}/test", method="POST")
    assert test_result["status"] == "Success"
    print(f"       -> Probe: {test_result['message']} ({test_result['latency_ms']}ms)")

    # 4. Update configuration
    updated = req("PUT Update Configuration", f"http://127.0.0.1:8000/api/v1/github/security-jobs/integrations/{item_id}", method="PUT", body={
        "repository_name": "frontend-app",
        "branch_filter": "main, develop, feature/*",
        "events": ["Push events", "Pull request events", "Release events"]
    })
    assert updated["repository_name"] == "frontend-app"
    assert updated["branch_filter"] == "main, develop, feature/*"
    print(f"       -> Saved config: repo={updated['repository_name']}, filter={updated['branch_filter']}")

    # 5. Disconnect and verify credentials cleared
    disconnected = req("POST Disconnect GitHub", f"http://127.0.0.1:8000/api/v1/github/security-jobs/integrations/{item_id}/disconnect", method="POST")
    assert disconnected["status"] == "Disconnected"
    assert not disconnected.get("config") or len(disconnected["config"]) == 0

    print("\nALL SECURITY JOB INTEGRATIONS TESTS PASSED SUCCESSFULLY (100% OK)")
    return True

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
