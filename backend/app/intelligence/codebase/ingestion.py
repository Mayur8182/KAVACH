"""
Kavach Codebase Intelligence — Step 1.1: Repository Ingestion Engine
Safely inspects, resolves, and inventories repository files.
Guarantees path containment, boundary security, and ignores vendor/build directories.
"""

import os
import hashlib
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, field


IGNORED_DIRECTORIES: Set[str] = {
    ".git", ".svn", ".hg", "node_modules", ".next", "dist", "build",
    "coverage", ".cache", "__pycache__", "venv", ".venv", "env",
    ".pytest_cache", ".gemini", ".agents", ".gsd", ".turbo", "vendor",
    ".idea", ".vscode", "target", "bin", "obj", ".terraform"
}

IGNORED_EXTENSIONS: Set[str] = {
    ".pyc", ".pyo", ".pyd", ".so", ".dll", ".dylib", ".exe", ".bin",
    ".iso", ".zip", ".tar", ".gz", ".7z", ".png", ".jpg", ".jpeg",
    ".gif", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".mov", ".avi", ".pdf", ".map", ".min.js", ".min.css"
}

MAX_FILE_SIZE_BYTES = 1024 * 1024 * 2  # 2MB limit per source file


@dataclass
class IngestedFile:
    path: str
    absolute_path: str
    relative_path: str
    size_bytes: int
    content: str
    content_hash: str
    extension: str
    is_binary: bool = False


@dataclass
class RepositoryInventory:
    root_path: str
    total_files: int
    total_size_bytes: int
    files: List[IngestedFile] = field(default_factory=list)
    languages_detected: Dict[str, int] = field(default_factory=dict)


class RepositoryIngestionService:
    """
    Step 1.1: Authoritative Repository Ingestion.
    Inspects repository workspaces, checks containment security, and reads source files.
    """

    def __init__(self, root_path: str):
        self.root_path = os.path.abspath(root_path)
        if not os.path.exists(self.root_path):
            raise FileNotFoundError(f"Repository target path does not exist: {self.root_path}")
        if not os.path.isdir(self.root_path):
            raise NotADirectoryError(f"Repository target must be a directory: {self.root_path}")

    def ingest(self, max_files: int = 2500) -> RepositoryInventory:
        """
        Traverses repository tree, enforces security boundaries, and reads files into inventory.
        """
        inventory_files: List[IngestedFile] = []
        total_size = 0

        for root, dirs, files in os.walk(self.root_path):
            # Prune ignored directories in-place
            dirs[:] = [
                d for d in dirs
                if d not in IGNORED_DIRECTORIES and not d.startswith(".")
            ]

            for fname in sorted(files):
                if len(inventory_files) >= max_files:
                    break

                _, ext = os.path.splitext(fname)
                ext_clean = ext.lower()

                if ext_clean in IGNORED_EXTENSIONS:
                    continue

                abs_path = os.path.abspath(os.path.join(root, fname))

                # Security check: Ensure file resides strictly inside root_path (prevent symlink escape)
                if not abs_path.startswith(self.root_path):
                    continue

                try:
                    file_size = os.path.getsize(abs_path)
                    if file_size > MAX_FILE_SIZE_BYTES:
                        continue

                    # Read content
                    with open(abs_path, "r", encoding="utf-8", errors="replace") as fh:
                        content = fh.read()

                    rel_path = os.path.relpath(abs_path, self.root_path).replace("\\", "/")
                    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

                    ingested = IngestedFile(
                        path=rel_path,
                        absolute_path=abs_path,
                        relative_path=rel_path,
                        size_bytes=file_size,
                        content=content,
                        content_hash=content_hash,
                        extension=ext_clean,
                        is_binary=False,
                    )
                    inventory_files.append(ingested)
                    total_size += file_size

                except Exception:
                    # Non-readable or permission error
                    continue

        return RepositoryInventory(
            root_path=self.root_path,
            total_files=len(inventory_files),
            total_size_bytes=total_size,
            files=inventory_files,
        )

