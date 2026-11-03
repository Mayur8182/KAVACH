from typing import Any, Dict, List

CANONICAL_ROLES: List[Dict[str, Any]] = [
    {
        "name": "SecurityReviewer",
        "description": "Read-only access to security blueprints, findings, scan results, and policies",
        "is_system": True,
        "permissions": [
            "PROJECT_READ",
            "PROJECT_METADATA_READ",
            "BLUEPRINT_READ",
            "REQUIREMENT_READ",
            "SCAN_READ",
            "FINDING_READ",
            "POLICY_READ",
            "GITHUB_READ",
            "MCP_TOOL_DISCOVER",
        ],
    },
    {
        "name": "SecurityOperator",
        "description": "Full operational security scanner execution, policy evaluation, and PR verification",
        "is_system": True,
        "permissions": [
            "PROJECT_READ",
            "PROJECT_METADATA_READ",
            "BLUEPRINT_READ",
            "REQUIREMENT_READ",
            "SCAN_READ",
            "SCAN_EXECUTE",
            "FINDING_READ",
            "POLICY_READ",
            "POLICY_EVALUATE",
            "GITHUB_READ",
            "GITHUB_SCAN",
            "MCP_TOOL_DISCOVER",
            "MCP_TOOL_EXECUTE",
        ],
    },
    {
        "name": "CodingAssistant",
        "description": "Standard coding assistant permissions for IDE agents (Cursor, Antigravity, Copilot)",
        "is_system": True,
        "permissions": [
            "PROJECT_READ",
            "PROJECT_METADATA_READ",
            "BLUEPRINT_READ",
            "REQUIREMENT_READ",
            "SCAN_READ",
            "SCAN_EXECUTE",
            "FINDING_READ",
            "GITHUB_READ",
            "MCP_TOOL_DISCOVER",
            "MCP_TOOL_EXECUTE",
        ],
    },
    {
        "name": "AutomationAgent",
        "description": "Restricted automation agent for automated CI scanning and report generation",
        "is_system": True,
        "permissions": [
            "PROJECT_READ",
            "SCAN_READ",
            "SCAN_EXECUTE",
            "MCP_TOOL_DISCOVER",
            "MCP_TOOL_EXECUTE",
        ],
    },
]


def get_canonical_roles() -> List[Dict[str, Any]]:
    return CANONICAL_ROLES
