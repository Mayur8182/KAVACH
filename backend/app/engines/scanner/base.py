import asyncio
import os
import shutil
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
from app.core.subprocess_runner import run_command_async

from app.engines.scanner.models import (
    NormalizedFindingCandidate,
    ScannerExecutionResult,
    ScanTarget,
)


class SecurityScanner(ABC):
    """
    Abstract base class for all deterministic security scanners.
    Executes real underlying CLI/container processes, collects real output,
    and normalizes findings into first-class security entities.
    """

    scanner_name: str
    scanner_type: str  # SAST, SECRETS, SCA, CONTAINER, IAC
    tool_name: str
    executable_name: str

    def resolve_executable(self) -> Optional[str]:
        """Resolves full executable path, checking system PATH, tools directories, and Python scripts directory."""
        if os.path.isabs(self.executable_name) and os.path.isfile(self.executable_name):
            return self.executable_name
        p = shutil.which(self.executable_name)
        if p:
            return p
        if os.name == "nt":
            for ext in [".cmd", ".bat", ".exe"]:
                p = shutil.which(self.executable_name + ext)
                if p:
                    return p
            search_dirs = [
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "bin")),
                os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python313\Scripts"),
                r"C:\tools\scanners",
                os.path.expandvars(r"%USERPROFILE%\bin"),
            ]
            for d in search_dirs:
                if not os.path.exists(d):
                    continue
                for ext in [".exe", ".cmd", ".bat", ""]:
                    cand = os.path.join(d, self.executable_name + ext)
                    if os.path.isfile(cand):
                        return cand
        return None

    async def validate_environment(self) -> Tuple[bool, str, Optional[str]]:
        """
        Verifies whether the scanner binary exists in the system PATH and can run.
        Returns: (is_available, description_message, version_string)
        """
        executable_path = self.resolve_executable()
        if not executable_path:
            return (
                False,
                f"{self.tool_name} binary '{self.executable_name}' is not installed or not found in system PATH. Install {self.tool_name} to enable this scanner.",
                None,
            )

        # Fast verification: executable physically exists on disk and is accessible
        if os.path.isfile(executable_path):
            return True, f"{self.tool_name} is operational", "active"

        return False, f"{self.tool_name} executable not accessible on disk", None

    async def health(self) -> Dict[str, Any]:
        """Returns health probe info for the scanner."""
        from datetime import datetime, timezone
        available, msg, ver = await self.validate_environment()
        return {
            "scanner_name": self.scanner_name,
            "scanner_type": self.scanner_type,
            "tool_name": self.tool_name,
            "status": "healthy" if available else "not_configured",
            "is_available": available,
            "version": ver,
            "message": msg,
            "last_health_check": datetime.now(timezone.utc).isoformat(),
        }

    @abstractmethod
    def build_command(self, target: ScanTarget) -> List[str]:
        """Constructs safe argument vector for scanner execution."""
        pass

    @abstractmethod
    async def normalize(
        self,
        raw_stdout: str,
        raw_stderr: str,
        exit_code: int,
        target: ScanTarget,
    ) -> List[NormalizedFindingCandidate]:
        """Parses scanner output (JSON/SARIF) into normalized finding candidates."""
        pass

    def get_tolerated_exit_codes(self) -> List[int]:
        """
        Returns exit codes that represent normal execution with findings.
        For example, Semgrep exits with 0 or 1, Gitleaks with 0 or 1, Checkov with 0 or 1.
        """
        return [0, 1]

    async def scan(self, target: ScanTarget, timeout_seconds: int = 90) -> ScannerExecutionResult:
        """
        Executes real scanner process against the target.
        Handles missing binary, timeout, exit codes, and output normalization.
        """
        is_available, env_msg, version_str = await self.validate_environment()
        if not is_available:
            return ScannerExecutionResult(
                scanner_name=self.scanner_name,
                scanner_type=self.scanner_type,
                status="NOT_CONFIGURED",
                scanner_version=None,
                command=None,
                exit_code=None,
                stdout_summary=None,
                stderr_output=env_msg,
                findings=[],
                duration_ms=0,
                error_message=env_msg,
            )

        executable_path = self.resolve_executable()
        cmd = self.build_command(target)
        if executable_path:
            cmd[0] = executable_path
        if os.name == "nt" and cmd[0].lower().endswith((".cmd", ".bat")):
            cmd = ["cmd.exe", "/c"] + cmd

        cmd_str = " ".join(cmd)
        start_time = time.time()

        try:
            # Execute subprocess safely with project root context (cwd=None)
            retcode, stdout_bytes, stderr_bytes = await run_command_async(
                cmd,
                cwd=None,
                timeout=float(timeout_seconds),
            )

            duration = int((time.time() - start_time) * 1000)
            raw_stdout = stdout_bytes.decode("utf-8", errors="replace")
            raw_stderr = stderr_bytes.decode("utf-8", errors="replace")
            exit_code = retcode

            tolerated_codes = self.get_tolerated_exit_codes()
            if exit_code not in tolerated_codes:
                return ScannerExecutionResult(
                    scanner_name=self.scanner_name,
                    scanner_type=self.scanner_type,
                    status="FAILED",
                    scanner_version=version_str,
                    command=cmd_str,
                    exit_code=exit_code,
                    stdout_summary=raw_stdout[:1000] if raw_stdout else None,
                    stderr_output=raw_stderr[:2000] if raw_stderr else None,
                    findings=[],
                    duration_ms=duration,
                    error_message=f"Scanner process exited with unexpected code {exit_code}: {raw_stderr[:300]}",
                )

            # Normalize findings
            findings = await self.normalize(raw_stdout, raw_stderr, exit_code, target)

            return ScannerExecutionResult(
                scanner_name=self.scanner_name,
                scanner_type=self.scanner_type,
                status="COMPLETED",
                scanner_version=version_str,
                command=cmd_str,
                exit_code=exit_code,
                stdout_summary=f"Processed successfully ({len(findings)} findings detected)",
                stderr_output=raw_stderr[:500] if raw_stderr else None,
                findings=findings,
                duration_ms=duration,
                error_message=None,
            )

        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return ScannerExecutionResult(
                scanner_name=self.scanner_name,
                scanner_type=self.scanner_type,
                status="FAILED",
                scanner_version=version_str,
                command=cmd_str,
                exit_code=-1,
                stdout_summary=None,
                stderr_output=str(e),
                findings=[],
                duration_ms=duration,
                error_message=f"Failed to execute scanner: {str(e)}",
            )
