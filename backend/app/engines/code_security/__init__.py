"""
Kavach Code Security Engine Suite
Exports:
- FullScanEngine (in sast/engine.py)
- QuickScanEngine (Git diff, incremental SAST, finding comparison)
- CustomScanEngine (Path/rule/severity scope filtering)
- AIScanEngine (Cross-file reasoning, business logic, IDOR & auth flaw detection with evidence)
- DeepReviewScanEngine (PR diff review, regressions, PR review comments & patch suggestions)
"""

from app.engines.sast.engine import SASTEngine as FullScanEngine
from app.engines.code_security.quick_scan import QuickScanEngine
from app.engines.code_security.custom_scan import CustomScanEngine
from app.engines.code_security.ai_scan import AIScanEngine
from app.engines.code_security.deep_review import DeepReviewScanEngine

__all__ = [
    "FullScanEngine",
    "QuickScanEngine",
    "CustomScanEngine",
    "AIScanEngine",
    "DeepReviewScanEngine",
]

