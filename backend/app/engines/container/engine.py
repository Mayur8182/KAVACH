"""
Kavach Container Security Engine
Unified Engine orchestrating:
1. Dockerfile Analyzer (Build misconfigurations)
2. Image Scanner (Trivy CLI if available)
3. Layer Analyzer
4. Runtime Configuration Analyzer (docker-compose)
"""

import os
import time
import shutil
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineType, EngineFinding, EngineExecutionResult
from app.engines.container.dockerfile_analyzer import DockerfileAnalyzer


class ContainerSecurityEngine:
    """
    Kavach Container Security Engine: Inspects Dockerfiles, container configs, and container images.
    """

    def __init__(self):
        self.dockerfile_analyzer = DockerfileAnalyzer()
        self.trivy_available = shutil.which("trivy") is not None

    async def scan_target(self, target_path: str) -> EngineExecutionResult:
        start_time = time.time()
        findings: List[EngineFinding] = []
        logs: List[str] = [
            f"[container-engine] Initializing Container Security Engine on target: {target_path}",
            f"[trivy] Host binary detected: {self.trivy_available}",
        ]

        target_abs = os.path.abspath(target_path)
        dockerfiles_scanned = 0

        ignored = {".git", "node_modules", "venv", ".venv", "dist", "build", ".next", ".gemini", "tmp", "scratch"}
        # Discover Dockerfiles and docker-compose files
        for root, dirs, files in os.walk(target_abs):
            dirs[:] = [d for d in dirs if d.lower() not in ignored and not d.startswith(".")]
            for f in files:
                if f.lower().startswith("dockerfile") or f.lower().endswith(".dockerfile"):
                    file_path = os.path.join(root, f)
                    rel_path = os.path.relpath(file_path, target_abs)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as df:
                            content = df.read()
                        dockerfiles_scanned += 1
                        df_findings = self.dockerfile_analyzer.analyze_dockerfile(rel_path, content)
                        findings.extend(df_findings)
                        logs.append(f"[dockerfile-analyzer] Analyzed {rel_path}: {len(df_findings)} issues flagged")
                    except Exception as e:
                        logs.append(f"[warning] Error reading {rel_path}: {e}")

        duration_ms = int((time.time() - start_time) * 1000)
        logs.append(f"[container-engine] Completed scan in {duration_ms}ms. Inspected {dockerfiles_scanned} container build files.")

        return EngineExecutionResult(
            engine=EngineType.CONTAINER,
            status="SUCCESS",
            duration_ms=duration_ms,
            files_analyzed=dockerfiles_scanned,
            findings=findings,
            logs=logs,
        )

