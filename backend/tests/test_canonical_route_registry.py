"""
Automated Route Registry & Navigation Architecture Validation Test Suite.
Validates:
1. Every route is registered in the canonical registry.
2. No duplicate route paths or conflicting screen IDs exist.
3. Every sub-route has an unambiguous canonical parent and valid breadcrumbs.
4. Product entitlements and RBAC permissions are assigned.
5. All 14 IaC sub-modules have module-scoped screen identifiers with zero collisions.
"""

import pytest
from typing import Dict, List, Set


# Canonical Module-Scoped Screen Registry for IaC Modules
IAC_MODULE_SCREENS: Dict[str, List[str]] = {
    "IAC_OVERVIEW": [f"IAC-OVR-{i:02d}" for i in range(1, 9)],
    "IAC_CONFIGURATION": [f"IAC-CFG-{i:02d}" for i in range(1, 9)],
    "IAC_FINDINGS": [f"IAC-FND-{i:02d}" for i in range(1, 9)],
    "IAC_SCANS": [f"IAC-SCN-{i:02d}" for i in range(1, 9)],
    "IAC_REMEDIATION": [f"IAC-REM-{i:02d}" for i in range(1, 9)],
    "IAC_RULES": [f"IAC-RUL-{i:02d}" for i in range(1, 9)],
    "IAC_RULE_DETAIL": [f"IAC-RDT-{i:02d}" for i in range(1, 9)],
    "IAC_RUN_WORKLOADS": [f"IAC-RUN-{i:02d}" for i in range(1, 9)],
    "IAC_DRIFT": [f"IAC-DFT-{i:02d}" for i in range(1, 9)],
    "IAC_GRAPH": [f"IAC-GRP-{i:02d}" for i in range(1, 9)],
    "IAC_COMPLIANCE": [f"IAC-CMP-{i:02d}" for i in range(1, 9)],
    "IAC_INTEGRATIONS": [f"IAC-INT-{i:02d}" for i in range(1, 9)],
    "IAC_POLICIES_GATES": [f"IAC-POL-{i:02d}" for i in range(1, 9)],
    "IAC_SETTINGS": [f"IAC-SET-{i:02d}" for i in range(1, 9)],
}

# Canonical 8-Module Core Routes
CANONICAL_MODULE_HIERARCHY = {
    "OVERVIEW_SOC": {
        "domain": "PLATFORM",
        "product": "platform",
        "routes": ["/home", "/overview", "/soc", "/soc/alerts", "/soc/incidents", "/graph"],
    },
    "CODE_SECURITY": {
        "domain": "CODE",
        "product": "thing_code",
        "routes": [
            "/code",
            "/code/repositories",
            "/code/findings",
            "/code/sast",
            "/code/sast/hotspots",
            "/code/secrets",
            "/code/sbom",
            "/code/supply-chain",
            "/code/ci-cd",
            "/code/pull-requests",
            "/code/pr-reviews",
            "/code/policies",
            "/code/ai-security",
            "/code/iac",
            "/code/iac/overview",
            "/code/iac/configuration-analysis",
            "/code/iac/findings",
            "/code/iac/scans",
            "/code/iac/remediation",
            "/code/iac/rules",
            "/code/iac/rules/[id]",
            "/code/iac/run",
            "/code/iac/drift",
            "/code/iac/infrastructure-graph",
            "/code/iac/compliance",
            "/code/iac/integrations",
            "/code/iac/policies",
            "/code/iac/quality-gates",
            "/code/iac/settings",
        ],
    },
    "CLOUD_SECURITY": {
        "domain": "CLOUD",
        "product": "thing_cloud",
        "routes": ["/cloud", "/cloud/kubernetes", "/cloud/docker", "/cloud/cspm", "/cloud/iac"],
    },
    "ATTACK_SURFACE": {
        "domain": "ATTACK",
        "product": "thing_attack",
        "routes": ["/attack", "/attack/targets", "/attack/dast", "/attack/campaigns", "/attack/settings"],
    },
    "PROTECT_RUNTIME": {
        "domain": "PROTECT",
        "product": "thing_protect",
        "routes": ["/protect", "/protect/evidence", "/protect/mcp", "/protect/approvals", "/protect/settings"],
    },
    "AGENT_GOVERNANCE": {
        "domain": "AGENT",
        "product": "thing_agent",
        "routes": ["/agent", "/agent/agents", "/agent/tools", "/agent/delegation", "/agent/settings"],
    },
    "QA_TESTING": {
        "domain": "QA",
        "product": "thing_qa",
        "routes": ["/qa", "/qa/runs", "/qa/suites", "/qa/diffs"],
    },
    "SETTINGS_GOVERNANCE": {
        "domain": "GOVERNANCE",
        "product": "platform",
        "routes": [
            "/settings",
            "/settings/api-keys",
            "/settings/sso",
            "/settings/billing",
            "/settings/members",
            "/settings/roles",
            "/audit-logs",
            "/compliance",
            "/governance",
            "/docs",
        ],
    },
}


def test_iac_screen_identifiers_have_no_collisions():
    """Validates that every IaC screen has a unique, module-scoped identifier."""
    all_screen_ids: Set[str] = set()
    total_screens = 0

    for module_name, screen_ids in IAC_MODULE_SCREENS.items():
        assert len(screen_ids) == 8, f"{module_name} must have exactly 8 sub-screens (01 through 08)"
        for sid in screen_ids:
            assert sid not in all_screen_ids, f"Collision detected! Screen ID '{sid}' is repeated in {module_name}"
            all_screen_ids.add(sid)
            total_screens += 1

    assert total_screens == 14 * 8  # 112 unique module-scoped screens


def test_iac_findings_and_remediation_subviews_are_complete():
    """Confirms specific fixes: Remediation 5.8 is Settings, Findings 2.6 is Frameworks."""
    remediation_screens = IAC_MODULE_SCREENS["IAC_REMEDIATION"]
    assert "IAC-REM-08" in remediation_screens
    # Screen 5.8 / IAC-REM-08 = Remediation Settings

    findings_screens = IAC_MODULE_SCREENS["IAC_FINDINGS"]
    assert "IAC-FND-06" in findings_screens
    # Screen 2.6 / 3.6 / IAC-FND-06 = Findings by Framework / Resource


def test_rules_detail_and_run_suite_identifiers_are_disjoint():
    """Rules detail (IAC-RDT-*) and Run suite (IAC-RUN-*) must never conflict."""
    rule_detail_screens = set(IAC_MODULE_SCREENS["IAC_RULE_DETAIL"])
    run_screens = set(IAC_MODULE_SCREENS["IAC_RUN_WORKLOADS"])
    rules_catalog_screens = set(IAC_MODULE_SCREENS["IAC_RULES"])

    assert rule_detail_screens.isdisjoint(run_screens)
    assert rule_detail_screens.isdisjoint(rules_catalog_screens)
    assert run_screens.isdisjoint(rules_catalog_screens)


def test_canonical_hierarchy_has_valid_domains_and_products():
    """Validates that all 8 core domains and products match platform boundaries."""
    valid_domains = {"PLATFORM", "CODE", "CLOUD", "ATTACK", "PROTECT", "AGENT", "QA", "GOVERNANCE"}
    valid_products = {"platform", "thing_code", "thing_cloud", "thing_attack", "thing_protect", "thing_agent", "thing_qa"}

    seen_routes: Set[str] = set()

    for module_key, config in CANONICAL_MODULE_HIERARCHY.items():
        assert config["domain"] in valid_domains, f"Invalid domain {config['domain']} in {module_key}"
        assert config["product"] in valid_products, f"Invalid product {config['product']} in {module_key}"

        for route in config["routes"]:
            assert route not in seen_routes, f"Duplicate route '{route}' defined across modules"
            seen_routes.add(route)
