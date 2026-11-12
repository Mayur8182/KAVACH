"""
Thing Scan Orchestrator — Dynamic Scan Planner
Analyzes detected asset profiles against registered scanner capabilities and host availability.
Deterministically decides which scanners run vs skip, estimates execution budgets,
and constructs parallel execution phases.
Adheres strictly to AGENTS.md: Deterministic planning, zero hardcoded decisions.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from app.engines.orchestrator.models import (
    AssetProfile,
    ExecutionPhase,
    PlanAction,
    ScanPlan,
    ScannerPlanDecision,
)
from app.engines.scanner.registry import ScannerRegistry, default_scanner_registry


class ScanPlanner:
    """
    Evaluates an AssetProfile to produce an optimized, authoritative ScanPlan.
    """

    def __init__(self, registry: Optional[ScannerRegistry] = None):
        self.registry = registry or default_scanner_registry

    async def create_plan(
        self,
        asset_profile: AssetProfile,
        requested_scanners: Optional[List[str]] = None,
        exclude_scanners: Optional[List[str]] = None,
        policy_requirements: Optional[List[Dict[str, Any]]] = None,
    ) -> ScanPlan:
        """
        Creates a deterministic ScanPlan for the target AssetProfile.
        Probes real host scanner binaries and maps matching assets to capabilities.
        """
        plan_id = str(uuid.uuid4())
        requested_set = {s.lower() for s in requested_scanners} if requested_scanners else None
        exclude_set = {s.lower() for s in exclude_scanners} if exclude_scanners else set()

        decisions: List[ScannerPlanDecision] = []

        # 1. Evaluate Kavach Builtin (Native zero-dependency guardrail)
        if "seculayer-builtin" not in exclude_set:
            decisions.append(
                ScannerPlanDecision(
                    scanner_name="seculayer-builtin",
                    scanner_type="SAST",
                    tool_name="Kavach Builtin AST Engine",
                    action=PlanAction.RUN,
                    priority=1,
                    reason="Native zero-dependency AST & deterministic rule engine covers core injection, secret, and auth flaws.",
                    is_available_on_host=True,
                    host_status_message="Built-in Python AST engine always available",
                    matched_assets_count=asset_profile.total_files_inspected,
                    sample_assets=asset_profile.manifest_files[:3] + asset_profile.iac_files[:3],
                    estimated_duration_seconds=max(5, min(60, asset_profile.total_files_inspected // 100)),
                )
            )

        # 2. Evaluate Gitleaks (Secrets)
        gitleaks_scanner = self.registry.get_scanner("gitleaks")
        gitleaks_avail, gitleaks_msg, _ = (
            await gitleaks_scanner.validate_environment()
            if gitleaks_scanner
            else (False, "Gitleaks not registered", None)
        )

        if "gitleaks" not in exclude_set:
            if requested_set and "gitleaks" not in requested_set:
                gitleaks_action = PlanAction.SKIP
                gitleaks_reason = "Excluded by user request selection."
            elif not gitleaks_avail:
                gitleaks_action = PlanAction.SKIP
                gitleaks_reason = f"Gitleaks CLI not installed on host ({gitleaks_msg}). Falling back to Kavach Builtin secret detection."
            elif asset_profile.total_files_inspected == 0 and not asset_profile.is_git_repository:
                gitleaks_action = PlanAction.SKIP
                gitleaks_reason = "No target files or git commits available for secret entropy analysis."
            else:
                gitleaks_action = PlanAction.RUN
                risk_count = len(asset_profile.secret_risk_files)
                gitleaks_reason = (
                    f"Target contains {asset_profile.total_files_inspected} files and "
                    f"{'active Git repository' if asset_profile.is_git_repository else 'local workspace'}. "
                    f"Identified {risk_count} sensitive config/key files for secret leak detection."
                )

            decisions.append(
                ScannerPlanDecision(
                    scanner_name="gitleaks",
                    scanner_type="SECRETS",
                    tool_name="Gitleaks",
                    action=gitleaks_action,
                    priority=1,
                    reason=gitleaks_reason,
                    is_available_on_host=gitleaks_avail,
                    host_status_message=gitleaks_msg,
                    matched_assets_count=asset_profile.total_files_inspected,
                    sample_assets=asset_profile.secret_risk_files[:5],
                    estimated_duration_seconds=max(5, min(90, asset_profile.total_files_inspected // 50)),
                )
            )

        # 3. Evaluate Semgrep (SAST)
        semgrep_scanner = self.registry.get_scanner("semgrep")
        semgrep_avail, semgrep_msg, _ = (
            await semgrep_scanner.validate_environment()
            if semgrep_scanner
            else (False, "Semgrep not registered", None)
        )

        total_source_files = sum(asset_profile.languages.values())
        top_languages = sorted(asset_profile.languages.items(), key=lambda x: x[1], reverse=True)[:3]
        top_lang_str = ", ".join(f"{lang} ({cnt})" for lang, cnt in top_languages) if top_languages else "none"

        if "semgrep" not in exclude_set:
            if requested_set and "semgrep" not in requested_set:
                semgrep_action = PlanAction.SKIP
                semgrep_reason = "Excluded by user request selection."
            elif not semgrep_avail:
                semgrep_action = PlanAction.SKIP
                semgrep_reason = f"Semgrep CLI not installed on host ({semgrep_msg}). Falling back to Kavach Builtin SAST analysis."
            elif total_source_files == 0:
                semgrep_action = PlanAction.SKIP
                semgrep_reason = "No source code files matching supported programming languages detected in target."
            else:
                semgrep_action = PlanAction.RUN
                semgrep_reason = f"Detected {total_source_files} source code files with top languages: {top_lang_str}."

            decisions.append(
                ScannerPlanDecision(
                    scanner_name="semgrep",
                    scanner_type="SAST",
                    tool_name="Semgrep",
                    action=semgrep_action,
                    priority=2,
                    reason=semgrep_reason,
                    is_available_on_host=semgrep_avail,
                    host_status_message=semgrep_msg,
                    matched_assets_count=total_source_files,
                    sample_assets=[a.path for a in asset_profile.discovered_assets if a.category in asset_profile.languages][:5],
                    estimated_duration_seconds=max(10, min(180, total_source_files // 25)),
                )
            )

        # 4. Evaluate Checkov (IaC)
        checkov_scanner = self.registry.get_scanner("checkov")
        checkov_avail, checkov_msg, _ = (
            await checkov_scanner.validate_environment()
            if checkov_scanner
            else (False, "Checkov not registered", None)
        )

        iac_target_count = len(asset_profile.iac_files) + len(asset_profile.container_files)

        if "checkov" not in exclude_set:
            if requested_set and "checkov" not in requested_set:
                checkov_action = PlanAction.SKIP
                checkov_reason = "Excluded by user request selection."
            elif not checkov_avail:
                checkov_action = PlanAction.SKIP
                checkov_reason = f"Checkov CLI not installed on host ({checkov_msg})."
            elif iac_target_count == 0:
                checkov_action = PlanAction.SKIP
                checkov_reason = "No Infrastructure as Code (Terraform, Kubernetes, Helm) or Dockerfiles detected in target."
            else:
                checkov_action = PlanAction.RUN
                checkov_reason = f"Detected {len(asset_profile.iac_files)} IaC templates and {len(asset_profile.container_files)} container files."

            decisions.append(
                ScannerPlanDecision(
                    scanner_name="checkov",
                    scanner_type="IAC",
                    tool_name="Checkov",
                    action=checkov_action,
                    priority=2,
                    reason=checkov_reason,
                    is_available_on_host=checkov_avail,
                    host_status_message=checkov_msg,
                    matched_assets_count=iac_target_count,
                    sample_assets=(asset_profile.iac_files + asset_profile.container_files)[:5],
                    estimated_duration_seconds=max(15, min(120, iac_target_count * 5)),
                )
            )

        # 5. Evaluate OSV-Scanner (SCA)
        osv_scanner = self.registry.get_scanner("osv-scanner")
        osv_avail, osv_msg, _ = (
            await osv_scanner.validate_environment()
            if osv_scanner
            else (False, "OSV-Scanner not registered", None)
        )

        manifest_count = len(asset_profile.manifest_files)
        ecosystems_str = ", ".join(asset_profile.package_ecosystems) if asset_profile.package_ecosystems else "none"

        if "osv-scanner" not in exclude_set:
            if requested_set and "osv-scanner" not in requested_set:
                osv_action = PlanAction.SKIP
                osv_reason = "Excluded by user request selection."
            elif not osv_avail:
                osv_action = PlanAction.SKIP
                osv_reason = f"OSV-Scanner CLI not installed on host ({osv_msg})."
            elif manifest_count == 0:
                osv_action = PlanAction.SKIP
                osv_reason = "No supported package dependency manifests (package.json, requirements.txt, go.mod, etc.) detected."
            else:
                osv_action = PlanAction.RUN
                osv_reason = f"Detected {manifest_count} package manifest(s) across ecosystems: {ecosystems_str}."

            decisions.append(
                ScannerPlanDecision(
                    scanner_name="osv-scanner",
                    scanner_type="SCA",
                    tool_name="OSV-Scanner",
                    action=osv_action,
                    priority=3,
                    reason=osv_reason,
                    is_available_on_host=osv_avail,
                    host_status_message=osv_msg,
                    matched_assets_count=manifest_count,
                    sample_assets=asset_profile.manifest_files[:5],
                    estimated_duration_seconds=max(10, min(90, manifest_count * 10)),
                )
            )

        # 6. Evaluate Trivy (Container & Filesystem)
        trivy_scanner = self.registry.get_scanner("trivy")
        trivy_avail, trivy_msg, _ = (
            await trivy_scanner.validate_environment()
            if trivy_scanner
            else (False, "Trivy not registered", None)
        )

        has_container_or_manifests = len(asset_profile.container_files) > 0 or len(asset_profile.manifest_files) > 0

        if "trivy" not in exclude_set:
            if requested_set and "trivy" not in requested_set:
                trivy_action = PlanAction.SKIP
                trivy_reason = "Excluded by user request selection."
            elif not trivy_avail:
                trivy_action = PlanAction.SKIP
                trivy_reason = f"Trivy CLI not installed on host ({trivy_msg})."
            elif not has_container_or_manifests:
                trivy_action = PlanAction.SKIP
                trivy_reason = "No Dockerfiles, container configs, or dependency manifests detected for Trivy analysis."
            else:
                trivy_action = PlanAction.RUN
                trivy_reason = (
                    f"Target contains {len(asset_profile.container_files)} container file(s) and "
                    f"{len(asset_profile.manifest_files)} dependency manifest(s) for vulnerability auditing."
                )

            decisions.append(
                ScannerPlanDecision(
                    scanner_name="trivy",
                    scanner_type="CONTAINER",
                    tool_name="Trivy",
                    action=trivy_action,
                    priority=3,
                    reason=trivy_reason,
                    is_available_on_host=trivy_avail,
                    host_status_message=trivy_msg,
                    matched_assets_count=len(asset_profile.container_files) + len(asset_profile.manifest_files),
                    sample_assets=(asset_profile.container_files + asset_profile.manifest_files)[:5],
                    estimated_duration_seconds=max(15, min(120, (len(asset_profile.container_files) + len(asset_profile.manifest_files)) * 8)),
                )
            )

        # Calculate planned vs skipped lists
        planned_scanners = [d.scanner_name for d in decisions if d.action == PlanAction.RUN]
        skipped_scanners = [d.scanner_name for d in decisions if d.action == PlanAction.SKIP]

        # Construct parallel execution phases
        execution_phases = self._build_execution_phases(decisions)

        total_estimated = sum(d.estimated_duration_seconds for d in decisions if d.action == PlanAction.RUN)
        # Account for parallel phase execution
        phase_max_durations = []
        for phase in execution_phases:
            durations = [
                d.estimated_duration_seconds
                for d in decisions
                if d.scanner_name in phase.scanners and d.action == PlanAction.RUN
            ]
            phase_max_durations.append(max(durations) if durations else 0)

        effective_duration = sum(phase_max_durations) if phase_max_durations else total_estimated

        return ScanPlan(
            plan_id=plan_id,
            target_path=asset_profile.target_path,
            asset_profile=asset_profile,
            decisions=decisions,
            planned_scanners=planned_scanners,
            skipped_scanners=skipped_scanners,
            execution_phases=execution_phases,
            total_estimated_duration_seconds=max(10, effective_duration),
        )

    def _build_execution_phases(self, decisions: List[ScannerPlanDecision]) -> List[ExecutionPhase]:
        """
        Organizes planned scanners into logical sequential phases with internal parallelism:
        Phase 1: Credentials & Baseline Guardrails (gitleaks, seculayer-builtin)
        Phase 2: Static Code & Infrastructure Analysis (semgrep, checkov)
        Phase 3: Supply Chain & Dependency Analysis (osv-scanner, trivy)
        """
        active_names = {d.scanner_name for d in decisions if d.action == PlanAction.RUN}
        phases: List[ExecutionPhase] = []

        # Phase 1: Fast baseline & credentials
        p1_scanners = [s for s in ["seculayer-builtin", "gitleaks"] if s in active_names]
        if p1_scanners:
            phases.append(
                ExecutionPhase(
                    phase_number=1,
                    name="Credentials & Fast Baseline Security",
                    scanners=p1_scanners,
                    run_in_parallel=True,
                    description="Detects high-entropy plaintext secrets, exposed keys, and core injection patterns immediately.",
                )
            )

        # Phase 2: Static code & Infrastructure
        p2_scanners = [s for s in ["semgrep", "checkov"] if s in active_names]
        if p2_scanners:
            phases.append(
                ExecutionPhase(
                    phase_number=len(phases) + 1,
                    name="Static Code & Infrastructure as Code Posture",
                    scanners=p2_scanners,
                    run_in_parallel=True,
                    description="Performs deep semantic AST code analysis and audits cloud infrastructure manifests.",
                )
            )

        # Phase 3: Dependencies & Supply chain
        p3_scanners = [s for s in ["osv-scanner", "trivy"] if s in active_names]
        if p3_scanners:
            phases.append(
                ExecutionPhase(
                    phase_number=len(phases) + 1,
                    name="Supply Chain & Container Security",
                    scanners=p3_scanners,
                    run_in_parallel=True,
                    description="Cross-references dependencies against known CVE databases and audits container configurations.",
                )
            )

        return phases
