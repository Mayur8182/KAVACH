"""
Verify Finding Detail Remediation APIs.
"""
import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:8000/api/v1/findings/89898989-8989-8989-8989-898989898989"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YWE4NzhhZi03OTg2LTRjNzAtYmE1Yi03MjYyMjk5NjZiZjciLCJleHAiOjIxMDU4OTk1NjIsImlhdCI6MTc5MDUzOTU2Mn0.aFJ30Y3X01YOSCulFg_GegA3knChft-wNBION7x1W_A"

def req(url, method="GET", body=None):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    data = json.dumps(body).encode("utf-8") if body else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("==========================================================")
    print("TESTING FINDING DETAIL & REMEDIATION API CONTRACTS")
    print("==========================================================")
    
    # 1. GET Finding Detail
    data = req(BASE_URL)
    print(f"[OK] Title: {data.get('title')}")
    print(f"[OK] Severity: {data.get('severity')}")
    print(f"[OK] File: {data.get('file_path')} Line: {data.get('line_number')}")
    print(f"[OK] CWE: {data.get('cwe')}")
    print(f"[OK] Language: {data.get('language')}")
    print(f"[OK] Issue Type: {data.get('issue_type')}")
    print(f"[OK] Recommendation: {data.get('recommendation')}")
    assert len(data.get("remediation_suggestions", [])) > 0, "Must have recommended fix"
    assert len(data.get("alternative_fixes", [])) > 0, "Must have alternative fixes"
    assert len(data.get("references", [])) == 3, "Must have 3 references"
    assert data.get("secure_code_preview") is not None, "Must have secure code preview"
    
    # 2. POST Test Fix
    test_res = req(f"{BASE_URL}/test-fix", method="POST", body={"suggestion_id": "11111111-2222-3333-4444-555555555555"})
    print(f"[OK] Test Fix: {test_res.get('status')} - {test_res.get('message')}")
    assert test_res.get("status") == "PASSED"
    assert test_res.get("checks_run") == 4
    
    # 3. POST Create PR
    pr_res = req(f"{BASE_URL}/create-pr", method="POST", body={"suggestion_id": "11111111-2222-3333-4444-555555555555"})
    print(f"[OK] Create PR: #{pr_res.get('pr_number')} - {pr_res.get('message')}")
    assert pr_res.get("success") is True
    assert pr_res.get("pr_number") == 43
    
    print("==========================================================")
    print("ALL REMEDIATION API CONTRACTS VERIFIED 100% SUCCESSFULLY")
    print("==========================================================")

if __name__ == "__main__":
    main()
