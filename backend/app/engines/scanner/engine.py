import asyncio
from typing import Any, Awaitable, Callable, Dict, List, Optional, Set
from app.engines.scanner.models import (
    FullScanVerificationResult,
    NormalizedFindingCandidate,
    ScannerExecutionResult,
    ScanTarget,
    VerificationRequirementEvaluation,
)
from app.engines.scanner.registry import ScannerRegistry, default_scanner_registry


# Mapping from Security Requirement Key to relevant scanner types and rule keywords
REQUIREMENT_RULE_MAPPINGS: Dict[str, Dict] = {
    "SECRETS_PROTECTION_REQUIRED": {
        "scanners": {"gitleaks", "semgrep"},
        "keywords": ["secret", "credential", "api_key", "token", "password", "private_key"],
    },
    "SECURE_DATABASE_ACCESS_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["sql", "sqli", "injection", "parameterized", "orm", "raw-sql"],
    },
    "INPUT_VALIDATION_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["injection", "xss", "traversal", "deserialization", "validation", "ssrf"],
    },
    "RATE_LIMITING_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["rate-limit", "dos", "throttling"],
    },
    "AUTHENTICATION_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["auth", "jwt", "session", "login", "password"],
    },
    "SESSION_SECURITY_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["cookie", "httponly", "samesite", "session"],
    },
    "AUTHORIZATION_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["authz", "permission", "rbac", "access-control", "idor"],
    },
    "ADMIN_ACTION_AUTHORIZATION_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["admin", "mfa", "privilege"],
    },
    "WEBHOOK_AUTHENTICITY_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["webhook", "hmac", "signature", "timing"],
    },
    "PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED": {
        "scanners": {"semgrep"},
        "keywords": ["idempotent", "idempotency", "payment", "charge"],
    },
    "CONTAINER_HARDENING_REQUIRED": {
        "scanners": {"trivy", "checkov"},
        "keywords": ["root", "privileged", "capabilities", "distroless", "user"],
    },
    "KUBERNETES_RBAC_REQUIRED": {
        "scanners": {"checkov"},
        "keywords": ["rbac", "cluster-admin", "serviceaccount", "wildcard"],
    },
    "TRANSPORT_SECURITY_REQUIRED": {
        "scanners": {"semgrep", "checkov"},
        "keywords": ["tls", "https", "ssl", "cleartext", "hsts"],
    },
}


class SecurityVerificationEngine:
    """
    Coordinates execution of real security scanners, aggregates findings,
    and deterministically evaluates Step 5 Security Requirements.
    """

    def __init__(self, registry: ScannerRegistry = default_scanner_registry) -> None:
        self.registry = registry

    async def verify_target(
        self,
        target: ScanTarget,
        selected_scanners: Optional[List[str]] = None,
        blueprint_requirements: Optional[List[Dict]] = None,
        on_event: Optional[Callable[[str, str, Dict[str, Any]], Awaitable[None]]] = None,
    ) -> FullScanVerificationResult:
        """Executes full scan and evaluates target against requirements."""
        return await self.execute_scan(target, selected_scanners, blueprint_requirements, on_event=on_event)

    async def execute_scan(
        self,
        target: ScanTarget,
        selected_scanners: Optional[List[str]] = None,
        blueprint_requirements: Optional[List[Dict]] = None,
        on_event: Optional[Callable[[str, str, Dict[str, Any]], Awaitable[None]]] = None,
    ) -> FullScanVerificationResult:
        scanners = self.registry.get_scanners_by_names(selected_scanners)

        async def _run_monitored(s):
            if on_event:
                try:
                    await on_event(s.scanner_name, "STARTING", {"engine": s.scanner_name, "type": s.scanner_type})
                except Exception:
                    pass
            try:
                res: ScannerExecutionResult = await s.scan(target)
                if on_event:
                    try:
                        await on_event(s.scanner_name, "COMPLETED" if res.status == "COMPLETED" else "FAILED", {
                            "engine": s.scanner_name,
                            "type": s.scanner_type,
                            "status": res.status,
                            "finding_count": len(res.findings),
                            "duration_ms": res.duration_ms,
                            "error_message": res.error_message,
                            "stdout_summary": res.stdout_summary,
                            "stderr_output": res.stderr_output,
                            "exit_code": res.exit_code,
                            "scanner_version": res.scanner_version,
                            "command": res.command,
                        })
                    except Exception:
                        pass
                return res
            except Exception as exc:
                if on_event:
                    try:
                        await on_event(s.scanner_name, "FAILED", {
                            "engine": s.scanner_name,
                            "type": s.scanner_type,
                            "status": "FAILED",
                            "error_message": str(exc),
                        })
                    except Exception:
                        pass
                raise

        execution_tasks = [_run_monitored(s) for s in scanners]

        # Execute all selected scanners concurrently
        execution_results: List[ScannerExecutionResult] = await asyncio.gather(
            *execution_tasks,
            return_exceptions=False,
        )

        # Perform cross-scanner correlation, deduplication, and evidence preservation
        from app.engines.orchestrator.deduplication import CrossScannerDeduplicator

        deduplicator = CrossScannerDeduplicator()
        correlated_findings, dedup_summary = deduplicator.process_scanner_executions(execution_results)

        # Convert to NormalizedFindingCandidates with rich provenance metadata for DB persistence
        all_findings = [deduplicator.to_normalized_candidate(cf) for cf in correlated_findings]

        # Evaluate Step 5 Blueprint Requirements based on real scanner evidence
        verifications = self.evaluate_requirements(
            requirements=blueprint_requirements or [],
            execution_results=execution_results,
            findings=all_findings,
        )

        overall_status = "COMPLETED"
        if all(r.status in {"FAILED", "NOT_CONFIGURED"} for r in execution_results):
            overall_status = "FAILED"
        elif any(r.status in {"FAILED", "NOT_CONFIGURED"} for r in execution_results):
            overall_status = "PARTIAL"

        return FullScanVerificationResult(
            status=overall_status,
            executions=execution_results,
            findings=all_findings,
            verifications=verifications,
            scanner_count=len(execution_results),
            finding_count=len(all_findings),
            correlated_findings=correlated_findings,
            deduplication_summary=dedup_summary.model_dump(),
        )

    def evaluate_requirements(
        self,
        requirements: List[Dict],
        execution_results: List[ScannerExecutionResult],
        findings: List[NormalizedFindingCandidate],
    ) -> List[VerificationRequirementEvaluation]:
        """
        Maps real findings to requirements deterministically.
        Rules:
        - If findings match -> VIOLATED
        - If relevant scanners ran and found 0 matching findings -> SATISFIED
        - If relevant scanners are not configured/failed -> UNKNOWN
        """
        results: List[VerificationRequirementEvaluation] = []
        exec_status_by_name = {e.scanner_name: e.status for e in execution_results}

        for req in requirements:
            req_id = str(req.get("id", ""))
            req_key = req.get("requirement_key", "")
            mapping = REQUIREMENT_RULE_MAPPINGS.get(req_key, {})
            relevant_scanners = mapping.get("scanners", set())
            keywords = mapping.get("keywords", [])

            # Find matching findings
            contributing = []
            for f in findings:
                # Match by scanner name or keyword in rule_id/title
                rule_text = f"{f.rule_id} {f.title} {f.description}".lower()
                matches_scanner = f.raw_metadata.get("engine", "") in relevant_scanners
                matches_keyword = any(k in rule_text for k in keywords)

                if matches_scanner and matches_keyword:
                    contributing.append(f)

            if contributing:
                results.append(
                    VerificationRequirementEvaluation(
                        requirement_id=req_id,
                        requirement_key=req_key,
                        status="VIOLATED",
                        rationale=f"Identified {len(contributing)} real security finding(s) violating this requirement.",
                        evidence_summary=f"Violations detected by scanner(s): {', '.join({c.raw_metadata.get('engine', 'scanner') for c in contributing})}",
                        contributing_findings=contributing,
                    )
                )
            else:
                # Check if relevant scanners actually ran
                scanners_ran = [
                    s for s in relevant_scanners
                    if exec_status_by_name.get(s) == "COMPLETED"
                ]
                scanners_missing = [
                    s for s in relevant_scanners
                    if exec_status_by_name.get(s) in {"NOT_CONFIGURED", "NOT_AVAILABLE", "FAILED", None}
                ]

                if scanners_ran:
                    results.append(
                        VerificationRequirementEvaluation(
                            requirement_id=req_id,
                            requirement_key=req_key,
                            status="SATISFIED",
                            rationale=f"Verified by real scanner(s) [{', '.join(scanners_ran)}] with zero reported violations.",
                            evidence_summary=f"Scanner execution completed clean without findings matching requirement criteria.",
                            contributing_findings=[],
                        )
                    )
                elif scanners_missing:
                    results.append(
                        VerificationRequirementEvaluation(
                            requirement_id=req_id,
                            requirement_key=req_key,
                            status="UNKNOWN",
                            rationale=f"Cannot verify requirement: required scanner(s) [{', '.join(scanners_missing)}] are not configured or failed to run.",
                            evidence_summary="Verification pending scanner availability.",
                            contributing_findings=[],
                        )
                    )
                else:
                    results.append(
                        VerificationRequirementEvaluation(
                            requirement_id=req_id,
                            requirement_key=req_key,
                            status="NOT_EVALUATED",
                            rationale="No automated scanner registered for this specific requirement category.",
                            evidence_summary="Manual or runtime verification required.",
                            contributing_findings=[],
                        )
                    )

        return results


# Global singleton verification engine
verification_engine = SecurityVerificationEngine()
