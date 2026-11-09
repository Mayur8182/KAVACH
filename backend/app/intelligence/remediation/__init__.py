"""
Kavach Phase 4: Multi-File Autonomous Remediation Subsystem
"""

from app.intelligence.remediation.models import (
    FileClassification,
    FileOperation,
    TransactionStatus,
    VerificationOutcome,
    RemediationPlanStatus,
    CandidateFileImpact,
    MultiFileImpactReport,
    PlannedFileChange,
    MultiFileRemediationPlan,
    FilePatchUnit,
    MultiFilePatchSet,
    ValidationFinding,
    PatchSetValidationResult,
    PatchTransactionRecord,
    MultiLayerVerificationReport,
    PatchRevisionRecord,
)
from app.intelligence.remediation.impact_resolver import MultiFileImpactResolver
from app.intelligence.remediation.plan_manager import MultiFileRemediationPlanner
from app.intelligence.remediation.patch_generator import MultiFilePatchGenerator
from app.intelligence.remediation.validator import MultiFilePatchValidator
from app.intelligence.remediation.transaction_manager import PatchTransactionManager
from app.intelligence.remediation.verification_pipeline import MultiFileVerificationPipeline
from app.intelligence.remediation.revision_loop import PatchRevisionLoop
from app.intelligence.remediation.coordinator import MultiFileRemediationCoordinator

__all__ = [
    "FileClassification",
    "FileOperation",
    "TransactionStatus",
    "VerificationOutcome",
    "RemediationPlanStatus",
    "CandidateFileImpact",
    "MultiFileImpactReport",
    "PlannedFileChange",
    "MultiFileRemediationPlan",
    "FilePatchUnit",
    "MultiFilePatchSet",
    "ValidationFinding",
    "PatchSetValidationResult",
    "PatchTransactionRecord",
    "MultiLayerVerificationReport",
    "PatchRevisionRecord",
    "MultiFileImpactResolver",
    "MultiFileRemediationPlanner",
    "MultiFilePatchGenerator",
    "MultiFilePatchValidator",
    "PatchTransactionManager",
    "MultiFileVerificationPipeline",
    "PatchRevisionLoop",
    "MultiFileRemediationCoordinator",
]

