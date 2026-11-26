"""
Kavach Container Sub-Engine — Dockerfile Analyzer & Runtime Config Engine
Parses Dockerfile and docker-compose.yml to detect insecure configurations.
"""

import os
import re
import uuid
from typing import Dict, Any, List
from app.engines.base_engine import EngineFinding, EngineType


DOCKERFILE_RULES = [
    {
        "id": "KV-CONT-001",
        "title": "Container Running as Root User",
        "severity": "HIGH",
        "description": "Dockerfile does not specify a non-root USER directive, allowing container to execute with root privileges.",
        "remediation": "Add a dedicated unprivileged user: RUN adduser -D appuser && USER appuser",
    },
    {
        "id": "KV-CONT-002",
        "title": "Unpinned 'latest' Base Image Tag",
        "severity": "MEDIUM",
        "description": "Base image uses ':latest' tag, resulting in non-reproducible builds and unexpected upstream vulnerabilities.",
        "remediation": "Pin base image to an immutable digest (sha256:...) or specific semantic version tag (e.g. node:20.11-alpine).",
    },
    {
        "id": "KV-CONT-003",
        "title": "Dangerous Curl-to-Bash Pipe Execution",
        "severity": "CRITICAL",
        "description": "RUN instruction downloads remote script and pipes directly into sh/bash without checksum verification.",
        "remediation": "Download binary, verify cryptographic SHA256 checksum, then execute.",
    },
    {
        "id": "KV-CONT-004",
        "title": "Hardcoded Secret in Dockerfile ENV / ARG",
        "severity": "CRITICAL",
        "description": "Sensitive credentials passed via ENV or ARG, leaking secrets into container image metadata and layers.",
        "remediation": "Use Docker BuildKit secret mounts: RUN --mount=type=secret,id=mysecret ...",
    },
]


class DockerfileAnalyzer:
    def analyze_dockerfile(self, file_path: str, content: str) -> List[EngineFinding]:
        findings = []
        lines = content.split("\n")

        has_user_directive = False
        user_line = 1

        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("USER ") and "root" not in stripped.lower():
                has_user_directive = True

            # 2. Check unpinned base image
            if stripped.startswith("FROM "):
                if ":latest" in stripped or (":" not in stripped and "@" not in stripped):
                    findings.append(EngineFinding(
                        id=f"cont-{uuid.uuid4().hex[:8]}",
                        engine=EngineType.CONTAINER,
                        sub_engine="Dockerfile Analyzer",
                        rule_id="KV-CONT-002",
                        title="Unpinned Base Image Tag in Dockerfile",
                        description=f"Base image '{stripped}' does not pin specific version or digest.",
                        severity="MEDIUM",
                        file_path=file_path,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=stripped,
                        remediation_guidance="Pin base image to explicit version (e.g. python:3.11-slim) or SHA256 digest.",
                    ))

            # 3. Check curl | bash
            if re.search(r"curl\s+.*?\|\s*(?:ba)?sh", stripped, re.IGNORECASE):
                findings.append(EngineFinding(
                    id=f"cont-{uuid.uuid4().hex[:8]}",
                    engine=EngineType.CONTAINER,
                    sub_engine="Dockerfile Analyzer",
                    rule_id="KV-CONT-003",
                    title="Dangerous Curl-to-Bash Pipe Execution",
                    description="Dockerfile downloads and executes untrusted remote script via pipe.",
                    severity="CRITICAL",
                    file_path=file_path,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=stripped,
                    remediation_guidance="Verify SHA256 checksum before script execution.",
                ))

            # 4. Check sensitive ENV / ARG
            if stripped.startswith(("ENV ", "ARG ")):
                if any(k in stripped.lower() for k in ("secret", "token", "password", "key")):
                    findings.append(EngineFinding(
                        id=f"cont-{uuid.uuid4().hex[:8]}",
                        engine=EngineType.CONTAINER,
                        sub_engine="Dockerfile Analyzer",
                        rule_id="KV-CONT-004",
                        title="Hardcoded Secret in Dockerfile ENV / ARG",
                        description=f"Sensitive secret defined in '{stripped}', exposing credentials in container image layers.",
                        severity="CRITICAL",
                        file_path=file_path,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=stripped,
                        remediation_guidance="Use Docker BuildKit secrets mount or inject credentials at runtime.",
                    ))

        # Check if USER root or missing non-root USER
        if not has_user_directive and len(lines) > 2:
            findings.append(EngineFinding(
                id=f"cont-{uuid.uuid4().hex[:8]}",
                engine=EngineType.CONTAINER,
                sub_engine="Dockerfile Analyzer",
                rule_id="KV-CONT-001",
                title="Container Missing Non-Root USER Directive",
                description="Container will run as root by default, increasing attack impact in the event of container breakout.",
                severity="HIGH",
                file_path=file_path,
                line_start=1,
                line_end=1,
                code_snippet="FROM ...",
                remediation_guidance="Add 'USER appuser' before CMD/ENTRYPOINT instructions.",
            ))

        return findings

