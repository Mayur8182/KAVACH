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
from app.services.remediation.code_intelligence import CodeIntelligenceService, CodeContext
from app.services.remediation.fix_strategy_engine import FixStrategyEngine, RemediationStrategy
from app.services.remediation.gemini_remediation_orchestrator import GeminiRemediationService
from app.services.remediation.validation_engine import ValidationOrchestrator, MultiLayerValidationReport, ValidationStageResult
from app.services.remediation.self_healing_service import SelfHealingService, SelfHealingAttempt
from app.services.remediation.github_remediation_service import GitHubRemediationService
from app.services.remediation.remediation_orchestrator import RemediationOrchestrator

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
    "CodeIntelligenceService",
    "CodeContext",
    "FixStrategyEngine",
    "RemediationStrategy",
    "GeminiRemediationService",
    "ValidationOrchestrator",
    "MultiLayerValidationReport",
    "ValidationStageResult",
    "SelfHealingService",
    "SelfHealingAttempt",
    "GitHubRemediationService",
    "RemediationOrchestrator",
]
