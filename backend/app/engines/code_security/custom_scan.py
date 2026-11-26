"""
Kavach Custom Scan Engine
Provides fine-grained developer control over scan scope, rules, severities, and depth.
"""

import os
import re
import time
import fnmatch
from typing import Dict, Any, List, Optional, Set
from pydantic import BaseModel, Field
from app.engines.base_engine import EngineType, EngineFinding, EngineExecutionResult
from app.engines.sast.engine import SASTEngine


class CustomScanProfile(BaseModel):
    name: str = "Custom Scan Profile"
    include_paths: List[str] = Field(default_factory=list)
    exclude_paths: List[str] = Field(default_factory=lambda: ["tests/**", "mocks/**", "*.test.*", "*.spec.*"])
    rule_categories: List[str] = Field(default_factory=lambda: ["sqli", "xss", "cmdi", "auth", "crypto"])
    severity_thresholds: List[str] = Field(default_factory=lambda: ["CRITICAL", "HIGH", "MEDIUM", "LOW"])
    scan_depth: str = "deep"  # shallow, standard, deep


class CustomScanEngine:
    """
    Custom Scan Engine:
    Executes scans restricted strictly to developer-configured paths, rules, and severities.
    """

    def __init__(self):
        self.sast_engine = SASTEngine()

    def filter_files_by_scope(
        self,
        base_path: str,
        include_paths: List[str],
        exclude_paths: List[str],
    ) -> List[str]:
        target_files = []
        abs_base = os.path.abspath(base_path)

        # If specific paths are specified, resolve them
        paths_to_traverse = []
        if include_paths:
            for p in include_paths:
                full_p = os.path.join(abs_base, p) if not os.path.isabs(p) else p
                if os.path.exists(full_p):
                    paths_to_traverse.append(full_p)
        else:
            paths_to_traverse.append(abs_base)

        for cur_path in paths_to_traverse:
            if os.path.isfile(cur_path):
                rel = os.path.relpath(cur_path, abs_base)
                if not any(fnmatch.fnmatch(rel, ex) for ex in exclude_paths):
                    target_files.append(cur_path)
            elif os.path.isdir(cur_path):
                for root, dirs, files in os.walk(cur_path):
                    dirs[:] = [d for d in dirs if d.lower() not in {".git", "node_modules", "venv", "dist", ".next"} and not d.startswith(".")]
                    for f in files:
                        full_f = os.path.join(root, f)
                        rel_f = os.path.relpath(full_f, abs_base)
                        # Check extension
                        if full_f.endswith((".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java")):
                            # Check exclusions
                            if not any(fnmatch.fnmatch(rel_f, ex) for ex in exclude_paths):
                                target_files.append(full_f)
                                if len(target_files) >= 300:
                                    break
                    if len(target_files) >= 300:
                        break

        return target_files

    async def scan_target(
        self,
        target_path: str,
        profile: CustomScanProfile,
    ) -> EngineExecutionResult:
        start_time = time.time()
        logs: List[str] = [
            f"[custom-scan] Initializing Custom Scope Engine for target: {target_path}",
            f"[custom-scope] Included paths: {profile.include_paths or ['<entire-repo>']}",
            f"[custom-scope] Excluded patterns: {profile.exclude_paths}",
            f"[custom-rules] Active categories: {profile.rule_categories}",
            f"[custom-severities] Allowed severities: {profile.severity_thresholds}",
        ]

        # 1. Resolve filtered target files
        candidate_files = self.filter_files_by_scope(
            target_path,
            profile.include_paths,
            profile.exclude_paths,
        )
        logs.append(f"[custom-scan] Resolved {len(candidate_files)} candidate source files within configured scope")

        # 2. Run SAST analysis
        raw_findings: List[EngineFinding] = []
        for cf in candidate_files:
            rel_p = os.path.relpath(cf, target_path)
            res = await self.sast_engine.scan_target(cf, max_files=1)
            for f in res.findings:
                f.file_path = rel_p
                raw_findings.append(f)

        # 3. Filter findings by configured rule categories and severities
        filtered_findings: List[EngineFinding] = []
        allowed_sevs = {s.upper() for s in profile.severity_thresholds}

        for f in raw_findings:
            if f.severity.upper() not in allowed_sevs:
                continue

            # Category filter (sqli, xss, cmdi, auth, etc.)
            rule_id_lower = f.rule_id.lower()
            title_lower = f.title.lower()
            matches_category = False
            for cat in profile.rule_categories:
                if cat in rule_id_lower or cat in title_lower:
                    matches_category = True
                    break

            if matches_category or not profile.rule_categories:
                filtered_findings.append(f)

        duration_ms = int((time.time() - start_time) * 1000)
        logs.append(
            f"[custom-scan] Custom scan completed in {duration_ms}ms. Filtered {len(raw_findings)} raw findings down to "
            f"{len(filtered_findings)} policy-compliant findings."
        )

        return EngineExecutionResult(
            engine=EngineType.SAST,
            status="SUCCESS",
            duration_ms=duration_ms,
            files_analyzed=len(candidate_files),
            findings=filtered_findings,
            logs=logs,
        )

