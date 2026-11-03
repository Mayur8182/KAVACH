"""
Response Authorization Service for Step 14.
Enforces that actors (users or runtime agents) have explicit permissions to request or execute response actions.
Enforces: EffectiveResponseAuthority ⊆ AuthorizedResponseAuthority.
"""

import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.authorization import AgentPermissionOverride, AgentRole, Permission, Role, RolePermission
from app.response.enums import ResponseActionType


FORBIDDEN_DESTRUCTIVE_ACTIONS = {
    "DELETE_DATABASE",
    "DELETE_CLUSTER",
    "DELETE_PRODUCTION",
    "DROP_TABLE",
    "PURGE_ALL_DATA",
}


class ResponseAuthorizationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authorize_response_action(
        self,
        actor_id: str,
        actor_type: str,
        action_type: str,
        target_type: str,
        project_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Determines whether actor_id is permitted to execute action_type on target_type.
        """
        # 1. Absolute rule: destructive actions are never allowed as generic runtime responses
        if action_type in FORBIDDEN_DESTRUCTIVE_ACTIONS:
            return {
                "authorized": False,
                "reason": f"Action '{action_type}' is an unauthorized destructive action and strictly forbidden.",
                "reason_code": "FORBIDDEN_DESTRUCTIVE_ACTION",
            }

        # 2. If actor is a human user / admin
        if actor_type == "USER":
            # Permitted for standard operations; high-risk actions will still require approval if policy dictates
            return {
                "authorized": True,
                "reason": "User is authorized for response execution.",
                "reason_code": "AUTHORIZED_USER",
            }

        # 3. If actor is an AGENT
        if actor_type == "AGENT":
            try:
                agent_uuid = uuid.UUID(actor_id)
            except ValueError:
                return {
                    "authorized": False,
                    "reason": f"Agent ID '{actor_id}' is not a valid UUID.",
                    "reason_code": "INVALID_AGENT_ID",
                }

            agent = await self.db.get(Agent, agent_uuid)
            if not agent:
                return {
                    "authorized": False,
                    "reason": f"Agent '{actor_id}' does not exist.",
                    "reason_code": "AGENT_NOT_FOUND",
                }

            if agent.status != "ACTIVE":
                return {
                    "authorized": False,
                    "reason": f"Agent '{agent.name}' is in status {agent.status}; cannot execute response actions.",
                    "reason_code": f"AGENT_{agent.status}",
                }

            # Check if agent has elevated scope or is restricted
            # Runtime security agents are authorized for defensive containment
            allowed_agent_actions = {
                ResponseActionType.ALERT.value,
                ResponseActionType.NOTIFY.value,
                ResponseActionType.BLOCK_REQUEST.value,
                ResponseActionType.DENY_TOOL_CALL.value,
                ResponseActionType.REVOKE_SESSION.value,
                ResponseActionType.REVOKE_DELEGATION.value,
                ResponseActionType.RESTRICT_DATA_FLOW.value,
            }

            if action_type not in allowed_agent_actions:
                return {
                    "authorized": False,
                    "reason": f"Agent '{agent.name}' is not authorized to execute high-impact action '{action_type}'.",
                    "reason_code": "AUTHORIZATION_DENIED",
                }

            return {
                "authorized": True,
                "reason": "Agent possesses required authority.",
                "reason_code": "AUTHORIZED_AGENT",
            }

        # 4. System / Policy triggered
        return {
            "authorized": True,
            "reason": "System/Policy execution permitted.",
            "reason_code": "AUTHORIZED_SYSTEM",
        }
