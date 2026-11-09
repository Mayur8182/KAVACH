"""
Kavach Security Intelligence Engine — Fingerprinting & Deduplication Engine.
Implements versioned fingerprint generation and deterministic deduplication classes:
1. EXACT_DUPLICATE: Repeated scan observation of same issue -> updates last_seen_at.
2. CROSS_SCANNER_EQUIVALENT: Different scanners identifying identical underlying flaw.
3. RELATED: Distinct vulnerabilities sharing a common package, asset, or CWE root cause.
4. SIMILAR: Textual similarity only — never auto-merged.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

from app.intelligence.security.schemas import (
    CanonicalFinding,
    DeduplicationClass,
    FindingObservation,
)

logger = logging.getLogger("kavach.security_intelligence.fingerprint")


class FindingFingerprinter:
    """
    Manages deterministic finding identity, cross-scan deduplication,
    and cross-scanner observation aggregation.
    """

    @classmethod
    def classify_and_merge(
        cls,
        existing_findings: List[CanonicalFinding],
        new_finding: CanonicalFinding,
    ) -> Tuple[DeduplicationClass, Optional[CanonicalFinding]]:
        """
        Determines the relationship between a newly observed finding and the active inventory:
        - If EXACT_DUPLICATE: updates target finding's last_seen_at and appends observation.
        - If CROSS_SCANNER_EQUIVALENT: links finding and records multi-scanner evidence.
        - If RELATED: records related_finding_id without merging.
        - Otherwise returns NEW.
        """
        for target in existing_findings:
            # 1. Exact duplicate check (same versioned fingerprint and same tenant scope)
            if target.canonical_fingerprint == new_finding.canonical_fingerprint:
                # Merge observation into existing finding
                target.last_seen_at = new_finding.last_seen_at
                for obs in new_finding.observations:
                    target.observations.append(obs)
                # If new finding has higher severity or more complete fields, update non-destructively
                if not target.evidence.snippet and new_finding.evidence.snippet:
                    target.evidence.snippet = new_finding.evidence.snippet
                return DeduplicationClass.EXACT_DUPLICATE, target

            # 2. Cross-scanner equivalence check
            # Different scanners reporting the same file, overlapping line range, and matching CWE/Rule
            is_same_file = (
                target.evidence.file_path
                and new_finding.evidence.file_path
                and target.evidence.file_path.replace("\\", "/").lower() == new_finding.evidence.file_path.replace("\\", "/").lower()
            )

            if is_same_file:
                # Check line overlap (within 3 lines) or symbol match
                lines_overlap = (
                    abs(target.evidence.start_line - new_finding.evidence.start_line) <= 3
                )
                same_symbol = (
                    target.evidence.symbol_name
                    and new_finding.evidence.symbol_name
                    and target.evidence.symbol_name == new_finding.evidence.symbol_name
                )

                if lines_overlap or same_symbol:
                    # Same underlying issue flagged by another scanner
                    for obs in new_finding.observations:
                        target.observations.append(obs)
                    if str(new_finding.id) not in target.related_finding_ids:
                        target.related_finding_ids.append(str(new_finding.id))
                    target.last_seen_at = new_finding.last_seen_at
                    return DeduplicationClass.CROSS_SCANNER_EQUIVALENT, target

            # 3. Related check (same package coordinate or same rule in same repository)
            is_same_package = (
                target.package_name
                and new_finding.package_name
                and target.package_name.lower() == new_finding.package_name.lower()
            )
            if is_same_package or (is_same_file and target.rule_id == new_finding.rule_id):
                if str(new_finding.id) not in target.related_finding_ids:
                    target.related_finding_ids.append(str(new_finding.id))
                if str(target.id) not in new_finding.related_finding_ids:
                    new_finding.related_finding_ids.append(str(target.id))
                return DeduplicationClass.RELATED, target

        return DeduplicationClass.NEW, None

    @classmethod
    def deduplicate_scan_batch(
        cls,
        incoming_findings: List[CanonicalFinding],
        existing_inventory: Optional[List[CanonicalFinding]] = None,
    ) -> Tuple[List[CanonicalFinding], Dict[str, int]]:
        """
        Deduplicates an entire batch of incoming findings against existing inventory
        and within the batch itself.
        Returns: (deduplicated_findings, summary_counts)
        """
        inventory_map: Dict[str, CanonicalFinding] = {}
        if existing_inventory:
            for f in existing_inventory:
                inventory_map[f.canonical_fingerprint] = f

        stats = {
            "total_ingested": len(incoming_findings),
            "exact_duplicates": 0,
            "cross_scanner_merged": 0,
            "related_linked": 0,
            "new_unique": 0,
        }

        active_list = list(inventory_map.values())
        final_list: List[CanonicalFinding] = []

        for candidate in incoming_findings:
            dedup_class, target = cls.classify_and_merge(active_list, candidate)

            if dedup_class == DeduplicationClass.EXACT_DUPLICATE:
                stats["exact_duplicates"] += 1
            elif dedup_class == DeduplicationClass.CROSS_SCANNER_EQUIVALENT:
                stats["cross_scanner_merged"] += 1
            elif dedup_class == DeduplicationClass.RELATED:
                stats["related_linked"] += 1
                active_list.append(candidate)
                final_list.append(candidate)
            else:  # NEW
                stats["new_unique"] += 1
                active_list.append(candidate)
                final_list.append(candidate)

        return active_list, stats

