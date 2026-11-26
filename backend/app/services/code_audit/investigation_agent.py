from typing import List, Dict, Any, Optional


class CodeAuditInvestigationAgent:
    """
    Enriches, cross-references, and prioritizes findings based on symbol dependencies
    and module impact. Also provides deep-dive explanations.
    """

    def correlate_and_prioritize(
        self,
        findings: List[Dict[str, Any]],
        symbols: List[Any] = None,
        arch_map: Any = None,
    ) -> List[Dict[str, Any]]:
        deduped: List[Dict[str, Any]] = []
        seen_keys = set()

        for f in findings:
            key = (f.get("rule_id"), f.get("file_path"), f.get("start_line"))
            if key in seen_keys:
                continue
            seen_keys.add(key)

            # Prioritization heuristic:
            # If CRITICAL -> P0
            # If HIGH and in core/service/api -> P1, else P2
            # If MEDIUM -> P2
            # If LOW/INFO -> P3
            sev = f.get("severity", "MEDIUM")
            path = f.get("file_path", "").lower()
            is_core = any(k in path for k in ["core", "service", "api", "auth", "security", "engine"])

            if sev == "CRITICAL":
                f["priority"] = "P0"
            elif sev == "HIGH":
                f["priority"] = "P1" if is_core else "P2"
            elif sev == "MEDIUM":
                f["priority"] = "P2"
            else:
                f["priority"] = "P3"

            deduped.append(f)

        return deduped

    def explain_finding(self, finding: Any) -> Dict[str, str]:
        title = getattr(finding, "title", "Code Audit Issue")
        rule_id = getattr(finding, "rule_id", "KAV-AUDIT-001")
        category = getattr(finding, "category", "QUALITY")
        description = getattr(finding, "description", "")
        file_path = getattr(finding, "file_path", "")
        root_cause = getattr(finding, "root_cause", "Architectural or implementation flaw.")
        tech_impact = getattr(finding, "technical_impact", "Increased technical debt and defect risk.")
        solution = getattr(finding, "recommended_solution", "Refactor to align with best practices.")

        explanation = (
            f"Finding {rule_id} ({title}) belongs to the {category} audit category. "
            f"In file '{file_path}', this issue represents a significant engineering concern. {description}"
        )

        root_cause_analysis = (
            f"The primary root cause is: {root_cause} "
            f"When code evolves without continuous refactoring, complexity compounds exponentially."
        )

        refactoring_pattern = (
            f"Recommended remediation pattern: {solution} "
            "Ensure that changes are accompanied by automated unit tests to verify zero behavioral regression."
        )

        preventative_advice = (
            f"To prevent similar {category.lower()} defects in the future: "
            "1. Enforce linting and complexity gates in CI/CD pipelines. "
            "2. Establish explicit code review guidelines regarding function length and coupling. "
            "3. Leverage Kavach incremental codebase intelligence on every pull request."
        )

        return {
            "finding_id": str(getattr(finding, "id", "")),
            "explanation": explanation,
            "root_cause_analysis": root_cause_analysis,
            "refactoring_pattern": refactoring_pattern,
            "preventative_advice": preventative_advice,
        }

