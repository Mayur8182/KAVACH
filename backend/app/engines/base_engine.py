"""
Kavach Engine Suite — Central Registry and Interfaces
Defines all 8 core security engines and the central scan orchestrator.
Strictly adheres to AGENTS.md:
"LLM proposes. Deterministic security systems decide. Runtime evidence proves."
"""

from typing import Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field


class EngineType(str, Enum):
    SAST = "SAST"
    SECRETS = "SECRETS"
    SCA = "SCA"
    CONTAINER = "CONTAINER"
    IAC = "IAC"
    DAST = "DAST"
    API_SECURITY = "API_SECURITY"
    SUPPLY_CHAIN = "SUPPLY_CHAIN"


class ScanProfile(str, Enum):
    QUICK = "Quick Scan"
    STANDARD = "Standard Scan"
    DEEP = "Deep Scan"
    FULL = "Full Scan"
    AI_SCAN = "AI Scan"
    DEEP_REVIEW = "Deep Review Scan"


class EngineFinding(BaseModel):
    id: str
    engine: EngineType
    sub_engine: str
    rule_id: str
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    file_path: str
    line_start: int = 1
    line_end: int = 1
    code_snippet: str = ""
    remediation_guidance: str = ""
    evidence: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0


class EngineExecutionResult(BaseModel):
    engine: EngineType
    status: str  # SUCCESS, PARTIAL, FAILED, SKIPPED
    duration_ms: int = 0
    files_analyzed: int = 0
    findings: List[EngineFinding] = Field(default_factory=list)
    logs: List[str] = Field(default_factory=list)
    error_message: str = ""

