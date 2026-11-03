"""
Step 20 Behavior Anomaly Detector.

Sections 37–43:
Detects behavioral deviations against established baselines.

RULE 61 — ANOMALY IS NOT AUTOMATICALLY AN ATTACK.
Classification states: NORMAL, ANOMALOUS, SUSPICIOUS, VERIFIED_SECURITY_EVENT, UNKNOWN.
"""

from typing import Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from app.intelligence.enums import BehaviorStatus


class BehaviorDetector:
    """
    Evaluates incoming events against baseline models to identify anomalous deviations.
    """

    @staticmethod
    def evaluate_tool_usage(
        project_id: uuid.UUID,
        agent_id: str,
        tool_name: str,
        baseline_record: Optional[Dict[str, Any]],
        environment: str = "PRODUCTION",
        evidence_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates agent tool execution against established baseline known_items.
        """
        now = datetime.now(timezone.utc)
        if not baseline_record:
            return {
                "project_id": project_id,
                "subject_type": "AI_AGENT",
                "subject_id": agent_id,
                "event_type": "TOOL_USAGE",
                "observed_value": {"tool_name": tool_name, "environment": environment},
                "baseline_reference": None,
                "deviation_context": {"reason": "NO_BASELINE_ESTABLISHED"},
                "observed_at": now,
                "evidence_id": evidence_id,
                "status": BehaviorStatus.UNKNOWN.value,
            }

        baseline_val = baseline_record.get("baseline_value", {})
        known_tools = set(baseline_val.get("known_items", []))

        # Check if tool is completely new
        if tool_name not in known_tools:
            # Dangerous destructive tools elevate to SUSPICIOUS
            destructive_keywords = {"delete", "terminate", "destroy", "drop", "revoke", "modify"}
            is_destructive = any(kw in tool_name.lower() for kw in destructive_keywords)
            status = BehaviorStatus.SUSPICIOUS.value if is_destructive else BehaviorStatus.ANOMALOUS.value

            return {
                "project_id": project_id,
                "subject_type": "AI_AGENT",
                "subject_id": agent_id,
                "event_type": "TOOL_USAGE",
                "observed_value": {"tool_name": tool_name, "environment": environment},
                "baseline_reference": str(baseline_record.get("id", "baseline-ref")),
                "deviation_context": {
                    "is_novel_tool": True,
                    "is_destructive": is_destructive,
                    "known_tools_count": len(known_tools),
                    "known_tools": list(known_tools),
                    "explanation": f"Agent invoked novel tool '{tool_name}' never previously observed in baseline.",
                },
                "observed_at": now,
                "evidence_id": evidence_id,
                "status": status,
            }

        return {
            "project_id": project_id,
            "subject_type": "AI_AGENT",
            "subject_id": agent_id,
            "event_type": "TOOL_USAGE",
            "observed_value": {"tool_name": tool_name, "environment": environment},
            "baseline_reference": str(baseline_record.get("id", "baseline-ref")),
            "deviation_context": None,
            "observed_at": now,
            "evidence_id": evidence_id,
            "status": BehaviorStatus.NORMAL.value,
        }

    @staticmethod
    def evaluate_rate_metric(
        project_id: uuid.UUID,
        subject_type: str,
        subject_id: str,
        metric_name: str,
        observed_value: float,
        baseline_record: Optional[Dict[str, Any]],
        evidence_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates numeric rates (e.g. requests/min, tool calls/min) against p95 and p99 thresholds.
        """
        now = datetime.now(timezone.utc)
        if not baseline_record:
            return {
                "project_id": project_id,
                "subject_type": subject_type,
                "subject_id": subject_id,
                "event_type": metric_name,
                "observed_value": {"rate": observed_value},
                "baseline_reference": None,
                "deviation_context": {"reason": "NO_BASELINE_ESTABLISHED"},
                "observed_at": now,
                "evidence_id": evidence_id,
                "status": BehaviorStatus.UNKNOWN.value,
            }

        b_val = baseline_record.get("baseline_value", {})
        p99 = b_val.get("p99", 0.0)
        p95 = b_val.get("p95", 0.0)

        if observed_value > p99:
            status = BehaviorStatus.ANOMALOUS.value
            deviation = {
                "threshold_exceeded": "p99",
                "p99_value": p99,
                "observed_value": observed_value,
                "ratio": observed_value / p99 if p99 > 0 else 0,
            }
        elif observed_value > p95:
            status = BehaviorStatus.SUSPICIOUS.value
            deviation = {
                "threshold_exceeded": "p95",
                "p95_value": p95,
                "observed_value": observed_value,
            }
        else:
            status = BehaviorStatus.NORMAL.value
            deviation = None

        return {
            "project_id": project_id,
            "subject_type": subject_type,
            "subject_id": subject_id,
            "event_type": metric_name,
            "observed_value": {"rate": observed_value},
            "baseline_reference": str(baseline_record.get("id", "baseline-ref")),
            "deviation_context": deviation,
            "observed_at": now,
            "evidence_id": evidence_id,
            "status": status,
        }
