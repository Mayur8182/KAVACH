"""
Step 26 Rate Limit & Abuse Policy Engine.

Enforces authoritative security decisions:
1. Block checks (Temporary blocks with automatic expiration, Permanent blocks)
2. Security challenge checks
3. Policy resolution (Scope hierarchy: Tool > Agent > User > Endpoint > Project > Tenant > Global)
4. Rate limit algorithm execution via RateLimitAlgorithmEngine
5. Dry-run simulation (WOULD_BLOCK, WOULD_THROTTLE, WOULD_CHALLENGE)
6. Traceable audit decision generation with Rule 2 execution_status tracking
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.models.abuse_models import (
    RateLimitPolicy,
    TemporaryBlock,
    PermanentBlock,
    SecurityChallenge,
)
from app.abuse.algorithms import RateLimitAlgorithmEngine, RateLimitResult


@dataclass
class PolicyEvaluationResult:
    decision: str  # ALLOW, THROTTLE, CHALLENGE, BLOCK, WOULD_BLOCK, WOULD_THROTTLE, WOULD_CHALLENGE
    allowed: bool
    policy_id: Optional[str]
    policy_name: Optional[str]
    algorithm_used: str
    tokens_remaining: Optional[float]
    retry_after: int
    execution_status: str  # APPLIED, REQUESTED, FAILED, UNKNOWN
    dry_run: bool
    reason: str
    evidence: Dict[str, Any] = field(default_factory=dict)


class RateLimitPolicyEngine:
    """
    Authoritative policy evaluator for rate limits, active blocks, and security challenges.
    """

    def __init__(self, db: AsyncSession, algo_engine: Optional[RateLimitAlgorithmEngine] = None):
        self.db = db
        self.algo_engine = algo_engine or RateLimitAlgorithmEngine()

    async def evaluate_request(
        self,
        endpoint: str,
        http_method: str = "POST",
        ip_address: str = "127.0.0.1",
        user_id: Optional[str] = None,
        account_identifier: Optional[str] = None,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        tenant_id: Optional[str] = None,
        project_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> PolicyEvaluationResult:
        now = datetime.now(timezone.utc)
        ctx = context or {}

        # 1. CHECK PERMANENT BLOCKS
        perm_block = await self._check_permanent_block(ip_address, user_id, account_identifier, agent_id)
        if perm_block:
            return PolicyEvaluationResult(
                decision="BLOCK",
                allowed=False,
                policy_id=None,
                policy_name="PERMANENT_BLOCK",
                algorithm_used="BLOCKLIST",
                tokens_remaining=0.0,
                retry_after=86400,
                execution_status="APPLIED",
                dry_run=False,
                reason=f"Identity is under an authorized permanent block: {perm_block.reason}",
                evidence={"block_id": str(perm_block.id), "authorized_by": perm_block.authorized_by},
            )

        # 2. CHECK TEMPORARY BLOCKS
        temp_block = await self._check_temporary_block(ip_address, user_id, account_identifier, agent_id, now)
        if temp_block:
            exp = temp_block.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            retry_seconds = max(1, int((exp - now).total_seconds()))
            return PolicyEvaluationResult(
                decision="BLOCK",
                allowed=False,
                policy_id=None,
                policy_name="TEMPORARY_BLOCK",
                algorithm_used="TEMPORARY_BLOCKLIST",
                tokens_remaining=0.0,
                retry_after=retry_seconds,
                execution_status="APPLIED",
                dry_run=False,
                reason=f"Identity is under an active temporary block: {temp_block.reason}",
                evidence={
                    "block_id": str(temp_block.id),
                    "expires_at": exp.isoformat(),
                    "retry_after": retry_seconds,
                },
            )

        # 3. CHECK PENDING SECURITY CHALLENGES
        active_challenge = await self._check_security_challenge(ip_address, user_id, account_identifier, now)
        if active_challenge:
            return PolicyEvaluationResult(
                decision="CHALLENGE",
                allowed=False,
                policy_id=None,
                policy_name="SECURITY_CHALLENGE",
                algorithm_used="STEP_UP_VERIFICATION",
                tokens_remaining=0.0,
                retry_after=60,
                execution_status="APPLIED",
                dry_run=False,
                reason=f"Verification required: {active_challenge.challenge_type} challenge pending.",
                evidence={
                    "challenge_id": str(active_challenge.id),
                    "challenge_type": active_challenge.challenge_type,
                    "attempts": active_challenge.attempts,
                },
            )

        # 4. RESOLVE APPLICABLE RATE LIMIT POLICY
        policy = await self._resolve_policy(
            endpoint=endpoint,
            http_method=http_method,
            user_id=user_id,
            agent_id=agent_id,
            tool_name=tool_name,
            tenant_id=tenant_id,
            project_id=project_id,
        )

        # Build Identity Key for state tracking
        identity_key = self._build_identity_key(
            policy=policy,
            ip_address=ip_address,
            user_id=user_id,
            account_identifier=account_identifier,
            agent_id=agent_id,
            tool_name=tool_name,
            endpoint=endpoint,
        )

        # If no specific policy found, apply default conservative global sliding window
        if not policy:
            algo_res: RateLimitResult = await self.algo_engine.evaluate(
                algorithm="SLIDING_WINDOW",
                identity_key=identity_key,
                limit_count=100,
                window_seconds=60,
                burst=20,
                dry_run=False,
                adaptive_context=ctx,
                fail_behavior="FAIL_OPEN",
            )
            return PolicyEvaluationResult(
                decision=algo_res.action,
                allowed=algo_res.allowed,
                policy_id=None,
                policy_name="DEFAULT_GLOBAL_POLICY",
                algorithm_used=algo_res.algorithm,
                tokens_remaining=algo_res.tokens_remaining,
                retry_after=algo_res.retry_after,
                execution_status=algo_res.execution_status,
                dry_run=False,
                reason=algo_res.reason,
                evidence=algo_res.metadata,
            )

        # 5. EXECUTE POLICY ALGORITHM
        algo_res: RateLimitResult = await self.algo_engine.evaluate(
            algorithm=policy.algorithm,
            identity_key=identity_key,
            limit_count=policy.limit_count,
            window_seconds=policy.window_seconds,
            burst=policy.burst,
            concurrency_limit=policy.concurrency_limit,
            dry_run=policy.dry_run,
            adaptive_context=ctx,
            fail_behavior=policy.fail_behavior,
        )

        final_decision = algo_res.action
        if not algo_res.allowed and not policy.dry_run:
            final_decision = policy.action

        return PolicyEvaluationResult(
            decision=final_decision,
            allowed=algo_res.allowed,
            policy_id=str(policy.id),
            policy_name=policy.name,
            algorithm_used=algo_res.algorithm,
            tokens_remaining=algo_res.tokens_remaining,
            retry_after=algo_res.retry_after,
            execution_status=algo_res.execution_status,
            dry_run=policy.dry_run,
            reason=algo_res.reason,
            evidence={
                "policy_id": str(policy.id),
                "scope": policy.scope,
                "conditions": policy.conditions,
                "algorithm": policy.algorithm,
                "limit_count": policy.limit_count,
                "window_seconds": policy.window_seconds,
                "dry_run": policy.dry_run,
            },
        )

    async def _check_permanent_block(
        self,
        ip: str,
        user_id: Optional[str],
        account: Optional[str],
        agent_id: Optional[str],
    ) -> Optional[PermanentBlock]:
        targets = [ip]
        if user_id:
            targets.append(user_id)
        if account:
            targets.append(account)
        if agent_id:
            targets.append(agent_id)

        stmt = select(PermanentBlock).where(
            and_(
                PermanentBlock.active == True,
                PermanentBlock.target_value.in_(targets),
            )
        ).limit(1)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def _check_temporary_block(
        self,
        ip: str,
        user_id: Optional[str],
        account: Optional[str],
        agent_id: Optional[str],
        now: datetime,
    ) -> Optional[TemporaryBlock]:
        targets = [ip]
        if user_id:
            targets.append(user_id)
        if account:
            targets.append(account)
        if agent_id:
            targets.append(agent_id)

        stmt = select(TemporaryBlock).where(
            and_(
                TemporaryBlock.active == True,
                TemporaryBlock.expires_at > now,
                TemporaryBlock.target_value.in_(targets),
            )
        ).limit(1)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def _check_security_challenge(
        self,
        ip: str,
        user_id: Optional[str],
        account: Optional[str],
        now: datetime,
    ) -> Optional[SecurityChallenge]:
        targets = [ip]
        if user_id:
            targets.append(user_id)
        if account:
            targets.append(account)

        stmt = select(SecurityChallenge).where(
            and_(
                SecurityChallenge.status == "PENDING",
                SecurityChallenge.expires_at > now,
                SecurityChallenge.target_identity.in_(targets),
            )
        ).limit(1)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def _resolve_policy(
        self,
        endpoint: str,
        http_method: str,
        user_id: Optional[str],
        agent_id: Optional[str],
        tool_name: Optional[str],
        tenant_id: Optional[str],
        project_id: Optional[str],
    ) -> Optional[RateLimitPolicy]:
        stmt = (
            select(RateLimitPolicy)
            .where(RateLimitPolicy.enabled == True)
            .order_by(RateLimitPolicy.priority.desc(), RateLimitPolicy.created_at.desc())
        )
        res = await self.db.execute(stmt)
        policies = list(res.scalars().all())

        for p in policies:
            scope = p.scope.upper()
            conds = p.conditions or {}

            if scope == "TOOL" and tool_name:
                if conds.get("tool_name") and conds["tool_name"] != tool_name:
                    continue
                return p
            elif scope == "AGENT" and agent_id:
                if conds.get("agent_id") and conds["agent_id"] != agent_id:
                    continue
                return p
            elif scope == "USER" and user_id:
                if conds.get("user_id") and conds["user_id"] != user_id:
                    continue
                return p
            elif scope == "ENDPOINT":
                target_ep = conds.get("endpoint")
                if target_ep and not endpoint.startswith(target_ep):
                    continue
                target_method = conds.get("http_method")
                if target_method and target_method.upper() != http_method.upper():
                    continue
                return p
            elif scope == "PROJECT" and project_id:
                if p.project_id and str(p.project_id) != str(project_id):
                    continue
                return p
            elif scope == "TENANT" and tenant_id:
                if p.tenant_id and p.tenant_id != tenant_id:
                    continue
                return p
            elif scope == "GLOBAL":
                target_ep = conds.get("endpoint")
                if target_ep and not endpoint.startswith(target_ep):
                    continue
                return p

        return None

    def _build_identity_key(
        self,
        policy: Optional[RateLimitPolicy],
        ip_address: str,
        user_id: Optional[str],
        account_identifier: Optional[str],
        agent_id: Optional[str],
        tool_name: Optional[str],
        endpoint: str,
    ) -> str:
        scope = policy.scope.upper() if policy else "GLOBAL"

        if scope == "TOOL" and tool_name:
            return f"tool:{tool_name}:{agent_id or 'anon'}"
        elif scope == "AGENT" and agent_id:
            return f"agent:{agent_id}"
        elif scope == "USER" and user_id:
            return f"user:{user_id}"
        elif scope == "ACCOUNT" and account_identifier:
            return f"account:{account_identifier}"
        elif scope == "ENDPOINT":
            return f"ep:{endpoint}:{user_id or ip_address}"
        else:
            return f"ip:{ip_address}:{endpoint}"
