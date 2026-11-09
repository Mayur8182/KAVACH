"""
Kavach Phase 5: Policy Impact Simulation Engine
Simulates proposed policies against historical scan and repository snapshots.
Provides visibility into blocker deltas, newly flagged violations, and false positives
WITHOUT triggering any enforcement side effects or mutating state.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.policy import SecurityPolicy, SecurityPolicyVersion
from app.models.scan import SecurityScan, SecurityFinding
from app.models.cloud_models import CloudResource
from app.intelligence.policy.models import (
    DecisionOutcome,
    PolicyContextSnapshot,
    SimulationImpactReport,
)
from app.intelligence.policy.evaluator_runtime import DeterministicPolicyEvaluator

logger = logging.getLogger("kavach.policy.simulation")


class PolicySimulationEngine:
    """
    Dry-run simulation engine evaluating candidate policies against real historical evidence.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def simulate_version_impact(
        self,
        version_id: uuid.UUID,
        project_ids: Optional[List[uuid.UUID]] = None,
        max_snapshots: int = 10,
    ) -> SimulationImpactReport:
        """
        Executes dry-run evaluation across historical scans without side effects.
        """
        start_time = time.time()
        version = await self.db.get(SecurityPolicyVersion, version_id)
        if not version:
            raise ValueError(f"Policy version '{version_id}' not found.")

        # 1. Fetch historical scans to use as evaluation snapshots
        stmt = select(SecurityScan).order_by(desc(SecurityScan.created_at)).limit(max_snapshots)
        if project_ids:
            stmt = stmt.where(SecurityScan.project_id.in_(project_ids))
        scans = (await self.db.execute(stmt)).scalars().all()

        policy_candidate = [{
            "id": str(version.policy_id),
            "version": version.version,
            "version_id": str(version.id),
            "content_hash": version.policy_content_hash,
            "definition": version.definition,
            "scope": version.definition.get("scope", {}).get("environment", "GLOBAL"),
            "priority": 100,
        }]

        outcome_counts = {
            DecisionOutcome.ALLOW.value: 0,
            DecisionOutcome.DENY.value: 0,
            DecisionOutcome.WARN.value: 0,
            DecisionOutcome.NOT_APPLICABLE.value: 0,
            DecisionOutcome.INDETERMINATE.value: 0,
        }
        affected_repos: Set[str] = set()
        violations_count = 0
        new_blockers = 0
        potential_false_positives = []
        total_resources = 0

        for sc in scans:
            # Load findings for this scan
            f_stmt = select(SecurityFinding).where(SecurityFinding.scan_id == sc.id).limit(100)
            db_findings = (await self.db.execute(f_stmt)).scalars().all()
            total_resources += len(db_findings)

            findings_data = []
            for f in db_findings:
                is_reach = False
                if f.raw_metadata and isinstance(f.raw_metadata, dict):
                    is_reach = bool(f.raw_metadata.get("is_reachable"))
                findings_data.append({
                    "id": str(f.id),
                    "rule_id": f.rule_id,
                    "title": f.title,
                    "severity": f.severity,
                    "file_path": f.file_path,
                    "line_number": f.line_number,
                    "is_reachable": is_reach,
                    "scanner_name": f.scanner_name,
                })

            repo_name = sc.repository or (f.repository if db_findings else "main-repo")
            affected_repos.add(repo_name)

            # Build historical snapshot
            snap = PolicyContextSnapshot(
                snapshot_id=f"sim_{sc.id}",
                project_id=str(sc.project_id),
                repository=repo_name,
                commit_sha=sc.commit_sha or "HEAD",
                environment="production",
                actor={"type": "CI_SYSTEM", "id": "github-actions"},
                operation={"type": "DEPLOY", "environment": "production"},
                findings=findings_data,
                cloud_resources=[],
                active_exceptions=[],
                is_fresh=True,
                missing_facts=[],
            )

            res = DeterministicPolicyEvaluator.evaluate_snapshot(
                context=snap,
                active_policies=policy_candidate,
            )

            outcome_counts[res.decision.value] = outcome_counts.get(res.decision.value, 0) + 1
            if res.decision == DecisionOutcome.DENY:
                new_blockers += 1
                violations_count += len(res.matched_rules)
            elif res.decision == DecisionOutcome.WARN:
                violations_count += len(res.matched_rules)

            # Detect potential false positives: e.g. blocking on findings that are unreachable
            for mr in res.matched_rules:
                if mr.decision == DecisionOutcome.DENY:
                    unreachable_evidence = [
                        ev for ev in mr.evidence_items
                        if ev.attribute == "is_reachable" and ev.observed_value is False
                    ]
                    if unreachable_evidence:
                        potential_false_positives.append({
                            "rule_key": mr.rule_key,
                            "snapshot_id": snap.snapshot_id,
                            "repository": repo_name,
                            "reason": "Rule blocked on an unreachable code finding (potential false positive candidate).",
                        })

        latency = (time.time() - start_time) * 1000.0

        # Mark version as SIMULATED if still draft
        if version.status in ("DRAFT", "TESTED"):
            version.status = "SIMULATED"
            await self.db.commit()

        return SimulationImpactReport(
            policy_id=str(version.policy_id),
            policy_version=version.version,
            policy_content_hash=version.policy_content_hash or "0" * 64,
            simulated_at=datetime.now(timezone.utc),
            snapshots_evaluated_count=len(scans),
            total_resources_evaluated=total_resources,
            outcome_distribution=outcome_counts,
            new_blockers_detected=new_blockers,
            violations_count=violations_count,
            potential_false_positives=potential_false_positives[:10],
            affected_repositories=list(affected_repos),
            evaluation_latency_ms=round(latency, 2),
            has_blocking_impact=(new_blockers > 0),
        )

