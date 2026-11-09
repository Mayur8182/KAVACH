"""
Remediation Lifecycle State Machine for Kavach AI Assistant.

CRITICAL RULE: Never show VERIFIED_FIXED unless a deterministic re-scan
confirmed the finding is no longer present. The UI must display honest state.
"""

from enum import Enum


class RemediationState(str, Enum):
    """Authoritative states for the remediation lifecycle."""
    PATCH_GENERATED = "PATCH_GENERATED"           # LLM produced a diff — not yet verified
    AWAITING_APPROVAL = "AWAITING_APPROVAL"        # Waiting for human authorization
    PATCH_APPLYING = "PATCH_APPLYING"              # File write in progress
    PATCH_APPLIED = "PATCH_APPLIED"                # Files written, re-scan not yet run
    VERIFICATION_RUNNING = "VERIFICATION_RUNNING"  # Re-scan in progress
    VERIFICATION_FAILED = "VERIFICATION_FAILED"    # Re-scan: finding still present
    VERIFIED_FIXED = "VERIFIED_FIXED"              # Re-scan: finding gone — ONLY honest success
    PR_CREATING = "PR_CREATING"                    # Creating GitHub PR
    PR_CREATED = "PR_CREATED"                      # PR is live with the fix
    FAILED = "FAILED"                              # Non-recoverable error


REMEDIATION_STATE_LABELS = {
    RemediationState.PATCH_GENERATED: "Patch Ready for Review",
    RemediationState.AWAITING_APPROVAL: "Awaiting Approval",
    RemediationState.PATCH_APPLYING: "Applying Patch...",
    RemediationState.PATCH_APPLIED: "Patch Applied — Verification Required",
    RemediationState.VERIFICATION_RUNNING: "Verification Running...",
    RemediationState.VERIFICATION_FAILED: "⚠️ Verification Failed — Finding Still Present",
    RemediationState.VERIFIED_FIXED: "✅ Verified Fixed",
    RemediationState.PR_CREATING: "Creating Pull Request...",
    RemediationState.PR_CREATED: "Pull Request Created",
    RemediationState.FAILED: "❌ Remediation Failed",
}

# States that must NEVER show success/verified UI
NON_VERIFIED_STATES = {
    RemediationState.PATCH_GENERATED,
    RemediationState.AWAITING_APPROVAL,
    RemediationState.PATCH_APPLYING,
    RemediationState.PATCH_APPLIED,
    RemediationState.VERIFICATION_RUNNING,
    RemediationState.VERIFICATION_FAILED,
    RemediationState.FAILED,
}


def is_verified_fixed(state: RemediationState) -> bool:
    """CRITICAL: Returns True ONLY after deterministic re-scan confirmed the fix."""
    return state == RemediationState.VERIFIED_FIXED


def get_state_label(state: RemediationState) -> str:
    return REMEDIATION_STATE_LABELS.get(state, state.value)


def requires_rescan_to_verify(state: RemediationState) -> bool:
    """Returns True if a re-scan must be run before marking as fixed."""
    return state in {RemediationState.PATCH_APPLIED, RemediationState.PATCH_GENERATED}
