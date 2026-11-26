"""
Kavach Secrets Security Engine
Unified Engine orchestrating:
1. Pattern Detection (API keys, tokens, passwords)
2. Entropy Detection (Shannon entropy for high-entropy secrets)
3. Validation Engine (Format and syntax verification)
4. Context Engine (False positive suppression)
5. History Scanner (Git history analysis)
"""

import os
import time
import uuid
import shutil
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineType, EngineFinding, EngineExecutionResult
from app.engines.secrets.pattern_detector import SecretPatternDetector
from app.engines.secrets.entropy_detector import EntropyDetector
from app.engines.secrets.context_engine import SecretValidationEngine, SecretContextEngine, GitHistorySecretScanner


class SecretsEngine:
    """
    Kavach Secrets Engine: High-precision secret leak detection with entropy and history scanning.
    """

    def __init__(self):
        self.pattern_detector = SecretPatternDetector()
        self.entropy_detector = EntropyDetector()
        self.validator = SecretValidationEngine()
        self.context = SecretContextEngine()
        self.history_scanner = GitHistorySecretScanner()
        self.gitleaks_available = shutil.which("gitleaks") is not None

    async def scan_target(self, target_path: str, max_files: int = 500) -> EngineExecutionResult:
        start_time = time.time()
        findings: List[EngineFinding] = []
        logs: List[str] = [
            f"[secrets-engine] Initializing Secrets Security Engine on {target_path}",
            f"[gitleaks] Host binary detected: {self.gitleaks_available}",
        ]

        target_abs = os.path.abspath(target_path)
        files_scanned = 0

        # Scan files
        for root, dirs, files in os.walk(target_abs):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "venv", ".venv", "dist", "build"}]
            for f in files:
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, target_abs)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as content_file:
                        content = content_file.read()
                    files_scanned += 1

                    # 1. Pattern Matching
                    pattern_matches = self.pattern_detector.detect_patterns(content)
                    for m in pattern_matches:
                        if not self.context.is_false_positive(rel_path, m["snippet"], m["match"]):
                            findings.append(EngineFinding(
                                id=f"sec-{uuid.uuid4().hex[:8]}",
                                engine=EngineType.SECRETS,
                                sub_engine="Pattern Detection Engine",
                                rule_id=m["rule_id"],
                                title=f"Exposed Secret: {m['name']}",
                                description=f"Hardcoded {m['type']} identified in source code.",
                                severity=m["severity"],
                                file_path=rel_path,
                                line_start=m["line"],
                                line_end=m["line"],
                                code_snippet=m["snippet"][:120],
                                remediation_guidance="Revoke exposed credential immediately. Migrate secret to secure vault (AWS Secrets Manager, HashiCorp Vault) or .env file with .gitignore entry.",
                                evidence={"match": m["match"][:4] + "...", "type": m["type"]},
                            ))

                    # 2. Entropy Detection for config and source files
                    if f.endswith((".py", ".js", ".ts", ".json", ".env", ".yaml", ".yml")):
                        lines = content.split("\n")
                        for idx, line in enumerate(lines, 1):
                            if any(k in line.lower() for k in ("token", "key", "secret", "auth", "pwd")):
                                high_entropy = self.entropy_detector.find_high_entropy_strings(line)
                                for he in high_entropy:
                                    if not self.context.is_false_positive(rel_path, line, he["token"]):
                                        findings.append(EngineFinding(
                                            id=f"sec-ent-{uuid.uuid4().hex[:8]}",
                                            engine=EngineType.SECRETS,
                                            sub_engine="Entropy Detection Engine",
                                            rule_id="KV-SEC-ENT-01",
                                            title="High-Entropy Cryptographic Token Detected",
                                            description=f"Identified high-entropy secret token (Shannon entropy: {he['entropy']}) in configuration or source code.",
                                            severity="HIGH",
                                            file_path=rel_path,
                                            line_start=idx,
                                            line_end=idx,
                                            code_snippet=line.strip()[:120],
                                            remediation_guidance="Extract credential into encrypted secrets storage and sanitize source code.",
                                            evidence={"entropy": he["entropy"], "length": he["length"]},
                                        ))

                except Exception:
                    pass

                if files_scanned >= max_files:
                    break
            if files_scanned >= max_files:
                break

        # 3. Git History Analysis
        history_secrets = await self.history_scanner.scan_git_history(target_abs, max_commits=30)
        for hs in history_secrets:
            findings.append(EngineFinding(
                id=f"sec-hist-{uuid.uuid4().hex[:8]}",
                engine=EngineType.SECRETS,
                sub_engine="History Scanner Engine",
                rule_id="KV-SEC-HIST-01",
                title="Exposed Secret in Git Commit History",
                description=f"Secret detected in past Git commit '{hs.get('commit', 'unknown')}'. Even if deleted in HEAD, commit history retains exposed token.",
                severity="HIGH",
                file_path=".git",
                line_start=1,
                line_end=1,
                code_snippet=hs.get("line", ""),
                remediation_guidance="Revoke token immediately. Rewrite Git commit history with BFG Repo-Cleaner or git-filter-repo to purge credential from history.",
                evidence={"commit": hs.get("commit")},
            ))

        duration_ms = int((time.time() - start_time) * 1000)
        logs.append(f"[secrets-engine] Analyzed {files_scanned} files + Git history in {duration_ms}ms. Found {len(findings)} secret leaks.")

        return EngineExecutionResult(
            engine=EngineType.SECRETS,
            status="SUCCESS",
            duration_ms=duration_ms,
            files_analyzed=files_scanned,
            findings=findings,
            logs=logs,
        )

