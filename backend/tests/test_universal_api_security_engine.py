"""
Kavach Enterprise API Security — Verification Test Suite
=========================================================
Tests:
1. Universal Multi-Language Route Discovery (Python, JS/TS, Go, Rust, C#, Mobile SDKs)
2. Canonical Endpoint Normalization & Lifecycle Categorization (Documented, Undocumented, Shadow, Zombie)
3. Inventory Drift & Change Detection
4. Multi-Identity Matrix Authorization & BOLA Evaluation (ID swapping, reproducible curl)
5. Isolated Remediation Verifier (Framework-aware patch synthesis & empirical verification)
"""

import pytest
from app.services.universal_api_discovery_engine import universal_discovery_engine, DiscoveredEndpoint
from app.services.multi_identity_authz_engine import multi_identity_authz_engine
from app.services.api_remediation_verifier import api_remediation_verifier


def test_universal_multi_language_discovery():
    """Verifies that universal discovery engine parses routes across multiple programming languages."""
    mock_files = {
        # Python FastAPI & Flask
        "services/users.py": """
@router.get("/api/v1/users/{id}")
async def get_user(id: str, current_user = Depends(get_current_user)):
    return {"id": id}

@app.route("/api/v1/legacy/export", methods=["POST"])
def export():
    pass
""",
        # Python Django urls.py
        "app/urls.py": """
urlpatterns = [
    path("api/v1/django/orders/<int:order_id>", OrderView.as_view()),
]
""",
        # JS / Express & Fastify
        "routes/auth.js": """
router.post('/api/v1/auth/login', authenticate, (req, res) => {
    res.json({ token: "xyz" });
});
fastify.get('/api/v1/fastify/health', (req, reply) => {});
""",
        # TypeScript Next.js route
        "frontend/app/api/profile/route.ts": """
export async function GET(request: Request) {
    return Response.json({ name: "Alice" });
}
""",
        # Go Gin
        "server/main.go": """
func main() {
    r := gin.Default()
    r.GET("/api/v1/go/metrics", authMiddleware(), MetricsHandler)
}
""",
        # Rust Axum
        "src/routes.rs": """
pub fn app() -> Router {
    Router::new()
        .route("/api/v1/rust/telemetry", get(telemetry_handler))
}
""",
        # C# ASP.NET Core
        "Controllers/ApiController.cs": """
[Route("api/[controller]")]
public class ApiController : ControllerBase {
    [HttpGet("{id}")]
    public IActionResult GetById(string id) => Ok();
}
""",
        # Mobile Swift URLSession
        "ios/NetworkClient.swift": """
let task = URLSession.shared.dataTask(with: URL(string: "https://api.corp.internal/api/v1/mobile/sync")!)
""",
        # Mobile Android Retrofit
        "android/ApiService.kt": """
interface ApiService {
    @GET("/api/v1/android/profile")
    fun getProfile(): Call<ProfileResponse>
}
""",
        # Flutter Dart Dio
        "mobile/lib/api.dart": """
final res = await dio.get("/api/v1/flutter/feed");
""",
    }

    discovered = universal_discovery_engine.discover_from_workspace(mock_files)
    assert len(discovered) >= 10, f"Expected at least 10 discovered routes across languages, got {len(discovered)}"

    paths = {e.path for e in discovered}
    assert "/api/v1/users/{id}" in paths
    assert "/api/v1/django/orders/{order_id}" in paths or any("orders" in p for p in paths)
    assert "/api/v1/auth/login" in paths
    assert "/api/profile" in paths
    assert "/api/v1/go/metrics" in paths
    assert "/api/v1/rust/telemetry" in paths
    assert any("mobile/sync" in p for p in paths)
    assert any("android/profile" in p for p in paths)
    assert any("flutter/feed" in p for p in paths)

    # Check sources and languages
    all_sources = set()
    all_langs = set()
    for e in discovered:
        all_sources.update(e.discovery_sources)
        all_langs.update(e.source_languages)

    assert "Source Code (AST)" in all_sources
    assert "Mobile Client SDK" in all_sources
    assert any("Python" in l for l in all_langs)
    assert any("Node.js" in l or "TypeScript" in l for l in all_langs)
    assert any("Go" in l for l in all_langs)
    assert any("Rust" in l for l in all_langs)
    assert any("Swift" in l for l in all_langs)


def test_endpoint_normalization_and_shadow_api_tagging():
    """Verifies that endpoints discovered only in runtime or client are flagged as SHADOW APIs."""
    code_endpoints = [
        DiscoveredEndpoint(method="GET", path="/api/v1/users/{id}", discovery_sources={"Source Code (AST)"}),
        DiscoveredEndpoint(method="POST", path="/api/v1/auth/login", discovery_sources={"Source Code (AST)"}),
    ]
    spec_endpoints = [
        {"method": "GET", "path": "/api/v1/users/{id}", "category": "Users"},
    ]
    runtime_endpoints = [
        {"method": "GET", "path": "/api/v1/users/{id}", "request_count": 500},
        {"method": "GET", "path": "/api/v1/shadow/internal-debug", "request_count": 12},  # Present in runtime, not in code or spec
    ]

    normalized = universal_discovery_engine.normalize_endpoints(
        endpoints=code_endpoints,
        spec_endpoints=spec_endpoints,
        runtime_endpoints=runtime_endpoints,
    )

    norm_map = {f"{e.method} {e.path}": e for e in normalized}

    # /api/v1/users/{id} is Documented + Code + Runtime
    user_ep = norm_map["GET /api/v1/users/{id}"]
    assert "OpenAPI Specification" in user_ep.discovery_sources
    assert "Source Code (AST)" in user_ep.discovery_sources
    assert "Runtime Traffic" in user_ep.discovery_sources
    assert user_ep.is_shadow is False

    # /api/v1/auth/login is Undocumented (in code, not in spec)
    login_ep = norm_map["POST /api/v1/auth/login"]
    assert login_ep.is_undocumented is True
    assert login_ep.is_shadow is False

    # /api/v1/shadow/internal-debug is a true Shadow API
    shadow_ep = norm_map["GET /api/v1/shadow/internal-debug"]
    assert shadow_ep.is_shadow is True
    assert shadow_ep.risk_level == "CRITICAL"


def test_inventory_drift_computation():
    """Verifies drift detection between previous and current scan inventory."""
    prev = [
        {"method": "GET", "path": "/api/v1/users", "auth_required": False},
        {"method": "DELETE", "path": "/api/v1/obsolete-endpoint", "auth_required": True},
    ]
    curr = [
        DiscoveredEndpoint(method="GET", path="/api/v1/users", auth_required=True),  # Modified: auth changed
        DiscoveredEndpoint(method="POST", path="/api/v1/new-feature", auth_required=True),  # Added
    ]

    drift = universal_discovery_engine.compute_inventory_drift(prev, curr)
    assert drift["has_drift"] is True
    assert drift["added_count"] == 1
    assert drift["removed_count"] == 1
    assert drift["modified_count"] == 1

    added_paths = [e["path"] for e in drift["added_endpoints"]]
    removed_paths = [e["path"] for e in drift["removed_endpoints"]]
    assert "/api/v1/new-feature" in added_paths
    assert "/api/v1/obsolete-endpoint" in removed_paths


def test_multi_identity_authz_matrix_and_bola_evaluation():
    """Verifies multi-identity authorization matrix and deterministic BOLA evaluation."""
    ep_path = "/api/v1/accounts/{id}"
    matrix = multi_identity_authz_engine.generate_authz_matrix(ep_path, "GET")
    assert len(matrix) >= 2

    bola_test = next((t for t in matrix if t["test_type"] == "BOLA_ID_SWAP"), None)
    assert bola_test is not None
    assert bola_test["victim_identity"].tenant_id != bola_test["attacker_identity"].tenant_id
    assert "rec_tenant_a_0042" in bola_test["path"]

    # Evaluate contract without tenant scoping
    insecure_code = """
    @router.get("/api/v1/accounts/{id}")
    async def get_account(id: str, db: AsyncSession = Depends(get_db)):
        return await db.get(Account, id)
    """
    eval_insecure = multi_identity_authz_engine.evaluate_contract_bola(ep_path, "GET", insecure_code)
    assert eval_insecure["vulnerable"] is True
    assert eval_insecure["cwe"] == "CWE-639"
    assert "curl" in eval_insecure["evidence"]["reproduction_curl"]

    # Evaluate contract with tenant scoping
    secure_code = """
    @router.get("/api/v1/accounts/{id}")
    async def get_account(id: str, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        return await db.execute(select(Account).where(Account.id == id, Account.tenant_id == current_user.tenant_id))
    """
    eval_secure = multi_identity_authz_engine.evaluate_contract_bola(ep_path, "GET", secure_code)
    assert eval_secure["vulnerable"] is False


def test_remediation_synthesis_and_verification():
    """Verifies grounded patch synthesis and independent fix verification."""
    finding = {
        "title": "Broken Object Level Authorization (BOLA)",
        "category": "Authorization Testing",
        "cwe": "CWE-639",
        "affected_endpoints": ["/api/v1/orders/{id}"],
    }

    # 1. Synthesize patch
    rem = api_remediation_verifier.synthesize_remediation(finding, framework="express", code_file_path="src/orders.ts")
    assert "tenant_id" in rem["patch"]
    assert "--- a/src/orders.ts" in rem["patch"]

    # 2. Verify with compliant patch
    verification_good = api_remediation_verifier.verify_remediation(finding, rem["patch"])
    assert verification_good["verified"] is True
    assert verification_good["status"] == "VERIFIED_FIXED"

    # 3. Verify with inadequate patch (no tenant check)
    inadequate_patch = """
    --- a/src/orders.ts
    +++ b/src/orders.ts
    @@ -10,2 +10,2 @@
    -  console.log("old");
    +  console.log("new");
    """
    verification_bad = api_remediation_verifier.verify_remediation(finding, inadequate_patch)
    assert verification_bad["verified"] is False
    assert verification_bad["status"] == "OPEN"

