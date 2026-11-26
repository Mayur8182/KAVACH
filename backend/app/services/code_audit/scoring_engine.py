from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


SEVERITY_PENALTIES = {
    "CRITICAL": 15.0,
    "HIGH": 8.0,
    "MEDIUM": 3.0,
    "LOW": 1.0,
    "INFO": 0.2,
}

CATEGORY_WEIGHTS = {
    "QUALITY": 0.20,
    "ARCHITECTURE": 0.20,
    "PERFORMANCE": 0.15,
    "TESTING": 0.15,
    "MAINTAINABILITY": 0.10,
    "RELIABILITY": 0.10,
    "DOCUMENTATION": 0.10,
}


@dataclass
class ScoreCalculationResult:
    quality_score: float
    architecture_score: float
    performance_score: float
    testing_score: float
    maintainability_score: float
    reliability_score: float
    documentation_score: float
    overall_score: float
    health_grade: str
    formula_breakdown: Dict[str, Any]


def _get_val(obj: Any, key: str, default: Any = "") -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class CodeAuditScoringEngine:
    """
    Computes deterministic, evidence-based quality scores and grades
    for repository code audits.
    """

    @staticmethod
    def calculate_grade(score: float) -> str:
        if score >= 95.0:
            return "A+"
        elif score >= 90.0:
            return "A"
        elif score >= 80.0:
            return "B"
        elif score >= 70.0:
            return "C"
        elif score >= 60.0:
            return "D"
        else:
            return "F"

    @classmethod
    def calculate_scores(cls, findings: List[Any]) -> ScoreCalculationResult:
        # Group findings by category
        findings_by_category: Dict[str, List[Any]] = {cat: [] for cat in CATEGORY_WEIGHTS}
        for f in findings:
            cat = str(_get_val(f, "category", "")).upper()
            if cat in findings_by_category:
                findings_by_category[cat].append(f)

        category_scores: Dict[str, float] = {}
        category_penalties: Dict[str, float] = {}
        category_counts: Dict[str, Dict[str, int]] = {}

        for cat, cat_findings in findings_by_category.items():
            counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
            total_penalty = 0.0

            for f in cat_findings:
                sev = str(_get_val(f, "severity", "MEDIUM")).upper()
                if sev in counts:
                    counts[sev] += 1
                    total_penalty += SEVERITY_PENALTIES.get(sev, 1.0)

            category_counts[cat] = counts
            category_penalties[cat] = round(total_penalty, 2)
            # Clamp between 0.0 and 100.0
            category_scores[cat] = round(max(0.0, min(100.0, 100.0 - total_penalty)), 1)

        # Weighted aggregate
        overall_score = sum(
            category_scores[cat] * weight for cat, weight in CATEGORY_WEIGHTS.items()
        )
        overall_score = round(max(0.0, min(100.0, overall_score)), 1)
        grade = cls.calculate_grade(overall_score)

        breakdown = {
            "weights": CATEGORY_WEIGHTS,
            "penalties": SEVERITY_PENALTIES,
            "category_penalties": category_penalties,
            "category_counts": category_counts,
            "category_scores": category_scores,
            "overall_score": overall_score,
            "health_grade": grade,
        }

        return ScoreCalculationResult(
            quality_score=category_scores["QUALITY"],
            architecture_score=category_scores["ARCHITECTURE"],
            performance_score=category_scores["PERFORMANCE"],
            testing_score=category_scores["TESTING"],
            maintainability_score=category_scores["MAINTAINABILITY"],
            reliability_score=category_scores["RELIABILITY"],
            documentation_score=category_scores["DOCUMENTATION"],
            overall_score=overall_score,
            health_grade=grade,
            formula_breakdown=breakdown,
        )
