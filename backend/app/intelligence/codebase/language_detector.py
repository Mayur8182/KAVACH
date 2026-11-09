"""
Kavach Codebase Intelligence — Step 1.2: Language Detection Engine
Identifies programming languages from file extensions, shebang lines, and syntax heuristics.
Computes language distributions and lines of code (LOC).
"""

import os
import re
from typing import Dict, List, Optional
from dataclasses import dataclass

from app.intelligence.codebase.ingestion import IngestedFile


EXTENSION_MAP: Dict[str, str] = {
    ".py": "Python",
    ".pyw": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".c": "C",
    ".h": "C",
    ".hpp": "C++",
    ".sh": "Shell",
    ".bash": "Shell",
    ".ps1": "PowerShell",
    ".sql": "SQL",
    ".tf": "HCL/Terraform",
    ".tfvars": "HCL/Terraform",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".json": "JSON",
    ".xml": "XML",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".proto": "Protocol Buffers",
    ".dockerfile": "Dockerfile",
}

SPECIAL_FILENAMES: Dict[str, str] = {
    "dockerfile": "Dockerfile",
    "containerfile": "Dockerfile",
    "makefile": "Makefile",
    "jenkinsfile": "Groovy",
    "gemfile": "Ruby",
    "rakefile": "Ruby",
    "vagrantfile": "Ruby",
    "procfile": "Procfile",
}


@dataclass
class LanguageStats:
    language: str
    file_count: int
    lines_of_code: int
    percentage: float


class LanguageDetector:
    """
    Step 1.2: Deterministic Multi-Language Detection Engine.
    """

    @classmethod
    def detect_file_language(cls, file: IngestedFile) -> str:
        basename = os.path.basename(file.relative_path).lower()

        # Check special filenames
        if basename in SPECIAL_FILENAMES:
            return SPECIAL_FILENAMES[basename]

        # Check extension
        ext = file.extension.lower()
        if ext in EXTENSION_MAP:
            return EXTENSION_MAP[ext]

        # Check Shebang in first line
        first_line = file.content.split("\n", 1)[0].strip() if file.content else ""
        if first_line.startswith("#!"):
            fl_low = first_line.lower()
            if "python" in fl_low:
                return "Python"
            if "node" in fl_low:
                return "JavaScript"
            if "bash" in fl_low or "sh" in fl_low:
                return "Shell"
            if "ruby" in fl_low:
                return "Ruby"
            if "perl" in fl_low:
                return "Perl"

        return "Unknown"

    @classmethod
    def analyze_repository(cls, files: List[IngestedFile]) -> Dict[str, LanguageStats]:
        """
        Analyzes a list of ingested files and aggregates statistics per language.
        """
        counts: Dict[str, int] = {}
        locs: Dict[str, int] = {}
        total_loc = 0

        for f in files:
            lang = cls.detect_file_language(f)
            lines = len(f.content.splitlines()) if f.content else 0

            counts[lang] = counts.get(lang, 0) + 1
            locs[lang] = locs.get(lang, 0) + lines
            total_loc += lines

        results: Dict[str, LanguageStats] = {}
        for lang, count in counts.items():
            loc = locs[lang]
            pct = round((loc / total_loc * 100.0), 2) if total_loc > 0 else 0.0
            results[lang] = LanguageStats(
                language=lang,
                file_count=count,
                lines_of_code=loc,
                percentage=pct,
            )

        return results

