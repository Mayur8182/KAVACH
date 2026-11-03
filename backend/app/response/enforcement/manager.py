"""
Runtime Enforcement Rules Manager.
Maintains short-lived enforcement rules in PostgreSQL with automatic expiration.
Platform gateways (e.g. MCP Gateway) consult this manager to enforce active blocks.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.response.models import RuntimeEnforcementRule


class EnforcementRuleManager:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_rule(
        self,
        project_id: uuid.UUID,
        target_type: str,
        target_id: str,
    ) -> Optional[RuntimeEnforcementRule]:
        now = datetime.now(timezone.utc)
        stmt = select(RuntimeEnforcementRule).where(
            RuntimeEnforcementRule.project_id == project_id,
            RuntimeEnforcementRule.target_type == target_type,
            RuntimeEnforcementRule.target_id == target_id,
            RuntimeEnforcementRule.status == "ACTIVE",
            RuntimeEnforcementRule.expires_at > now,
        )
        return (await self.db.execute(stmt)).scalars().first()

    async def list_active_rules(
        self,
        project_id: uuid.UUID,
    ) -> List[RuntimeEnforcementRule]:
        now = datetime.now(timezone.utc)
        stmt = select(RuntimeEnforcementRule).where(
            RuntimeEnforcementRule.project_id == project_id,
            RuntimeEnforcementRule.status == "ACTIVE",
            RuntimeEnforcementRule.expires_at > now,
        ).order_by(RuntimeEnforcementRule.created_at.desc())
        return list((await self.db.execute(stmt)).scalars().all())

    async def revoke_rule(
        self,
        rule_id: uuid.UUID,
        reason: str = "Revoked by authorized operator",
    ) -> Optional[RuntimeEnforcementRule]:
        rule = await self.db.get(RuntimeEnforcementRule, rule_id)
        if not rule:
            return None
        rule.status = "REVOKED"
        rule.reason = f"{rule.reason} | REVOKED: {reason}"
        await self.db.commit()
        await self.db.refresh(rule)
        return rule
