"""
UnifiedFindingsService — Single authoritative source for all security findings queries.

All dashboard widgets, chat responses, reports, and API endpoints must use this service
to ensure consistent finding counts across the entire application.

Rules:
- Zero hardcoded counts
- All queries scoped to authorized project IDs
- Scanner type classification uses scanner_type column, not title heuristics
- Consistent counts across all callers
"""

import uuid
import logging
from enum import Enum
from typing import Dict, Any, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, and_

from app.models.scan import SecurityFinding, SecurityScan

logger = logging.getLogger("kavach.unified_findings")


class ScannerModule(str, Enum):
    SAST = "SAST"
    SECRETS = "SECRETS"
    SCA = "SCA"
    IAC = "IAC"
    CONTAINER = "CONTAINER"
    DAST = "DAST"
    ALL = "ALL"


# Authoritative scanner name → module mapping (used at ingestion AND query time)
SCANNER_TO_MODULE: Dict[str, ScannerModule] = {
    "semgrep": ScannerModule.SAST,
    "seculayer-builtin": ScannerModule.SAST,
    "gitleaks": ScannerModule.SECRETS,
    "osv": ScannerModule.SCA,
    "trivy-sca": ScannerModule.SCA,
    "trivy-container": ScannerModule.CONTAINER,
    "trivy": ScannerModule.CONTAINER,
    "checkov": ScannerModule.IAC,
    "dast": ScannerModule.DAST,
    "api-security": ScannerModule.DAST,
}

# Rule ID prefix → module mapping (fallback when scanner_type column is not set)
RULE_PREFIX_TO_MODULE: Dict[str, ScannerModule] = {
    "cwe": ScannerModule.SAST,
    "semgrep": ScannerModule.SAST,
    "sast": ScannerModule.SAST,
    "gitleaks": ScannerModule.SECRETS,
    "sec-": ScannerModule.SECRETS,
    "cve-": ScannerModule.SCA,
    "ghsa-": ScannerModule.SCA,
    "iac-": ScannerModule.IAC,
    "tf-": ScannerModule.IAC,
    "docker-": ScannerModule.CONTAINER,
    "k8s-": ScannerModule.CONTAINER,
    "api-": ScannerModule.DAST,
}


def classify_finding_module(
    scanner_type: Optional[str],
    rule_id: Optional[str],
    category: Optional[str],
) -> ScannerModule:
    """
    Classify a finding into the correct scanner module.
    Priority: scanner_type column > rule_id prefix > category field > SAST default.
    Never uses title string matching.
    """
    # 1. Use scanner_type column if set
    if scanner_type:
        st_upper = scanner_type.upper()
        for m in ScannerModule:
            if m != ScannerModule.ALL and m.value == st_upper:
                return m
        # Also check scanner name mapping
        st_lower = scanner_type.lower()
        if st_lower in SCANNER_TO_MODULE:
            return SCANNER_TO_MODULE[st_lower]

    # 2. Use rule_id prefix
    if rule_id:
        rule_lower = rule_id.lower()
        for prefix, module in RULE_PREFIX_TO_MODULE.items():
            if rule_lower.startswith(prefix):
                return module

    # 3. Use category field
    if category:
        cat_lower = category.lower()
        for m in ScannerModule:
            if m != ScannerModule.ALL and m.value.lower() in cat_lower:
                return m

    # 4. Default
    return ScannerModule.SAST


class UnifiedFindingsService:
    """
    Single authoritative service for all security findings queries.
    All callers (dashboard, chat, reports, API) MUST use this service for consistency.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_findings(
        self,
        project_ids: List[uuid.UUID],
        severity_filter: Optional[str] = None,
        scanner_module: Optional[ScannerModule] = None,
        scan_id: Optional[uuid.UUID] = None,
        repository: Optional[str] = None,
        search_term: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Authoritative findings query. Returns consistent results regardless of caller.
        """
        if not project_ids:
            return {"findings": [], "total": 0, "counts": self._empty_counts(), "module_counts": {}}

        stmt = (
            select(SecurityFinding)
            .where(SecurityFinding.project_id.in_(project_ids))
            .order_by(
                desc(SecurityFinding.severity == "CRITICAL"),
                desc(SecurityFinding.severity == "HIGH"),
                desc(SecurityFinding.detected_at),
                desc(SecurityFinding.created_at),
            )
        )

        if severity_filter and severity_filter.upper() != "ALL":
            stmt = stmt.where(SecurityFinding.severity == severity_filter.upper())

        if scan_id:
            stmt = stmt.where(SecurityFinding.scan_id == scan_id)

        if repository:
            clean_repo = repository.split("/")[-1].replace(".git", "")
            stmt = stmt.where(
                or_(
                    SecurityFinding.repository.ilike(f"%{clean_repo}%"),
                    SecurityFinding.file_path.ilike(f"%{clean_repo}%"),
                )
            )

        if search_term:
            stmt = stmt.where(
                or_(
                    SecurityFinding.title.ilike(f"%{search_term}%"),
                    SecurityFinding.rule_id.ilike(f"%{search_term}%"),
                    SecurityFinding.description.ilike(f"%{search_term}%"),
                )
            )

        # Module filter using authoritative classification
        if scanner_module and scanner_module != ScannerModule.ALL:
            module_conditions = [SecurityFinding.scanner_type == scanner_module.value]
            for prefix, mod in RULE_PREFIX_TO_MODULE.items():
                if mod == scanner_module:
                    module_conditions.append(SecurityFinding.rule_id.ilike(f"{prefix}%"))
            if hasattr(SecurityFinding, 'category'):
                module_conditions.append(
                    SecurityFinding.category.ilike(f"%{scanner_module.value.lower()}%")
                )
            stmt = stmt.where(or_(*module_conditions))

        paginated_stmt = stmt.offset(offset).limit(limit)
        res = await self.db.execute(paginated_stmt)
        findings = res.scalars().all()

        # Total count (without pagination)
        count_stmt = select(func.count(SecurityFinding.id)).where(
            SecurityFinding.project_id.in_(project_ids)
        )
        if severity_filter and severity_filter.upper() != "ALL":
            count_stmt = count_stmt.where(SecurityFinding.severity == severity_filter.upper())
        if scan_id:
            count_stmt = count_stmt.where(SecurityFinding.scan_id == scan_id)
        if repository:
            clean_repo = repository.split("/")[-1].replace(".git", "")
            count_stmt = count_stmt.where(
                or_(
                    SecurityFinding.repository.ilike(f"%{clean_repo}%"),
                    SecurityFinding.file_path.ilike(f"%{clean_repo}%"),
                )
            )
        total = (await self.db.execute(count_stmt)).scalar() or 0

        counts = await self._get_severity_counts(project_ids, scan_id=scan_id)
        module_counts = await self._get_module_counts(project_ids, scan_id=scan_id)

        serialized = []
        for f in findings:
            module = classify_finding_module(
                getattr(f, 'scanner_type', None),
                f.rule_id,
                getattr(f, 'category', None),
            )
            serialized.append({
                "id": str(f.id),
                "title": f.title or f.rule_id,
                "severity": (f.severity or "MEDIUM").upper(),
                "rule_id": f.rule_id,
                "file_path": f.file_path,
                "line_start": getattr(f, "line_start", None) or getattr(f, "line_number", None),
                "cve_id": getattr(f, "cve_id", None),
                "cwe_id": getattr(f, "cwe_id", None),
                "scanner_module": module.value,
                "category": getattr(f, "category", None) or module.value,
                "repository": getattr(f, "repository", None),
                "description": f.description,
                "remediation": getattr(f, "remediation", None),
                "snippet": getattr(f, "snippet", None),
                "scan_id": str(f.scan_id) if f.scan_id else None,
                "status": getattr(f, "status", "OPEN"),
                "detected_at": f.detected_at.isoformat() if hasattr(f, 'detected_at') and f.detected_at else None,
            })

        return {
            "findings": serialized,
            "total": total,
            "counts": counts,
            "module_counts": module_counts,
        }

    async def _get_severity_counts(
        self,
        project_ids: List[uuid.UUID],
        scan_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, int]:
        """Returns authoritative severity counts from DB — single source of truth."""
        stmt = (
            select(SecurityFinding.severity, func.count(SecurityFinding.id))
            .where(SecurityFinding.project_id.in_(project_ids))
        )
        if scan_id:
            stmt = stmt.where(SecurityFinding.scan_id == scan_id)
        stmt = stmt.group_by(SecurityFinding.severity)
        rows = (await self.db.execute(stmt)).all()

        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for sev, cnt in rows:
            key = (sev or "LOW").upper()
            if key in counts:
                counts[key] += cnt
            elif key in ("INFORMATIONAL",):
                counts["INFO"] += cnt
        counts["total"] = sum(v for k, v in counts.items() if k != "total")
        return counts

    async def _get_module_counts(
        self,
        project_ids: List[uuid.UUID],
        scan_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, int]:
        """Returns per-module finding counts using authoritative classification."""
        stmt = select(
            SecurityFinding.scanner_type,
            SecurityFinding.rule_id,
            SecurityFinding.category,
            func.count(SecurityFinding.id),
        ).where(SecurityFinding.project_id.in_(project_ids))
        if scan_id:
            stmt = stmt.where(SecurityFinding.scan_id == scan_id)
        stmt = stmt.group_by(
            SecurityFinding.scanner_type,
            SecurityFinding.rule_id,
            SecurityFinding.category,
        )
        rows = (await self.db.execute(stmt)).all()

        counts = {m.value: 0 for m in ScannerModule if m != ScannerModule.ALL}
        for scanner_type, rule_id, category, cnt in rows:
            module = classify_finding_module(scanner_type, rule_id, category)
            counts[module.value] = counts.get(module.value, 0) + cnt
        return counts

    def _empty_counts(self) -> Dict[str, int]:
        return {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0, "total": 0}

    async def get_finding_by_id(
        self,
        finding_id: uuid.UUID,
        project_ids: Optional[List[uuid.UUID]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a single finding by ID with full detail."""
        stmt = select(SecurityFinding).where(SecurityFinding.id == finding_id)
        if project_ids:
            stmt = stmt.where(SecurityFinding.project_id.in_(project_ids))
        finding = (await self.db.execute(stmt)).scalars().first()
        if not finding:
            return None

        module = classify_finding_module(
            getattr(finding, 'scanner_type', None),
            finding.rule_id,
            getattr(finding, 'category', None),
        )
        return {
            "id": str(finding.id),
            "title": finding.title or finding.rule_id,
            "severity": (finding.severity or "MEDIUM").upper(),
            "rule_id": finding.rule_id,
            "file_path": finding.file_path,
            "line_start": getattr(finding, "line_start", None),
            "line_end": getattr(finding, "line_end", None),
            "cve_id": getattr(finding, "cve_id", None),
            "cwe_id": getattr(finding, "cwe_id", None),
            "scanner_module": module.value,
            "category": getattr(finding, "category", None) or module.value,
            "repository": getattr(finding, "repository", None),
            "description": finding.description,
            "remediation": getattr(finding, "remediation", None),
            "snippet": getattr(finding, "snippet", None),
            "scan_id": str(finding.scan_id) if finding.scan_id else None,
            "project_id": str(finding.project_id) if finding.project_id else None,
            "status": getattr(finding, "status", "OPEN"),
        }
