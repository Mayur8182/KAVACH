"""
Kavach Security Intelligence Engine (SIE) — Unified Engine Facade.
Coordinates normalization, deduplication, vulnerability enrichment, asset resolution,
bounded reachability analysis, attack path synthesis, and contextual risk scoring.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.intelligence.codebase.ast_parser import CodeFileAST
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine
from app.intelligence.codebase.symbol_index import SymbolIndex
from app.intelligence.security.asset_resolver import AssetResolver
from app.intelligence.security.attack_paths import AttackPathEngine
from app.intelligence.security.fingerprinter import FindingFingerprinter
from app.intelligence.security.knowledge_graph import SecurityKnowledgeGraph
from app.intelligence.security.normalizer import ScannerResultNormalizer
from app.intelligence.security.reachability import ReachabilityAnalyzer
from app.intelligence.security.risk_engine import ContextualRiskEngine
from app.intelligence.security.schemas import (
    AttackPathCandidate,
    CanonicalFinding,
    EvidencePackage,
    PriorityBand,
    ReachabilityStatus,
)
from app.intelligence.security.vuln_intel import VulnerabilityIntelligenceService

logger = logging.getLogger("kavach.security_intelligence.engine")


class SecurityIntelligenceEngine:
    """
    Authoritative security intelligence facade for Kavach.
    Answers:
    - What security issues exist?
    - Are they duplicates or separate manifestations?
    - Is vulnerable code reachable from exposed entry points?
    - Can weaknesses form a plausible attack chain?
    - Which issue should engineering fix first, and why?
    """

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self.vuln_service = VulnerabilityIntelligenceService()
        self.normalizer = ScannerResultNormalizer()
        self.fingerprinter = FindingFingerprinter()
        self.reachability_analyzer = ReachabilityAnalyzer()
        self.attack_path_engine = AttackPathEngine()
        self.risk_engine = ContextualRiskEngine()

    def process_raw_findings(
        self,
        raw_items: List[Dict[str, Any]],
        scanner_name: str,
        project_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        repository_name: Optional[str] = None,
        commit_sha: Optional[str] = None,
        scan_execution_id: Optional[uuid.UUID] = None,
        existing_inventory: Optional[List[CanonicalFinding]] = None,
        dep_graph_engine: Optional[DependencyGraphEngine] = None,
        file_asts: Optional[Dict[str, CodeFileAST]] = None,
        symbol_index: Optional[SymbolIndex] = None,
    ) -> Tuple[List[CanonicalFinding], List[AttackPathCandidate], Dict[str, Any]]:
        """
        Runs the full Security Intelligence pipeline across raw scanner outputs.
        """
        # Step 1: Normalize
        normalized: List[CanonicalFinding] = []
        scanner_lower = scanner_name.lower()

        for item in raw_items:
            if "semgrep" in scanner_lower:
                cf = self.normalizer.normalize_semgrep(
                    item, project_id, organization_id, None, repository_name, commit_sha, scan_execution_id
                )
            elif "gitleaks" in scanner_lower:
                cf = self.normalizer.normalize_gitleaks(
                    item, project_id, organization_id, None, repository_name, commit_sha, scan_execution_id
                )
            elif "trivy" in scanner_lower or "osv" in scanner_lower:
                cf = self.normalizer.normalize_trivy_or_osv(
                    item, scanner_name, project_id, organization_id, None, repository_name, commit_sha, scan_execution_id
                )
            else:
                cf = self.normalizer.from_existing_db_finding(item)
            normalized.append(cf)

        # Step 2: Deduplicate against inventory
        deduped_findings, dedup_stats = self.fingerprinter.deduplicate_scan_batch(
            incoming_findings=normalized,
            existing_inventory=existing_inventory,
        )

        # Step 3: Asset & Symbol Resolution
        for f in deduped_findings:
            AssetResolver.resolve_to_ast_symbol(f, symbol_index=symbol_index, file_asts=file_asts)

        # Step 4: Vulnerability & Weakness Intelligence Enrichment
        for f in deduped_findings:
            self.vuln_service.enrich_finding(f)

        # Step 5: Bounded Reachability Analysis
        for f in deduped_findings:
            reach = self.reachability_analyzer.analyze_finding_reachability(
                finding=f,
                dep_graph_engine=dep_graph_engine,
                file_asts=file_asts,
            )
            f.reachability = reach

        # Step 6: Candidate Attack Path Synthesis
        attack_paths = self.attack_path_engine.discover_attack_paths_for_findings(deduped_findings)

        # Step 7: Deterministic Contextual Risk Scoring
        for f in deduped_findings:
            self.risk_engine.calculate_risk(f)

        # Sort findings by priority score descending
        deduped_findings.sort(
            key=lambda x: x.risk_assessment.priority_score if x.risk_assessment else 0.0,
            reverse=True,
        )

        summary = {
            "total_findings": len(deduped_findings),
            "deduplication": dedup_stats,
            "p0_count": sum(1 for f in deduped_findings if f.risk_assessment and f.risk_assessment.priority_band == PriorityBand.P0),
            "p1_count": sum(1 for f in deduped_findings if f.risk_assessment and f.risk_assessment.priority_band == PriorityBand.P1),
            "p2_count": sum(1 for f in deduped_findings if f.risk_assessment and f.risk_assessment.priority_band == PriorityBand.P2),
            "p3_count": sum(1 for f in deduped_findings if f.risk_assessment and f.risk_assessment.priority_band == PriorityBand.P3),
            "p4_count": sum(1 for f in deduped_findings if f.risk_assessment and f.risk_assessment.priority_band == PriorityBand.P4),
            "reachable_count": sum(1 for f in deduped_findings if f.reachability and f.reachability.status in (ReachabilityStatus.CANDIDATE_PATH, ReachabilityStatus.PATH_WITH_MITIGATION)),
            "attack_paths_count": len(attack_paths),
        }

        return deduped_findings, attack_paths, summary

    def build_evidence_package(self, finding: CanonicalFinding) -> EvidencePackage:
        """
        Builds a comprehensive, grounded evidence package for the Investigation Agent or UI drawer.
        """
        reach = finding.reachability
        risk = finding.risk_assessment

        rec_action = "Review and remediate according to prioritized security guidelines."
        if risk and risk.priority_band == PriorityBand.P0:
            rec_action = "IMMEDIATE REMEDIATION: Critical exposure detected on active call path."
        elif risk and risk.priority_band == PriorityBand.P1:
            rec_action = "URGENT REMEDIATION: High severity issue reachable from public entry point."
        elif reach and reach.status == ReachabilityStatus.NO_PATH_FOUND:
            rec_action = "PLANNED REMEDIATION: Code is currently not reachable from external entry points."

        return EvidencePackage(
            finding_id=str(finding.id),
            repository_id=str(finding.repository_id) if finding.repository_id else None,
            commit_sha=finding.commit_sha,
            title=finding.title,
            category=finding.category.value,
            severity=finding.normalized_severity.value,
            priority_band=risk.priority_band.value if risk else "P2",
            priority_score=risk.priority_score if risk else 50.0,
            evidence_coordinates={
                "file_path": finding.evidence.file_path,
                "start_line": finding.evidence.start_line,
                "end_line": finding.evidence.end_line,
                "symbol": finding.evidence.symbol_name,
                "symbol_kind": finding.evidence.symbol_kind,
                "route": finding.evidence.route_endpoint,
                "snippet": finding.evidence.snippet,
            },
            enrichment={
                "cve_id": finding.enrichment.cve_id if finding.enrichment else None,
                "cwe_ids": finding.enrichment.cwe_ids if finding.enrichment else [],
                "cvss_score": finding.enrichment.cvss_score if finding.enrichment else None,
                "is_known_exploited": finding.enrichment.is_known_exploited if finding.enrichment else False,
                "epss_score": finding.enrichment.epss_score if finding.enrichment else None,
                "source": finding.enrichment.source_provider if finding.enrichment else None,
            } if finding.enrichment else None,
            reachability={
                "status": reach.status.value if reach else "not_assessed",
                "entrypoint": reach.entrypoint if reach else None,
                "hops": [h.model_dump() for h in reach.call_hops] if reach else [],
                "sink": reach.sink_name if reach else None,
                "mitigations": reach.mitigations if reach else [],
            },
            reason_codes=risk.reason_codes if risk else [],
            limitations=reach.limitations if reach else [],
            recommended_action=rec_action,
        )

