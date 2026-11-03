"""
THING MCP Tools — Remediation & Verification Handlers
Exposes autonomous patch synthesis and real rescan verification as MCP tools.
"""

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.engines.remediation.synthesizer import PatchSynthesizer
from app.engines.remediation.validator import PatchValidator
from app.engines.remediation.verifier import PatchVerifier
from app.mcp.schemas import MCPContext, ToolExecutionResult


async def execute_propose_remediation_diff(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Synthesizes a minimal unified diff to fix a specific security vulnerability finding.
    """
    finding = arguments.get("finding") or {
        "rule_id": arguments.get("rule_id", "SECURITY_ISSUE"),
        "severity": arguments.get("severity", "HIGH"),
        "file_path": arguments.get("file_path", "unknown"),
        "line_number": arguments.get("line_number", 1),
        "snippet": arguments.get("snippet", ""),
    }
    file_content = arguments.get("file_content")
    repo_context = arguments.get("repository_context", {})

    synthesizer = PatchSynthesizer()
    result = await synthesizer.synthesize_patch(
        finding=finding,
        file_content=file_content,
        repository_context=repo_context,
    )

    diff = result.get("patch", "")
    is_valid_format, format_msg = PatchValidator.validate_diff_format(diff) if diff else (False, "No diff generated")

    return ToolExecutionResult(
        status="SUCCESS" if result.get("is_fixable") else "ERROR",
        data={
            "is_fixable": result.get("is_fixable", False),
            "root_cause": result.get("root_cause", ""),
            "explanation": result.get("explanation", ""),
            "patch": diff,
            "is_valid_format": is_valid_format,
            "format_message": format_msg,
            "confidence": result.get("confidence", 0.0),
            "strategies": result.get("strategies", []),
        },
        message="Patch synthesized successfully" if result.get("is_fixable") else "Could not synthesize fix.",
    )


async def execute_verify_remediation_patch(
    context: MCPContext,
    arguments: Dict[str, Any],
    db: AsyncSession,
) -> ToolExecutionResult:
    """
    Executes real rescan in sandbox to verify that the patch eliminates the vulnerability.
    """
    file_path = arguments.get("file_path", "code.py")
    original_content = arguments.get("original_content", "")
    patched_content = arguments.get("patched_content", "")
    rule_id = arguments.get("rule_id", "SECURITY_RULE")
    scanner_type = arguments.get("scanner_type", "semgrep")

    result = await PatchVerifier.verify_patch_in_sandbox(
        file_path=file_path,
        original_content=original_content,
        patched_content=patched_content,
        rule_id=rule_id,
        scanner_type=scanner_type,
    )

    return ToolExecutionResult(
        status="SUCCESS" if result.get("verified") else "ERROR",
        data=result,
        message=result.get("message", "Verification completed."),
    )
