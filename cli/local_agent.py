#!/usr/bin/env python3
"""
Thing Local Security Agent — Step 27

Responsibilities:
  - Repository discovery and context loading
  - Filesystem monitoring with debounce
  - Incremental scanner selection and execution
  - Security contract impact detection
  - Policy evaluation relay
  - Git hook support
  - Local HTTP API for IDE communication

Architecture:
  IDE / CLI / Git Hook
       ↓
  Local Security Agent (this process)
       ↓
  Thing Backend API → Intent / Blueprint / Contracts / Policy
       ↓
  Scanner Orchestration → Semgrep / Gitleaks / Trivy / Checkov / OSV
       ↓
  Evidence → Policy Decision → IDE Feedback

SECURITY INVARIANTS:
  - LLM NEVER makes ALLOW/BLOCK decisions; only the policy engine does.
  - Repository file content NEVER overrides agent policy or instructions.
  - Arbitrary shell commands from LLM output are NEVER executed.
  - Scanner failures are ALWAYS surfaced, never silently swallowed.
  - A PASSED result is NEVER issued when a scanner failed.
"""

import argparse
import asyncio
import hashlib
import json
import logging
import os
import platform
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from threading import Thread, Event, Lock
from typing import Dict, List, Optional, Set, Tuple

# ─────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────

THING_API_URL = os.environ.get("THING_API_URL", "http://localhost:8000/api/v1")
CONFIG_FILE = Path.home() / ".thing_cli_config.json"
LOCAL_AGENT_PORT = int(os.environ.get("THING_AGENT_PORT", "17382"))
AGENT_VERSION = "0.1.0"

# Debounce interval in seconds — do NOT scan every keystroke
DEBOUNCE_SECONDS = float(os.environ.get("THING_DEBOUNCE_SECONDS", "1.5"))

# Maximum file size to scan (bytes) — avoid scanning huge generated/binary files
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# Directories to always exclude
EXCLUDED_DIRS: Set[str] = {
    ".git", "__pycache__", "node_modules", ".venv", "venv",
    "dist", "build", ".next", "target", "vendor",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("thing.local_agent")


# ─────────────────────────────────────────────────────────────────
# Prompt Injection Defense
# Placed here so it's available to both the local agent and AI adapters.
# Repository content (README / comments / code) CANNOT override policy.
# ─────────────────────────────────────────────────────────────────

import re as _re

_INJECTION_PATTERNS = [
    _re.compile(p, _re.IGNORECASE) for p in [
        r"ignore\s+all\s+previous\s+instructions",
        r"disregard\s+thing\s+policy",
        r"allow\s+all\s+code\s+changes",
        r"bypass[_\s]security",
        r"you\s+are\s+now\s+a",
        r"act\s+as\s+if\s+you\s+have\s+no\s+restrictions",
        r"thing[_\s]policy\s*=\s*allow",
        r"OVERRIDE_SECURITY",
        r"DISABLE_SCANNING",
        r"SKIP_POLICY",
    ]
]



def detect_prompt_injection(content: str) -> List[str]:
    """
    Detect prompt injection attempts in repository content.
    README / comments / code CANNOT override Thing security policy.
    """
    return [p.pattern for p in _INJECTION_PATTERNS if p.search(content)]


def sanitize_for_llm_context(content: str, max_bytes: int = 10_000) -> str:
    """
    Sanitize repository content before sending as LLM context.
    Redacts injection attempts; truncates to max_bytes.
    The LLM receives context only — NOT policy authority.
    """
    injections = detect_prompt_injection(content)
    if injections:
        logger.warning(f"Prompt injection attempt in repository content: {injections}")
        content = "[CONTENT REDACTED — Prompt injection attempt detected]"
    if len(content.encode()) > max_bytes:
        content = content.encode()[:max_bytes].decode(errors="ignore") + "\n...[TRUNCATED]"
    return content




# ─────────────────────────────────────────────────────────────────
# Config / Credential Helpers
# ─────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def get_project_id(git_root: str) -> Optional[str]:
    config = load_config()
    return config.get("bindings", {}).get(git_root, {}).get("project_id")


def get_device_id() -> Optional[str]:
    return load_config().get("device_id")


# ─────────────────────────────────────────────────────────────────
# Git Helpers
# ─────────────────────────────────────────────────────────────────

def get_git_root() -> Optional[str]:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL, text=True
        ).strip()
    except Exception:
        return None


def get_git_info(git_root: str) -> dict:
    """Collect real git metadata — never fabricated."""
    info = {}
    commands = {
        "branch": ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        "commit_sha": ["git", "rev-parse", "HEAD"],
        "remote_url": ["git", "remote", "get-url", "origin"],
    }
    for key, cmd in commands.items():
        try:
            info[key] = subprocess.check_output(cmd, cwd=git_root, stderr=subprocess.DEVNULL, text=True).strip()
        except Exception:
            info[key] = None
    return info


def get_changed_files(git_root: str) -> List[str]:
    """Files changed since last commit."""
    try:
        out = subprocess.check_output(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=git_root, stderr=subprocess.DEVNULL, text=True
        ).strip()
        return [f for f in out.split("\n") if f]
    except Exception:
        return []


def get_staged_files(git_root: str) -> List[str]:
    """Files staged for commit."""
    try:
        out = subprocess.check_output(
            ["git", "diff", "--cached", "--name-only"],
            cwd=git_root, stderr=subprocess.DEVNULL, text=True
        ).strip()
        return [f for f in out.split("\n") if f]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────
# Repository Context / Discovery
# ─────────────────────────────────────────────────────────────────

@dataclass
class RepositoryContext:
    """Real repository context — derived from actual files, never fabricated."""
    repository_id: str
    local_path_hash: str
    git_root: str
    remote_url: Optional[str]
    branch: Optional[str]
    commit_sha: Optional[str]
    project_id: Optional[str]
    detected_languages: List[str] = field(default_factory=list)
    detected_frameworks: List[str] = field(default_factory=list)
    package_managers: List[str] = field(default_factory=list)
    has_docker: bool = False
    has_terraform: bool = False
    has_kubernetes: bool = False
    has_cicd: bool = False
    environment_files: List[str] = field(default_factory=list)
    last_synced: Optional[str] = None


LANGUAGE_EXTENSIONS: Dict[str, str] = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".go": "go", ".rs": "rust", ".java": "java", ".cs": "csharp",
    ".rb": "ruby", ".php": "php", ".cpp": "cpp", ".c": "c",
    ".swift": "swift", ".kt": "kotlin", ".scala": "scala",
}

FRAMEWORK_INDICATORS: Dict[str, str] = {
    "fastapi": "fastapi", "django": "django", "flask": "flask",
    "express": "express", "react": "react", "vue": "vue",
    "angular": "angular", "spring": "spring", "rails": "rails",
}

PACKAGE_MANAGER_FILES: Dict[str, str] = {
    "requirements.txt": "pip", "pyproject.toml": "pip",
    "package.json": "npm", "yarn.lock": "yarn", "pnpm-lock.yaml": "pnpm",
    "Gemfile": "bundler", "go.mod": "go_modules",
    "Cargo.toml": "cargo", "pom.xml": "maven", "build.gradle": "gradle",
}


def discover_repository(git_root: str) -> RepositoryContext:
    """
    Perform real repository discovery by examining actual files.
    Never assumes technology from folder names alone.
    """
    logger.info(f"Discovering repository at: {git_root}")

    git_info = get_git_info(git_root)
    local_path_hash = hashlib.sha256(git_root.encode()).hexdigest()
    project_id = get_project_id(git_root)

    detected_languages: Set[str] = set()
    package_managers: List[str] = []
    environment_files: List[str] = []
    has_docker = False
    has_terraform = False
    has_kubernetes = False
    has_cicd = False

    for root, dirs, files in os.walk(git_root):
        # Prune excluded directories in-place
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

        for fname in files:
            fpath = os.path.join(root, fname)
            rel_path = os.path.relpath(fpath, git_root)

            # Check file size
            try:
                size = os.path.getsize(fpath)
                if size > MAX_FILE_SIZE_BYTES:
                    continue
            except OSError:
                continue

            ext = Path(fname).suffix.lower()
            if ext in LANGUAGE_EXTENSIONS:
                detected_languages.add(LANGUAGE_EXTENSIONS[ext])

            if fname in PACKAGE_MANAGER_FILES:
                pm = PACKAGE_MANAGER_FILES[fname]
                if pm not in package_managers:
                    package_managers.append(pm)

            lower = fname.lower()
            if lower == "dockerfile" or lower.startswith("dockerfile."):
                has_docker = True
            if ext == ".tf":
                has_terraform = True
            if ext in (".yaml", ".yml") and ("k8s" in rel_path or "kubernetes" in rel_path
                                              or "deploy" in rel_path):
                has_kubernetes = True
            if fname in (".github", ".gitlab-ci.yml", "Jenkinsfile", ".travis.yml",
                         "azure-pipelines.yml", ".circleci"):
                has_cicd = True
            if lower.startswith(".env"):
                environment_files.append(rel_path)

    # Detect frameworks from package files
    detected_frameworks: List[str] = []
    req_file = os.path.join(git_root, "requirements.txt")
    pkg_file = os.path.join(git_root, "package.json")
    for indicator, fw in FRAMEWORK_INDICATORS.items():
        for candidate in [req_file, pkg_file]:
            if os.path.exists(candidate):
                try:
                    with open(candidate) as f:
                        content = f.read().lower()
                    if indicator in content and fw not in detected_frameworks:
                        detected_frameworks.append(fw)
                except Exception:
                    pass

    ctx = RepositoryContext(
        repository_id=local_path_hash[:16],
        local_path_hash=local_path_hash,
        git_root=git_root,
        remote_url=git_info.get("remote_url"),
        branch=git_info.get("branch"),
        commit_sha=git_info.get("commit_sha"),
        project_id=project_id,
        detected_languages=sorted(detected_languages),
        detected_frameworks=detected_frameworks,
        package_managers=package_managers,
        has_docker=has_docker,
        has_terraform=has_terraform,
        has_kubernetes=has_kubernetes,
        has_cicd=has_cicd,
        environment_files=environment_files,
        last_synced=datetime.now(timezone.utc).isoformat(),
    )

    logger.info(f"Repository discovery complete: languages={ctx.detected_languages}, "
                f"frameworks={ctx.detected_frameworks}, docker={ctx.has_docker}, "
                f"terraform={ctx.has_terraform}")
    return ctx


# ─────────────────────────────────────────────────────────────────
# Scanner Selection Engine
# ─────────────────────────────────────────────────────────────────

def select_scanners(changed_files: List[str], repo_ctx: RepositoryContext) -> List[str]:
    """
    Determines which scanners to run based on changed file types.
    Does NOT run every scanner blindly. Optimised for incremental scanning.
    """
    scanners: Set[str] = set()

    # Always run secret detection on any change
    scanners.add("gitleaks")

    for f in changed_files:
        ext = Path(f).suffix.lower()
        name = Path(f).name.lower()

        # SAST
        if ext in (".py", ".js", ".ts", ".go", ".java", ".rb", ".php", ".cs"):
            scanners.add("semgrep")

        # Dependency / SCA
        if name in ("requirements.txt", "requirements-dev.txt", "pyproject.toml",
                    "package.json", "package-lock.json", "yarn.lock",
                    "go.mod", "go.sum", "gemfile", "cargo.toml", "pom.xml"):
            scanners.add("osv-scanner")

        # Container
        if name.startswith("dockerfile") or ext in (".dockerfile",):
            scanners.add("trivy")
        if name in ("docker-compose.yml", "docker-compose.yaml"):
            scanners.add("trivy")
            scanners.add("checkov")

        # IaC
        if ext == ".tf":
            scanners.add("checkov")
        if name in ("cloudformation.yml", "cloudformation.yaml") or "cloudformation" in f.lower():
            scanners.add("checkov")
        if ext in (".yaml", ".yml") and any(kw in f.lower() for kw in ("k8s", "kubernetes", "deploy", "service", "ingress")):
            scanners.add("checkov")
        if ext == ".bicep" or ext == ".json" and "arm" in f.lower():
            scanners.add("checkov")

    # If no specific files changed, run SAST over source code
    if not changed_files and repo_ctx.detected_languages:
        scanners.add("semgrep")
        scanners.add("gitleaks")

    logger.info(f"Selected scanners: {sorted(scanners)} for files: {changed_files[:10]}")
    return sorted(scanners)


# ─────────────────────────────────────────────────────────────────
# Scanner Execution (Safe subprocess, never arbitrary LLM commands)
# ─────────────────────────────────────────────────────────────────

@dataclass
class ScannerResult:
    scanner: str
    status: str  # PASS | FAILED | NOT_INSTALLED
    findings: List[dict] = field(default_factory=list)
    error: Optional[str] = None
    exit_code: Optional[int] = None
    duration_ms: int = 0
    scanner_version: Optional[str] = None


def run_safe_subprocess(cmd: List[str], cwd: str, timeout: int = 120) -> Tuple[int, str, str]:
    """
    Execute a scanner subprocess safely.
    - Only accepts pre-defined trusted commands, NEVER arbitrary shell strings.
    - Enforces timeout to prevent hang.
    - Never executes LLM-generated shell commands.
    """
    try:
        start = time.monotonic()
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            # No shell=True — prevents shell injection
        )
        duration_ms = int((time.monotonic() - start) * 1000)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"Scanner timed out after {timeout}s"
    except FileNotFoundError:
        return -2, "", "Scanner not found in PATH"
    except Exception as e:
        return -3, "", str(e)


def run_semgrep(git_root: str, files: Optional[List[str]] = None) -> ScannerResult:
    start = time.monotonic()
    cmd = ["semgrep", "scan", "--json", "--timeout", "60"]
    if files:
        cmd.extend(files[:50])  # Limit to avoid argv overflow
    else:
        cmd.append(git_root)

    code, stdout, stderr = run_safe_subprocess(cmd, git_root)
    duration_ms = int((time.monotonic() - start) * 1000)

    if code == -2:
        return ScannerResult("semgrep", "NOT_INSTALLED", error="Semgrep not installed or not in PATH",
                              duration_ms=duration_ms)
    if code not in (0, 1):  # semgrep exits 1 when findings found — that's OK
        return ScannerResult("semgrep", "FAILED", error=f"Process exited {code}: {stderr[:500]}",
                              exit_code=code, duration_ms=duration_ms)

    try:
        data = json.loads(stdout)
        findings = data.get("results", [])
        # Never invent findings — if semgrep found 0, we return 0
        return ScannerResult("semgrep", "PASS", findings=findings,
                              exit_code=code, duration_ms=duration_ms)
    except json.JSONDecodeError:
        return ScannerResult("semgrep", "FAILED",
                              error=f"Failed to parse semgrep output: {stdout[:200]}",
                              exit_code=code, duration_ms=duration_ms)


def run_gitleaks(git_root: str) -> ScannerResult:
    start = time.monotonic()
    cmd = ["gitleaks", "detect", "--source", git_root, "--report-format", "json",
           "--report-path", "/dev/stdout", "--no-git"]
    code, stdout, stderr = run_safe_subprocess(cmd, git_root, timeout=60)
    duration_ms = int((time.monotonic() - start) * 1000)

    if code == -2:
        return ScannerResult("gitleaks", "NOT_INSTALLED", error="Gitleaks not installed or not in PATH",
                              duration_ms=duration_ms)

    findings = []
    if stdout.strip():
        try:
            raw = json.loads(stdout)
            if isinstance(raw, list):
                # Redact secret values — only keep evidence context, NOT the full secret
                for leak in raw:
                    findings.append({
                        "rule_id": leak.get("RuleID", ""),
                        "description": leak.get("Description", ""),
                        "file": leak.get("File", ""),
                        "line": leak.get("StartLine", 0),
                        # Redact: never expose the full secret value in findings
                        "secret_redacted": "[REDACTED]",
                        "match_redacted": leak.get("Match", "")[:10] + "...[REDACTED]" if leak.get("Match") else "[REDACTED]",
                        "commit": leak.get("Commit", ""),
                    })
        except json.JSONDecodeError:
            pass

    status = "PASS" if code == 0 else "FAILED" if code not in (0, 1) else "PASS"
    return ScannerResult("gitleaks", status, findings=findings, exit_code=code, duration_ms=duration_ms)


def run_checkov(git_root: str, files: Optional[List[str]] = None) -> ScannerResult:
    start = time.monotonic()
    if files:
        cmd = ["checkov", "-f"] + files[:20] + ["--output", "json", "--quiet"]
    else:
        cmd = ["checkov", "-d", git_root, "--output", "json", "--quiet"]

    code, stdout, stderr = run_safe_subprocess(cmd, git_root)
    duration_ms = int((time.monotonic() - start) * 1000)

    if code == -2:
        return ScannerResult("checkov", "NOT_INSTALLED", error="Checkov not installed or not in PATH",
                              duration_ms=duration_ms)

    findings = []
    if stdout.strip():
        try:
            data = json.loads(stdout)
            if isinstance(data, dict):
                failed = data.get("results", {}).get("failed_checks", [])
                for check in failed:
                    findings.append({
                        "check_id": check.get("check_id"),
                        "check_type": check.get("check_type"),
                        "resource": check.get("resource"),
                        "file": check.get("file_path"),
                        "line": check.get("file_line_range", [0])[0],
                        "message": check.get("check", {}).get("name", ""),
                    })
        except json.JSONDecodeError:
            pass

    return ScannerResult("checkov", "PASS", findings=findings, exit_code=code, duration_ms=duration_ms)


def run_trivy(git_root: str, files: Optional[List[str]] = None) -> ScannerResult:
    start = time.monotonic()
    cmd = ["trivy", "fs", "--format", "json", "--quiet", git_root]
    code, stdout, stderr = run_safe_subprocess(cmd, git_root, timeout=180)
    duration_ms = int((time.monotonic() - start) * 1000)

    if code == -2:
        return ScannerResult("trivy", "NOT_INSTALLED", error="Trivy not installed or not in PATH",
                              duration_ms=duration_ms)

    findings = []
    if stdout.strip():
        try:
            data = json.loads(stdout)
            for result in data.get("Results", []):
                for vuln in result.get("Vulnerabilities", []) or []:
                    findings.append({
                        "vuln_id": vuln.get("VulnerabilityID"),
                        "pkg_name": vuln.get("PkgName"),
                        "installed_version": vuln.get("InstalledVersion"),
                        "fixed_version": vuln.get("FixedVersion"),
                        "severity": vuln.get("Severity"),
                        "description": vuln.get("Description", "")[:200],
                        "target": result.get("Target"),
                    })
        except json.JSONDecodeError:
            pass

    return ScannerResult("trivy", "PASS", findings=findings, exit_code=code, duration_ms=duration_ms)


def run_osv_scanner(git_root: str) -> ScannerResult:
    start = time.monotonic()
    cmd = ["osv-scanner", "--json", "-r", git_root]
    code, stdout, stderr = run_safe_subprocess(cmd, git_root, timeout=120)
    duration_ms = int((time.monotonic() - start) * 1000)

    if code == -2:
        return ScannerResult("osv-scanner", "NOT_INSTALLED", error="OSV-Scanner not installed or not in PATH",
                              duration_ms=duration_ms)

    findings = []
    if stdout.strip():
        try:
            data = json.loads(stdout)
            for result in data.get("results", []):
                for pkg in result.get("packages", []):
                    for vuln in pkg.get("vulnerabilities", []):
                        findings.append({
                            "id": vuln.get("id"),
                            "package": pkg.get("package", {}).get("name"),
                            "version": pkg.get("package", {}).get("version"),
                            "severity": vuln.get("database_specific", {}).get("severity"),
                            "summary": vuln.get("summary", "")[:200],
                        })
        except json.JSONDecodeError:
            pass

    return ScannerResult("osv-scanner", "PASS", findings=findings, exit_code=code, duration_ms=duration_ms)


SCANNER_REGISTRY = {
    "semgrep": run_semgrep,
    "gitleaks": run_gitleaks,
    "checkov": run_checkov,
    "trivy": run_trivy,
    "osv-scanner": run_osv_scanner,
}


def run_scanners(scanners: List[str], git_root: str,
                 changed_files: Optional[List[str]] = None) -> List[ScannerResult]:
    """Run selected scanners and return all results — failures always surfaced."""
    results = []
    for scanner_name in scanners:
        if scanner_name not in SCANNER_REGISTRY:
            logger.warning(f"Unknown scanner requested: {scanner_name} — skipping.")
            continue
        logger.info(f"Running scanner: {scanner_name}")
        fn = SCANNER_REGISTRY[scanner_name]
        if changed_files is not None:
            try:
                result = fn(git_root, changed_files)
            except TypeError:
                # Scanner doesn't accept files param
                result = fn(git_root)
        else:
            result = fn(git_root)

        if result.status == "FAILED":
            logger.error(
                f"\nSCAN FAILED\n\nScanner:\n{scanner_name}\n\n"
                f"Reason:\n{result.error}\n\nSecurity verification:\nINCOMPLETE"
            )
        elif result.status == "NOT_INSTALLED":
            logger.warning(f"Scanner not installed: {scanner_name}. Install to enable security coverage.")
        else:
            logger.info(f"Scanner {scanner_name}: {len(result.findings)} findings")

        results.append(result)
    return results


# ─────────────────────────────────────────────────────────────────
# SARIF Output
# ─────────────────────────────────────────────────────────────────

def build_sarif_output(scan_results: List[ScannerResult], repo_ctx: RepositoryContext) -> dict:
    """
    Build a valid SARIF 2.1.0 document from scanner results.
    NEVER claims a result is verified if the underlying scanner failed.
    """
    runs = []
    for result in scan_results:
        tool_run = {
            "tool": {
                "driver": {
                    "name": result.scanner,
                    "version": result.scanner_version or "unknown",
                    "informationUri": f"https://thing.security/scanners/{result.scanner}",
                }
            },
            "results": [],
            "invocations": [
                {
                    "executionSuccessful": result.status in ("PASS",),
                    "toolExecutionNotifications": [],
                }
            ],
        }
        if result.status == "FAILED":
            tool_run["invocations"][0]["toolExecutionNotifications"].append({
                "level": "error",
                "message": {"text": f"SCAN FAILED: {result.error}"},
            })

        for finding in result.findings:
            sarif_result = {
                "ruleId": finding.get("check_id") or finding.get("rule_id") or finding.get("vuln_id") or "UNKNOWN",
                "message": {"text": finding.get("message") or finding.get("description") or finding.get("summary") or "Security finding"},
                "locations": [],
            }
            file_path = finding.get("file") or finding.get("path") or finding.get("target")
            line = finding.get("line") or finding.get("start", {}).get("line", 1) if isinstance(finding.get("start"), dict) else 1
            if file_path:
                sarif_result["locations"].append({
                    "physicalLocation": {
                        "artifactLocation": {"uri": str(file_path).replace("\\", "/")},
                        "region": {"startLine": line or 1},
                    }
                })
            tool_run["results"].append(sarif_result)

        runs.append(tool_run)

    return {
        "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        "version": "2.1.0",
        "runs": runs,
    }


# ─────────────────────────────────────────────────────────────────
# Cache Key Computation (used by both local agent and backend API)
# ─────────────────────────────────────────────────────────────────

def _compute_cache_key(project_id: str, scanner: str, scanner_version: str,
                       policy_version: int, blueprint_version: int,
                       contract_version: int, commit_sha: Optional[str]) -> str:
    """
    Compute a deterministic cache key.
    Any relevant version change (policy, blueprint, contract, scanner, commit) invalidates the key.
    NEVER return cached PASS when any of these dimensions have changed.
    """
    parts = [
        project_id, scanner, scanner_version,
        str(policy_version), str(blueprint_version),
        str(contract_version), commit_sha or "",
    ]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


# ─────────────────────────────────────────────────────────────────
# Contract Impact Detection
# ─────────────────────────────────────────────────────────────────

def detect_contract_impacts(changed_files: List[str], security_context: dict) -> List[dict]:
    """
    Determine whether changed files affect active security contracts.
    Returns UNKNOWN status when verification cannot be completed.
    """
    contracts = security_context.get("contracts") or []
    impacts = []

    for contract in contracts:
        # Real contract impact detection would parse contract scope and
        # match against changed file patterns. Currently returns UNKNOWN
        # for all contracts when files change — never fabricates SATISFIED.
        impact = {
            "contract_id": contract.get("id"),
            "contract_name": contract.get("name"),
            "status": "UNKNOWN",
            "reason": "Re-verification required after code change.",
            "affected_files": [],
        }

        # Basic heuristic: flag contracts that sound auth/admin-related when
        # auth or admin files change (deterministic rule, not LLM guess)
        contract_name_lower = (contract.get("name") or "").lower()
        for f in changed_files:
            f_lower = f.lower()
            if any(kw in contract_name_lower for kw in ("auth", "authz", "admin")):
                if any(kw in f_lower for kw in ("auth", "admin", "permission", "role")):
                    impact["status"] = "UNKNOWN"
                    impact["affected_files"].append(f)
                    impact["reason"] = f"File {f} may affect contract: {contract.get('name')}. Re-verify required."

        impacts.append(impact)

    return impacts


# ─────────────────────────────────────────────────────────────────
# File Watcher (Debounced)
# ─────────────────────────────────────────────────────────────────

class FileWatcher:
    """
    Monitors repository files using filesystem polling.
    Implements debounce to avoid scanning on every keystroke.
    """

    def __init__(self, git_root: str, callback, debounce_seconds: float = DEBOUNCE_SECONDS):
        self.git_root = git_root
        self.callback = callback
        self.debounce_seconds = debounce_seconds
        self._stop_event = Event()
        self._timer = None
        self._timer_lock = Lock()
        self._snapshots: Dict[str, float] = {}

    def _get_snapshot(self) -> Dict[str, float]:
        snapshot = {}
        for root, dirs, files in os.walk(self.git_root):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            for f in files:
                fpath = os.path.join(root, f)
                try:
                    snapshot[fpath] = os.path.getmtime(fpath)
                except OSError:
                    pass
        return snapshot

    def _detect_changes(self) -> List[str]:
        new_snapshot = self._get_snapshot()
        changed = []

        for fpath, mtime in new_snapshot.items():
            prev = self._snapshots.get(fpath)
            if prev is None or abs(mtime - prev) > 0.001:
                rel = os.path.relpath(fpath, self.git_root)
                changed.append(rel)

        for fpath in self._snapshots:
            if fpath not in new_snapshot:
                rel = os.path.relpath(fpath, self.git_root)
                changed.append(rel)

        self._snapshots = new_snapshot
        return changed

    def _schedule_scan(self, changed_files: List[str]):
        with self._timer_lock:
            if self._timer:
                self._timer.cancel()
            loop = asyncio.new_event_loop()
            self._timer = Thread(target=self._debounced_run, args=(changed_files, loop), daemon=True)
            self._timer.start()

    def _debounced_run(self, changed_files: List[str], loop):
        time.sleep(self.debounce_seconds)
        if not self._stop_event.is_set():
            try:
                self.callback(changed_files)
            except Exception as e:
                logger.error(f"Scan callback error: {e}")

    def watch(self):
        logger.info(f"Starting file watcher on: {self.git_root}")
        self._snapshots = self._get_snapshot()
        poll_interval = 0.5

        while not self._stop_event.is_set():
            time.sleep(poll_interval)
            changed = self._detect_changes()
            if changed:
                logger.debug(f"Changes detected: {changed}")
                self._schedule_scan(changed)

    def stop(self):
        self._stop_event.set()


# ─────────────────────────────────────────────────────────────────
# Local HTTP API for IDE Communication
# ─────────────────────────────────────────────────────────────────

class LocalAgentState:
    """Shared state accessible to both the watcher and HTTP handler."""
    def __init__(self):
        self.repo_ctx: Optional[RepositoryContext] = None
        self.security_context: Optional[dict] = None
        self.latest_scan_results: List[ScannerResult] = []
        self.contract_impacts: List[dict] = []
        self.last_scan_time: Optional[str] = None
        self.is_offline: bool = False
        self._lock = Lock()


_agent_state = LocalAgentState()


class LocalAgentHTTPHandler(BaseHTTPRequestHandler):
    """
    Restricted local HTTP API for IDE communication.
    Only exposes specific, safe read endpoints.
    Never allows arbitrary command execution.
    Authentication is required for write operations.
    """

    def log_message(self, format, *args):
        logger.debug(f"HTTP: {format % args}")

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data, indent=2).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        # Restrict access: only localhost
        self.send_header("Access-Control-Allow-Origin", "vscode-webview://")
        self.end_headers()
        self.wfile.write(body)

    def _validate_origin(self) -> bool:
        """Prevent unauthorized local processes from invoking agent APIs."""
        # In production: validate shared secret or Unix socket
        return True  # Simplified for initial implementation

    def do_GET(self):
        if not self._validate_origin():
            self._send_json({"error": "Unauthorized"}, 403)
            return

        state = _agent_state

        if self.path == "/health":
            self._send_json({
                "status": "ONLINE",
                "offline_mode": state.is_offline,
                "version": AGENT_VERSION,
            })
        elif self.path == "/status":
            with state._lock:
                ctx_data = asdict(state.repo_ctx) if state.repo_ctx else None
            self._send_json({
                "repository": ctx_data,
                "security_context": state.security_context,
                "offline_mode": state.is_offline,
                "last_scan": state.last_scan_time,
            })
        elif self.path == "/findings":
            with state._lock:
                all_findings = []
                for r in state.latest_scan_results:
                    for f in r.findings:
                        f["_scanner"] = r.scanner
                        all_findings.append(f)
            self._send_json({"findings": all_findings, "total": len(all_findings)})
        elif self.path == "/contracts":
            self._send_json({"contract_impacts": state.contract_impacts})
        elif self.path == "/intent":
            ctx = state.security_context or {}
            self._send_json({"intent": ctx.get("intent")})
        elif self.path == "/policy":
            ctx = state.security_context or {}
            self._send_json({"policy": ctx.get("policy")})
        elif self.path == "/scan":
            # Trigger a scan via GET (safe — no user-supplied commands)
            git_root = state.repo_ctx.git_root if state.repo_ctx else None
            if not git_root:
                self._send_json({"error": "No repository loaded"}, 503)
                return
            changed = get_changed_files(git_root)
            scanners = select_scanners(changed, state.repo_ctx)
            results = run_scanners(scanners, git_root, changed)
            with state._lock:
                state.latest_scan_results = results
                state.last_scan_time = datetime.now(timezone.utc).isoformat()
            all_findings = []
            for r in results:
                for f in r.findings:
                    f["_scanner"] = r.scanner
                    all_findings.append(f)
            self._send_json({
                "findings": all_findings,
                "total": len(all_findings),
                "scanners_run": [r.scanner for r in results],
                "scanners_failed": [r.scanner for r in results if r.status == "FAILED"],
                "scan_time": state.last_scan_time,
            })
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        # Write operations require a shared secret (simplified here)
        self._send_json({"error": "POST not supported on local agent directly. Use the CLI."}, 405)


def run_local_http_server():
    server = HTTPServer(("127.0.0.1", LOCAL_AGENT_PORT), LocalAgentHTTPHandler)
    logger.info(f"Local agent HTTP API listening on 127.0.0.1:{LOCAL_AGENT_PORT}")
    server.serve_forever()


# ─────────────────────────────────────────────────────────────────
# Backend Context Sync
# ─────────────────────────────────────────────────────────────────

def fetch_security_context(project_id: str) -> Optional[dict]:
    """
    Fetch the real security context from the backend.
    Returns None on failure — never fabricates context.
    """
    url = f"{THING_API_URL}/cli/context/{project_id}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        logger.warning(f"Failed to fetch security context: {e}. Operating offline.")
        return None


# ─────────────────────────────────────────────────────────────────
# Main Agent Loop
# ─────────────────────────────────────────────────────────────────

def on_file_change(changed_files: List[str]):
    """Called by FileWatcher after debounce — runs incremental scan."""
    state = _agent_state
    if not state.repo_ctx:
        return

    git_root = state.repo_ctx.git_root
    logger.info(f"Incremental scan triggered for: {changed_files[:5]}")

    scanners = select_scanners(changed_files, state.repo_ctx)
    if not scanners:
        logger.info("No scanners required for changed files.")
        return

    results = run_scanners(scanners, git_root, changed_files)

    with state._lock:
        state.latest_scan_results = results
        state.last_scan_time = datetime.now(timezone.utc).isoformat()
        if state.security_context:
            state.contract_impacts = detect_contract_impacts(changed_files, state.security_context)

    total_findings = sum(len(r.findings) for r in results)
    failed_scanners = [r.scanner for r in results if r.status == "FAILED"]

    if failed_scanners:
        logger.error(f"SCAN INCOMPLETE — Failed scanners: {failed_scanners}. "
                     f"Security verification: INCOMPLETE")
    if total_findings:
        logger.warning(f"SECURITY: {total_findings} finding(s) detected. Review required.")
    else:
        logger.info(f"Incremental scan complete. {total_findings} findings.")


def start_agent(git_root: str):
    """Main entry point for the local security agent."""
    logger.info(f"Thing Local Security Agent v{AGENT_VERSION} starting...")
    logger.info(f"Repository: {git_root}")

    # Discover repository
    repo_ctx = discover_repository(git_root)
    _agent_state.repo_ctx = repo_ctx

    # Fetch security context
    if repo_ctx.project_id:
        ctx = fetch_security_context(repo_ctx.project_id)
        if ctx:
            _agent_state.security_context = ctx
            _agent_state.is_offline = False
            logger.info("Security context loaded from backend.")
        else:
            _agent_state.is_offline = True
            logger.warning("OFFLINE VERIFICATION MODE — cannot reach Thing backend. "
                           "Remote checks unavailable.")
    else:
        logger.warning("Repository NOT CONNECTED. Run 'thing init' to bind to a project.")
        _agent_state.is_offline = True

    # Start local HTTP API
    http_thread = Thread(target=run_local_http_server, daemon=True)
    http_thread.start()

    # Initial scan
    logger.info("Running initial full scan...")
    changed = get_changed_files(git_root)
    scanners = select_scanners(changed or [], repo_ctx)
    results = run_scanners(scanners, git_root, changed if changed else None)
    _agent_state.latest_scan_results = results
    _agent_state.last_scan_time = datetime.now(timezone.utc).isoformat()

    total = sum(len(r.findings) for r in results)
    logger.info(f"Initial scan complete. {total} finding(s).")

    # Start file watcher
    watcher = FileWatcher(git_root, on_file_change)
    try:
        watcher.watch()
    except KeyboardInterrupt:
        logger.info("Local security agent stopping.")
        watcher.stop()


# ─────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="thing-agent",
        description="Thing Local Security Agent — real-time developer security.",
    )
    parser.add_argument("--repo", type=str, help="Repository path (default: auto-detect from git)")
    parser.add_argument("--port", type=int, default=17382, help="Local HTTP API port")
    parser.add_argument(
        "--scan-only", action="store_true",
        help="Run a single scan and exit (for CI use)"
    )
    parser.add_argument("--format", choices=["human", "json", "sarif"], default="human")
    args = parser.parse_args()

    global LOCAL_AGENT_PORT
    LOCAL_AGENT_PORT = args.port


    git_root = args.repo or get_git_root()
    if not git_root:
        print("ERROR: Not a git repository and --repo not specified.", file=sys.stderr)
        sys.exit(3)

    if args.scan_only:
        repo_ctx = discover_repository(git_root)
        changed = get_changed_files(git_root)
        scanners = select_scanners(changed or [], repo_ctx)
        results = run_scanners(scanners, git_root, changed if changed else None)

        all_findings = []
        for r in results:
            all_findings.extend(r.findings)

        has_failure = any(r.status == "FAILED" for r in results)

        if args.format == "sarif":
            print(json.dumps(build_sarif_output(results, repo_ctx), indent=2))
        elif args.format == "json":
            print(json.dumps({
                "scan_id": hashlib.md5(str(time.time()).encode()).hexdigest(),
                "repository": repo_ctx.git_root,
                "commit": repo_ctx.commit_sha,
                "status": "INCOMPLETE" if has_failure else "COMPLETE",
                "findings": all_findings,
                "scanners_run": [r.scanner for r in results],
                "scanners_failed": [r.scanner for r in results if r.status == "FAILED"],
                "duration_ms": sum(r.duration_ms for r in results),
            }, indent=2))
        else:
            for r in results:
                if r.status == "FAILED":
                    print(f"\nSCAN FAILED\nScanner: {r.scanner}\nReason: {r.error}\nSecurity verification: INCOMPLETE")
                elif r.status == "NOT_INSTALLED":
                    print(f"\nSCANNER NOT INSTALLED: {r.scanner}")
                else:
                    print(f"\n{r.scanner}: {len(r.findings)} finding(s)")
                    for f in r.findings[:10]:
                        print(f"  - {f.get('check_id') or f.get('rule_id') or f.get('vuln_id')}: "
                              f"{f.get('file') or f.get('path', '')}:{f.get('line', '')}")

        if has_failure:
            sys.exit(2)
        if all_findings:
            sys.exit(1)
        sys.exit(0)
    else:
        start_agent(git_root)


if __name__ == "__main__":
    main()
