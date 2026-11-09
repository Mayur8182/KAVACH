import re

path = r'backend/app/intelligence/action_orchestrator.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'is_scan_query = \([\s\S]*?\)\s*\]\)'

replacement = '''is_scan_query = (
            any(w in q for w in ["scan", "scann", "san ", "audit", "check security", "verify security"]) and
            any(w in q for w in ["repo", "reposiotry", "repository", "code", "codebase", "project", "vulnerabilit", "all", "branch"])
        ) or any(p in q for p in [
            "run scan", "start scan", "trigger scan", "scan the code", "scan code", "scan all",
            "scan my repository", "scan my repo", "scan repo", "scan reposiotry", "scan this repo",
            "run it", "run all agents", "run agents", "run all", "run everything", "execute agents",
            "execute all", "start agents", "start all agents", "run test", "run tests", "execute tests",
            "test project", "test this project", "test this repo", "test repo", "testsprite", "test with testsprite",
            "sab agents run karo", "sab run karo", "run kavach", "launch agents"
        ]) or q in ["run", "run it", "scan", "scan it", "start", "test", "test it"]'''

new_content, count = re.subn(pattern, replacement, content, count=1)
if count > 0:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Updated is_scan_query!")
else:
    print("FAILED: Pattern did not match")
