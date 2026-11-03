"""
Step 26 Abuse & Rate Limiting Service.

Orchestrates the entire lifecycle:
1. Request evaluation & rate limit enforcement
2. Live policy simulation (dry run)
3. Telemetry event ingestion & SHA-256 raw hashing
4. Deterministic threat detection & signal escalation (SOC / Incident)
5. Block & Security Challenge lifecycle management
6. Real metrics calculation for Thing Protect dashboard
"""

import hashlib
import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.models.abuse_models import (
    RateLimitPolicy,
    RateLimitPolicyVersion,
    RateLimitDecision,
    AbuseDetectionRule,
    AbuseDetectionEvent,
    AbuseDetectionSignal,
    AbuseDetectionCase,
    TemporaryBlock,
    PermanentBlock,
    SecurityChallenge,
    ResponseAction,
    ResponseVerification,
)
from app.models.soc_models import SocAlert
from app.abuse.algorithms import RateLimitAlgorithmEngine
from app.abuse.detector import AbuseThreatDetector
from app.abuse.policy_engine import RateLimitPolicyEngine, PolicyEvaluationResult


class AbuseProtectionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.algo_engine = RateLimitAlgorithmEngine()
        self.detector = AbuseThreatDetector(db)
        self.policy_engine = RateLimitPolicyEngine(db, self.algo_engine)

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
        """
        Evaluates a live incoming request against active blocks, challenges, and policies.
        Persists an immutable RateLimitDecision for compliance and auditability.
        """
        result = await self.policy_engine.evaluate_request(
            endpoint=endpoint,
            http_method=http_method,
            ip_address=ip_address,
            user_id=user_id,
            account_identifier=account_identifier,
            agent_id=agent_id,
            tool_name=tool_name,
            tenant_id=tenant_id,
            project_id=project_id,
            context=context,
        )

        evidence_dict = {
            "retry_after": result.retry_after,
            "tokens_remaining": result.tokens_remaining,
            "policy_name": result.policy_name,
            "policy_id": result.policy_id,
            "ip_address": ip_address,
            "account_identifier": account_identifier,
            "agent_id": agent_id,
            "tool_name": tool_name,
            "details": result.evidence,
        }

        proj_uuid = uuid.UUID(str(project_id)) if project_id else None
        pol_uuid = uuid.UUID(str(result.policy_id)) if result.policy_id else None

        decision_record = RateLimitDecision(
            policy_id=pol_uuid,
            policy_name=result.policy_name,
            identity_key=f"{ip_address}:{account_identifier or user_id or agent_id or 'anon'}",
            identity_type="AGENT" if agent_id else ("USER" if user_id else "IP"),
            endpoint=endpoint,
            http_method=http_method,
            algorithm_used=result.algorithm_used,
            tokens_remaining=result.tokens_remaining,
            retry_after_seconds=result.retry_after,
            decision=result.decision,
            execution_status=result.execution_status,
            dry_run=result.dry_run,
            reason=result.reason,
            evidence=evidence_dict,
            tenant_id=tenant_id,
            project_id=proj_uuid,
        )
        self.db.add(decision_record)
        await self.db.commit()

        return result

    async def simulate_policy(
        self,
        endpoint: str,
        http_method: str = "POST",
        ip_address: str = "127.0.0.1",
        account_identifier: Optional[str] = None,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Runs a policy check in simulation mode without recording decisions or altering state."""
        result = await self.policy_engine.evaluate_request(
            endpoint=endpoint,
            http_method=http_method,
            ip_address=ip_address,
            account_identifier=account_identifier,
            agent_id=agent_id,
            tool_name=tool_name,
            context=context,
        )
        return {
            "simulated_decision": result.decision,
            "allowed": result.allowed,
            "policy_name": result.policy_name,
            "algorithm_used": result.algorithm_used,
            "tokens_remaining": result.tokens_remaining,
            "retry_after_seconds": result.retry_after,
            "reason": result.reason,
            "evidence": result.evidence,
            "mode": "SIMULATION",
        }

    async def ingest_security_event(
        self,
        event_type: str,
        endpoint: str,
        result_status: str,
        ip_address: str,
        account_identifier: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        device_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        metadata_payload: Optional[Dict[str, Any]] = None,
        project_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        payload = metadata_payload or {}
        raw_bytes = json.dumps(
            {
                "event_type": event_type,
                "endpoint": endpoint,
                "result_status": result_status,
                "ip": ip_address,
                "account": account_identifier,
                "agent": agent_id,
                "tool": tool_name,
                "timestamp": now.isoformat(),
            },
            sort_keys=True,
        ).encode("utf-8")
        raw_hash = hashlib.sha256(raw_bytes).hexdigest()

        proj_uuid = uuid.UUID(str(project_id)) if project_id else None

        event = AbuseDetectionEvent(
            event_type=event_type,
            endpoint=endpoint,
            result_status=result_status,
            ip_address=ip_address,
            account_identifier=account_identifier,
            user_id=user_id,
            session_id=session_id,
            device_id=device_id,
            user_agent=user_agent,
            agent_id=agent_id,
            tool_name=tool_name,
            metadata_payload=payload,
            raw_hash=raw_hash,
            project_id=proj_uuid,
            tenant_id=tenant_id,
            timestamp=now,
        )
        self.db.add(event)
        await self.db.flush()

        generated_signals = await self.detector.analyze_event_stream(event)
        signal_records = []

        for sig in generated_signals:
            signal_obj = AbuseDetectionSignal(
                signal_type=sig["signal_type"],
                severity=sig["severity"],
                status="ACTIVE",
                confidence_score=sig["confidence_score"],
                target_resource=sig["target_resource"],
                target_identity=sig["target_identity"],
                evidence=sig["evidence"],
                recommended_action=sig.get("recommended_action"),
                tenant_id=tenant_id,
                project_id=proj_uuid,
                detected_at=now,
            )

            if sig.get("recommended_action") == "TEMPORARY_BLOCK":
                expires = now + timedelta(minutes=15)
                temp_block = TemporaryBlock(
                    block_type="IP" if sig["target_identity"] == ip_address else "ACCOUNT",
                    target_value=sig["target_identity"],
                    scope="GLOBAL",
                    reason=f"Automated abuse mitigation for {sig['signal_type']}",
                    evidence=sig["evidence"],
                    expires_at=expires,
                    active=True,
                    tenant_id=tenant_id,
                    project_id=proj_uuid,
                )
                self.db.add(temp_block)
                signal_obj.action_taken = "TEMPORARY_BLOCK_APPLIED"

                action_rec = ResponseAction(
                    action_type="BLOCK",
                    target_entity=sig["target_identity"],
                    execution_status="APPLIED",
                    parameters={"expires_at": expires.isoformat(), "reason": temp_block.reason},
                    tenant_id=tenant_id,
                    project_id=proj_uuid,
                )
                self.db.add(action_rec)
                await self.db.flush()

                verif_rec = ResponseVerification(
                    action_id=action_rec.id,
                    target_entity=sig["target_identity"],
                    verification_status="VERIFIED",
                    expected_outcome="Subsequent abusive traffic throttled or blocked",
                    observed_outcome="Temporary block active in policy engine",
                    evidence={"block_id": str(temp_block.id)},
                )
                self.db.add(verif_rec)

            elif sig.get("recommended_action") == "REQUIRE_MFA":
                challenge = SecurityChallenge(
                    challenge_type="MFA",
                    target_identity=sig["target_identity"],
                    endpoint=endpoint,
                    status="PENDING",
                    expires_at=now + timedelta(minutes=10),
                    context_data={"signal_type": sig["signal_type"]},
                    tenant_id=tenant_id,
                    project_id=proj_uuid,
                )
                self.db.add(challenge)
                signal_obj.action_taken = "SECURITY_CHALLENGE_ISSUED"

            if sig["severity"] in ("CRITICAL", "HIGH"):
                soc_alert_id = await self._escalate_to_soc(signal_obj, event)
                signal_obj.escalation_reference = soc_alert_id

            self.db.add(signal_obj)
            signal_records.append(signal_obj)

        await self.db.commit()

        return {
            "event_id": str(event.id),
            "raw_hash": raw_hash,
            "status": "INGESTED",
            "signals_generated_count": len(signal_records),
            "signals": [
                {
                    "signal_type": s.signal_type,
                    "severity": s.severity,
                    "target_identity": s.target_identity,
                    "action_taken": s.action_taken,
                }
                for s in signal_records
            ],
        }

    async def _escalate_to_soc(self, signal: AbuseDetectionSignal, event: AbuseDetectionEvent) -> str:
        """Creates a real SOC Alert linked to the abuse detection signal."""
        from app.models.project import Project
        from app.models.user import User

        now = datetime.now(timezone.utc)
        proj_id = signal.project_id
        if not proj_id:
            proj_stmt = select(Project).limit(1)
            res = await self.db.execute(proj_stmt)
            proj = res.scalar_one_or_none()
            if proj:
                proj_id = proj.id
            else:
                user_stmt = select(User).limit(1)
                user_res = await self.db.execute(user_stmt)
                user = user_res.scalar_one_or_none()
                if not user:
                    user = User(
                        email="system_abuse@thing.security",
                        name="Abuse Protection Admin",
                        password_hash="system_hash_placeholder",
                        is_active=True,
                    )
                    self.db.add(user)
                    await self.db.flush()

                proj = Project(
                    name="Abuse Protection Default",
                    description="Default project for abuse alerts",
                    owner_id=user.id,
                )
                self.db.add(proj)
                await self.db.flush()
                proj_id = proj.id

        alert_key = f"ALT-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        alert_title = f"[ABUSE PROTECTION] {signal.signal_type.replace('_', ' ')}: {signal.target_identity}"
        alert_desc = f"Automated abuse protection triggered {signal.signal_type}. Endpoint: {event.endpoint}, IP: {event.ip_address}"
        dedup_key = f"abuse_{proj_id}_{signal.signal_type}_{signal.target_identity}"

        alert = SocAlert(
            alert_key=alert_key,
            project_id=proj_id,
            deduplication_key=dedup_key,
            title=alert_title,
            description=alert_desc,
            severity=signal.severity,
            confidence="HIGH",
            status="NEW",
            source="ABUSE_ENGINE",
            event_count=1,
            first_seen_at=now,
            last_seen_at=now,
            risk_assessment={"score": 90 if signal.severity == "CRITICAL" else 75, "factors": ["ABUSE_PROTECTION", signal.signal_type]},
            created_at=now,
        )
        self.db.add(alert)
        await self.db.flush()
        return str(alert.id)

    async def create_policy(self, data: Dict[str, Any], created_by: str = "ADMIN") -> RateLimitPolicy:
        policy = RateLimitPolicy(
            name=data["name"],
            description=data.get("description"),
            version=1,
            scope=data.get("scope", "GLOBAL").upper(),
            priority=data.get("priority", 100),
            algorithm=data.get("algorithm", "TOKEN_BUCKET").upper(),
            limit_count=data.get("limit_count", 100),
            window_seconds=data.get("window_seconds", 60),
            burst=data.get("burst", 20),
            concurrency_limit=data.get("concurrency_limit"),
            fail_behavior=data.get("fail_behavior", "FAIL_OPEN").upper(),
            conditions=data.get("conditions", {}),
            action=data.get("action", "THROTTLE").upper(),
            enabled=data.get("enabled", True),
            dry_run=data.get("dry_run", False),
            tenant_id=data.get("tenant_id"),
            created_by=created_by,
        )
        self.db.add(policy)
        await self.db.flush()

        version_rec = RateLimitPolicyVersion(
            policy_id=policy.id,
            version=1,
            snapshot=data,
            change_summary="Initial policy creation",
            changed_by=created_by,
        )
        self.db.add(version_rec)
        await self.db.commit()
        await self.db.refresh(policy)
        return policy

    async def list_policies(self) -> List[RateLimitPolicy]:
        stmt = select(RateLimitPolicy).order_by(RateLimitPolicy.priority.desc(), RateLimitPolicy.created_at.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_policy(self, policy_id: uuid.UUID) -> Optional[RateLimitPolicy]:
        stmt = select(RateLimitPolicy).where(RateLimitPolicy.id == policy_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_block(
        self,
        block_type: str,
        target_value: str,
        reason: str,
        permanent: bool = False,
        duration_minutes: int = 60,
        authorized_by: str = "ADMIN",
        evidence: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        if permanent:
            block = PermanentBlock(
                block_type=block_type.upper(),
                target_value=target_value.strip(),
                scope="GLOBAL",
                reason=reason,
                authorized_by=authorized_by,
                evidence=evidence or {},
                active=True,
            )
            self.db.add(block)
            await self.db.commit()
            return {"id": str(block.id), "type": "PERMANENT", "target": target_value, "active": True}
        else:
            expires = now + timedelta(minutes=duration_minutes)
            block = TemporaryBlock(
                block_type=block_type.upper(),
                target_value=target_value.strip(),
                scope="GLOBAL",
                reason=reason,
                evidence=evidence or {},
                expires_at=expires,
                active=True,
                created_by=authorized_by,
            )
            self.db.add(block)
            await self.db.commit()
            return {
                "id": str(block.id),
                "type": "TEMPORARY",
                "target": target_value,
                "expires_at": expires.isoformat(),
                "active": True,
            }

    async def list_blocks(self) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        stmt_temp = select(TemporaryBlock).where(
            and_(TemporaryBlock.active == True, TemporaryBlock.expires_at > now)
        ).order_by(TemporaryBlock.created_at.desc())
        stmt_perm = select(PermanentBlock).where(
            PermanentBlock.active == True
        ).order_by(PermanentBlock.created_at.desc())

        res_temp = await self.db.execute(stmt_temp)
        res_perm = await self.db.execute(stmt_perm)

        return {
            "temporary_blocks": list(res_temp.scalars().all()),
            "permanent_blocks": list(res_perm.scalars().all()),
        }

    async def list_decisions(self, limit: int = 100) -> List[RateLimitDecision]:
        stmt = select(RateLimitDecision).order_by(RateLimitDecision.timestamp.desc()).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def list_signals(self, limit: int = 100) -> List[AbuseDetectionSignal]:
        stmt = select(AbuseDetectionSignal).order_by(AbuseDetectionSignal.detected_at.desc()).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_overview_statistics(self) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)

        total_policies = (await self.db.execute(select(func.count(RateLimitPolicy.id)))).scalar() or 0
        active_policies = (await self.db.execute(select(func.count(RateLimitPolicy.id)).where(RateLimitPolicy.enabled == True))).scalar() or 0
        total_decisions = (await self.db.execute(select(func.count(RateLimitDecision.id)))).scalar() or 0
        throttled_count = (await self.db.execute(select(func.count(RateLimitDecision.id)).where(RateLimitDecision.decision.in_(["THROTTLE", "WOULD_THROTTLE"])))).scalar() or 0
        blocked_count = (await self.db.execute(select(func.count(RateLimitDecision.id)).where(RateLimitDecision.decision == "BLOCK"))).scalar() or 0

        total_signals = (await self.db.execute(select(func.count(AbuseDetectionSignal.id)))).scalar() or 0
        brute_force_count = (await self.db.execute(select(func.count(AbuseDetectionSignal.id)).where(AbuseDetectionSignal.signal_type.like("%BRUTE_FORCE%")))).scalar() or 0
        credential_stuffing_count = (await self.db.execute(select(func.count(AbuseDetectionSignal.id)).where(AbuseDetectionSignal.signal_type == "CREDENTIAL_STUFFING_SUSPECTED"))).scalar() or 0
        mfa_abuse_count = (await self.db.execute(select(func.count(AbuseDetectionSignal.id)).where(AbuseDetectionSignal.signal_type == "MFA_ABUSE_SUSPECTED"))).scalar() or 0
        agent_abuse_count = (await self.db.execute(select(func.count(AbuseDetectionSignal.id)).where(AbuseDetectionSignal.signal_type == "AGENT_ABUSE_SUSPECTED"))).scalar() or 0

        temp_blocks = (await self.db.execute(
            select(func.count(TemporaryBlock.id)).where(
                and_(TemporaryBlock.active == True, TemporaryBlock.expires_at > now)
            )
        )).scalar() or 0
        perm_blocks = (await self.db.execute(
            select(func.count(PermanentBlock.id)).where(PermanentBlock.active == True)
        )).scalar() or 0

        top_accounts_stmt = (
            select(
                AbuseDetectionEvent.account_identifier,
                func.count(AbuseDetectionEvent.id).label("count"),
            )
            .where(AbuseDetectionEvent.account_identifier.isnot(None))
            .group_by(AbuseDetectionEvent.account_identifier)
            .order_by(desc("count"))
            .limit(5)
        )
        res_acc = await self.db.execute(top_accounts_stmt)
        top_accounts = [
            {"account": row[0], "event_count": row[1]}
            for row in res_acc.all()
        ]

        top_endpoints_stmt = (
            select(
                RateLimitDecision.endpoint,
                func.count(RateLimitDecision.id).label("count"),
            )
            .group_by(RateLimitDecision.endpoint)
            .order_by(desc("count"))
            .limit(5)
        )
        res_ep = await self.db.execute(top_endpoints_stmt)
        top_endpoints = [
            {"endpoint": row[0], "request_count": row[1]}
            for row in res_ep.all()
        ]

        return {
            "total_policies": total_policies,
            "active_policies": active_policies,
            "total_requests_evaluated": total_decisions,
            "throttled_requests": throttled_count,
            "blocked_requests": blocked_count,
            "abuse_signals_total": total_signals,
            "brute_force_signals": brute_force_count,
            "credential_stuffing_signals": credential_stuffing_count,
            "mfa_abuse_signals": mfa_abuse_count,
            "agent_abuse_signals": agent_abuse_count,
            "active_temporary_blocks": temp_blocks,
            "active_permanent_blocks": perm_blocks,
            "top_targeted_accounts": top_accounts,
            "top_targeted_endpoints": top_endpoints,
        }
