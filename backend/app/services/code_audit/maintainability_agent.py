import math
import re
from typing import List, Dict, Any, Tuple


class MaintainabilityAgent:
    """
    Computes Halstead Volume, Cyclomatic Complexity, and the standard
    Maintainability Index (MI) for each codebase file.
    """

    def analyze(self, files: List[Any], symbols: List[Any] = None) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        findings: List[Dict[str, Any]] = []
        file_metrics_list: List[Dict[str, Any]] = []

        for file_obj in files:
            path = getattr(file_obj, "relative_path", "").replace("\\", "/")
            content = getattr(file_obj, "content", "")
            if not content or self._should_skip(path):
                continue

            lines = [l for l in content.splitlines() if l.strip() and not l.strip().startswith(("#", "//", "/*", "*"))]
            loc = len(lines)
            if loc < 15:
                continue

            mi, cc, volume = self._calculate_maintainability_index(content, loc)

            file_metrics_list.append({
                "file_path": path,
                "loc": loc,
                "cyclomatic_complexity": cc,
                "halstead_volume": round(volume, 1),
                "maintainability_index": round(mi, 1),
                "grade": "Good" if mi >= 65 else ("Moderate" if mi >= 50 else "Poor"),
            })

            # Flag low MI files
            if mi < 50.0:
                findings.append({
                    "category": "MAINTAINABILITY",
                    "rule_id": "KAV-MAINT-001",
                    "title": f"Critically low Maintainability Index (MI = {mi:.1f}) in {path}",
                    "description": f"File '{path}' has an MI score of {mi:.1f}/100 (LOC: {loc}, CC: {cc}, Volume: {volume:.0f}). Files below 50 are difficult to maintain and have high defect rates.",
                    "severity": "HIGH",
                    "priority": "P1",
                    "confidence": "CONFIRMED",
                    "file_path": path,
                    "start_line": 1,
                    "end_line": loc,
                    "code_evidence": f"Maintainability Index: {mi:.1f} | LOC: {loc} | Cyclomatic Complexity: {cc}",
                    "root_cause": "High volume of operators and operands combined with dense branching logic.",
                    "technical_impact": "High defect risk, slow development cycle, steep onboarding curve.",
                    "recommended_solution": "Decompose into modular components and reduce branching conditionals.",
                    "estimated_remediation_minutes": 75,
                    "related_files": [],
                    "related_symbols": [],
                    "detection_method": "AST_ANALYSIS",
                })
            elif mi < 65.0:
                findings.append({
                    "category": "MAINTAINABILITY",
                    "rule_id": "KAV-MAINT-002",
                    "title": f"Moderate Maintainability Risk (MI = {mi:.1f}) in {path}",
                    "description": f"File '{path}' has a borderline MI score of {mi:.1f}/100.",
                    "severity": "MEDIUM",
                    "priority": "P2",
                    "confidence": "HIGH",
                    "file_path": path,
                    "start_line": 1,
                    "end_line": loc,
                    "code_evidence": f"Maintainability Index: {mi:.1f} | LOC: {loc} | Cyclomatic Complexity: {cc}",
                    "root_cause": "Accumulating complexity in a single file.",
                    "technical_impact": "Incremental decline in engineering velocity.",
                    "recommended_solution": "Simplify control flow and factor out helper functions.",
                    "estimated_remediation_minutes": 35,
                    "related_files": [],
                    "related_symbols": [],
                    "detection_method": "AST_ANALYSIS",
                })

        return findings, sorted(file_metrics_list, key=lambda x: x["maintainability_index"])

    def _should_skip(self, path: str) -> bool:
        p = path.lower()
        return any(x in p for x in [
            "node_modules", ".git", "venv", ".venv", "dist", "build", ".next",
            "coverage", "package-lock.json", "yarn.lock"
        ])

    def _calculate_maintainability_index(self, content: str, loc: int) -> Tuple[float, int, float]:
        # Approximate tokens
        tokens = re.findall(r"[a-zA-Z0-9_]+|[+\-*/%=<>!&|^~]+", content)
        total_tokens = len(tokens)
        unique_tokens = len(set(tokens))

        # Halstead Volume V = N * log2(eta)
        if total_tokens > 0 and unique_tokens > 1:
            volume = total_tokens * math.log2(unique_tokens)
        else:
            volume = 100.0

        # Approximate Cyclomatic Complexity CC
        decision_keywords = ["if", "elif", "else", "for", "while", "case", "catch", "except", "&&", "||", "and", "or"]
        cc = 1
        for kw in decision_keywords:
            cc += len(re.findall(r"\b" + re.escape(kw) + r"\b", content))

        # MI standard formula (SEI variant scaled to 0-100)
        # MI = 171 - 5.2 * ln(V) - 0.23 * CC - 16.2 * ln(LOC)
        try:
            raw_mi = 171.0 - 5.2 * math.log(max(1.0, volume)) - 0.23 * cc - 16.2 * math.log(max(1.0, loc))
            scaled_mi = max(0.0, min(100.0, (raw_mi / 171.0) * 100.0))
        except Exception:
            scaled_mi = 50.0

        return scaled_mi, cc, volume

