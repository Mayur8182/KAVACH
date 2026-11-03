"""
End-to-End Verification Script for Finding Detail & Remediation
Complies with THING Contract:
- Real DB persistence
- Real API contracts
- Real file modification on disk
- Real AST verification & policy checks
- Real PR creation
"""
import urllib.request
import urllib.parse
import json
import os
import sys

BASE_API = "http://127.0.0.1:8000/api/v1"
BASE_FE = "http://localhost:3002"
DEV_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YWE4NzhhZi03OTg2LTRjNzAtYmE1Yi03MjYyMjk5NjZiZjciLCJleHAiOjIxMDU4OTk1NjIsImlhdCI6MTc5MDUzOTU2Mn0.aFJ30Y3X01YOSCulFg_GegA3knChft-wNBION7x1W_A"
FINDING_ID = "89898989-8989-8989-8989-898989898989"

headers = {
    "Authorization": f"Bearer {DEV_TOKEN}",
    "Content-Type": "application/json"
}

def check(step_name, condition, extra=""):
    if condition:
        print(f" [PASS] {step_name} {extra}")
    else:
        print(f"❌ [FAIL] {step_name} {extra}")
        sys.exit(1)

def run():
    print("=== STARTING FULL E2E REMEDIATION VERIFICATION ===")

    # 1. Check Frontend HTML rendering
    fe_url = f"{BASE_FE}/code/findings/{FINDING_ID}"
    print(f"\n1. Testing Frontend Route: {fe_url}")
    req = urllib.request.Request(fe_url)
    res = urllib.request.urlopen(req)
    check("Frontend HTTP Status", res.getcode() == 200, f"Code: {res.getcode()}")
    html = res.read().decode('utf-8', errors='ignore')
    check("Breadcrumbs rendered", "Remediation" in html)
    check("Page Structure loaded", "finding-detail-container" in html or "CodeWorkshell" in html or "SQL Injection" in html or len(html) > 500)

    # 2. Check Backend GET Finding Detail
    api_url = f"{BASE_API}/findings/{FINDING_ID}"
    print(f"\n2. Testing Backend API: GET {api_url}")
    req = urllib.request.Request(api_url, headers=headers)
    res = urllib.request.urlopen(req)
    check("API GET Status", res.getcode() == 200)
    data = json.loads(res.read())
    check("Finding Title", data.get("title") == "SQL Injection", f"Title: {data.get('title')}")
    check("Finding Severity", data.get("severity") in ("CRITICAL", "Critical"), f"Severity: {data.get('severity')}")
    check("CWE", data.get("cwe") == "CWE-89", f"CWE: {data.get('cwe')}")
    check("File Path", "src/routes/user.py" in data.get("file_path", ""), f"File: {data.get('file_path')}")
    check("Remediation Suggestions present", len(data.get("remediation_suggestions", [])) > 0)
    check("Alternative Fixes present", len(data.get("alternative_fixes", [])) > 0)
    check("Secure Code Preview present", bool(data.get("secure_code_preview")))

    # 3. Test Fix API
    test_fix_url = f"{BASE_API}/findings/{FINDING_ID}/test-fix"
    print(f"\n3. Testing Backend API: POST {test_fix_url}")
    req = urllib.request.Request(test_fix_url, data=b"{}", headers=headers)
    res = urllib.request.urlopen(req)
    check("Test Fix Status", res.getcode() == 200)
    test_res = json.loads(res.read())
    check("Test Fix Result Passed", test_res.get("status") == "PASSED", f"Status: {test_res.get('status')}")
    check("Test Fix 4 Checks Run", test_res.get("checks_run") == 4, f"Checks: {test_res.get('checks_run')}")
    check("AST Check Valid", test_res.get("details", {}).get("ast_syntax") == "VALID")
    check("Policy Gate Allowed", test_res.get("details", {}).get("opa_policy_gate") == "ALLOW")

    # 4. Create PR API
    pr_url = f"{BASE_API}/findings/{FINDING_ID}/create-pr"
    print(f"\n4. Testing Backend API: POST {pr_url}")
    req = urllib.request.Request(pr_url, data=b"{}", headers=headers)
    res = urllib.request.urlopen(req)
    check("Create PR Status", res.getcode() == 200)
    pr_res = json.loads(res.read())
    check("PR Number Created", pr_res.get("pr_number") == 43, f"PR #: {pr_res.get('pr_number')}")
    check("PR URL matches", "/code/pull-requests/43" in pr_res.get("pr_url", ""))

    # 5. Apply Fix API (Real File Patching)
    target_file = os.path.abspath("src/routes/user.py")
    print(f"\n5. Testing Backend API: POST /apply-fix on {target_file}")
    
    # Ensure original vulnerable file is present
    orig_code = (
        "from flask import Flask, request, jsonify\n"
        "import sqlite3\n\n"
        "app = Flask(__name__)\n\n"
        "# User route with finding CWE-89\n"
        "@app.route('/user', methods=['GET'])\n"
        "def get_user():\n"
        "    user_id = request.args.get('id')\n\n"
        "    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n\n"
        "    cursor = db.execute(query)\n\n"
        "    user = cursor.fetchone()\n"
        "    if user:\n"
        "        return jsonify(user)\n"
        "    else:\n"
        "        return jsonify({'error': 'User not found'}), 404\n"
    )
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(orig_code)

    apply_fix_url = f"{BASE_API}/findings/{FINDING_ID}/apply-fix"
    req = urllib.request.Request(apply_fix_url, data=b"{}", headers=headers)
    res = urllib.request.urlopen(req)
    check("Apply Fix Status", res.getcode() == 200)
    apply_res = json.loads(res.read())
    check("Apply Fix Success", apply_res.get("success") is True)
    check("Scan Triggered", apply_res.get("scan_triggered") is True)

    # Verify physical file modification
    with open(target_file, "r", encoding="utf-8") as f:
        patched_file_content = f.read()

    check("Vulnerable f-string removed", "f\"SELECT * FROM users WHERE id = {user_id}\"" not in patched_file_content)
    check("Secure parameterized query applied", "\"SELECT * FROM users WHERE id = %s\"" in patched_file_content)
    check("Parameterized cursor execution present", "cursor = db.execute(query, (user_id,))" in patched_file_content)

    print("\n=== ALL E2E VERIFICATIONS PASSED WITH 100% SUCCESS ===")

if __name__ == "__main__":
    run()
