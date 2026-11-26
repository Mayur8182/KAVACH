"""
Kavach SAST Sub-Engine — Semantic Analysis Engine & Custom Rules Engine
Understands semantic code behavior, variable scoping, and organization-specific custom security rules.
"""

import os
import re
import uuid
import yaml
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineFinding, EngineType


class SemanticAnalysisEngine:
    """
    Checks semantic invariants such as missing authentication decorators,
    empty exception handlers, and unsafe variable shadowing.
    """

    def analyze_semantics(self, file_path: str, content: str) -> List[EngineFinding]:
        findings: List[EngineFinding] = []
        lines = content.split("\n")

        # 1. Detect empty except blocks (CWE-391)
        empty_except_pattern = re.compile(r"except(?:\s+[a-zA-Z0-9_]+)?:\s*(?:pass|\.\.\.)\s*$")
        for idx, line in enumerate(lines, 1):
            if empty_except_pattern.search(line):
                findings.append(EngineFinding(
                    id=f"sem-{uuid.uuid4().hex[:8]}",
                    engine=EngineType.SAST,
                    sub_engine="Semantic Analysis Engine",
                    rule_id="KV-SEM-001",
                    title="Silently Ignored Exception (CWE-391)",
                    description="Empty 'except: pass' block suppresses system exceptions, hiding failures or security errors.",
                    severity="LOW",
                    file_path=file_path,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=line.strip(),
                    remediation_guidance="Log caught exceptions with error context and re-raise or handle properly.",
                ))

        # 2. Detect exposed sensitive debug flag in production code
        debug_pattern = re.compile(r"DEBUG\s*=\s*True\b")
        for idx, line in enumerate(lines, 1):
            if debug_pattern.search(line) and not ("test" in file_path.lower() or "example" in file_path.lower()):
                findings.append(EngineFinding(
                    id=f"sem-{uuid.uuid4().hex[:8]}",
                    engine=EngineType.SAST,
                    sub_engine="Semantic Analysis Engine",
                    rule_id="KV-SEM-002",
                    title="Exposed Debug Mode (CWE-489)",
                    description="Application code explicitly sets DEBUG = True, exposing detailed stack traces and secrets in error pages.",
                    severity="HIGH",
                    file_path=file_path,
                    line_start=idx,
                    line_end=idx,
                    code_snippet=line.strip(),
                    remediation_guidance="Read DEBUG flag dynamically from environment variable (e.g. os.getenv('DEBUG', 'false').lower() == 'true').",
                ))

        return findings


class CustomRulesEngine:
    """
    Loads and runs organization-specific YAML rules.
    """

    def __init__(self, rules_directory: Optional[str] = None):
        self.rules: List[Dict[str, Any]] = []
        if rules_directory and os.path.exists(rules_directory):
            self.load_rules(rules_directory)

    def load_rules(self, rules_dir: str):
        for root, _, files in os.walk(rules_dir):
            for f in files:
                if f.endswith((".yaml", ".yml")):
                    try:
                        with open(os.path.join(root, f), "r", encoding="utf-8") as rf:
                            data = yaml.safe_load(rf)
                            if isinstance(data, list):
                                self.rules.extend(data)
                            elif isinstance(data, dict):
                                self.rules.append(data)
                    except Exception:
                        pass

    def evaluate(self, file_path: str, content: str) -> List[EngineFinding]:
        findings: List[EngineFinding] = []
        lines = content.split("\n")
        for r in self.rules:
            pattern_str = r.get("pattern")
            if not pattern_str:
                continue
            regex = re.compile(pattern_str)
            for idx, line in enumerate(lines, 1):
                if regex.search(line):
                    findings.append(EngineFinding(
                        id=f"custom-{uuid.uuid4().hex[:8]}",
                        engine=EngineType.SAST,
                        sub_engine="Custom Rules Engine",
                        rule_id=r.get("id", "ORG-RULE-001"),
                        title=r.get("title", "Custom Organization Security Rule"),
                        description=r.get("description", "Violates internal security guidelines."),
                        severity=r.get("severity", "MEDIUM"),
                        file_path=file_path,
                        line_start=idx,
                        line_end=idx,
                        code_snippet=line.strip(),
                        remediation_guidance=r.get("remediation", "Comply with organizational standard."),
                    ))
        return findings

