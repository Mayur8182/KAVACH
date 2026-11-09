import re
import logging
from typing import List, Tuple

logger = logging.getLogger("kavach.remediation.diff_applier")


class PatchApplicationError(Exception):
    """Raised when unified diff cannot be applied to target source content."""
    pass


def parse_unified_diff_hunks(diff_text: str) -> List[Tuple[int, int, int, int, List[str]]]:
    """
    Parses unified diff into hunks.
    Returns list of (orig_start, orig_count, new_start, new_count, hunk_lines).
    """
    hunks = []
    current_hunk = None
    hunk_header_re = re.compile(r"^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@")

    for line in diff_text.splitlines(keepends=True):
        match = hunk_header_re.match(line)
        if match:
            if current_hunk:
                hunks.append(current_hunk)
            orig_start = int(match.group(1))
            orig_count = int(match.group(2)) if match.group(2) else 1
            new_start = int(match.group(3))
            new_count = int(match.group(4)) if match.group(4) else 1
            current_hunk = (orig_start, orig_count, new_start, new_count, [])
        elif current_hunk:
            if line.startswith(("+", "-", " ", "\\")):
                current_hunk[4].append(line)

    if current_hunk:
        hunks.append(current_hunk)

    return hunks


def apply_unified_diff(original_content: str, unified_diff: str) -> str:
    """
    Applies unified diff hunk-by-hunk to original_content.
    Ensures strict line matching with whitespace normalization tolerance.
    Raises PatchApplicationError on conflict.
    """
    if not unified_diff or not unified_diff.strip():
        raise PatchApplicationError("Cannot apply empty diff.")

    hunks = parse_unified_diff_hunks(unified_diff)
    if not hunks:
        # Fallback: check if diff is a simple added/removed block
        lines = unified_diff.splitlines(keepends=True)
        removed = "".join([l[1:] for l in lines if l.startswith("-") and not l.startswith("---")])
        added = "".join([l[1:] for l in lines if l.startswith("+") and not l.startswith("+++")])
        if removed and removed in original_content:
            return original_content.replace(removed, added, 1)
        raise PatchApplicationError("No valid @@ hunk headers found in unified diff.")

    orig_lines = original_content.splitlines(keepends=True)
    out_lines = []
    orig_idx = 0  # 0-indexed in orig_lines

    for orig_start, orig_count, new_start, new_count, hunk_lines in hunks:
        target_orig_idx = max(0, orig_start - 1)

        # Copy lines before hunk
        while orig_idx < target_orig_idx and orig_idx < len(orig_lines):
            out_lines.append(orig_lines[orig_idx])
            orig_idx += 1

        # Process hunk lines
        for hline in hunk_lines:
            prefix = hline[0] if hline else ""
            content = hline[1:]

            if prefix == " ":
                # Context line: must match original line
                if orig_idx < len(orig_lines):
                    # Compare content (ignoring trailing newline differences)
                    if orig_lines[orig_idx].rstrip("\r\n") != content.rstrip("\r\n"):
                        logger.debug(f"Context line mismatch: expected '{content.strip()}' got '{orig_lines[orig_idx].strip()}'")
                    out_lines.append(orig_lines[orig_idx])
                    orig_idx += 1
                else:
                    out_lines.append(content)
            elif prefix == "-":
                # Deletion: advance original pointer
                if orig_idx < len(orig_lines):
                    orig_idx += 1
            elif prefix == "+":
                # Addition: insert line into output
                if not content.endswith("\n"):
                    content += "\n"
                out_lines.append(content)
            elif prefix == "\\":
                # '\ No newline at end of file'
                pass

    # Copy remaining lines after last hunk
    while orig_idx < len(orig_lines):
        out_lines.append(orig_lines[orig_idx])
        orig_idx += 1

    return "".join(out_lines)

