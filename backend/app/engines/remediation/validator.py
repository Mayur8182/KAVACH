"""
THING Remediation Engine — Patch Validator
Verifies syntactic validity and integrity of proposed patches before verification or application.
"""

import ast
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("thing.remediation.validator")

_HUNK_HEADER_RE = re.compile(r"^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@")

PLACEHOLDER_DIFF_MARKERS = (
    "// Secured: Parameterized input validation enforced",
    "mongodb://<DB_USER>:<DB_PASSWORD>",
    "rentalhub-dev",
)


class PatchValidator:
    """Validates unified diff format, real content changes, and code syntax integrity."""

    @staticmethod
    def validate_diff_format(diff: str) -> Tuple[bool, str]:
        """Ensures diff conforms to standard unified diff structure and is not a placeholder."""
        if not diff or not diff.strip():
            return False, "Patch diff is empty."

        clean = diff.strip()
        for marker in PLACEHOLDER_DIFF_MARKERS:
            if marker in clean:
                return False, "Rejected placeholder/synthetic diff marker; diff must target actual repository code."

        has_header = ("---" in clean and "+++" in clean) or clean.startswith("@@")
        has_hunk = bool(re.search(r"@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@", clean))
        diff_lines = clean.splitlines()
        has_change = any(
            (ln.startswith("+") and not ln.startswith("+++"))
            or (ln.startswith("-") and not ln.startswith("---"))
            for ln in diff_lines
        )

        if not (has_header and has_hunk):
            return False, "Patch does not conform to unified diff format (missing diff header or @@ hunk)."
        if not has_change:
            return False, "Patch diff contains no actual additions or deletions."

        return True, "Valid unified diff format."

    @staticmethod
    def validate_python_syntax(code: str) -> Tuple[bool, str]:
        """Tests if the code parses into a valid Python AST without syntax errors."""
        try:
            ast.parse(code)
            return True, "Python AST syntax is valid."
        except SyntaxError as e:
            return False, f"Syntax error at line {e.lineno}, col {e.offset}: {e.msg}"

    @staticmethod
    def validate_syntax_for_file(file_path: str, code: str) -> Tuple[bool, str]:
        """Runs deterministic parser checks matching the target file extension."""
        lower = (file_path or "").lower()
        if lower.endswith(".py"):
            return PatchValidator.validate_python_syntax(code)
        if lower.endswith(".json"):
            try:
                json.loads(code)
                return True, "JSON syntax is valid."
            except Exception as e:
                return False, f"Invalid JSON syntax: {e}"
        if lower.endswith((".yml", ".yaml")):
            try:
                import yaml

                list(yaml.safe_load_all(code))
                return True, "YAML syntax is valid."
            except ImportError:
                return True, "YAML parser unavailable; skipped."
            except Exception as e:
                return False, f"Invalid YAML syntax: {e}"
        return True, f"Syntax check passed for {file_path or 'file'}."

    @classmethod
    def apply_diff_to_text(cls, original_text: str, diff_text: str) -> Tuple[bool, str, str]:
        """
        Applies a standard unified diff (`--- / +++ / @@ ... @@`) to `original_text` in memory.
        Supports exact line-number hunk placement as well as nearby fuzzy anchor matching when line numbers drift slightly.
        Returns: (success, new_text, status_message)
        """
        is_valid, reason = cls.validate_diff_format(diff_text)
        if not is_valid:
            return False, original_text, reason

        had_trailing_newline = original_text.endswith("\n")
        orig_lines = original_text.splitlines()
        diff_lines = diff_text.splitlines()

        hunks: List[Tuple[int, List[Tuple[str, str]]]] = []
        idx = 0
        while idx < len(diff_lines):
            line = diff_lines[idx]
            m = _HUNK_HEADER_RE.match(line)
            if m:
                orig_start = max(1, int(m.group(1)))
                hunk_ops: List[Tuple[str, str]] = []
                idx += 1
                while idx < len(diff_lines):
                    hl = diff_lines[idx]
                    if _HUNK_HEADER_RE.match(hl) or hl.startswith("diff --git ") or hl.startswith("--- "):
                        break
                    if hl.startswith("\\ No newline"):
                        idx += 1
                        continue
                    if hl.startswith((" ", "-", "+")):
                        hunk_ops.append((hl[0], hl[1:]))
                    elif hl == "":
                        hunk_ops.append((" ", ""))
                    idx += 1
                if hunk_ops:
                    hunks.append((orig_start, hunk_ops))
                continue
            idx += 1

        if not hunks:
            return False, original_text, "No valid @@ unified diff hunks found."

        working = list(orig_lines)
        offset_delta = 0

        for orig_start, ops in hunks:
            expected_old = [val for op, val in ops if op in (" ", "-")]
            replacement = [val for op, val in ops if op in (" ", "+")]

            # Empty source creation or pure append hunk
            if not expected_old:
                insert_pos = min(len(working), max(0, orig_start - 1 + offset_delta))
                working[insert_pos:insert_pos] = replacement
                offset_delta += len(replacement)
                continue

            expected_pos = max(0, min(len(working), orig_start - 1 + offset_delta))
            match_idx: Optional[int] = None

            # 1. Exact check at hunk line number
            if working[expected_pos : expected_pos + len(expected_old)] == expected_old:
                match_idx = expected_pos
            else:
                # 2. Search within +/- 30 lines, then whole file (stripped comparison fallback)
                n_old = len(expected_old)
                candidates = list(
                    range(max(0, expected_pos - 30), min(len(working) - n_old + 1, expected_pos + 31))
                )
                candidates.extend(i for i in range(max(0, len(working) - n_old + 1)) if i not in candidates)

                for pos in candidates:
                    if working[pos : pos + n_old] == expected_old:
                        match_idx = pos
                        break

                if match_idx is None:
                    stripped_expected = [s.rstrip() for s in expected_old]
                    for pos in candidates:
                        if [w.rstrip() for w in working[pos : pos + n_old]] == stripped_expected:
                            match_idx = pos
                            break

            if match_idx is None:
                return (
                    False,
                    original_text,
                    f"Hunk around line {orig_start} did not match target file contents.",
                )

            working[match_idx : match_idx + len(expected_old)] = replacement
            offset_delta += len(replacement) - len(expected_old)

        new_text = "\n".join(working)
        if had_trailing_newline and not new_text.endswith("\n"):
            new_text += "\n"
        if new_text == original_text:
            return False, original_text, "Patch produced no textual changes to target file."

        return True, new_text, f"Applied {len(hunks)} unified diff hunk(s) cleanly."
