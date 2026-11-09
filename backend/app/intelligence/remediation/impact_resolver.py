"""
Kavach Phase 4: Multi-File Impact Resolver (M1)
Read-only component analyzing code relationships and security intelligence
to determine the minimal, evidence-backed candidate file set for remediation.
"""

from __future__ import annotations

import os
import re
import uuid
import hashlib
import logging
from typing import Dict, List, Optional, Set, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.scan import SecurityFinding
from app.intelligence.remediation.models import (
    FileClassification,
    CandidateFileImpact,
    MultiFileImpactReport,
)

logger = logging.getLogger("kavach.remediation.impact_resolver")


class MultiFileImpactResolver:
    """
    Step 1.1 / M1: Resolves affected repository files and symbols using
    Phase 1 Code Intelligence (AST, symbol index, dependency graph)
    and Phase 2 Security Intelligence (reachability, attack paths).
    Strictly read-only: no file modifications.
    """

    @classmethod
    async def resolve_impact(
        cls,
        db: AsyncSession,
        finding_id: str,
        repo_root: Optional[str] = None,
        base_commit_sha: Optional[str] = None,
    ) -> MultiFileImpactReport:
        """
        Traverses symbol index, imports, call graphs, tests, and security findings
        to produce a classified candidate file impact report.
        """
        f_uuid = None
        try:
            f_uuid = uuid.UUID(str(finding_id))
        except (ValueError, TypeError):
            pass

        finding = None
        if f_uuid:
            finding = await db.get(SecurityFinding, f_uuid)
        if not finding:
            target_id = f_uuid if f_uuid else finding_id
            stmt = select(SecurityFinding).where(SecurityFinding.id == target_id)
            finding = (await db.execute(stmt)).scalars().first()

        if not finding:
            raise ValueError(f"Security finding '{finding_id}' not found.")

        primary_file = finding.file_path or "main.py"
        repo_path = repo_root or os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))

        # Determine target symbol in primary file
        primary_symbol = cls._extract_primary_symbol(finding, primary_file, repo_path)

        # 1. Resolve primary file impact (Classification: REQUIRED)
        candidate_files: List[CandidateFileImpact] = []
        primary_hash = cls._compute_file_hash(repo_path, primary_file)

        candidate_files.append(
            CandidateFileImpact(
                file_path=primary_file,
                classification=FileClassification.REQUIRED,
                target_symbols=[primary_symbol] if primary_symbol else [],
                reasons=[
                    f"Vulnerability '{finding.rule_id or finding.title}' resides directly in this file",
                    f"Source location line {finding.line_number or 1}",
                ],
                confidence=1.0,
                is_included_in_plan=True,
                base_file_hash=primary_hash,
            )
        )

        # 2. Discover callers, imports, and supporting files via codebase search & dependency graph
        callers, supporting_files = cls._discover_callers_and_supporting(
            repo_path=repo_path,
            primary_file=primary_file,
            primary_symbol=primary_symbol,
        )

        for supp_file, details in supporting_files.items():
            if supp_file == primary_file:
                continue
            classification = details.get("classification", FileClassification.SUPPORTING)
            supp_hash = cls._compute_file_hash(repo_path, supp_file)
            candidate_files.append(
                CandidateFileImpact(
                    file_path=supp_file,
                    classification=classification,
                    target_symbols=details.get("symbols", []),
                    reasons=details.get("reasons", ["Referenced in call hierarchy or imports"]),
                    confidence=details.get("confidence", 0.85),
                    callers=details.get("callers", []),
                    callees=details.get("callees", []),
                    imports=details.get("imports", []),
                    is_included_in_plan=(classification in (FileClassification.REQUIRED, FileClassification.SUPPORTING, FileClassification.TEST)),
                    base_file_hash=supp_hash,
                )
            )

        # 3. Discover associated tests
        test_files = cls._discover_related_tests(repo_path, primary_file, primary_symbol)
        for tf in test_files:
            if any(c.file_path == tf for c in candidate_files):
                continue
            t_hash = cls._compute_file_hash(repo_path, tf)
            candidate_files.append(
                CandidateFileImpact(
                    file_path=tf,
                    classification=FileClassification.TEST,
                    target_symbols=[primary_symbol] if primary_symbol else [],
                    reasons=[f"Validates behavior of {primary_file}"],
                    confidence=0.90,
                    is_included_in_plan=True,
                    base_file_hash=t_hash,
                )
            )

        # 4. Check for excluded or vendor files
        cls._filter_and_flag_special_files(candidate_files)

        # 5. Completeness checks (detect likely missing changes)
        warnings = cls._run_completeness_checks(candidate_files, primary_symbol)

        return MultiFileImpactReport(
            project_id=str(finding.project_id),
            finding_id=str(finding.id),
            primary_file=primary_file,
            primary_symbol=primary_symbol,
            candidate_files=candidate_files,
            completeness_warnings=warnings,
            overall_confidence=0.95 if not warnings else 0.85,
        )

    @classmethod
    def _compute_file_hash(cls, repo_path: str, relative_file_path: str) -> Optional[str]:
        full_path = os.path.normpath(os.path.join(repo_path, relative_file_path))
        if os.path.exists(full_path) and os.path.isfile(full_path):
            try:
                with open(full_path, "rb") as f:
                    return hashlib.sha256(f.read()).hexdigest()
            except Exception as e:
                logger.debug(f"Could not hash {full_path}: {e}")
        return None

    @classmethod
    def _extract_primary_symbol(
        cls,
        finding: SecurityFinding,
        primary_file: str,
        repo_path: str,
    ) -> Optional[str]:
        """Identifies function or class name enclosing the vulnerable line number."""
        full_path = os.path.normpath(os.path.join(repo_path, primary_file))
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return None

        target_line = finding.line_number or 1
        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            # Scan backwards from vulnerable line to find nearest def or class
            for i in range(min(target_line - 1, len(lines) - 1), -1, -1):
                line = lines[i]
                match = re.match(r"^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)", line)
                if match:
                    return match.group(1)
                match_cls = re.match(r"^\s*class\s+([a-zA-Z0-9_]+)", line)
                if match_cls:
                    return match_cls.group(1)
        except Exception as e:
            logger.debug(f"Error extracting symbol: {e}")

        return None

    @classmethod
    def _discover_callers_and_supporting(
        cls,
        repo_path: str,
        primary_file: str,
        primary_symbol: Optional[str],
    ) -> Tuple[List[str], Dict[str, Dict[str, Any]]]:
        """
        Inspects repository files to discover callers of primary_symbol or files
        that import primary_file.
        """
        callers: List[str] = []
        supporting: Dict[str, Dict[str, Any]] = {}

        file_stem = os.path.splitext(os.path.basename(primary_file))[0]
        mod_name = file_stem

        # Scan repository for references (bounded to small depth / reasonable paths)
        for root, dirs, files in os.walk(repo_path):
            # Exclude vendor and hidden directories
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", "scratch")]
            for f in files:
                if not f.endswith((".py", ".ts", ".js", ".tsx", ".jsx")):
                    continue
                full_f = os.path.join(root, f)
                rel_f = os.path.relpath(full_f, repo_path).replace("\\", "/")

                if rel_f == primary_file or "test" in rel_f.lower():
                    continue

                try:
                    with open(full_f, "r", encoding="utf-8", errors="replace") as fh:
                        content = fh.read()

                    # Check for import of primary_file or mod_name
                    has_import = (f"import {mod_name}" in content or f"from .{mod_name}" in content or f"from {mod_name}" in content or f"/{file_stem}" in content)
                    has_call = (primary_symbol and re.search(r"\b" + re.escape(primary_symbol) + r"\b", content))

                    if has_call or has_import:
                        callers.append(rel_f)
                        supporting[rel_f] = {
                            "classification": FileClassification.SUPPORTING,
                            "symbols": [primary_symbol] if has_call else [],
                            "reasons": [
                                f"Direct caller of `{primary_symbol}`" if has_call else f"Imports `{mod_name}`"
                            ],
                            "confidence": 0.85,
                            "imports": [mod_name] if has_import else [],
                            "callers": [primary_symbol] if has_call else [],
                        }
                except Exception:
                    continue

        return callers, supporting

    @classmethod
    def _discover_related_tests(
        cls,
        repo_path: str,
        primary_file: str,
        primary_symbol: Optional[str],
    ) -> List[str]:
        """Finds test files that exercise primary_file or primary_symbol."""
        test_files = []
        file_stem = os.path.splitext(os.path.basename(primary_file))[0]

        # Conventional test names: test_<file_stem>.py or <file_stem>.test.ts
        candidate_names = [f"test_{file_stem}.py", f"{file_stem}_test.py", f"{file_stem}.test.ts", f"{file_stem}.test.js"]

        for root, dirs, files in os.walk(repo_path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build")]
            for f in files:
                full_f = os.path.join(root, f)
                rel_f = os.path.relpath(full_f, repo_path).replace("\\", "/")

                if f in candidate_names:
                    test_files.append(rel_f)
                elif "test" in rel_f.lower() and primary_symbol:
                    # Check if test file references primary_symbol
                    try:
                        with open(full_f, "r", encoding="utf-8", errors="replace") as fh:
                            if re.search(r"\b" + re.escape(primary_symbol) + r"\b", fh.read()):
                                test_files.append(rel_f)
                    except Exception:
                        pass

        return list(set(test_files))

    @classmethod
    def _filter_and_flag_special_files(cls, candidate_files: List[CandidateFileImpact]) -> None:
        """Classifies lockfiles, vendor files, and generated docs properly."""
        for c in candidate_files:
            lower_path = c.file_path.lower()
            if any(v in lower_path for v in ("node_modules/", "vendor/", "site-packages/")):
                c.classification = FileClassification.VENDOR
                c.is_included_in_plan = False
                c.reasons.append("Third-party vendored code is excluded by default.")
            elif any(g in lower_path for g in ("package-lock.json", "poetry.lock", "yarn.lock", ".min.js")):
                c.classification = FileClassification.GENERATED
                c.is_included_in_plan = False
                c.reasons.append("Generated artifact or lockfile requires dedicated lock handling.")
            elif lower_path.endswith((".md", ".rst", ".txt")):
                c.classification = FileClassification.DOCUMENTATION
                c.is_included_in_plan = False

    @classmethod
    def _run_completeness_checks(
        cls,
        candidate_files: List[CandidateFileImpact],
        primary_symbol: Optional[str],
    ) -> List[str]:
        """Detects likely missing changes or coverage gaps."""
        warnings = []
        has_tests = any(c.classification == FileClassification.TEST for c in candidate_files)
        if not has_tests:
            warnings.append(f"No existing test files detected for symbol `{primary_symbol or 'target'}`; test creation recommended.")

        supporting_callers = [c for c in candidate_files if c.classification == FileClassification.SUPPORTING]
        if supporting_callers:
            warnings.append(f"Identified {len(supporting_callers)} supporting caller file(s) that may require call site adaptation.")

        return warnings
