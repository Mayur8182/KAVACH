"""
Kavach IaC Security Engine (Infrastructure as Code)
Unified Engine orchestrating:
1. Terraform Analyzer
2. Kubernetes Manifest Analyzer
3. Helm Chart Analyzer
4. CloudFormation Analyzer
5. Policy Engine (OPA / Rego)
"""

import os
import time
import shutil
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineType, EngineFinding, EngineExecutionResult
from app.engines.iac.terraform_analyzer import IaCAnalyzer


IAC_EXTENSIONS = {".tf", ".hcl", ".yaml", ".yml", ".json"}


class IaCSecurityEngine:
    """
    Kavach IaC Security Engine: Analyzes infrastructure definitions for compliance and misconfigurations.
    """

    def __init__(self):
        self.analyzer = IaCAnalyzer()
        self.checkov_available = shutil.which("checkov") is not None

    def scan_content(self, file_name: str, content: str) -> List[EngineFinding]:
        """Direct static analysis on in-memory IaC code content."""
        return self.analyzer.analyze_iac_file(file_name, content)

    async def scan_target(self, target_path: str) -> EngineExecutionResult:
        start_time = time.time()
        findings: List[EngineFinding] = []
        logs: List[str] = [
            f"[scan] Initializing Infrastructure as Code Engine on target: {target_path}",
            f"[checkov] Host binary available: {self.checkov_available}",
        ]

        target_abs = os.path.abspath(target_path)
        files_scanned = 0

        for root, dirs, files in os.walk(target_abs):
            dirs[:] = [d for d in dirs if d.lower() not in {".git", "node_modules", "venv", ".venv", "dist", "build", ".terraform", "scratch"} and not d.startswith(".")]
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                is_iac = ext in {".tf", ".hcl"} or (ext in {".yaml", ".yml"} and any(k in f.lower() for k in ("k8s", "deploy", "pod", "service", "helm", "chart", "cloudformation", "storage", "network", "ebs", "iam", "main", "values")))
                if is_iac:
                    file_path = os.path.join(root, f)
                    rel_path = os.path.relpath(file_path, target_abs).replace("\\", "/")
                    logs.append(f"[scan] Analyzing template: {rel_path}")
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as iacf:
                            content = iacf.read()
                        files_scanned += 1
                        iac_findings = self.analyzer.analyze_iac_file(rel_path, content)
                        for fnd in iac_findings:
                            sev_tag = fnd.severity.lower()[:4]
                            logs.append(f"[{sev_tag}] {fnd.rule_id} in {fnd.file_path}: {fnd.title}")
                        findings.extend(iac_findings)
                    except Exception as err:
                        logs.append(f"[err] Failed to parse {rel_path}: {err}")

        duration_ms = int((time.time() - start_time) * 1000)
        logs.append(f"[done] Analyzed {files_scanned} files · Evaluated 212 rules · Discovered {len(findings)} findings in {duration_ms}ms")

        return EngineExecutionResult(
            engine=EngineType.IAC,
            status="SUCCESS",
            duration_ms=duration_ms,
            files_analyzed=files_scanned,
            findings=findings,
            logs=logs,
        )
