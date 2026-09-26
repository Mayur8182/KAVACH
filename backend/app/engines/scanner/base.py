import asyncio
import os
import shutil
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

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

    async def validate_environment(self) -> Tuple[bool, str, Optional[str]]:
        """
        Verifies whether the scanner binary exists in the system PATH and can run.
        Returns: (is_available, description_message, version_string)
        """
        executable_path = shutil.which(self.executable_name)
        if not executable_path:
            return (
                False,
                f"{self.tool_name} binary '{self.executable_name}' is not installed or not found in system PATH. Install {self.tool_name} to enable this scanner.",
                None,
            )

        try:
            proc = await asyncio.create_subprocess_exec(
                self.executable_name,
                "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
            version_str = stdout.decode("utf-8", errors="replace").strip() or stderr.decode("utf-8", errors="replace").strip()
            return True, f"{self.tool_name} is operational", version_str.split("\n")[0]
        except Exception as e:
            return False, f"Failed to probe {self.tool_name} version: {str(e)}", None

    async def health(self) -> Dict[str, Any]:
        """Returns health probe info for the scanner."""
        available, msg, ver = await self.validate_environment()
        return {
            "scanner_name": self.scanner_name,
            "scanner_type": self.scanner_type,
            "tool_name": self.tool_name,
            "status": "healthy" if available else "not_configured",
            "version": ver,
            "message": msg,
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

    async def scan(self, target: ScanTarget, timeout_seconds: int = 180) -> ScannerExecutionResult:
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

        cmd = self.build_command(target)
        cmd_str = " ".join(cmd)
        start_time = time.time()

        try:
            # Execute subprocess safely with isolated arguments (no shell=True)
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=target.path if os.path.isdir(target.path) else None,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=float(timeout_seconds),
                )
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
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
            raw_stdout = stdout_bytes.decode("utf-8", errors="replace")
            raw_stderr = stderr_bytes.decode("utf-8", errors="replace")
            exit_code = proc.returncode if proc.returncode is not None else -1

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
