from typing import Any, Dict, List, Optional
from app.core.config import get_settings
from app.integrations.github.models import GitHubCheckRunOutput


def map_decision_to_conclusion(decision: str) -> str:
    """
    Deterministic mapping from Step 7 policy decision to GitHub Check Run conclusion.
    - ALLOW            -> success
    - WARN             -> neutral
    - BLOCK            -> failure
    - REQUIRE_APPROVAL -> action_required
    - NOT_EVALUATED    -> failure
    """
    mapping = {
        "ALLOW": "success",
        "WARN": "neutral",
        "BLOCK": "failure",
        "REQUIRE_APPROVAL": "action_required",
        "NOT_EVALUATED": "failure",
    }
    return mapping.get(decision.upper(), "failure")


def generate_check_run_output(
    decision: str,
    reason: str,
    commit_sha: str,
    scan_id: Optional[str],
    findings_summary: Dict[str, int],
    violated_requirements: List[str],
    project_id: Optional[str] = None,
) -> GitHubCheckRunOutput:
    """
    Generates sanitized markdown summary for GitHub Check Run and PR comment.
    NEVER includes raw secrets, passwords, tokens, or internal server paths.
    """
    settings = get_settings()
    conclusion = map_decision_to_conclusion(decision)

    icon = "✅" if conclusion == "success" else ("⚠️" if conclusion == "neutral" else "❌")

    title = f"{icon} Policy Decision: {decision}"

    summary_lines = [
        f"### {icon} Security Control Plane — Evaluation Result",
        f"**Decision:** `{decision}`",
        f"**Reason:** {reason}",
        f"**Commit:** `{commit_sha[:8]}`",
    ]

    if scan_id:
        summary_lines.append(f"**Scan ID:** `{scan_id}`")

    # Detailed Findings Breakdown
    total_findings = sum(findings_summary.values())
    summary_lines.append("\n#### Security Findings:")
    if total_findings == 0:
        summary_lines.append("- No security vulnerabilities or policy violations detected.")
    else:
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            count = findings_summary.get(sev, 0)
            if count > 0:
                summary_lines.append(f"- **{sev}:** {count}")

    # Violated Requirements Breakdown
    if violated_requirements:
        summary_lines.append("\n#### Violated Security Requirements:")
        for req in violated_requirements:
            summary_lines.append(f"- `{req}`")

    # Platform Deep Link
    if project_id:
        base_url = getattr(settings, "public_app_url", "http://localhost:3002")
        portal_url = f"{base_url}/projects/{project_id}"
        summary_lines.append(f"\n[View Full Security Audit in Control Plane]({portal_url})")

    summary_text = "\n".join(summary_lines)

    detail_text = (
        "This security decision was deterministically computed by the Policy Engine "
        "consuming verified evidence from Step 6 scanners against configured project policies. "
        "LLMs have zero security authority over this decision."
    )

    return GitHubCheckRunOutput(
        title=title,
        summary=summary_text,
        text=detail_text,
    )
