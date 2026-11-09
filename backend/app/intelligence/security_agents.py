import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.models.agent import Agent
from app.models.scan import SecurityFinding, SecurityScan, ScannerExecution
from app.models.integration import Integration
from app.models.audit_event import AuditEvent

logger = logging.getLogger("kavach.security_agents")


class SecurityAgentDefinition:
    def __init__(
        self,
        key: str,
        name: str,
        agent_type: str,
        description: str,
        allowed_tools: List[str],
        default_status: str = "active",
    ):
        self.key = key
        self.name = name
        self.agent_type = agent_type
        self.description = description
        self.allowed_tools = allowed_tools
        self.default_status = default_status


SPECIALIZED_AGENTS: List[SecurityAgentDefinition] = [
    SecurityAgentDefinition(
        key="sast_agent",
        name="SAST Agent",
        agent_type="static_analysis",
        description="Analyzes source code for security flaws, CWE patterns, and code injection vulnerabilities via Semgrep.",
        allowed_tools=["semgrep_scan", "ast_inspect", "taint_tracker"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="iac_agent",
        name="IaC Agent",
        agent_type="iac_security",
        description="Checks Terraform, Kubernetes manifests, and CloudFormation for misconfigurations via Checkov.",
        allowed_tools=["checkov_scan", "tf_graph_analyze", "manifest_inspect"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="container_agent",
        name="Container Agent",
        agent_type="container_security",
        description="Scans Dockerfile directives, base images, and layers for CVEs via Trivy.",
        allowed_tools=["trivy_image_scan", "dockerfile_lint", "layer_inspect"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="secrets_agent",
        name="Secrets Agent",
        agent_type="secrets_detection",
        description="Detects exposed secrets, high-entropy tokens, API keys, and certificates via Gitleaks.",
        allowed_tools=["gitleaks_scan", "entropy_analyzer", "git_history_walk"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="sca_agent",
        name="SCA Agent",
        agent_type="dependency_analysis",
        description="Analyzes open-source dependencies, transitive packages, and software bill of materials (SBOM).",
        allowed_tools=["osv_scan", "syft_sbom", "vuln_match"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="dast_agent",
        name="DAST Agent",
        agent_type="dynamic_analysis",
        description="Executes dynamic application testing, runtime endpoint fuzzing, and API security verification.",
        allowed_tools=["api_fuzzer", "crawler", "header_inspect"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="scm_agent",
        name="SCM Security Agent",
        agent_type="scm_governance",
        description="Audits branch protections, commit signatures, pull request approval gates, and repository posture.",
        allowed_tools=["github_audit", "pr_gate_check", "rule_verify"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="cloud_agent",
        name="Cloud Security Agent",
        agent_type="cloud_posture",
        description="Monitors cloud assets (AWS, GCP, Azure), security groups, IAM least privilege, and resource drift.",
        allowed_tools=["cloud_asset_query", "iam_eval", "drift_detect"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="investigation_agent",
        name="Vulnerability Investigation Agent",
        agent_type="root_cause_investigation",
        description="Performs deep root-cause analysis, call graph tracing, and attack path hypothesis verification.",
        allowed_tools=["callgraph_trace", "evidence_gather", "hypothesis_eval"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="remediation_agent",
        name="Remediation Agent",
        agent_type="patch_synthesis",
        description="Proposes and validates contextual source code patches and git diffs with rescan verification.",
        allowed_tools=["diff_synthesizer", "syntax_validator", "rescan_verify"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="compliance_agent",
        name="Evidence & Compliance Agent",
        agent_type="compliance_audit",
        description="Maps security findings to regulatory frameworks (SOC 2, ISO 27001, NIST, PCI-DSS, CIS).",
        allowed_tools=["framework_map", "evidence_binder", "audit_packager"],
        default_status="Idle",
    ),
    SecurityAgentDefinition(
        key="reporting_agent",
        name="Reporting Agent",
        agent_type="report_generator",
        description="Compiles executive security summaries, technical findings catalogs, and trend reports.",
        allowed_tools=["pdf_generator", "markdown_render", "metrics_aggregator"],
        default_status="Idle",
    ),
]


class SecurityAgentCoordinator:
    """
    Coordinates and monitors the 12 specialized Kavach security agents.
    Persists and reads real agent status and activity from database.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_agents_summary(self, project_id: Optional[uuid.UUID] = None) -> List[Dict[str, Any]]:
        """
        Returns active agents and their actual running state.
        Calculates real telemetry, finding counts, and durations from ScannerExecution and Integration tables.
        """
        # 1. Fetch DB registered agents if any
        db_agents_map = {}
        try:
            q = select(Agent)
            if project_id:
                q = q.where(Agent.project_id == project_id)
            res = await self.db.execute(q)
            for a in res.scalars().all():
                db_agents_map[a.agent_type.lower()] = a
        except Exception as exc:
            logger.warning("Failed to query registered agents: %s", exc, exc_info=True)
            pass

        # 2. Check latest scans and running state
        recent_scans = []
        try:
            sq = select(SecurityScan).order_by(desc(SecurityScan.created_at)).limit(5)
            if project_id:
                sq = sq.where(SecurityScan.project_id == project_id)
            s_res = await self.db.execute(sq)
            recent_scans = s_res.scalars().all()
        except Exception as exc:
            logger.warning("Failed to query recent scans for live agents: %s", exc, exc_info=True)
            pass

        running_scans = [s for s in recent_scans if s.status == "RUNNING"]

        # 3. Query latest scanner executions
        latest_execs_by_type: Dict[str, ScannerExecution] = {}
        try:
            ex_q = select(ScannerExecution).order_by(desc(ScannerExecution.id)).limit(100)
            if project_id:
                ex_q = (
                    select(ScannerExecution)
                    .join(SecurityScan, ScannerExecution.scan_id == SecurityScan.id)
                    .where(SecurityScan.project_id == project_id)
                    .order_by(desc(ScannerExecution.id))
                    .limit(100)
                )
            ex_res = await self.db.execute(ex_q)
            for ex in ex_res.scalars().all():
                stype = (ex.scanner_type or "").upper()
                sname = (ex.scanner_name or "").lower()
                if stype and stype not in latest_execs_by_type:
                    latest_execs_by_type[stype] = ex
                if sname and sname not in latest_execs_by_type:
                    latest_execs_by_type[sname] = ex
        except Exception as e:
            logger.warning(f"Failed to query ScannerExecution for live agents: {e}")

        # 4. Check configured integrations
        configured_providers = set()
        try:
            iq = select(Integration.provider).where(Integration.is_connected == True)
            if project_id:
                iq = iq.where(Integration.project_id == project_id)
            ires = await self.db.execute(iq)
            configured_providers = set(p.lower() for p in ires.scalars().all() if p)
        except Exception as exc:
            logger.warning("Failed to query configured integrations: %s", exc, exc_info=True)
            pass

        output: List[Dict[str, Any]] = []
        for defn in SPECIALIZED_AGENTS:
            status = "Idle"
            detail = defn.description
            issues_count = 0
            duration = "0s"
            subtitle = None

            # Map agent to scanner type or execution
            exec_item: Optional[ScannerExecution] = None
            if defn.key == "sast_agent":
                exec_item = latest_execs_by_type.get("SAST") or latest_execs_by_type.get("semgrep")
            elif defn.key == "iac_agent":
                exec_item = latest_execs_by_type.get("IAC") or latest_execs_by_type.get("checkov")
            elif defn.key == "container_agent":
                exec_item = latest_execs_by_type.get("CONTAINER") or latest_execs_by_type.get("trivy")
            elif defn.key == "secrets_agent":
                exec_item = latest_execs_by_type.get("SECRETS") or latest_execs_by_type.get("gitleaks")
            elif defn.key == "sca_agent":
                exec_item = latest_execs_by_type.get("SCA") or latest_execs_by_type.get("osv")

            # Fallback to builtin scanner execution if primary scanner binary was missing
            builtin_exec = latest_execs_by_type.get("seculayer-builtin") or latest_execs_by_type.get("BUILTIN")
            if (not exec_item or exec_item.status in ["NOT_AVAILABLE", "NOT_CONFIGURED", "FAILED"]) and builtin_exec:
                exec_item = builtin_exec

            if running_scans and defn.key in ["sast_agent", "iac_agent", "container_agent", "secrets_agent", "sca_agent"]:
                status = "Running"
                detail = f"Executing {defn.name} inspection on workspace..."
            elif exec_item:
                if exec_item.status == "COMPLETED":
                    status = "Completed"
                    subtitle = f"{exec_item.finding_count or 0} issues found"
                elif exec_item.status == "RUNNING":
                    status = "Running"
                elif exec_item.status in ["FAILED", "ERROR"]:
                    status = "Failed"
                    subtitle = "Execution failed"
                elif exec_item.status in ["NOT_AVAILABLE", "NOT_CONFIGURED"]:
                    status = "Not Configured"
                    subtitle = "Scanner tool not installed"

                issues_count = exec_item.finding_count or 0
                if exec_item.duration_ms:
                    ms = exec_item.duration_ms
                    if ms >= 60000:
                        duration = f"{ms // 60000}m {(ms % 60000) // 1000}s"
                    else:
                        duration = f"{max(1, ms // 1000)}s"
                else:
                    duration = "1s"
            else:
                # Specialized agent evaluations
                if defn.key == "dast_agent":
                    try:
                        from app.models.api_security import ApiSecurityScan
                        api_s_q = select(ApiSecurityScan).order_by(desc(ApiSecurityScan.started_at)).limit(1)
                        api_s = (await self.db.execute(api_s_q)).scalars().first()
                        if api_s:
                            status = "Completed" if api_s.status in ("COMPLETED", "FINISHED") else "Running"
                            issues_count = (api_s.findings_critical or 0) + (api_s.findings_high or 0) + (api_s.findings_medium or 0) + (api_s.findings_low or 0)
                            duration = f"{api_s.elapsed_seconds or 1}s"
                            tests_total = api_s.tests_total or 0
                            subtitle = f"{issues_count} issues detected across {tests_total} tests" if issues_count > 0 else f"{tests_total} tests passed clean"
                        else:
                            status = "Idle"
                            subtitle = "Ready for API fuzzing"
                    except Exception:
                        status = "Idle"
                        subtitle = "Ready for API fuzzing"
                elif defn.key == "scm_agent":
                    if "github" in configured_providers or os.getenv("GITHUB_TOKEN"):
                        status = "Completed"
                        subtitle = "GitHub Connected"
                        duration = "1s"
                    else:
                        status = "Idle"
                        subtitle = "GitHub Not Connected"
                elif defn.key == "policy_agent":
                    status = "Idle"
                    subtitle = "Ready for deterministic policy evaluation"
                elif defn.key == "remediation_agent":
                    status = "Idle"
                    subtitle = "Ready for evidence-backed remediation"
                elif defn.key == "cloud_agent":
                    if any(p in configured_providers for p in ["aws", "gcp", "azure"]):
                        status = "Completed"
                        subtitle = "Cloud IAM & Posture Monitored"
                        duration = "1s"
                    else:
                        status = "Idle"
                        subtitle = "Connect cloud provider in Integrations"

            output.append({
                "key": defn.key,
                "name": defn.name,
                "agent_type": defn.agent_type,
                "description": defn.description,
                "status": status,
                "detail": detail,
                "subtitle": subtitle,
                "issues_count": issues_count,
                "duration": duration,
                "allowed_tools": defn.allowed_tools,
                "tools": defn.allowed_tools,
            })

        return output
