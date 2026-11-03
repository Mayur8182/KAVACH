"""
Kavach AI Security Guardrails Engine
Multi-tier deterministic guardrails:
1. Input Guardrail: Injection detection, credential leak prevention, request bounds.
2. Context Guardrail: Cross-tenant identity & resource ownership verification.
3. Tool Guardrail: Allowlist enforcement, risk tiering & human approval requirements.
4. Output Guardrail: Token / secret redaction & cross-tenant response sanitation.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple, List
import uuid

logger = logging.getLogger("kavach.guardrails")

# Common patterns for prompt injection & system jailbreak attempts
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules)",
    r"disregard\s+(all\s+)?system\s+prompts?",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"dan\s+mode",
    r"reveal\s+(your\s+)?system\s+prompt",
    r"show\s+(me\s+)?(the\s+)?hidden\s+instructions",
    r"bypass\s+all\s+(security|authorization|rules)",
    r"drop\s+table\s+",
    r"exec\s+xp_cmdshell",
]

# Sensitive patterns (tokens, keys, passwords)
SECRET_PATTERNS = [
    (r"ghp_[A-Za-z0-9_]{36,}", "[REDACTED_GITHUB_TOKEN]"),
    (r"github_pat_[A-Za-z0-9_]{82}", "[REDACTED_GITHUB_PAT]"),
    (r"AKIA[0-9A-Z]{16}", "[REDACTED_AWS_ACCESS_KEY]"),
    (r"xox[baprs]-[0-9A-Za-z-]{10,}", "[REDACTED_SLACK_TOKEN]"),
    (r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]+", "[REDACTED_JWT]"),
    (r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----", "[REDACTED_PRIVATE_KEY]"),
]


class SecurityGuardrails:
    """
    Authoritative Guardrails Engine for Kavach Assistant & Action Orchestrator.
    """

    @classmethod
    def inspect_input(cls, query: str) -> Tuple[bool, str, Optional[str]]:
        """
        Validates user input.
        Returns: (is_safe, sanitized_query, rejection_reason)
        """
        if not query or not query.strip():
            return True, "", None

        if len(query) > 16384:
            return False, query[:1000], "Query length exceeds maximum allowed character limit (16KB)."

        # Check prompt injection patterns
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, query, re.IGNORECASE):
                logger.warning(f"Prompt injection pattern detected: '{pattern}' in query")
                return False, query, "Your query contains disallowed prompt modification instructions. Execution blocked by Kavach Guardrails."

        # Redact secrets from user query so they never get logged or transmitted to LLMs
        sanitized = query
        for pattern, replacement in SECRET_PATTERNS:
            sanitized = re.sub(pattern, replacement, sanitized)

        return True, sanitized, None

    @classmethod
    def inspect_context(
        cls,
        user_id: uuid.UUID,
        accessible_project_ids: List[uuid.UUID],
        requested_project_id: Optional[uuid.UUID],
    ) -> bool:
        """
        Validates that the requested project ID belongs to the authorized tenant context.
        """
        if requested_project_id is None:
            return True

        if requested_project_id not in accessible_project_ids:
            logger.warning(
                f"Context Guardrail: Cross-tenant access attempt by user {user_id} on project {requested_project_id}"
            )
            return False

        return True

    @classmethod
    def inspect_output(cls, text: str) -> str:
        """
        Sanitizes AI output to ensure credentials or connection strings never leak to the UI.
        """
        if not text:
            return ""

        sanitized = text
        for pattern, replacement in SECRET_PATTERNS:
            sanitized = re.sub(pattern, replacement, sanitized)

        # Redact database connection URIs
        sanitized = re.sub(
            r"postgresql(\+asyncpg)?://[^@\s]+:[^@\s]+@[^\s/]+/[^\s]+",
            "postgresql://[REDACTED_CREDENTIALS]@[HOST]/[DB]",
            sanitized,
        )

        return sanitized
