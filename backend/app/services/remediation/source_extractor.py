import os
import hashlib
import logging
from dataclasses import dataclass
from typing import Optional, List

from app.services.remediation.repository_context import RepositoryContext, sanitize_and_resolve_path

logger = logging.getLogger("kavach.remediation.source_extractor")


class SourceExtractionError(Exception):
    """Raised when source file cannot be read, validated, or found."""
    pass


@dataclass
class SourceContext:
    relative_path: str
    absolute_path: str
    file_content: str
    file_hash: str
    language: str
    line_start: int
    line_end: int
    vulnerable_snippet: str
    context_snippet: str
    surrounding_lines: List[str]


def detect_language(file_path: str) -> str:
    """Infers programming language from file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    mapping = {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".go": "go",
        ".java": "java",
        ".rb": "ruby",
        ".php": "php",
        ".tf": "terraform",
        ".hcl": "hcl",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".json": "json",
        ".sh": "bash",
        ".bash": "bash",
        ".sql": "sql",
        "dockerfile": "dockerfile",
    }
    fname = os.path.basename(file_path).lower()
    if fname.startswith("dockerfile"):
        return "dockerfile"
    return mapping.get(ext, "text")


def extract_vulnerable_source(
    repo_context: RepositoryContext,
    relative_file_path: str,
    line_start: Optional[int] = None,
    line_end: Optional[int] = None,
    context_lines: int = 20,
) -> SourceContext:
    """
    Extracts real file content, surrounding lines, language, and SHA-256 integrity hash
    from the checked-out repository.
    Raises SourceExtractionError if file does not exist or cannot be read.
    """
    if not relative_file_path or not relative_file_path.strip():
        raise SourceExtractionError("No file path specified for finding.")

    try:
        abs_path = sanitize_and_resolve_path(repo_context.root_path, relative_file_path)
    except ValueError as e:
        raise SourceExtractionError(f"Security boundary error: {str(e)}")

    if not os.path.isfile(abs_path):
        raise SourceExtractionError(
            f"Target source file '{relative_file_path}' does not exist in repository '{repo_context.repository_name}'."
        )

    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        raise SourceExtractionError(f"Failed to read source file '{relative_file_path}': {str(e)}")

    file_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    lines = content.splitlines(keepends=True)
    total_lines = len(lines)

    l_start = max(1, line_start or 1)
    l_end = max(l_start, line_end or l_start)

    # Slice context window
    window_start = max(1, l_start - context_lines)
    window_end = min(total_lines, l_end + context_lines)

    vulnerable_snippet = "".join(lines[l_start - 1 : min(total_lines, l_end)])
    context_snippet = "".join(lines[window_start - 1 : window_end])
    surrounding_lines = [l.rstrip("\r\n") for l in lines[window_start - 1 : window_end]]

    return SourceContext(
        relative_path=relative_file_path.replace("\\", "/"),
        absolute_path=abs_path,
        file_content=content,
        file_hash=file_hash,
        language=detect_language(relative_file_path),
        line_start=l_start,
        line_end=l_end,
        vulnerable_snippet=vulnerable_snippet,
        context_snippet=context_snippet,
        surrounding_lines=surrounding_lines,
    )

