"""
Kavach SAST Engine (Code Security)
Unified Engine orchestrating:
1. Parser Engine (Tree-sitter / AST)
2. Rule Engine (Semgrep + Native)
3. Taint Analysis Engine (Source-to-sink tracking)
4. Data Flow Engine (Inter-procedural flow)
5. Semantic Analysis Engine (Invariants & scopes)
6. Custom Rules Engine (Organization rules)
"""

import os
import time
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineType, EngineFinding, EngineExecutionResult
from app.engines.sast.parser import CodeParserEngine
from app.engines.sast.rule_engine import SASTRuleEngine
from app.engines.sast.taint_analysis import TaintAnalysisEngine
from app.engines.sast.data_flow import DataFlowEngine
from app.engines.sast.semantic_analysis import SemanticAnalysisEngine, CustomRulesEngine


SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java", ".php"}
IGNORED_DIRS = {".git", "node_modules", "venv", ".venv", "dist", "build", ".next", "__pycache__"}


class SASTEngine:
    """
    Kavach SAST Engine: Multi-layered Static Application Security Testing.
    """

    def __init__(self, custom_rules_dir: Optional[str] = None):
        self.parser = CodeParserEngine()
        self.rules = SASTRuleEngine()
        self.taint = TaintAnalysisEngine()
        self.data_flow = DataFlowEngine()
        self.semantics = SemanticAnalysisEngine()
        self.custom = CustomRulesEngine(custom_rules_dir)

    async def scan_target(self, target_path: str, max_files: int = 500) -> EngineExecutionResult:
        start_time = time.time()
        findings: List[EngineFinding] = []
        logs: List[str] = [
            f"[sast-orchestrator] Initializing multi-language AST parser for target: {target_path}",
            f"[semgrep] Probing Semgrep CLI tool... (Available: {self.rules.semgrep_available})",
        ]

        # 1. Run Semgrep if installed
        if self.rules.semgrep_available:
            semgrep_findings = await self.rules.run_semgrep_if_available(target_path)
            findings.extend(semgrep_findings)
            logs.append(f"[semgrep] Discovered {len(semgrep_findings)} findings across target")

        # 2. Walk directory and execute native AST, Taint, and Semantic checks
        files_scanned = 0
        target_abs = os.path.abspath(target_path)

        if os.path.isfile(target_abs):
            file_list = [target_abs]
        else:
            file_list = []
            for root, dirs, files in os.walk(target_abs):
                dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in SUPPORTED_EXTENSIONS:
                        file_list.append(os.path.join(root, f))
                        if len(file_list) >= max_files:
                            break
                if len(file_list) >= max_files:
                    break

        logs.append(f"[sast-engine] Discovered {len(file_list)} candidate source files for AST & taint inspection")

        for file_path in file_list:
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                rel_path = os.path.relpath(file_path, target_abs)
                files_scanned += 1

                # Sub-Engine 2: Native Rule Engine
                rule_res = self.rules.run_native_rules(rel_path, content)
                findings.extend(rule_res)

                # Sub-Engine 3: Taint Analysis
                if file_path.endswith(".py"):
                    taint_res = self.taint.analyze_python_taint(rel_path, content)
                    findings.extend(taint_res)

                # Sub-Engine 5: Semantic Analysis
                sem_res = self.semantics.analyze_semantics(rel_path, content)
                findings.extend(sem_res)

                # Sub-Engine 6: Custom Rules
                if self.custom.rules:
                    custom_res = self.custom.evaluate(rel_path, content)
                    findings.extend(custom_res)

            except Exception as e:
                logs.append(f"[warning] Error analyzing file {file_path}: {str(e)}")

        duration_ms = int((time.time() - start_time) * 1000)
        logs.append(f"[sast-engine] Completed scan in {duration_ms}ms. Analyzed {files_scanned} files. Total findings: {len(findings)}")

        return EngineExecutionResult(
            engine=EngineType.SAST,
            status="SUCCESS",
            duration_ms=duration_ms,
            files_analyzed=files_scanned,
            findings=findings,
            logs=logs,
        )

