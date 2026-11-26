"""
Kavach Secrets Sub-Engines — Validation, Context, and History Scanner
"""

import os
import re
import subprocess
from typing import Dict, Any, List, Optional


class SecretValidationEngine:
    """
    Safely validates credential formats without unauthorized external calls.
    """

    @staticmethod
    def validate_format(secret_type: str, candidate: str) -> bool:
        if secret_type == "AWS Access Key ID":
            return len(candidate) == 20 and candidate.startswith(("AKIA", "AGPA", "AIDA", "AROA", "AIPA", "ANPA", "ANVA", "ASIA"))
        elif secret_type == "GitHub Personal Access Token":
            return len(candidate) >= 40 and candidate.startswith("ghp_")
        elif secret_type == "Stripe API Key":
            return len(candidate) >= 30 and (candidate.startswith("sk_live_") or candidate.startswith("sk_test_"))
        return len(candidate) >= 12


class SecretContextEngine:
    """
    Suppresses false positives based on test files, variable names, and dummy values.
    """

    FALSE_POSITIVE_INDICATORS = {
        "example", "dummy", "placeholder", "fake", "mock", "test", "your_api_key",
        "xxxx", "000000", "123456", "changeme", "sample", "env_var",
    }

    def is_false_positive(self, file_path: str, snippet: str, match_value: str) -> bool:
        lower_snippet = snippet.lower()
        lower_match = match_value.lower()
        lower_path = file_path.lower()

        # Check for placeholder strings
        for indicator in self.FALSE_POSITIVE_INDICATORS:
            if indicator in lower_match or f"'{indicator}'" in lower_snippet or f'"{indicator}"' in lower_snippet:
                return True

        # Check for test files with mock tokens
        if ("test" in lower_path or "spec" in lower_path or "fixture" in lower_path) and ("fake" in lower_snippet or "mock" in lower_snippet):
            return True

        return False


class GitHistorySecretScanner:
    """
    Scans Git commit history diffs for secrets committed in previous revisions.
    """

    async def scan_git_history(self, repo_path: str, max_commits: int = 50) -> List[Dict[str, Any]]:
        history_findings: List[Dict[str, Any]] = []
        if not os.path.exists(os.path.join(repo_path, ".git")):
            return history_findings

        try:
            cmd = ["git", "-C", repo_path, "log", f"-n{max_commits}", "-p", "--diff-filter=A"]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="ignore")
            if proc.returncode != 0:
                return history_findings

            diff_text = proc.stdout
            lines = diff_text.split("\n")
            current_commit = ""
            for line in lines:
                if line.startswith("commit "):
                    current_commit = line.split()[1]
                elif line.startswith("+") and not line.startswith("+++"):
                    added_line = line[1:].strip()
                    # Check for private key or token
                    if "BEGIN RSA PRIVATE KEY" in added_line or "AKIA" in added_line:
                        history_findings.append({
                            "commit": current_commit,
                            "line": added_line[:50],
                            "type": "Exposed Credential in Historical Commit",
                        })
        except Exception:
            pass

        return history_findings

