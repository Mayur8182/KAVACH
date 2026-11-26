"""
Kavach Repository Intelligence — Phase 2: Repository Discovery Service
Discovers repository structure, programming languages, dependency manifests,
frontend/backend division, application entry points, CI/CD, and configurations.
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field

logger = logging.getLogger("kavach.intelligence.discovery")

# Excluded directory names
DEFAULT_EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "out",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".turbo",
    ".coverage",
    ".idea",
    ".vscode",
    ".mypy_cache",
    ".agent",
    ".agents",
}

# Binary and non-source file extensions
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".pdf",
    ".zip", ".tar", ".gz", ".7z", ".rar", ".exe", ".dll", ".so", ".dylib",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mov", ".avi", ".mp3",
    ".pyc", ".pyo", ".class", ".jar", ".war",
}

# Source code extensions mapped to languages
EXTENSION_TO_LANGUAGE = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
    ".c": "C",
    ".cpp": "C++",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".sh": "Shell",
    ".bash": "Shell",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".tf": "Terraform",
    ".hcl": "HCL",
}

# Framework markers in manifests or directory names
MANIFEST_FILES = {
    "package.json": "Node.js / npm",
    "requirements.txt": "Python / pip",
    "Pipfile": "Python / Pipenv",
    "poetry.lock": "Python / Poetry",
    "pyproject.toml": "Python",
    "go.mod": "Go Modules",
    "pom.xml": "Java / Maven",
    "build.gradle": "Java / Gradle",
    "build.gradle.kts": "Kotlin / Gradle",
    "Cargo.toml": "Rust / Cargo",
    "composer.json": "PHP / Composer",
    "Gemfile": "Ruby / Bundler",
}


@dataclass
class DiscoveredFile:
    path: str
    relative_path: str
    size_bytes: int
    extension: str
    language: str
    is_binary: bool
    is_manifest: bool
    is_config: bool


@dataclass
class RepositoryDiscoveryResult:
    root_path: str
    total_files: int
    total_size_bytes: int
    total_source_files: int
    languages: Dict[str, int]
    primary_language: str
    manifests: List[Dict[str, str]]
    package_managers: List[str]
    entry_points: List[str]
    frontend_directories: List[str]
    backend_directories: List[str]
    infrastructure_directories: List[str]
    ci_cd_files: List[str]
    config_files: List[str]
    readme_purpose: str
    tree_hierarchy: Dict[str, Any]
    detected_frameworks: List[str]


class RepositoryDiscoveryService:
    """
    Step 2: Complete Discovery Engine for Connected Codebases.
    """

    def __init__(self, root_path: str):
        self.root_path = os.path.abspath(root_path)
        self.ignore_patterns: List[str] = self._load_gitignore()

    def _load_gitignore(self) -> List[str]:
        patterns = []
        gitignore_path = os.path.join(self.root_path, ".gitignore")
        if os.path.isfile(gitignore_path):
            try:
                with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            patterns.append(line.rstrip("/"))
            except Exception as e:
                logger.warning(f"Could not read .gitignore: {e}")
        return patterns

    def _is_ignored(self, rel_path: str) -> bool:
        norm = rel_path.replace("\\", "/")
        parts = norm.split("/")
        if any(p in DEFAULT_EXCLUDED_DIRS for p in parts):
            return True
        for pat in self.ignore_patterns:
            if pat in parts or norm.startswith(pat) or norm.endswith(pat):
                return True
        return False

    def discover(self, max_files: int = 1500) -> RepositoryDiscoveryResult:
        """
        Executes complete repository discovery across the filesystem.
        """
        if not os.path.isdir(self.root_path):
            raise ValueError(f"Repository directory does not exist: {self.root_path}")

        files: List[DiscoveredFile] = []
        languages_count: Dict[str, int] = {}
        total_size = 0
        manifests: List[Dict[str, str]] = []
        package_managers: Set[str] = set()
        ci_cd_files: List[str] = []
        config_files: List[str] = []
        frontend_dirs: Set[str] = set()
        backend_dirs: Set[str] = set()
        infra_dirs: Set[str] = set()
        entry_points: List[str] = []
        frameworks: Set[str] = set()

        # Walk filesystem
        for root, dirs, filenames in os.walk(self.root_path):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in DEFAULT_EXCLUDED_DIRS and not self._is_ignored(os.path.relpath(os.path.join(root, d), self.root_path))]

            for fname in filenames:
                full_path = os.path.join(root, fname)
                rel_path = os.path.relpath(full_path, self.root_path).replace("\\", "/")

                if self._is_ignored(rel_path):
                    continue

                try:
                    fsize = os.path.getsize(full_path)
                except OSError:
                    fsize = 0

                total_size += fsize
                ext = os.path.splitext(fname)[1].lower()
                is_bin = ext in BINARY_EXTENSIONS
                lang = EXTENSION_TO_LANGUAGE.get(ext, "Other") if not is_bin else "Binary"

                if not is_bin and lang != "Other":
                    languages_count[lang] = languages_count.get(lang, 0) + 1

                # Check manifests
                is_man = fname in MANIFEST_FILES
                if is_man:
                    pm_info = MANIFEST_FILES[fname]
                    manifests.append({"file": rel_path, "type": pm_info})
                    package_managers.add(pm_info)

                # Check CI/CD
                if ".github/workflows" in rel_path or fname in (".gitlab-ci.yml", "Jenkinsfile", "bitbucket-pipelines.yml"):
                    ci_cd_files.append(rel_path)

                # Check Config files
                if fname.startswith(".env") or fname in ("docker-compose.yml", "Dockerfile", "tsconfig.json", "next.config.js", "next.config.mjs", "vite.config.ts", "alembic.ini"):
                    config_files.append(rel_path)

                # Check directory classifications
                parts = rel_path.split("/")
                if len(parts) > 1:
                    top_dir = parts[0].lower()
                    if top_dir in ("frontend", "client", "web", "ui", "pages", "app"):
                        frontend_dirs.add(parts[0])
                    elif top_dir in ("backend", "server", "api", "services"):
                        backend_dirs.add(parts[0])
                    elif top_dir in ("infra", "infrastructure", "terraform", "k8s", "helm", "deploy"):
                        infra_dirs.add(parts[0])

                # Entry point checks
                if fname in (
                    "main.py", "app.py", "server.py", "wsgi.py", "asgi.py", "manage.py",
                    "index.js", "index.ts", "server.js", "server.ts", "main.ts", "app.js",
                    "main.go", "Application.java"
                ):
                    entry_points.append(rel_path)
                elif "app/layout.tsx" in rel_path or "app/layout.js" in rel_path or "pages/_app.tsx" in rel_path:
                    entry_points.append(rel_path)

                files.append(DiscoveredFile(
                    path=full_path,
                    relative_path=rel_path,
                    size_bytes=fsize,
                    extension=ext,
                    language=lang,
                    is_binary=is_bin,
                    is_manifest=is_man,
                    is_config=fname in config_files or fname.endswith(".json") or fname.endswith(".yaml") or fname.endswith(".yml"),
                ))

                if len(files) >= max_files:
                    break
            if len(files) >= max_files:
                break

        # Primary language resolution
        primary_lang = "Unknown"
        if languages_count:
            primary_lang = max(languages_count.items(), key=lambda x: x[1])[0]

        # Framework detection by inspecting manifests and files
        frameworks = self._detect_frameworks(manifests)

        # Readme purpose extraction
        readme_purpose = self._extract_readme_purpose()

        # Build clean tree hierarchy (top 2 levels)
        tree_hierarchy = self._build_directory_summary()

        return RepositoryDiscoveryResult(
            root_path=self.root_path,
            total_files=len(files),
            total_size_bytes=total_size,
            total_source_files=sum(1 for f in files if not f.is_binary),
            languages=languages_count,
            primary_language=primary_lang,
            manifests=manifests,
            package_managers=sorted(list(package_managers)),
            entry_points=sorted(entry_points),
            frontend_directories=sorted(list(frontend_dirs)),
            backend_directories=sorted(list(backend_dirs)),
            infrastructure_directories=sorted(list(infra_dirs)),
            ci_cd_files=sorted(ci_cd_files),
            config_files=sorted(config_files),
            readme_purpose=readme_purpose,
            tree_hierarchy=tree_hierarchy,
            detected_frameworks=sorted(list(frameworks)),
        )

    def _detect_frameworks(self, manifests: List[Dict[str, str]]) -> Set[str]:
        frameworks: Set[str] = set()

        # 1. Inspect package.json
        for m in manifests:
            if m["file"].endswith("package.json"):
                full_m = os.path.join(self.root_path, m["file"])
                try:
                    with open(full_m, "r", encoding="utf-8", errors="ignore") as f:
                        data = json.load(f)
                        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                        if "next" in deps:
                            frameworks.add("Next.js")
                        if "react" in deps:
                            frameworks.add("React")
                        if "express" in deps:
                            frameworks.add("Express")
                        if "nestjs" in deps or "@nestjs/core" in deps:
                            frameworks.add("NestJS")
                        if "vue" in deps:
                            frameworks.add("Vue.js")
                        if "tailwindcss" in deps:
                            frameworks.add("TailwindCSS")
                        if "mongoose" in deps:
                            frameworks.add("Mongoose")
                        if "prisma" in deps or "@prisma/client" in deps:
                            frameworks.add("Prisma")
                except Exception:
                    pass

            # 2. Inspect requirements.txt / pyproject.toml
            elif m["file"].endswith("requirements.txt") or m["file"].endswith("pyproject.toml"):
                full_m = os.path.join(self.root_path, m["file"])
                try:
                    with open(full_m, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read().lower()
                        if "fastapi" in content:
                            frameworks.add("FastAPI")
                        if "flask" in content:
                            frameworks.add("Flask")
                        if "django" in content:
                            frameworks.add("Django")
                        if "sqlalchemy" in content:
                            frameworks.add("SQLAlchemy")
                        if "pydantic" in content:
                            frameworks.add("Pydantic")
                        if "pymongo" in content or "motor" in content:
                            frameworks.add("MongoDB/PyMongo")
                except Exception:
                    pass

        return frameworks

    def _extract_readme_purpose(self) -> str:
        for fname in ("README.md", "README.txt", "readme.md", "Readme.md"):
            p = os.path.join(self.root_path, fname)
            if os.path.isfile(p):
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as f:
                        lines = [line.strip() for line in f if line.strip()]
                        for line in lines[:10]:
                            if not line.startswith("#") and len(line) > 20:
                                return line[:300]
                        if lines:
                            return re.sub(r"^[#\s*]+", "", lines[0])[:300]
                except Exception:
                    pass
        return "Application software repository"

    def _build_directory_summary(self) -> Dict[str, Any]:
        summary: Dict[str, Any] = {}
        try:
            for item in os.listdir(self.root_path):
                if item in DEFAULT_EXCLUDED_DIRS or item.startswith("."):
                    continue
                full_item = os.path.join(self.root_path, item)
                if os.path.isdir(full_item):
                    sub_count = len([x for x in os.listdir(full_item) if not x.startswith(".")])
                    summary[item] = {"type": "directory", "child_count": sub_count}
                else:
                    summary[item] = {"type": "file", "size": os.path.getsize(full_item)}
        except Exception:
            pass
        return summary

