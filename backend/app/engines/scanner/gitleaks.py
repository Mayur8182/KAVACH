import asyncio
import hashlib
import json
import logging
import os
import tempfile
import time
from typing import List

from app.core.subprocess_runner import run_command_async
from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.models import NormalizedFindingCandidate, ScanTarget, ScannerExecutionResult

logger = logging.getLogger("secure-control-plane")


def mask_secret(secret_val: str) -> str:
    """Masks secret values to prevent cleartext exposure in databases and audit logs."""
    if not secret_val:
        return "[REDACTED]"
    if len(secret_val) <= 6:
        return "****"
    return f"{secret_val[:3]}...****...{secret_val[-2:]}"


class GitleaksScanner(SecurityScanner):
    """
    Secret detection scanner executing real Gitleaks CLI.
    Identifies hardcoded API tokens, credentials, private keys, and passwords.
    Strictly prevents persisting unmasked secret values in plaintext.
    """
    scanner_name = "gitleaks"
    scanner_type = "SECRETS"
    tool_name = "Gitleaks"
    executable_name = "gitleaks"

    def build_command(self, target: ScanTarget) -> List[str]:
        # Fallback command if invoked directly
        return [
            self.executable_name,
            "detect",
            "--no-git",
            "--source",
            target.path,
            "--report-format",
            "json",
        ]

    def get_tolerated_exit_codes(self) -> List[int]:
        # Gitleaks exits with 0 (no leaks found) or 1 (leaks found)
        return [0, 1]

    async def scan(self, target: ScanTarget, timeout_seconds: int = 35) -> ScannerExecutionResult:
        """
        Executes Gitleaks with a guaranteed temporary report file so Windows and POSIX
        both capture report output without creating literal '-' files or shell redirection bugs.
        """
        is_available, env_msg, version_str = await self.validate_environment()
        if not is_available:
            return await super().scan(target, timeout_seconds=timeout_seconds)

        executable_path = self.resolve_executable() or self.executable_name
        fd, temp_report = tempfile.mkstemp(suffix=".json", prefix="gitleaks_report_")
        os.close(fd)

        cmd = [
            executable_path,
            "detect",
            "--no-git",
            "--source",
            target.path,
            "--report-format",
            "json",
            "--report-path",
            temp_report,
        ]
        if os.name == "nt" and cmd[0].lower().endswith((".cmd", ".bat")):
            cmd = ["cmd.exe", "/c"] + cmd

        cmd_str = " ".join(cmd)
        start_time = time.time()

        try:
            cwd_path = target.path if os.path.isdir(target.path) else None
            try:
                retcode, stdout_bytes, stderr_bytes = await run_command_async(
                    cmd,
                    cwd=cwd_path,
                    timeout=float(timeout_seconds),
                )
            except asyncio.TimeoutError:
                duration = int((time.time() - start_time) * 1000)
                return ScannerExecutionResult(
                    scanner_name=self.scanner_name,
                    scanner_type=self.scanner_type,
                    status="FAILED",
                    scanner_version=version_str,
                    command=cmd_str,
                    exit_code=-1,
                    stdout_summary=None,
                    stderr_output=f"Execution timed out after {timeout_seconds} seconds",
                    findings=[],
                    duration_ms=duration,
                    error_message=f"Scanner execution timed out after {timeout_seconds}s",
                )

            duration = int((time.time() - start_time) * 1000)
            raw_stderr = stderr_bytes.decode("utf-8", errors="replace").strip()

            raw_stdout = ""
            if os.path.exists(temp_report):
                try:
                    with open(temp_report, "r", encoding="utf-8", errors="replace") as rf:
                        raw_stdout = rf.read()
                except Exception as ex:
                    logger.warning(f"Error reading gitleaks temp report: {ex}")

            findings = await self.normalize(raw_stdout, raw_stderr, retcode, target)
            return ScannerExecutionResult(
                scanner_name=self.scanner_name,
                scanner_type=self.scanner_type,
                status="COMPLETED" if retcode in self.get_tolerated_exit_codes() else "FAILED",
                scanner_version=version_str,
                command=cmd_str,
                exit_code=retcode,
                stdout_summary=f"Gitleaks detected {len(findings)} secret leaks",
                stderr_output=raw_stderr if retcode not in self.get_tolerated_exit_codes() else None,
                findings=findings,
                duration_ms=duration,
                error_message=None if retcode in self.get_tolerated_exit_codes() else raw_stderr[:300],
            )
        finally:
            if os.path.exists(temp_report):
                try:
                    os.remove(temp_report)
                except Exception:
                    pass

    async def normalize(
        self,
        raw_stdout: str,
        raw_stderr: str,
        exit_code: int,
        target: ScanTarget,
    ) -> List[NormalizedFindingCandidate]:
        if not raw_stdout or not raw_stdout.strip():
            return []

        try:
            data = json.loads(raw_stdout)
        except Exception:
            try:
                data = json.loads(raw_stderr)
            except Exception:
                return []

        if not isinstance(data, list):
            return []

        findings: List[NormalizedFindingCandidate] = []

        for item in data:
            rule_id = item.get("RuleID", "generic-secret")
            desc = item.get("Description", "Detected plaintext secret")
            file_path = item.get("File")
            line = item.get("StartLine")
            raw_secret = item.get("Secret", "")

            # Exclude scratch, node_modules, and cache files unless target is specifically within scratch
            if file_path:
                fp_norm = file_path.replace("\\", "/").lower()
                target_norm = target.path.replace("\\", "/").lower()
                if "/scratch/" in fp_norm or fp_norm.startswith("scratch/"):
                    if not ("/scratch/" in target_norm or target_norm.endswith("/scratch") or target_norm.endswith("scratch")):
                        continue

            # Security rule: Never store raw plaintext secrets!
            masked = mask_secret(raw_secret)
            secret_hash = hashlib.sha256(raw_secret.encode("utf-8")).hexdigest()[:16]

            fp_raw = f"gitleaks:{rule_id}:{file_path}:{line}:{secret_hash}"
            fingerprint = hashlib.sha256(fp_raw.encode("utf-8")).hexdigest()

            findings.append(
                NormalizedFindingCandidate(
                    rule_id=f"gitleaks:{rule_id}",
                    title=f"Secret Exposed: {desc}",
                    description=f"{desc} identified in {file_path}:{line}. Exposed secret values violate core credentials security boundaries.",
                    severity="CRITICAL",
                    file_path=file_path,
                    line_number=line,
                    column_number=item.get("StartColumn"),
                    snippet=f"Detected Token: {masked}",
                    fingerprint=fingerprint,
                    category="SECRETS",
                    raw_metadata={
                        "rule_id": rule_id,
                        "commit": item.get("Commit"),
                        "entropy": item.get("Entropy"),
                        "secret_hash_prefix": secret_hash,
                        "engine": "gitleaks",
                    },
                )
            )

        return findings
