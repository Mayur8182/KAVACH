import sys
sys.path.insert(0, 'backend')
from app.core.security import create_access_token
import urllib.request
import json

token = create_access_token('cfcd446bfa4f4f20aafd331c6d371677')
headers = {'Authorization': f'Bearer {token}'}
base_url = 'http://127.0.0.1:8000'

endpoints = [
    '/api/sast/agent/status',
    '/api/sast/exceptions',
    '/api/sast/rules',
    '/api/sast/findings/recent?limit=10',
    '/api/sast/overview',
    '/api/v1/code/autofix/overview',
]

print("=== RUNNING SAST SECURITY VERIFICATION TESTS ===")
for ep in endpoints:
    url = base_url + ep
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode('utf-8')
            data = json.loads(raw)
            print(f"✅ {ep}: HTTP {resp.status}")
            if ep == '/api/sast/overview':
                print(f"   Pure SAST findings: {data.get('total_findings')} | Critical: {data.get('critical_findings')} | Coverage: {data.get('code_coverage_pct')}%")
                print(f"   Active scanners: {[s.get('name') for s in data.get('scanners', [])]}")
            elif 'findings/recent' in ep:
                items = data if isinstance(data, list) else data.get('items', [])
                print(f"   Returned {len(items)} recent findings.")
                for f in items[:3]:
                    print(f"   -> [{f.get('display_id')}] {f.get('title')} | CWE: {f.get('cwe')} | Reachable: {f.get('reachability')}")
            elif 'agent/status' in ep:
                print(f"   Autonomous SAST Agent: {data.get('agent_id')} | Status: {data.get('status')} | Engine: {data.get('engine')}")
            elif 'exceptions' in ep:
                print(f"   Exceptions Ledger: Total={data.get('total')}, Active={data.get('active_count')}, Expired={data.get('expired_count')}, Revoked={data.get('revoked_count')}")
            elif 'autofix/overview' in ep:
                print(f"   Remediation Workspace: Proposals={data.get('total_proposals')}, Validated={data.get('validated_count')}, Active PRs={data.get('active_prs')}")
    except Exception as e:
        print(f"❌ {ep}: Error: {e}")
