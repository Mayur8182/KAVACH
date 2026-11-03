"""
Step 20 Behavioral Baseline Engine.

Sections 33–36, 61–63:
Calculates statistical behavioral baselines from authentic historical observations.

RULE 57 — NO FAKE BASELINES (real sample counts and metrics required).
RULE 61 — Baseline update safety & contamination protection (incident events excluded).
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import statistics


class BaselineCalculator:
    """
    Computes statistical metrics (median, percentiles, frequencies) from real observations.
    """

    @staticmethod
    def calculate_numeric_baseline(
        values: List[float],
        metric_name: str,
        window_start: datetime,
        window_end: datetime,
        source: str = "OPENTELEMETRY_METRICS",
    ) -> Dict[str, Any]:
        """
        Calculates median, p90, p95, p99, and variance from real samples.
        """
        if not values:
            raise ValueError("Cannot calculate baseline without historical samples (Rule 57)")

        sorted_vals = sorted(values)
        n = len(sorted_vals)

        median_val = statistics.median(sorted_vals)
        mean_val = statistics.mean(sorted_vals)
        stdev_val = statistics.stdev(sorted_vals) if n > 1 else 0.0

        p90_idx = int(0.90 * n)
        p95_idx = int(0.95 * n)
        p99_idx = int(0.99 * n)

        p90 = sorted_vals[min(p90_idx, n - 1)]
        p95 = sorted_vals[min(p95_idx, n - 1)]
        p99 = sorted_vals[min(p99_idx, n - 1)]

        return {
            "metric": metric_name,
            "window_start": window_start,
            "window_end": window_end,
            "sample_count": n,
            "calculation_method": "MEDIAN_PERCENTILE",
            "baseline_value": {
                "median": median_val,
                "mean": mean_val,
                "p90": p90,
                "p95": p95,
                "p99": p99,
                "min": sorted_vals[0],
                "max": sorted_vals[-1],
            },
            "variance": {"standard_deviation": stdev_val},
            "confidence": min(1.0, n / 100.0),  # Confidence proportional to sample size
            "source": source,
        }

    @staticmethod
    def calculate_set_frequency_baseline(
        historical_items: List[str],
        metric_name: str,
        window_start: datetime,
        window_end: datetime,
        source: str = "AGENT_TOOL_CALL_EVENTS",
    ) -> Dict[str, Any]:
        """
        Calculates normal tool / action frequency distribution for agents (Sections 39-40).
        """
        if not historical_items:
            raise ValueError("Cannot calculate frequency baseline without historical samples (Rule 57)")

        counts: Dict[str, int] = {}
        for item in historical_items:
            counts[item] = counts.get(item, 0) + 1

        total = len(historical_items)
        freqs = {item: count / total for item, count in counts.items()}

        return {
            "metric": metric_name,
            "window_start": window_start,
            "window_end": window_end,
            "sample_count": total,
            "calculation_method": "FREQUENCY_DISTRIBUTION",
            "baseline_value": {
                "known_items": list(counts.keys()),
                "frequencies": freqs,
            },
            "variance": {"unique_item_count": len(counts)},
            "confidence": min(1.0, total / 50.0),
            "source": source,
        }
