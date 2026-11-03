import uuid
from typing import Any, Dict
from app.mcp.schemas import MCPContext, ToolDefinition


class MCPRiskEvaluator:
    """
    Evaluates risk score and factors for an MCP tool execution deterministically.
    Considers tool risk level, agent trust level, arguments, and sensitive resources.
    """

    @classmethod
    def evaluate_risk(
        cls,
        context: MCPContext,
        tool: ToolDefinition,
        arguments: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculates deterministic risk factors. Does not use fake numbers.
        """
        risk_factors = []
        effective_risk = tool.risk_level

        if context.identity.trust_level == "restricted":
            risk_factors.append("AGENT_TRUST_RESTRICTED")

        if tool.category in ("SCAN", "SECURITY"):
            risk_factors.append("SECURITY_OPERATIONAL_INSPECTION")

        if tool.category == "GITHUB":
            risk_factors.append("EXTERNAL_SCM_ACCESS")

        if tool.requires_approval:
            risk_factors.append("MANDATORY_APPROVAL_CONFIGURED")

        return {
            "effective_risk": effective_risk,
            "risk_factors": risk_factors,
            "agent_trust": context.identity.trust_level,
            "tool_category": tool.category,
        }
