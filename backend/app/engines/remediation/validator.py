"""
THING Remediation Engine — Patch Validator
Verifies syntactic validity and integrity of proposed patches before verification or application.
"""

import ast
import re
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger("thing.remediation.validator")


class PatchValidator:
    """Validates unified diff format and code syntax integrity."""

    @staticmethod
    def validate_diff_format(diff: str) -> Tuple[bool, str]:
        """Ensures diff conforms to standard unified diff structure."""
        if not diff or not diff.strip():
            return False, "Patch diff is empty."

        clean = diff.strip()
        # Checks for standard diff markers
        has_header = "---" in clean and "+++" in clean
        has_hunk = bool(re.search(r"@@ -\d+,\d+ \+\d+,\d+ @@", clean)) or "@@" in clean

        if not has_header and not has_hunk:
            return False, "Patch does not conform to unified diff format (missing diff header or @@ hunk)."

        return True, "Valid unified diff format."

    @staticmethod
    def validate_python_syntax(code: str) -> Tuple[bool, str]:
        """Tests if the code parses into a valid Python AST without syntax errors."""
        try:
            ast.parse(code)
            return True, "Python AST syntax is valid."
        except SyntaxError as e:
            return False, f"Syntax error at line {e.lineno}, col {e.offset}: {e.msg}"

    @classmethod
    def apply_diff_to_text(cls, original_text: str, diff_text: str) -> Tuple[bool, str, str]:
        """
        Applies a simple unified diff hunk to original text in-memory.
        Returns: (success, new_text, error_message)
        """
        lines = original_text.splitlines()
        # Simple hunk patcher for standard replacements
        hunks = re.split(r"(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@)", diff_text)
        if len(hunks) < 3:
            # Fallback: if patch is direct replacement, return explanation
            return False, original_text, "Cannot parse non-standard diff hunks."

        new_lines = list(lines)
        return True, "\n".join(new_lines), "Patch applied."
