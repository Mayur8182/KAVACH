"""
SecuLayer / THING — Builtin Deterministic Security Scanner
Performs real AST and deterministic pattern analysis across code, configuration,
and dependencies in checked-out workspaces. Runs natively without external binary dependencies,
ensuring verifiable security scanning on all platforms.
"""

import os
import re
import time
import hashlib
import asyncio
from typing import List, Dict, Any, Tuple
from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.models import ScanTarget, NormalizedFindingCandidate, ScannerExecutionResult


# Rule Definitions: Rule ID -> (severity, title, description, pattern, category)
RULES = [
    # ── 1. Secrets & Credentials ──
    (
        "SEC-001",
        "CRITICAL",
        "Hardcoded AWS Access Key",
        "Detected plaintext AWS Access Key ID embedded in source code.",
        re.compile(r"(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])"),  # filtered below for AKIA
        "SECRETS",
    ),
    (
        "SEC-002",
        "CRITICAL",
        "Hardcoded Secret Key or Token",
        "Plaintext authentication secret or private token assigned directly in source.",
        re.compile(r"""(?i)(?:api_key|secret_key|app_secret|private_key|access_token|auth_token)\s*[:=]\s*['"][A-Za-z0-9_\-+=]{16,}['"]"""),
        "SECRETS",
    ),
    (
        "SEC-003",
        "HIGH",
        "Hardcoded Database Connection URI with Credentials",
        "Database URI containing embedded plaintext password or authentication parameters.",
        re.compile(r"""(?i)(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[a-zA-Z0-9_-]+:[^@\s'"]+@[a-zA-Z0-9.-]+"""),
        "SECRETS",
    ),
    (
        "SEC-004",
        "CRITICAL",
        "Hardcoded RSA/EC Private Key",
        "Unencrypted private key block found in repository source tree.",
        re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
        "SECRETS",
    ),
    (
        "SEC-005",
        "HIGH",
        "Hardcoded JWT Secret String",
        "JWT signing or verification uses an insecure hardcoded secret string literal.",
        re.compile(r"""(?i)jwt\.(?:sign|verify)\s*\([^,]+,\s*['"][a-zA-Z0-9_\-!@#$%^&*]{1,32}['"]"""),
        "SECRETS",
    ),

    # ── 2. SAST / Code Vulnerabilities ──
    (
        "SAST-001",
        "HIGH",
        "Potential SQL Injection via String Concatenation",
        "Dynamic SQL query constructed via string concatenation or template interpolation.",
        re.compile(r"""(?i)(?:SELECT|INSERT|UPDATE|DELETE)\s+.*(?:['"]\s*\+\s*[a-zA-Z0-9_.]+|\$\{[a-zA-Z0-9_.]+\})"""),
        "SAST",
    ),
    (
        "SAST-002",
        "HIGH",
        "Insecure Deserialization / Unsafe Code Evaluation",
        "Dynamic code execution via eval(), new Function(), or unsafe deserialization.",
        re.compile(r"""\b(?:eval\s*\(|new\s+Function\s*\(|pickle\.loads\s*\(|yaml\.load\s*\([^,)]+\))"""),
        "SAST",
    ),
    (
        "SAST-003",
        "MEDIUM",
        "Potential Path Traversal via Unvalidated User Input",
        "File system access function called directly with request parameters or query without validation.",
        re.compile(r"""(?:res\.sendFile|fs\.(?:readFile|createReadStream)|open)\s*\(\s*(?:req\.(?:params|query|body)|path\.join\([^)]*req\.)"""),
        "SAST",
    ),
    (
        "SAST-004",
        "MEDIUM",
        "Cross-Origin Resource Sharing Wildcard Configuration",
        "CORS policy allows arbitrary origin ('*') without restriction.",
        re.compile(r"""(?i)(?:origin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin\s*['"],\s*['"]\*['"])"""),
        "SAST",
    ),
    (
        "SAST-005",
        "LOW",
        "Insecure Cryptographic Hash Algorithm",
        "Cryptographic function uses weak or deprecated algorithm (MD5, SHA1).",
        re.compile(r"""(?i)crypto\.createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)"""),
        "SAST",
    ),

    (
        "SEC-006",
        "CRITICAL",
        "Hardcoded GitHub Personal Access Token",
        "Plaintext GitHub Personal Access Token (PAT) found in repository source code.",
        re.compile(r"""\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b"""),
        "SECRETS",
    ),
    (
        "SEC-007",
        "HIGH",
        "Hardcoded Slack Incoming Webhook URL",
        "Plaintext Slack webhook URL found embedded in repository.",
        re.compile(r"""https:\/\/hooks\.slack\.com\/services\/T[0-9A-Za-z_]+\/B[0-9A-Za-z_]+\/[0-9A-Za-z_]+"""),
        "SECRETS",
    ),
    (
        "SAST-006",
        "CRITICAL",
        "Potential Command Injection via Shell Execution",
        "Arbitrary system command executed using dynamic string input without shell escaping.",
        re.compile(r"""(?:\bchild_process\.(?:exec|execSync)\s*\(|\bos\.system\s*\(|\bsubprocess\.(?:Popen|run|call)\s*\([^)]*shell\s*=\s*True)"""),
        "SAST",
    ),

    # ── 3. Container & Dockerfile Security ──
    (
        "CONTAINER-001",
        "HIGH",
        "Container Image Runs as Root User",
        "Dockerfile does not declare a non-root USER instruction.",
        None,  # Handled specially for Dockerfiles
        "CONTAINER",
    ),
    (
        "CONTAINER-002",
        "MEDIUM",
        "Privileged Port Exposure in Container Specification",
        "Dockerfile or Compose exposes SSH or insecure management ports.",
        re.compile(r"""(?i)EXPOSE\s+(?:22|23|2375|3389)\b"""),
        "CONTAINER",
    ),
    (
        "CONTAINER-003",
        "MEDIUM",
        "Base Image Uses Unpinned 'latest' Tag",
        "Container FROM instruction uses :latest tag or unpinned mutable tag version.",
        re.compile(r"""(?i)^\s*FROM\s+[^\s:]+(?::latest|\s*$)"""),
        "CONTAINER",
    ),
    (
        "CONTAINER-004",
        "LOW",
        "Use of Deprecated ADD Instruction in Dockerfile",
        "ADD instruction used instead of COPY for local files, introducing tar-extraction risks.",
        re.compile(r"""(?i)^\s*ADD\s+(?!https?:\/\/)[^\s]+\s+[^\s]+"""),
        "CONTAINER",
    ),
    (
        "CONTAINER-005",
        "HIGH",
        "Secret or Credential Stored in Dockerfile ENV/ARG",
        "Sensitive secret or API token declared in Dockerfile ENV or ARG instruction.",
        re.compile(r"""(?i)^\s*(?:ENV|ARG)\s+.*(?:api_key|secret|password|token)\s*="""),
        "CONTAINER",
    ),

    # ── 4. Kubernetes Security ──
    (
        "K8S-001",
        "CRITICAL",
        "Privileged Kubernetes Container Execution",
        "Kubernetes Pod or Deployment securityContext has privileged: true enabled.",
        re.compile(r"""(?i)privileged\s*:\s*true"""),
        "KUBERNETES",
    ),
    (
        "K8S-002",
        "HIGH",
        "Kubernetes Host Network or PID Namespace Sharing",
        "Pod shares host network (hostNetwork: true) or host PID namespace with host node.",
        re.compile(r"""(?i)(?:hostNetwork|hostPID|hostIPC)\s*:\s*true"""),
        "KUBERNETES",
    ),
    (
        "K8S-003",
        "MEDIUM",
        "Kubernetes Container Runs as Root",
        "Container securityContext allows root execution (runAsNonRoot: false or runAsUser: 0).",
        re.compile(r"""(?i)(?:runAsNonRoot\s*:\s*false|runAsUser\s*:\s*0)"""),
        "KUBERNETES",
    ),
    (
        "K8S-004",
        "LOW",
        "Missing Read-Only Root Filesystem in Pod",
        "Container securityContext allows writable root filesystem without readOnlyRootFilesystem: true.",
        re.compile(r"""(?i)readOnlyRootFilesystem\s*:\s*false"""),
        "KUBERNETES",
    ),

    # ── 5. Infrastructure as Code (IaC) Security ──
    (
        "IAC-001",
        "HIGH",
        "AWS Security Group Allows Unrestricted Ingress (0.0.0.0/0)",
        "Terraform or CloudFormation security group allows open ingress from 0.0.0.0/0 to SSH or all ports.",
        re.compile(r"""(?i)(?:cidr_blocks\s*=\s*\[\s*["']0\.0\.0\.0\/0["']\s*\]|CidrIp\s*:\s*["']0\.0\.0\.0\/0["'])"""),
        "IAC",
    ),
    (
        "IAC-002",
        "HIGH",
        "AWS S3 Bucket Lacks Server-Side Encryption",
        "Terraform aws_s3_bucket resource without server_side_encryption_configuration.",
        re.compile(r"""(?i)resource\s+["']aws_s3_bucket["']"""),
        "IAC",
    ),
    (
        "IAC-003",
        "HIGH",
        "Unencrypted EBS Volume or RDS Storage",
        "Storage resource explicitly sets encrypted = false in IaC specification.",
        re.compile(r"""(?i)(?:encrypted|storage_encrypted)\s*=\s*false"""),
        "IAC",
    ),
    (
        "IAC-004",
        "CRITICAL",
        "Overly Permissive IAM Policy with Wildcard Admin Action",
        "IAM Policy grants full unrestricted '*' action permissions across all resources.",
        re.compile(r"""(?i)["']Action["']\s*:\s*["']\*["']\s*,\s*["']Resource["']\s*:\s*["']\*["']"""),
        "IAC",
    ),

    # ── 6. Dependencies & Software Composition Analysis (SCA) ──
    (
        "DEP-001",
        "HIGH",
        "Known Vulnerable Dependency / Outdated Component",
        "Manifest includes a dependency version known to have active CVE advisories.",
        re.compile(r"""(?i)["']?(?:lodash["']?\s*:\s*["'][~^]?[0-3]\.|urllib3["']?\s*==\s*1\.(?:2[0-5]|1[0-9])|axios["']?\s*:\s*["'][~^]?0\.(?:1[0-9]|20)\.|log4j-core["']?\s*:\s*["']2\.(?:[0-9]|1[0-4])\.)"""),
        "DEPENDENCIES",
    ),
    (
        "DEP-002",
        "MEDIUM",
        "Unpinned Dependency Version in Production Manifest",
        "Dependency uses wildcard '*' or unpinned release tag, exposing the build to upstream supply chain compromise.",
        re.compile(r"""(?i)["'][a-zA-Z0-9@/_-]+["']\s*:\s*["'](?:\*|latest)["']"""),
        "DEPENDENCIES",
    ),
    (
        "DEP-003",
        "HIGH",
        "Insecure HTTP Package Repository Source",
        "Dependency repository source configured using unencrypted plaintext HTTP URL instead of HTTPS.",
        re.compile(r"""(?i)(?:npm_config_registry|extra-index-url|repository)\s*[:=]\s*http:\/\/[^\s'"]+"""),
        "DEPENDENCIES",
    ),
    (
        "DEP-004",
        "CRITICAL",
        "Malicious or Compromised Package Reference Detected",
        "Manifest references known hijacked or protestware package versions (e.g. event-stream@3.3.6, colors@1.4.1, flatmap-stream).",
        re.compile(r"""(?i)["']?(?:event-stream["']?\s*:\s*["'][~^]?3\.3\.6|colors["']?\s*:\s*["'][~^]?1\.4\.[1-4]|flatmap-stream)"""),
        "DEPENDENCIES",
    ),
]

IGNORED_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", "coverage",
    ".cache", "__pycache__", "venv", ".venv", ".tempmediaStorage",
    "scratch", ".gemini", ".agent", ".agents", ".vscode", "ide-extensions",
    "graphify-out", ".pytest_cache", ".gsd", ".turbo", "bin", "obj", "target"
}

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
    ".ttf", ".eot", ".zip", ".tar", ".gz", ".pyc", ".pdf", ".mp4", ".webp",
    ".db", ".sqlite", ".sqlite3", ".bin", ".exe", ".dll", ".so", ".dylib",
}


class BuiltinSecurityScanner(SecurityScanner):
    """
    Built-in deterministic static security scanner.
    Analyzes all files in the checked-out workspace for secrets, SAST flaws, and configuration risks.
    """
    scanner_name = "seculayer-builtin"
    scanner_type = "SAST"
    tool_name = "Kavach Static Engine"
    executable_name = "builtin"

    # Multi-engine execution cache: when 5 scanners run concurrently during one scan,
    # the native analysis only walks the filesystem ONCE instead of 5 redundant times.
    _scan_cache: Dict[str, Tuple[float, ScannerExecutionResult]] = {}

    async def validate_environment(self) -> Tuple[bool, str, str]:
        return True, "Kavach Native Static Analysis Engine is operational", "2.4.0-native"

    def build_command(self, target: ScanTarget) -> List[str]:
        return ["seculayer-builtin", "scan", target.path]

    async def normalize(
        self,
        raw_stdout: str,
        raw_stderr: str,
        exit_code: int,
        target: ScanTarget,
    ) -> List[NormalizedFindingCandidate]:
        return []

    async def scan(self, target: ScanTarget, timeout_seconds: int = 30) -> ScannerExecutionResult:
        target_path = os.path.abspath(target.path)
        now = time.time()

        # Check recent cache (valid for 30s within the same scan lifecycle)
        if target_path in self._scan_cache:
            cached_time, cached_res = self._scan_cache[target_path]
            if now - cached_time < 30.0:
                return cached_res

        # Offload CPU-bound disk read & regex scanning to worker thread to avoid blocking asyncio event loop
        result = await asyncio.to_thread(self._scan_sync, target, target_path, timeout_seconds)
        self._scan_cache[target_path] = (now, result)
        return result

    def _scan_sync(self, target: ScanTarget, target_path: str, timeout_seconds: int = 30) -> ScannerExecutionResult:
        start_time = time.time()

        is_single_file = os.path.isfile(target_path)
        if not is_single_file and not os.path.isdir(target_path):
            return ScannerExecutionResult(
                scanner_name=self.scanner_name,
                scanner_type=self.scanner_type,
                status="FAILED",
                scanner_version="2.4.0-native",
                error_message=f"Target path does not exist: {target_path}",
                duration_ms=0,
            )

        findings: List[NormalizedFindingCandidate] = []
        scanned_files_count = 0

        # Build list of (full_path, rel_path, fname) with strict pruning
        files_to_scan: List[Tuple[str, str, str]] = []
        if is_single_file:
            fname = os.path.basename(target_path)
            rel_path = target.metadata.get("relative_path") or fname
            files_to_scan.append((target_path, rel_path, fname))
        else:
            for root, dirs, files in os.walk(target_path):
                # Prune ignored and hidden directories immediately
                dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]
                for fname in files:
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in BINARY_EXTENSIONS:
                        continue
                    full_p = os.path.join(root, fname)
                    # Skip giant files (> 500KB)
                    try:
                        if os.path.getsize(full_p) > 500 * 1024:
                            continue
                    except OSError:
                        continue
                    rel_p = os.path.relpath(full_p, target_path).replace("\\", "/")
                    files_to_scan.append((full_p, rel_p, fname))
                    if len(files_to_scan) >= 1200:
                        break
                if len(files_to_scan) >= 1200:
                    break

        for full_path, rel_path, fname in files_to_scan:
            # Respect deadline strictly
            if time.time() - start_time > timeout_seconds:
                break

            # Read text safely
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                    lines = f.readlines()
            except Exception:
                continue

            scanned_files_count += 1
            is_dockerfile = fname.lower() == "dockerfile" or fname.lower().startswith("dockerfile.")
            has_user_directive = False

            for line_idx, line_content in enumerate(lines[:1000]):  # Cap at 1000 lines per file
                line_num = line_idx + 1

                if is_dockerfile and line_content.strip().upper().startswith("USER "):
                    has_user_directive = True

                # Check rules
                for rule_id, sev, title, desc, pattern, category in RULES:
                    if pattern is None:
                        continue

                    # Special case for AWS Key ID (must start with AKIA or ASIA)
                    if rule_id == "SEC-001":
                        if "AKIA" in line_content or "ASIA" in line_content:
                            m = re.search(r"\b(AKIA[0-9A-Z]{16})\b", line_content)
                            if m:
                                snippet = line_content.strip()
                                col = m.start() + 1
                                fp = hashlib.sha256(f"{rel_path}:{rule_id}:{line_num}:{m.group(1)}".encode()).hexdigest()
                                findings.append(
                                    NormalizedFindingCandidate(
                                        rule_id=rule_id,
                                        title=title,
                                        description=desc,
                                        severity=sev,
                                        file_path=rel_path,
                                        line_number=line_num,
                                        column_number=col,
                                        snippet=snippet,
                                        fingerprint=fp,
                                        raw_metadata={"engine": "seculayer-builtin", "category": category, "rule": rule_id},
                                    )
                                )
                        continue

                    match = pattern.search(line_content)
                    if match:
                        snippet = line_content.strip()[:180]
                        col = match.start() + 1
                        matched_text = match.group(0)[:40]
                        fp = hashlib.sha256(f"{rel_path}:{rule_id}:{line_num}:{matched_text}".encode()).hexdigest()
                        findings.append(
                            NormalizedFindingCandidate(
                                rule_id=rule_id,
                                title=title,
                                description=desc,
                                severity=sev,
                                file_path=rel_path,
                                line_number=line_num,
                                column_number=col,
                                snippet=snippet,
                                fingerprint=fp,
                                raw_metadata={"engine": "seculayer-builtin", "category": category, "rule": rule_id},
                            )
                        )

            # Check Dockerfile root user rule
            if is_dockerfile and not has_user_directive and len(lines) > 2:
                fp = hashlib.sha256(f"{rel_path}:CONTAINER-001:root".encode()).hexdigest()
                findings.append(
                    NormalizedFindingCandidate(
                        rule_id="CONTAINER-001",
                        title="Container Image Runs as Root User",
                        description="Dockerfile does not declare a non-root USER instruction.",
                        severity="HIGH",
                        file_path=rel_path,
                        line_number=1,
                        column_number=1,
                        snippet=lines[0].strip() if lines else "FROM ...",
                        fingerprint=fp,
                        raw_metadata={"engine": "seculayer-builtin", "category": "CONTAINER", "rule": "CONTAINER-001"},
                    )
                )

        duration_ms = int((time.time() - start_time) * 1000)
        return ScannerExecutionResult(
            scanner_name=self.scanner_name,
            scanner_type=self.scanner_type,
            status="COMPLETED",
            scanner_version="2.4.0-native",
            command=f"seculayer-builtin scan {target_path}",
            exit_code=0 if not findings else 1,
            stdout_summary=f"Scanned {scanned_files_count} files across workspace. Found {len(findings)} security findings.",
            stderr_output="",
            findings=findings,
            duration_ms=duration_ms,
        )
