from typing import List, Dict, Any
from dataclasses import dataclass
from collections import defaultdict


CATEGORY_DEBT_MULTIPLIERS = {
    "ARCHITECTURE": 1.5,
    "RELIABILITY": 1.3,
    "PERFORMANCE": 1.2,
    "MAINTAINABILITY": 1.1,
    "QUALITY": 1.0,
    "TESTING": 1.0,
    "DOCUMENTATION": 0.8,
}


@dataclass
class TechnicalDebtCalculationResult:
    total_debt_hours: float
    high_priority_hours: float
    debt_by_module: Dict[str, float]
    debt_by_category: Dict[str, float]
    top_complex_files: List[Dict[str, Any]]
    maintenance_hotspots: List[Dict[str, Any]]


def _get_val(obj: Any, key: str, default: Any = "") -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class CodeAuditTechnicalDebtEngine:
    """
    Computes real, evidence-derived technical debt hours, module breakdowns,
    and maintenance hotspots.
    """

    @classmethod
    def calculate_debt(cls, findings: List[Any]) -> TechnicalDebtCalculationResult:
        total_hours = 0.0
        high_pri_hours = 0.0

        module_hours: Dict[str, float] = defaultdict(float)
        category_hours: Dict[str, float] = defaultdict(float)
        file_metrics: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "file_path": "",
                "total_hours": 0.0,
                "findings_count": 0,
                "categories": set(),
                "severities": defaultdict(int),
                "highest_severity": "INFO",
            }
        )

        severity_rank = {"CRITICAL": 5, "HIGH": 4, "MEDIUM": 3, "LOW": 2, "INFO": 1}

        for f in findings:
            cat = str(_get_val(f, "category", "QUALITY")).upper()
            priority = str(_get_val(f, "priority", "P2")).upper()
            sev = str(_get_val(f, "severity", "MEDIUM")).upper()
            file_path = str(_get_val(f, "file_path", "unknown"))
            mins = int(_get_val(f, "estimated_remediation_minutes", 15))

            mult = CATEGORY_DEBT_MULTIPLIERS.get(cat, 1.0)
            finding_hours = (mins / 60.0) * mult

            total_hours += finding_hours
            if priority in ("P0", "P1") or sev in ("CRITICAL", "HIGH"):
                high_pri_hours += finding_hours

            category_hours[cat] += finding_hours

            # Derive module name from file path
            parts = file_path.replace("\\", "/").strip("/").split("/")
            if len(parts) >= 2:
                module_name = f"{parts[0]}/{parts[1]}"
            elif len(parts) == 1:
                module_name = parts[0]
            else:
                module_name = "root"

            module_hours[module_name] += finding_hours

            # Track per file
            entry = file_metrics[file_path]
            entry["file_path"] = file_path
            entry["total_hours"] += finding_hours
            entry["findings_count"] += 1
            entry["categories"].add(cat)
            entry["severities"][sev] += 1

            if severity_rank.get(sev, 1) > severity_rank.get(entry["highest_severity"], 1):
                entry["highest_severity"] = sev

        # Format top complex files
        top_files = sorted(
            file_metrics.values(),
            key=lambda x: (x["total_hours"], x["findings_count"]),
            reverse=True,
        )[:10]

        top_files_formatted = [
            {
                "file_path": f["file_path"],
                "debt_hours": round(f["total_hours"], 2),
                "findings_count": f["findings_count"],
                "categories": sorted(list(f["categories"])),
                "highest_severity": f["highest_severity"],
            }
            for f in top_files
        ]

        # Identify maintenance hotspots: files with >= 2 categories and high debt or >= 3 findings
        hotspots = [
            f for f in top_files_formatted
            if len(f["categories"]) >= 2 or f["findings_count"] >= 3
        ]

        return TechnicalDebtCalculationResult(
            total_debt_hours=round(total_hours, 1),
            high_priority_hours=round(high_pri_hours, 1),
            debt_by_module={k: round(v, 1) for k, v in sorted(module_hours.items(), key=lambda x: x[1], reverse=True)},
            debt_by_category={k: round(v, 1) for k, v in sorted(category_hours.items(), key=lambda x: x[1], reverse=True)},
            top_complex_files=top_files_formatted,
            maintenance_hotspots=hotspots,
        )
