"""
Kavach Security Intelligence Engine — Attack Path Candidate Engine.
Synthesizes candidate attack paths linking exposed entry points (e.g. public routes)
to vulnerable code/dependencies and sensitive execution sinks.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.intelligence.security.schemas import (
    AttackPathCandidate,
    AttackPathStatus,
    CanonicalFinding,
    ConfidenceLevel,
    ReachabilityStatus,
)

logger = logging.getLogger("kavach.security_intelligence.attack_paths")


class AttackPathEngine:
    """
    Constructs candidate attack paths from entrypoints to sensitive assets.
    Discloses preconditions, missing evidence, and mitigations.
    """

    @classmethod
    def discover_attack_paths_for_findings(
        cls,
        findings: List[CanonicalFinding],
    ) -> List[AttackPathCandidate]:
        """
        Discovers candidate attack paths across all assessed findings.
        Groups findings that share entrypoints or form multi-stage weakness chains.
        """
        candidates: List[AttackPathCandidate] = []

        for f in findings:
            reach = f.reachability
            if not reach or reach.status not in (
                ReachabilityStatus.CANDIDATE_PATH,
                ReachabilityStatus.PATH_WITH_MITIGATION,
            ):
                continue

            entrypoint = reach.entrypoint or (f.evidence.route_endpoint and f"{f.evidence.http_method or 'GET'} {f.evidence.route_endpoint}") or "External Input"
            sink = reach.sink_name or (f.enrichment and f.enrichment.cwe_ids and f"Vulnerable Operation ({f.enrichment.cwe_ids[0]})") or "Sensitive Sink"

            has_mitigation = bool(reach.mitigations)
            status = AttackPathStatus.MITIGATED_CANDIDATE if has_mitigation else AttackPathStatus.CANDIDATE

            title = f"Attack Path: {entrypoint} ➔ {f.title} ➔ {sink}"
            if has_mitigation:
                title = f"[Mitigated] {title}"

            preconditions = [
                f"Attacker must have network reachability to entrypoint {entrypoint}",
                "Payload must reach vulnerable handler without external WAF interception",
            ]
            if f.category.value == "SCA":
                preconditions.append(f"Vulnerable package {f.package_name} must execute with vulnerable arguments")

            mitigations = list(reach.mitigations)
            if not mitigations:
                mitigations = ["None statically detected on call chain"]

            candidate = AttackPathCandidate(
                path_id=uuid.uuid4(),
                title=title,
                status=status,
                entrypoint_asset=entrypoint,
                target_asset=sink,
                hops=reach.call_hops,
                associated_finding_ids=[str(f.id)],
                preconditions=preconditions,
                mitigations=mitigations,
                missing_links=reach.limitations,
                confidence=reach.confidence,
                created_at=datetime.now(timezone.utc),
            )
            candidates.append(candidate)

        return candidates

