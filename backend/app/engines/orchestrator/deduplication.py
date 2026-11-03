"""
Thing Scan Orchestrator — Cross-Scanner Finding Normalizer & Deduplicator
Correlates findings across disparate scanners (Semgrep, Gitleaks, Trivy, Checkov, OSV-Scanner, Builtin).
Merges duplicates into unified findings while preserving complete multi-source evidence.
Adheres strictly to AGENTS.md:
- Rule 13: Every security decision must have evidence.
- Rule 18: Traceability and deterministic verification.
- Rule 1: No fake or hardcoded findings.
"""

import hashlib
import re
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from app.engines.orchestrator.models import (
    CorrelatedFinding,
    DeduplicationSummary,
    FindingEvidenceSource,
)
from app.engines.scanner.models import NormalizedFindingCandidate, ScannerExecutionResult

# Severity hierarchy for deterministic selection of highest impact
SEVERITY_ORDER: Dict[str, int] = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFORMATIONAL": 1,
}

CVE_REGEX = re.compile(r"\b(CVE-\d{4}-\d{4,7}|GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})\b", re.IGNORECASE)


def normalize_file_path(path: Optional[str]) -> str:
    """Normalizes file path for consistent cross-scanner matching across platforms."""
    if not path:
        return ""
    p = path.replace("\\", "/").strip()
    if p.startswith("./"):
        p = p[2:]
    return p.lower()


def pick_highest_severity(severities: List[str]) -> str:
    """Selects the highest severity from a list of severity ratings."""
    best_sev = "INFORMATIONAL"
    best_rank = 0
    for s in severities:
        norm_s = (s or "").upper().strip()
        rank = SEVERITY_ORDER.get(norm_s, 1)
        if rank > best_rank:
            best_rank = rank
            best_sev = norm_s
    return best_sev


def infer_taxonomy(
    rule_id: str,
    title: str,
    description: str,
    raw_metadata: Dict[str, Any],
) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
    """
    Infers canonical (category, cwe_id, owasp_category, remediation)
    based on scanner rule identifiers and vulnerability signatures.
    """
    combined = f"{rule_id} {title} {description}".lower()

    # 1. Hardcoded Secrets & Credentials
    if any(k in combined for k in ["secret", "credential", "api_key", "token", "password", "private_key", "jwt_secret", "gitleaks"]):
        return (
            "SECRETS",
            "CWE-798",
            "A07:2021-Identification and Authentication Failures",
            "Remove hardcoded secret from repository, invalidate exposed credential immediately, and load secret from secure vault/environment variable.",
        )

    # 2. SQL Injection
    if any(k in combined for k in ["sql", "sqli", "injection", "parameterized", "raw-sql"]):
        return (
            "INJECTION",
            "CWE-89",
            "A03:2021-Injection",
            "Use parameterized SQL queries or ORM query builder. Never concatenate untrusted user input directly into SQL strings.",
        )

    # 3. Cross-Site Scripting (XSS)
    if any(k in combined for k in ["xss", "cross-site", "dangerouslysetinnerhtml", "reflected-xss"]):
        return (
            "INJECTION",
            "CWE-79",
            "A03:2021-Injection",
            "Sanitize and contextually encode all dynamic outputs before rendering in HTML templates.",
        )

    # 4. Server-Side Request Forgery (SSRF)
    if "ssrf" in combined or "server-side request" in combined:
        return (
            "INJECTION",
            "CWE-918",
            "A10:2021-Server-Side Request Forgery",
            "Validate and restrict target URLs against strict whitelist; block requests to internal link-local IP addresses (e.g. 169.254.169.254).",
        )

    # 5. Dependency Vulnerabilities (SCA)
    if CVE_REGEX.search(combined) or "package" in combined or "osv" in combined or "cve" in combined:
        return (
            "SCA",
            "CWE-1395",
            "A06:2021-Vulnerable and Outdated Components",
            "Upgrade package dependency to recommended patched version in lockfile.",
        )

    # 6. Infrastructure as Code & Container Misconfigurations
    if any(k in combined for k in ["checkov", "ckv_", "terraform", "root user", "privileged", "kubernetes", "helm", "dockerfile"]):
        return (
            "IAC",
            "CWE-1004",
            "A05:2021-Security Misconfiguration",
            "Update infrastructure configuration to enforce least-privilege security controls.",
        )

    # 7. Cryptographic Failures
    if any(k in combined for k in ["crypto", "cipher", "md5", "sha1", "des", "ecb", "weak key"]):
        return (
            "CRYPTO",
            "CWE-327",
            "A02:2021-Cryptographic Failures",
            "Migrate from broken cryptographic primitives to modern standards (AES-256-GCM, SHA-256, Ed25519).",
        )

    # 8. Authentication & Broken Access Control
    if any(k in combined for k in ["auth", "jwt", "session", "rbac", "idor", "privilege"]):
        return (
            "AUTH",
            "CWE-285",
            "A01:2021-Broken Access Control",
            "Enforce strict server-side access control checks for all user identity and resource ownership requests.",
        )

    return (
        "OTHER",
        "CWE-699",
        "A05:2021-Security Misconfiguration",
        "Review security advisory guideline and apply least privilege remediation.",
    )


class CrossScannerDeduplicator:
    """
    Multi-scanner result normalizer and correlation engine.
    Ingests execution results from multiple scanners, groups duplicate findings,
    preserves full multi-scanner provenance evidence, and elevates confidence ratings.
    """

    def process_scanner_executions(
        self,
        executions: List[ScannerExecutionResult],
    ) -> Tuple[List[CorrelatedFinding], DeduplicationSummary]:
        """
        Main entrypoint. Ingests ScannerExecutionResults and returns consolidated
        CorrelatedFindings with rich evidence and summary metrics.
        """
        raw_candidates: List[Tuple[NormalizedFindingCandidate, ScannerExecutionResult]] = []
        for exc in executions:
            for f in exc.findings:
                raw_candidates.append((f, exc))

        return self.correlate_candidates(raw_candidates)

    def correlate_candidates(
        self,
        candidates_with_exec: List[Tuple[NormalizedFindingCandidate, Optional[ScannerExecutionResult]]],
    ) -> Tuple[List[CorrelatedFinding], DeduplicationSummary]:
        """Correlates and merges raw candidates into deduplicated CorrelatedFindings."""
        total_raw = len(candidates_with_exec)
        if total_raw == 0:
            return [], DeduplicationSummary(
                total_raw_findings=0,
                total_unique_findings=0,
                duplicate_findings_merged=0,
                multi_scanner_corroborated_count=0,
                findings_by_severity={},
                findings_by_category={},
            )

        # Bucket candidates by correlation key
        buckets: Dict[str, List[Tuple[NormalizedFindingCandidate, Optional[ScannerExecutionResult]]]] = {}

        for cand, exc in candidates_with_exec:
            key = self._generate_correlation_key(cand, exc)
            if key not in buckets:
                buckets[key] = []
            buckets[key].append((cand, exc))

        # Consolidate each bucket into a CorrelatedFinding
        correlated_findings: List[CorrelatedFinding] = []
        multi_scanner_count = 0
        severity_counts: Dict[str, int] = {}
        category_counts: Dict[str, int] = {}

        for corr_key, group in buckets.items():
            consolidated = self._consolidate_group(corr_key, group)
            correlated_findings.append(consolidated)

            if consolidated.scanner_count >= 2:
                multi_scanner_count += 1

            severity_counts[consolidated.severity] = severity_counts.get(consolidated.severity, 0) + 1
            category_counts[consolidated.category] = category_counts.get(consolidated.category, 0) + 1

        # Sort findings by severity (Critical first)
        correlated_findings.sort(
            key=lambda x: (
                -SEVERITY_ORDER.get(x.severity, 0),
                -x.scanner_count,
                x.file_path or "",
                x.line_number or 0,
            )
        )

        duplicates_merged = total_raw - len(correlated_findings)
        summary = DeduplicationSummary(
            total_raw_findings=total_raw,
            total_unique_findings=len(correlated_findings),
            duplicate_findings_merged=duplicates_merged,
            multi_scanner_corroborated_count=multi_scanner_count,
            findings_by_severity=severity_counts,
            findings_by_category=category_counts,
        )

        return correlated_findings, summary

    def _generate_correlation_key(
        self,
        candidate: NormalizedFindingCandidate,
        exec_info: Optional[ScannerExecutionResult],
    ) -> str:
        """
        Computes a canonical correlation key that bridges scanner-specific representations
        into a unified vulnerability occurrence concept.
        """
        norm_path = normalize_file_path(candidate.file_path)
        rule_lower = candidate.rule_id.lower()
        title_lower = candidate.title.lower()
        desc_lower = candidate.description.lower()
        category, _, _, _ = infer_taxonomy(candidate.rule_id, candidate.title, candidate.description, candidate.raw_metadata)

        # ── Strategy 1: Dependency Vulnerabilities (SCA CVEs) ───────────────
        cve_match = CVE_REGEX.search(f"{rule_lower} {title_lower} {desc_lower}")
        if cve_match:
            cve_id = cve_match.group(1).upper()
            pkg = candidate.raw_metadata.get("package") or ""
            if not pkg:
                # Try finding package name in snippet or description
                if candidate.snippet and len(candidate.snippet.split()) > 0:
                    pkg = candidate.snippet.split()[0].lower()
            return f"sca:{cve_id}:{pkg.lower()}:{norm_path}"

        # ── Strategy 2: Plaintext Secrets ───────────────────────────────────
        if category == "SECRETS":
            # Bucket line within +/- 2 lines (line // 3)
            line = candidate.line_number or 0
            line_bucket = line // 3
            # If secret hash prefix exists in metadata, include it
            secret_hash = candidate.raw_metadata.get("secret_hash_prefix") or ""
            return f"secret:{norm_path}:{line_bucket}:{secret_hash}"

        # ── Strategy 3: Infrastructure as Code (IaC) ────────────────────────
        if category == "IAC":
            line = candidate.line_number or 0
            # Normalize check ID root (e.g. CKV_DOCKER_2 or DS002)
            check_root = rule_lower.split(":")[-1].split("/")[-1]
            return f"iac:{norm_path}:{line}:{check_root}"

        # ── Strategy 4: Code Vulnerabilities (SAST Injections/Auth) ─────────
        if category in {"INJECTION", "AUTH", "CRYPTO"}:
            line = candidate.line_number or 0
            line_bucket = line // 2
            return f"sast:{norm_path}:{line_bucket}:{category}"

        # ── Strategy 5: Exact Location & Fallback ───────────────────────────
        return f"loc:{norm_path}:{candidate.line_number or 0}:{candidate.rule_id}"

    def _consolidate_group(
        self,
        correlation_key: str,
        group: List[Tuple[NormalizedFindingCandidate, Optional[ScannerExecutionResult]]],
    ) -> CorrelatedFinding:
        """Consolidates a group of matching candidates into a single CorrelatedFinding."""
        evidence_sources: List[FindingEvidenceSource] = []
        participating_scanners: Set[str] = set()
        severities: List[str] = []

        primary_cand = group[0][0]
        # Choose best title, description, and snippet across all candidates
        best_title = primary_cand.title
        best_desc = primary_cand.description
        best_snippet = primary_cand.snippet
        best_file = primary_cand.file_path
        best_line = primary_cand.line_number
        best_col = primary_cand.column_number

        for cand, exc in group:
            scanner_name = (
                exc.scanner_name
                if exc
                else cand.raw_metadata.get("engine")
                or cand.rule_id.split(":")[0]
                or "scanner"
            )
            scanner_type = (
                exc.scanner_type
                if exc
                else cand.raw_metadata.get("scanner_type")
                or "SAST"
            )

            participating_scanners.add(scanner_name)
            severities.append(cand.severity)

            # Pick longest, most informative description
            if len(cand.description or "") > len(best_desc or ""):
                best_desc = cand.description
            # Pick longest snippet
            if cand.snippet and (not best_snippet or len(cand.snippet) > len(best_snippet)):
                best_snippet = cand.snippet
            if cand.line_number and not best_line:
                best_line = cand.line_number
            if cand.column_number and not best_col:
                best_col = cand.column_number

            evidence_sources.append(
                FindingEvidenceSource(
                    scanner_name=scanner_name,
                    scanner_type=scanner_type,
                    rule_id=cand.rule_id,
                    severity=cand.severity,
                    title=cand.title,
                    message=cand.description,
                    file_path=cand.file_path,
                    line_number=cand.line_number,
                    column_number=cand.column_number,
                    snippet=cand.snippet,
                    fingerprint=cand.fingerprint,
                    raw_metadata=cand.raw_metadata,
                )
            )

        # Harmonize severity to the highest
        harmonized_sev = pick_highest_severity(severities)

        # Derive taxonomy
        category, cwe, owasp, remediation = infer_taxonomy(
            primary_cand.rule_id,
            best_title,
            best_desc,
            primary_cand.raw_metadata,
        )

        # Clean title to ensure professional presentation
        clean_title = best_title
        if clean_title.startswith(("SAST: ", "Container CVE: ", "Secret Exposed: ")):
            clean_title = clean_title.split(": ", 1)[-1]

        # Multi-scanner verification confidence rating
        scanner_count = len(participating_scanners)
        if scanner_count >= 2:
            verification_status = "MULTI_SCANNER_VERIFIED"
            confidence = "VERY_HIGH"
        else:
            verification_status = "SINGLE_SCANNER_VERIFIED"
            confidence = "HIGH" if category in {"SECRETS", "SCA"} else "MEDIUM"

        # Stable canonical cross-scanner fingerprint
        norm_file = normalize_file_path(best_file)
        fp_str = f"thing:{category}:{norm_file}:{best_line}:{correlation_key}"
        canonical_fp = hashlib.sha256(fp_str.encode("utf-8")).hexdigest()
        finding_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, canonical_fp))

        # Consolidated metadata
        consolidated_meta = {
            "canonical_correlation_key": correlation_key,
            "evidence_count": len(evidence_sources),
            "evidence_sources": [s.model_dump() for s in evidence_sources],
            "participating_scanners": sorted(list(participating_scanners)),
            "verification_status": verification_status,
            "confidence": confidence,
            "primary_engine": list(participating_scanners)[0] if participating_scanners else "unknown",
        }

        return CorrelatedFinding(
            id=finding_id,
            canonical_fingerprint=canonical_fp,
            rule_id=primary_cand.rule_id,
            title=clean_title,
            description=best_desc,
            severity=harmonized_sev,
            category=category,
            cwe_id=cwe,
            owasp_category=owasp,
            file_path=best_file,
            line_number=best_line,
            column_number=best_col,
            snippet=best_snippet,
            remediation=remediation,
            confidence=confidence,
            verification_status=verification_status,
            participating_scanners=sorted(list(participating_scanners)),
            scanner_count=scanner_count,
            evidence_sources=evidence_sources,
            raw_metadata=consolidated_meta,
        )

    @staticmethod
    def to_normalized_candidate(cf: CorrelatedFinding) -> NormalizedFindingCandidate:
        """Converts a CorrelatedFinding back to a NormalizedFindingCandidate for DB persistence."""
        return NormalizedFindingCandidate(
            rule_id=cf.rule_id,
            title=cf.title,
            description=cf.description,
            severity=cf.severity,
            file_path=cf.file_path,
            line_number=cf.line_number,
            column_number=cf.column_number,
            snippet=cf.snippet,
            fingerprint=cf.canonical_fingerprint,
            raw_metadata=cf.raw_metadata,
        )
