"""
E2E HTTP Health Check for Frontend and Backend Routes.
"""
import urllib.request
import urllib.error

ROUTES = [
    ("Frontend Home", "http://localhost:3002/home"),
    ("Frontend CI/CD Control Plane", "http://localhost:3002/code/ci-cd"),
    ("Frontend Findings Workspace", "http://localhost:3002/code/findings"),
    ("Frontend Jobs Workspace", "http://localhost:3002/code/jobs"),
    ("Frontend Pull Requests Detail", "http://localhost:3002/code/pull-requests/123"),
    ("Frontend Dependencies Workspace", "http://localhost:3002/code/dependencies"),
    ("Frontend Secrets Workspace", "http://localhost:3002/code/secrets"),
    ("Frontend SAST Workspace", "http://localhost:3002/code/sast"),
    ("Frontend SBOM Workspace", "http://localhost:3002/code/sbom"),
    ("Frontend Autofix Workspace", "http://localhost:3002/code/autofix"),
]

def check_route(name, url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            content_type = resp.headers.get("Content-Type", "")
            print(f"[SUCCESS 200] {name:35} -> {status} ({content_type.split(';')[0]})")
            return True
    except urllib.error.HTTPError as e:
        print(f"[FAIL {e.code}] {name:35} -> HTTP {e.code}: {e.reason}")
        return False
    except Exception as e:
        print(f"[ERROR]      {name:35} -> {type(e).__name__}: {str(e)}")
        return False

def main():
    print("=================================================================")
    print("CHECKING ALL MAJOR THING CODE FRONTEND ROUTES ON PORT 3002")
    print("=================================================================")
    results = [check_route(name, url) for name, url in ROUTES]
    success_count = sum(1 for r in results if r)
    print("=================================================================")
    print(f"RESULTS: {success_count}/{len(ROUTES)} routes responded with HTTP 200 OK")
    print("=================================================================")

if __name__ == "__main__":
    main()
