"""
SecuLayer / Kavach Remediation Engine
Modular services for repository context resolution, source extraction,
Gemini-powered patch generation, unified diff application, and empirical validation.
"""

from app.services.remediation.repository_context import RepositoryContext, resolve_repository_context
from app.services.remediation.source_extractor import SourceContext, extract_vulnerable_source, SourceExtractionError
from app.services.remediation.diff_applier import apply_unified_diff, PatchApplicationError
from app.services.remediation.patch_generator import (
    RemediationPatchProposal,
    RemediationPatchGenerator,
)

__all__ = [
    "RepositoryContext",
    "resolve_repository_context",
    "SourceContext",
    "extract_vulnerable_source",
    "SourceExtractionError",
    "apply_unified_diff",
    "PatchApplicationError",
    "RemediationPatchProposal",
    "RemediationPatchGenerator",
]
