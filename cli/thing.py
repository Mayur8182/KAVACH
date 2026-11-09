import argparse
import sys
import os
import json
import urllib.request
import urllib.error
import hashlib
import subprocess
import time

API_URL = "http://localhost:8000/api/v1/cli"
CONFIG_FILE = os.path.expanduser("~/.thing_cli_config.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)

def _post(url, data):
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, data=json.dumps(data).encode("utf-8")) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        sys.exit(1)

def _get(url):
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        sys.exit(1)

def get_git_root():
    try:
        return subprocess.check_output(["git", "rev-parse", "--show-toplevel"], stderr=subprocess.DEVNULL).decode().strip()
    except subprocess.CalledProcessError:
        return None

def get_changed_files():
    try:
        output = subprocess.check_output(["git", "diff", "--name-only", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
        return [f for f in output.split('\n') if f]
    except:
        return []

def get_staged_files():
    try:
        output = subprocess.check_output(["git", "diff", "--cached", "--name-only"], stderr=subprocess.DEVNULL).decode().strip()
        return [f for f in output.split('\n') if f]
    except:
        return []

def auth_login(args):
    print("Logging into Thing...")
    config = load_config()
    device_name = os.environ.get("COMPUTERNAME", "Unknown")
    resp = _post(f"{API_URL}/auth", {"device_name": device_name, "os_type": "WINDOWS"})
    config["device_id"] = resp["device_id"]
    config["token"] = resp["token"]
    save_config(config)
    print("Authentication successful.")

def init(args):
    config = load_config()
    if "device_id" not in config:
        print("Please run 'thing auth login' first.")
        sys.exit(1)
        
    git_root = get_git_root()
    if not git_root:
        print("Not a git repository.")
        sys.exit(1)
        
    project_id = input("Enter Thing Project ID: ")
    local_path_hash = hashlib.sha256(git_root.encode()).hexdigest()
    
    resp = _post(f"{API_URL}/bind", {
        "device_id": config["device_id"],
        "project_id": project_id,
        "local_path_hash": local_path_hash
    })
    
    repo_bindings = config.get("bindings", {})
    repo_bindings[git_root] = {
        "binding_id": resp["binding_id"],
        "project_id": project_id
    }
    config["bindings"] = repo_bindings
    save_config(config)
    print(f"Initialized Thing Security for project {project_id}.")

def get_context():
    config = load_config()
    git_root = get_git_root()
    if not git_root or not config.get("bindings", {}).get(git_root):
        print("NOT CONNECTED")
        sys.exit(1)
    project_id = config["bindings"][git_root]["project_id"]
    return _get(f"{API_URL}/context/{project_id}")

def status(args):
    try:
        ctx = get_context()
        print("Thing Security Status:")
        print(f"Project ID: {ctx['project_id']}")
        print(f"Intent Version: {ctx.get('intent_version')}")
        print(f"Blueprint Version: {ctx.get('blueprint_version')}")
        print(f"Policy Version: {ctx.get('policy_version')}")
        print(f"Contract Version: {ctx.get('contract_version')}")
    except SystemExit:
        pass

def intent(args):
    ctx = get_context()
    if ctx.get("intent"):
        print(json.dumps(ctx["intent"], indent=2))
    else:
        print("No Intent configured.")

def blueprint(args):
    ctx = get_context()
    if ctx.get("blueprint"):
        print(json.dumps(ctx["blueprint"], indent=2))
    else:
        print("No Blueprint configured.")

def contracts(args):
    ctx = get_context()
    if ctx.get("contracts"):
        for c in ctx["contracts"]:
            print(f"[{c['id']}] {c['name']} - {c['description']}")
    else:
        print("No Contracts configured.")

def policy(args):
    ctx = get_context()
    if ctx.get("policy"):
        print(json.dumps(ctx["policy"], indent=2))
    else:
        print("No Policy configured.")

def findings(args):
    # Mocking fetching findings from local cache or backend
    print("No active findings in local cache.")

def explain(args):
    print("Explaining finding AI... (Integration requires valid backend logic)")
    
def fix(args):
    finding_id = getattr(args, "finding_id", None)
    if not finding_id:
        print("Please specify a finding ID: thing fix --finding-id <ID>")
        return
    
    print(f"Applying automated remediation patch for finding {finding_id}...")
    try:
        req = urllib.request.Request(f"http://localhost:8000/api/v1/api-security/findings/{finding_id}/apply-fix", method="POST")
        req.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req, data=json.dumps({}).encode("utf-8")) as resp:
            data = json.loads(resp.read().decode())
            print(f"[SUCCESS] {data.get('message')}")
            if data.get("patch"):
                print("\nApplied Unified Diff Patch:")
                print(data["patch"])
            print(f"\nTo deterministically verify this fix, run:\n  thing verify --finding-id {finding_id}")
    except Exception as e:
        print(f"[ERROR] Failed to apply fix: {e}")

def verify(args):
    finding_id = getattr(args, "finding_id", None)
    if not finding_id:
        print("Please specify a finding ID: thing verify --finding-id <ID>")
        return

    print(f"Running deterministic rescan verification for finding {finding_id}...")
    try:
        req = urllib.request.Request(f"http://localhost:8000/api/v1/api-security/findings/{finding_id}/verify-fix", method="POST")
        req.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req, data=json.dumps({}).encode("utf-8")) as resp:
            data = json.loads(resp.read().decode())
            print(f"[VERIFIED FIXED] {data.get('message')}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"[RESCAN FAILED] Verification rejected: {err_body}")
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")

def run_scanner(name, cmd):
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0 and not result.stdout:
            print(f"SCAN FAILED\n\nScanner:\n{name}\n\nReason:\nProcess exited with code {result.returncode}\n\nSecurity verification:\nINCOMPLETE")
            return None, False
        return result.stdout, True
    except FileNotFoundError:
        print(f"SCAN FAILED\n\nScanner:\n{name}\n\nReason:\nScanner not found in PATH\n\nSecurity verification:\nINCOMPLETE")
        return None, False

def scan(args):
    config = load_config()
    git_root = get_git_root()
    if (not git_root or not config.get("bindings", {}).get(git_root)) and not getattr(args, "api", False):
        print("NOT CONNECTED")
        sys.exit(1)
        
    print(f"Running scan... (changed={args.changed}, staged={args.staged}, format={args.format})")
    
    files_to_scan = []
    if args.staged:
        files_to_scan = get_staged_files()
    elif args.changed:
        files_to_scan = get_changed_files()
    
    ctx = get_context() if config.get("bindings", {}).get(git_root) else {}
    policy_action = ctx.get("policy", {}).get("default_action", "ALLOW") if ctx.get("policy") else "ALLOW"
    
    scanners_to_run = [] if getattr(args, "api", False) else ["semgrep", "gitleaks"]
    
    if any(f.endswith("Dockerfile") for f in files_to_scan):
        scanners_to_run.append("trivy")
    if any(f.endswith(".tf") for f in files_to_scan):
        scanners_to_run.append("checkov")
    if any(f == "requirements.txt" or f == "package.json" for f in files_to_scan):
        scanners_to_run.append("osv-scanner")
        
    all_findings = []
    has_failure = False
    
    for s in scanners_to_run:
        if s == "semgrep":
            out, success = run_scanner("Semgrep", ["semgrep", "scan", "--json", git_root])
            if not success: has_failure = True
            elif out:
                try:
                    data = json.loads(out)
                    all_findings.extend(data.get("results", []))
                except json.JSONDecodeError:
                    pass
        elif s == "gitleaks":
            out, success = run_scanner("Gitleaks", ["gitleaks", "detect", "-v", "--no-git"])
            if not success: has_failure = True
            
        elif s == "checkov":
            out, success = run_scanner("Checkov", ["checkov", "-d", git_root, "-o", "json"])
            if not success: has_failure = True
            
        elif s == "trivy":
            out, success = run_scanner("Trivy", ["trivy", "fs", "--format", "json", git_root])
            if not success: has_failure = True
            
        elif s == "osv-scanner":
            out, success = run_scanner("OSV-Scanner", ["osv-scanner", "--json", "-r", git_root])
            if not success: has_failure = True

    # Run Kavach Code-Based API Security Analyzer
    api_findings = []
    print("\n--- Running Kavach Code-Based API Security Analyzer ---")
    source_files = {}
    scan_dir = git_root or "."
    for root, dirs, files in os.walk(scan_dir):
        dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "venv", ".venv", ".next", "__pycache__", "graphify-out", "dist", "build", ".gsd"]]
        for fname in files:
            if any(fname.endswith(ext) for ext in [".ts", ".js", ".py", ".go", ".java"]):
                fpath = os.path.join(root, fname)
                rel = os.path.relpath(fpath, scan_dir).replace("\\", "/")
                # Focus scan on application code
                if any(kw in rel.lower() for kw in ["src/", "routes", "controller", "api", "handler", "service"]):
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                            source_files[rel] = f.read()
                    except Exception:
                        pass
                if len(source_files) >= 50:
                    break
        if len(source_files) >= 50:
            break

    # Try backend API first
    backend_succeeded = False
    try:
        req = urllib.request.Request("http://localhost:8000/api/v1/api-security/code/scan", method="POST")
        req.add_header('Content-Type', 'application/json')
        payload = json.dumps({"files": source_files, "name": os.path.basename(scan_dir)}).encode("utf-8")
        with urllib.request.urlopen(req, data=payload, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            api_findings = data.get("findings", [])
            backend_succeeded = True
    except Exception:
        pass

    # Local engine fallback
    if not backend_succeeded:
        try:
            sys.path.insert(0, os.path.join(scan_dir, "backend"))
            from app.services.code_api_security_engine import code_api_security_engine
            local_res = code_api_security_engine.analyze_codebase(source_files, os.path.basename(scan_dir))
            api_findings = local_res.get("findings", [])
        except Exception as ex:
            print(f"[Notice] Local API security engine fallback: {ex}")

    if api_findings:
        print(f"\nKavach API Security Engine identified {len(api_findings)} OWASP API vulnerabilities:")
        for af in api_findings:
            sev = af.get("severity", "HIGH")
            print(f"[{sev}] {af.get('title')}")
            print(f"  Location: {af.get('file_path')}")
            print(f"  OWASP Category: {af.get('owasp_category')} ({af.get('cwe')})")
            print(f"  Root Cause: {af.get('description', '')[:120]}")
            if af.get("id"):
                print(f"  Remediation: Run 'thing fix --finding-id {af.get('id')}' to apply verified patch\n")

    if has_failure:
        if policy_action == "BLOCK":
            print("\nPOLICY: BLOCK (Scanner execution failed)")
            sys.exit(1)
        else:
            print("\nPOLICY: PASS (Scanner execution failed, but policy allows)")
            sys.exit(0)
    
    print(f"\nScanners found {len(all_findings)} vulnerabilities.")
    for finding in all_findings:
        print(f"- {finding.get('check_id')} in {finding.get('path')}:{finding.get('start', {}).get('line')}")
        
    print("Scan finished.")
    if len(all_findings) > 0 and policy_action == "BLOCK":
        print("POLICY: BLOCK")
        sys.exit(1)
    elif len(all_findings) > 0 and policy_action == "WARN":
        print("POLICY: WARN")
        sys.exit(0)
    else:
        print("POLICY: PASS")
        sys.exit(0)

def hook_install(args):
    git_root = get_git_root()
    if not git_root:
        print("Not a git repository.")
        sys.exit(1)
        
    hook_path = os.path.join(git_root, ".git", "hooks", "pre-commit")
    with open(hook_path, "w") as f:
        f.write("#!/bin/sh\n")
        f.write("python cli/thing.py scan --staged\n")
        f.write("if [ $? -ne 0 ]; then\n")
        f.write("  echo 'Thing Security blocked the commit.'\n")
        f.write("  exit 1\n")
        f.write("fi\n")
        
    if sys.platform != "win32":
        os.chmod(hook_path, 0o755)
    print("Pre-commit hook installed.")
    
    pre_push_path = os.path.join(git_root, ".git", "hooks", "pre-push")
    with open(pre_push_path, "w") as f:
        f.write("#!/bin/sh\n")
        f.write("python cli/thing.py scan\n")
        f.write("if [ $? -ne 0 ]; then\n")
        f.write("  echo 'Thing Security blocked the push.'\n")
        f.write("  exit 1\n")
        f.write("fi\n")
        
    if sys.platform != "win32":
        os.chmod(pre_push_path, 0o755)
    print("Pre-push hook installed.")

def hook_uninstall(args):
    git_root = get_git_root()
    if not git_root:
        sys.exit(1)
        
    hook_path = os.path.join(git_root, ".git", "hooks", "pre-commit")
    if os.path.exists(hook_path):
        os.remove(hook_path)
    
    pre_push_path = os.path.join(git_root, ".git", "hooks", "pre-push")
    if os.path.exists(pre_push_path):
        os.remove(pre_push_path)
        
    print("Hooks uninstalled.")

def daemon(args):
    config = load_config()
    git_root = get_git_root()
    if not git_root or not config.get("bindings", {}).get(git_root):
        print("NOT CONNECTED")
        sys.exit(1)
        
    project_id = config["bindings"][git_root]["project_id"]
    print(f"Starting Thing daemon for project {project_id}...")
    
    while True:
        try:
            ctx = _get(f"{API_URL}/context/{project_id}")
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Polled context. Policy Version: {ctx.get('policy_version')}")
            time.sleep(10)
        except KeyboardInterrupt:
            print("Daemon stopping...")
            break
        except Exception as e:
            print(f"Daemon error: {e}")
            time.sleep(10)

def main():
    parser = argparse.ArgumentParser(prog="thing")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # auth
    auth_parser = subparsers.add_parser("auth")
    auth_subparsers = auth_parser.add_subparsers(dest="auth_command", required=True)
    auth_subparsers.add_parser("login")
    
    # init
    subparsers.add_parser("init")
    subparsers.add_parser("status")
    
    # intent, blueprint, contracts, policy
    subparsers.add_parser("intent")
    subparsers.add_parser("blueprint")
    subparsers.add_parser("contracts")
    subparsers.add_parser("policy")
    subparsers.add_parser("findings")
    
    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("--finding-id", type=str, help="Finding ID to deterministically rescan")
    
    fix_parser = subparsers.add_parser("fix")
    fix_parser.add_argument("--finding-id", type=str, help="Finding ID to apply remediation patch")
    
    subparsers.add_parser("explain")
    
    # scan
    scan_parser = subparsers.add_parser("scan")
    scan_parser.add_argument("--changed", action="store_true")
    scan_parser.add_argument("--staged", action="store_true")
    scan_parser.add_argument("--commit", type=str)
    scan_parser.add_argument("--format", type=str, default="human")
    scan_parser.add_argument("--api", action="store_true", help="Run OWASP API Security code analysis")
    
    # hook
    hook_parser = subparsers.add_parser("hook")
    hook_subparsers = hook_parser.add_subparsers(dest="hook_command", required=True)
    hook_subparsers.add_parser("install")
    hook_subparsers.add_parser("uninstall")

    # daemon
    subparsers.add_parser("daemon")
    
    args = parser.parse_args()
    
    if args.command == "auth" and args.auth_command == "login":
        auth_login(args)
    elif args.command == "init":
        init(args)
    elif args.command == "status":
        status(args)
    elif args.command == "intent":
        intent(args)
    elif args.command == "blueprint":
        blueprint(args)
    elif args.command == "contracts":
        contracts(args)
    elif args.command == "policy":
        policy(args)
    elif args.command == "findings":
        findings(args)
    elif args.command == "verify":
        verify(args)
    elif args.command == "fix":
        fix(args)
    elif args.command == "explain":
        explain(args)
    elif args.command == "scan":
        scan(args)
    elif args.command == "hook":
        if args.hook_command == "install":
            hook_install(args)
        elif args.hook_command == "uninstall":
            hook_uninstall(args)
    elif args.command == "daemon":
        daemon(args)

if __name__ == "__main__":
    main()
