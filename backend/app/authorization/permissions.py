from typing import Any, Dict, List

# Canonical Permission Catalog
CANONICAL_PERMISSIONS: List[Dict[str, Any]] = [
    # Project Scope
    {
        "name": "PROJECT_READ",
        "description": "Read project metadata, configuration, and status",
        "resource_type": "PROJECT",
        "action": "READ",
        "risk_level": "LOW",
    },
    {
        "name": "PROJECT_METADATA_READ",
        "description": "Read repository and intent metadata for project",
        "resource_type": "PROJECT",
        "action": "READ",
        "risk_level": "LOW",
    },
    # Blueprint Scope
    {
        "name": "BLUEPRINT_READ",
        "description": "Read active security blueprints and compliance requirements",
        "resource_type": "BLUEPRINT",
        "action": "READ",
        "risk_level": "LOW",
    },
    {
        "name": "REQUIREMENT_READ",
        "description": "Read individual security requirement specifications",
        "resource_type": "BLUEPRINT",
        "action": "READ",
        "risk_level": "LOW",
    },
    # Scan Scope
    {
        "name": "SCAN_READ",
        "description": "Read security scan summaries and execution progress",
        "resource_type": "SCAN",
        "action": "READ",
        "risk_level": "LOW",
    },
    {
        "name": "SCAN_EXECUTE",
        "description": "Trigger security verification tools and scanner executions",
        "resource_type": "SCAN",
        "action": "EXECUTE",
        "risk_level": "MEDIUM",
    },
    {
        "name": "FINDING_READ",
        "description": "Read identified security vulnerabilities and normalized findings",
        "resource_type": "FINDING",
        "action": "READ",
        "risk_level": "LOW",
    },
    # Policy Scope
    {
        "name": "POLICY_READ",
        "description": "Read active security policies and versioned rules",
        "resource_type": "POLICY",
        "action": "READ",
        "risk_level": "LOW",
    },
    {
        "name": "POLICY_EVALUATE",
        "description": "Query policy engine to simulate or evaluate operation decisions",
        "resource_type": "POLICY",
        "action": "EVALUATE",
        "risk_level": "MEDIUM",
    },
    # GitHub Scope
    {
        "name": "GITHUB_READ",
        "description": "Read connected GitHub repository metadata and pull request checks",
        "resource_type": "GITHUB",
        "action": "READ",
        "risk_level": "LOW",
    },
    {
        "name": "GITHUB_SCAN",
        "description": "Trigger security verification on specific pull requests or commits",
        "resource_type": "GITHUB",
        "action": "EXECUTE",
        "risk_level": "MEDIUM",
    },
    # MCP Scope
    {
        "name": "MCP_TOOL_DISCOVER",
        "description": "List registered MCP tools and JSON schemas",
        "resource_type": "MCP_TOOL",
        "action": "DISCOVER",
        "risk_level": "LOW",
    },
    {
        "name": "MCP_TOOL_EXECUTE",
        "description": "Execute registered MCP tools within authorization boundaries",
        "resource_type": "MCP_TOOL",
        "action": "EXECUTE",
        "risk_level": "MEDIUM",
    },
]

# Dangerous permissions - Defined but never assigned to ordinary agents
DANGEROUS_PERMISSIONS: List[Dict[str, Any]] = [
    {
        "name": "SECRET_READ",
        "description": "Access plaintext secret values or credentials",
        "resource_type": "SECRET",
        "action": "READ",
        "risk_level": "CRITICAL",
    },
    {
        "name": "DATABASE_WRITE",
        "description": "Execute write or migration statements on live databases",
        "resource_type": "DATABASE",
        "action": "WRITE",
        "risk_level": "HIGH",
    },
    {
        "name": "DATABASE_DELETE",
        "description": "Drop tables or execute destructive database operations",
        "resource_type": "DATABASE",
        "action": "DELETE",
        "risk_level": "CRITICAL",
    },
    {
        "name": "CLOUD_RESOURCE_WRITE",
        "description": "Provision or modify cloud infrastructure resources",
        "resource_type": "CLOUD",
        "action": "WRITE",
        "risk_level": "HIGH",
    },
    {
        "name": "CLOUD_RESOURCE_DELETE",
        "description": "Terminate cloud servers or delete object storage buckets",
        "resource_type": "CLOUD",
        "action": "DELETE",
        "risk_level": "CRITICAL",
    },
    {
        "name": "KUBERNETES_WRITE",
        "description": "Apply or update Kubernetes deployment manifests",
        "resource_type": "KUBERNETES",
        "action": "WRITE",
        "risk_level": "HIGH",
    },
    {
        "name": "PRODUCTION_DEPLOY",
        "description": "Promote or deploy code changes directly to production",
        "resource_type": "DEPLOYMENT",
        "action": "EXECUTE",
        "risk_level": "CRITICAL",
    },
    {
        "name": "PRODUCTION_DELETE",
        "description": "Decommission production environments or tear down clusters",
        "resource_type": "DEPLOYMENT",
        "action": "DELETE",
        "risk_level": "CRITICAL",
    },
    {
        "name": "IAM_WRITE",
        "description": "Create or grant cloud/identity roles and policies",
        "resource_type": "IAM",
        "action": "WRITE",
        "risk_level": "CRITICAL",
    },
    {
        "name": "CREDENTIAL_ROTATE",
        "description": "Rotate agent authentication keys and root secrets",
        "resource_type": "CREDENTIAL",
        "action": "MANAGE",
        "risk_level": "HIGH",
    },
]


def get_all_permission_definitions() -> List[Dict[str, Any]]:
    return CANONICAL_PERMISSIONS + DANGEROUS_PERMISSIONS
