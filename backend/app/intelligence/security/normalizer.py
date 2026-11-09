"""
Kavach Security Intelligence Engine — Scanner Result Adapters & Normalization.
Converts raw findings from Semgrep, Gitleaks, Trivy, Checkov, OSV, and built-in scanners
into the CanonicalFinding model with complete evidence provenance.
"""

import hashlib
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from app.intelligence.security.schemas import (
    CanonicalFinding,
    FindingCategory,
    FindingEvidence,
    FindingObservation,
    FindingType,
    NormalizedSeverity,
    ScannerSeverity,
    ConfidenceLevel,
)


class ScannerResultNormalizer:
    """
    Authoritative normalizer transforming heterogeneous scanner outputs into
    canonical security findings while strictly preserving raw execution provenance.
    """

    @classmethod
    def normalize_severity(cls, raw_sev: Optional[str]) -> Tuple[ScannerSeverity, NormalizedSeverity]:
        """Normalizes scanner severity strings to canonical uppercase enums."""
        if not raw_sev:
            return ScannerSeverity.MEDIUM, NormalizedSeverity.MEDIUM

        s = str(raw_sev).strip().upper()
        if s in ("CRITICAL", "BLOCKER"):
            return ScannerSeverity.CRITICAL, NormalizedSeverity.CRITICAL
        elif s in ("HIGH", "ERROR"):
            return ScannerSeverity.HIGH, NormalizedSeverity.HIGH
        elif s in ("MEDIUM", "MODERATE", "WARNING"):
            return ScannerSeverity.MEDIUM, NormalizedSeverity.MEDIUM
        elif s in ("LOW", "NOTE"):
            return ScannerSeverity.LOW, NormalizedSeverity.LOW
        elif s in ("INFO", "INFORMATIONAL"):
            return ScannerSeverity.INFORMATIONAL, NormalizedSeverity.INFORMATIONAL
        return ScannerSeverity.MEDIUM, NormalizedSeverity.MEDIUM

    @classmethod
    def generate_fingerprint_v1(
        cls,
        tenant_scope: str,
        rule_id: str,
        normalized_file_path: Optional[str],
        package_or_symbol: Optional[str],
        finding_type: str,
    ) -> str:
        """
        Deterministic, versioned finding fingerprint (v1.0).
        Does NOT rely solely on line numbers, which shift across git commits.
        """
        clean_path = (normalized_file_path or "global").replace("\\", "/").lower().strip()
        clean_rule = (rule_id or "generic-rule").lower().strip()
        clean_target = (package_or_symbol or "none").lower().strip()
        clean_scope = (tenant_scope or "default").strip()

        seed = f"v1:{clean_scope}:{clean_rule}:{clean_path}:{clean_target}:{finding_type}"
        return hashlib.sha256(seed.encode("utf-8")).hexdigest()

    @classmethod
    def normalize_semgrep(
        cls,
        raw: Dict[str, Any],
        project_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        repository_id: Optional[uuid.UUID] = None,
        repository_name: Optional[str] = None,
        commit_sha: Optional[str] = None,
        scan_execution_id: Optional[uuid.UUID] = None,
    ) -> CanonicalFinding:
        """Normalizes a raw Semgrep JSON result item."""
        check_id = raw.get("check_id") or raw.get("rule_id") or "semgrep.generic"
        path = raw.get("path") or raw.get("file_path") or ""
        start = raw.get("start", {})
        end = raw.get("end", {})
        start_line = start.get("line") or raw.get("line_number") or raw.get("line_start") or 1
        end_line = end.get("line") or raw.get("line_end") or start_line

        extra = raw.get("extra", {})
        message = extra.get("message") or raw.get("message") or raw.get("description") or "Semgrep finding"
        raw_sev = extra.get("severity") or raw.get("severity") or "HIGH"
        scanner_sev, norm_sev = cls.normalize_severity(raw_sev)

        lines = extra.get("lines") or raw.get("snippet") or ""

        # Deterministic fingerprint
        scope = str(project_id or organization_id or repository_name or "proj")
        fingerprint = cls.generate_fingerprint_v1(
            tenant_scope=scope,
            rule_id=check_id,
            normalized_file_path=path,
            package_or_symbol=None,
            finding_type=FindingType.CODE_VULNERABILITY.value,
        )

        observation = FindingObservation(
            scanner_name="semgrep",
            scanner_version=raw.get("version"),
            scanner_execution_id=scan_execution_id,
            raw_finding_reference=check_id,
            observed_rule_id=check_id,
            observed_severity=raw_sev,
            raw_payload=raw,
        )

        evidence = FindingEvidence(
            file_path=path,
            start_line=int(start_line),
            end_line=int(end_line),
            column_start=start.get("col"),
            snippet=lines[:1000] if lines else None,
        )

        return CanonicalFinding(
            id=uuid.uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            repository_id=repository_id,
            repository=repository_name,
            commit_sha=commit_sha,
            canonical_fingerprint=fingerprint,
            fingerprint_version="v1.0",
            title=check_id.split(".")[-1].replace("-", " ").title(),
            description=message,
            category=FindingCategory.SAST,
            finding_type=FindingType.CODE_VULNERABILITY,
            rule_id=check_id,
            scanner_severity=scanner_sev,
            normalized_severity=norm_sev,
            evidence=evidence,
            observations=[observation],
        )

    @classmethod
    def normalize_gitleaks(
        cls,
        raw: Dict[str, Any],
        project_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        repository_id: Optional[uuid.UUID] = None,
        repository_name: Optional[str] = None,
        commit_sha: Optional[str] = None,
        scan_execution_id: Optional[uuid.UUID] = None,
    ) -> CanonicalFinding:
        """Normalizes a raw Gitleaks JSON finding item with secret masking."""
        rule_id = raw.get("RuleID") or raw.get("rule_id") or "gitleaks.secret"
        description = raw.get("Description") or raw.get("description") or f"Hardcoded secret detected: {rule_id}"
        path = raw.get("File") or raw.get("file_path") or ""
        start_line = int(raw.get("StartLine") or raw.get("line_number") or 1)
        end_line = int(raw.get("EndLine") or start_line)

        # Mask secrets in raw snippet
        secret_val = raw.get("Secret") or raw.get("secret") or ""
        match_line = raw.get("Match") or raw.get("snippet") or ""
        if secret_val and len(secret_val) > 4:
            masked_secret = secret_val[:2] + "*" * (len(secret_val) - 4) + secret_val[-2:]
        else:
            masked_secret = "[REDACTED_SECRET]"

        masked_match = match_line.replace(secret_val, masked_secret) if secret_val else match_line

        scope = str(project_id or organization_id or repository_name or "proj")
        fingerprint = cls.generate_fingerprint_v1(
            tenant_scope=scope,
            rule_id=rule_id,
            normalized_file_path=path,
            package_or_symbol=None,
            finding_type=FindingType.HARDCODED_SECRET.value,
        )

        observation = FindingObservation(
            scanner_name="gitleaks",
            scanner_version=raw.get("version"),
            scanner_execution_id=scan_execution_id,
            raw_finding_reference=rule_id,
            observed_rule_id=rule_id,
            observed_severity="CRITICAL",
            raw_payload={k: v for k, v in raw.items() if k.lower() != "secret"},
        )

        evidence = FindingEvidence(
            file_path=path,
            start_line=start_line,
            end_line=end_line,
            snippet=masked_match[:500] if masked_match else f"Secret matched pattern {rule_id}",
        )

        return CanonicalFinding(
            id=uuid.uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            repository_id=repository_id,
            repository=repository_name,
            commit_sha=commit_sha,
            canonical_fingerprint=fingerprint,
            fingerprint_version="v1.0",
            title=f"Exposed Credential: {rule_id}",
            description=description,
            category=FindingCategory.SECRETS,
            finding_type=FindingType.HARDCODED_SECRET,
            rule_id=rule_id,
            scanner_severity=ScannerSeverity.CRITICAL,
            normalized_severity=NormalizedSeverity.CRITICAL,
            evidence=evidence,
            observations=[observation],
        )

    @classmethod
    def normalize_trivy_or_osv(
        cls,
        raw: Dict[str, Any],
        scanner_name: str = "trivy",
        project_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        repository_id: Optional[uuid.UUID] = None,
        repository_name: Optional[str] = None,
        commit_sha: Optional[str] = None,
        scan_execution_id: Optional[uuid.UUID] = None,
    ) -> CanonicalFinding:
        """Normalizes SCA / package dependency findings from Trivy or OSV-Scanner."""
        vuln_id = raw.get("VulnerabilityID") or raw.get("id") or raw.get("rule_id") or "CVE-UNKNOWN"
        pkg_name = raw.get("PkgName") or raw.get("package") or raw.get("package_name") or "unknown-package"
        installed_ver = raw.get("InstalledVersion") or raw.get("installed_version") or raw.get("version") or "0.0.0"
        fixed_ver = raw.get("FixedVersion") or raw.get("fixed_version")
        raw_sev = raw.get("Severity") or raw.get("severity") or "HIGH"
        title = raw.get("Title") or raw.get("summary") or f"{vuln_id} in {pkg_name}"
        description = raw.get("Description") or raw.get("description") or f"Vulnerability {vuln_id} affects package {pkg_name} {installed_ver}."
        path = raw.get("Target") or raw.get("file_path") or raw.get("path") or "package.json"

        scanner_sev, norm_sev = cls.normalize_severity(raw_sev)
        scope = str(project_id or organization_id or repository_name or "proj")
        fingerprint = cls.generate_fingerprint_v1(
            tenant_scope=scope,
            rule_id=vuln_id,
            normalized_file_path=path,
            package_or_symbol=f"{pkg_name}@{installed_ver}",
            finding_type=FindingType.DEPENDENCY_VULNERABILITY.value,
        )

        observation = FindingObservation(
            scanner_name=scanner_name,
            scanner_execution_id=scan_execution_id,
            raw_finding_reference=vuln_id,
            observed_rule_id=vuln_id,
            observed_severity=raw_sev,
            raw_payload=raw,
        )

        evidence = FindingEvidence(
            file_path=path,
            start_line=int(raw.get("line_number") or raw.get("line_start") or 1),
            end_line=int(raw.get("line_end") or 1),
            snippet=f"dependency: {pkg_name}@{installed_ver} (fixed in {fixed_ver or 'N/A'})",
        )

        return CanonicalFinding(
            id=uuid.uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            repository_id=repository_id,
            repository=repository_name,
            commit_sha=commit_sha,
            canonical_fingerprint=fingerprint,
            fingerprint_version="v1.0",
            title=title,
            description=description,
            category=FindingCategory.SCA,
            finding_type=FindingType.DEPENDENCY_VULNERABILITY,
            rule_id=vuln_id,
            package_name=pkg_name,
            installed_version=installed_ver,
            fixed_version=fixed_ver,
            scanner_severity=scanner_sev,
            normalized_severity=norm_sev,
            evidence=evidence,
            observations=[observation],
        )

    @classmethod
    def from_existing_db_finding(
        cls,
        f: Any,  # app.models.scan.SecurityFinding instance or dict
    ) -> CanonicalFinding:
        """Adapts an existing Kavach SecurityFinding ORM object into the CanonicalFinding domain model."""
        def get_val(key: str, default: Any = None) -> Any:
            if isinstance(f, dict):
                return f.get(key, default)
            return getattr(f, key, default)

        fid = get_val("id") or uuid.uuid4()
        pid = get_val("project_id")
        org_id = get_val("organization_id")
        repo_id = get_val("repository_id")
        repo_name = get_val("repository")
        commit = get_val("commit_sha")
        scanner = get_val("scanner_name", "builtin") or "builtin"
        rule = get_val("rule_id", "generic-rule")
        title = get_val("title", "Security Finding")
        desc = get_val("description", "")
        sev = get_val("severity", "MEDIUM")
        path = get_val("file_path", "") or "unknown_file"
        line = get_val("line_number") or get_val("line_start") or 1
        end_line = get_val("line_end") or line
        snippet = get_val("snippet")
        cat_str = get_val("category", "SAST") or "SAST"
        status_str = get_val("status", "open") or "open"

        cat_upper = cat_str.upper()
        if "SECRET" in cat_upper:
            cat = FindingCategory.SECRETS
            ftype = FindingType.HARDCODED_SECRET
        elif "SCA" in cat_upper or "DEPEND" in cat_upper:
            cat = FindingCategory.SCA
            ftype = FindingType.DEPENDENCY_VULNERABILITY
        elif "CONTAINER" in cat_upper or "DOCKER" in cat_upper:
            cat = FindingCategory.CONTAINER
            ftype = FindingType.MISCONFIGURATION
        elif "IAC" in cat_upper or "TERRAFORM" in cat_upper:
            cat = FindingCategory.IAC
            ftype = FindingType.MISCONFIGURATION
        elif "API" in cat_upper:
            cat = FindingCategory.API
            ftype = FindingType.API_EXPOSURE
        else:
            cat = FindingCategory.SAST
            ftype = FindingType.CODE_VULNERABILITY

        scanner_sev, norm_sev = cls.normalize_severity(sev)
        scope = str(pid or org_id or repo_name or "proj")
        fingerprint = get_val("fingerprint") or cls.generate_fingerprint_v1(
            tenant_scope=scope,
            rule_id=rule,
            normalized_file_path=path,
            package_or_symbol=None,
            finding_type=ftype.value,
        )

        observation = FindingObservation(
            scanner_name=scanner,
            scanner_execution_id=get_val("scanner_execution_id"),
            raw_finding_reference=rule,
            observed_rule_id=rule,
            observed_severity=sev,
            observed_at=get_val("detected_at") or datetime.now(timezone.utc),
            raw_payload=get_val("raw_metadata", {}) or {},
        )

        evidence = FindingEvidence(
            file_path=path,
            start_line=int(line),
            end_line=int(end_line),
            snippet=snippet,
        )

        return CanonicalFinding(
            id=fid if isinstance(fid, uuid.UUID) else uuid.UUID(str(fid)),
            organization_id=org_id,
            project_id=pid,
            repository_id=repo_id,
            repository=repo_name,
            commit_sha=commit,
            canonical_fingerprint=fingerprint,
            fingerprint_version="v1.0",
            title=title,
            description=desc,
            category=cat,
            finding_type=ftype,
            rule_id=rule,
            scanner_severity=scanner_sev,
            normalized_severity=norm_sev,
            status=status_str,
            evidence=evidence,
            observations=[observation],
            first_seen_at=get_val("first_seen_at") or datetime.now(timezone.utc),
            last_seen_at=get_val("last_seen_at") or datetime.now(timezone.utc),
        )
