"""
Thing Scan Orchestrator — Asset Discovery Engine
Inspects repository trees, workspaces, and container targets to build
an authoritative AssetProfile of languages, manifests, IaC, and security targets.
Strict compliance with AGENTS.md: Real filesystem inspection, zero mocked numbers.
"""

import asyncio
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from app.engines.orchestrator.models import (
    AssetProfile,
    AssetType,
    DiscoveredAsset,
)

# Directories to skip to preserve performance and prevent infinite traversal
IGNORED_DIRECTORIES: Set[str] = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "env",
    ".env",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".gradle",
    "target",
    "vendor",
    ".terraform",
    ".idea",
    ".vscode",
    "coverage",
    ".pytest_cache",
    ".tox",
    "bin",
    "obj",
    ".gemini",
    "tmp",
}

# File extensions ignored during scanning (binaries, media, compiled files)
IGNORED_EXTENSIONS: Set[str] = {
    ".min.js",
    ".min.css",
    ".map",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".mp3",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".pyc",
    ".pyo",
    ".class",
    ".dll",
    ".exe",
    ".so",
    ".dylib",
    ".swp",
}

# Language mapping by file extension
LANGUAGE_EXTENSIONS: Dict[str, str] = {
    ".py": "python",
    ".pyi": "python",
    ".pyw": "python",
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".rs": "rust",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".php": "php",
    ".rb": "ruby",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".ps1": "powershell",
    ".sql": "sql",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
}

# Manifest filename to ecosystem mapping
MANIFEST_ECOSYSTEM_MAP: Dict[str, str] = {
    "package.json": "npm",
    "package-lock.json": "npm",
    "pnpm-lock.yaml": "npm",
    "yarn.lock": "npm",
    "requirements.txt": "pip",
    "pipfile": "pip",
    "pyproject.toml": "pip",
    "setup.py": "pip",
    "poetry.lock": "pip",
    "go.mod": "go",
    "go.sum": "go",
    "pom.xml": "maven",
    "build.gradle": "gradle",
    "build.gradle.kts": "gradle",
    "cargo.toml": "cargo",
    "cargo.lock": "cargo",
    "gemfile": "rubygems",
    "gemfile.lock": "rubygems",
    "composer.json": "composer",
    "composer.lock": "composer",
}

# Secret-risk sensitive filename patterns
SECRET_FILENAME_PATTERNS = [
    re.compile(r"^\.env(?:\.[a-zA-Z0-9_\-]+)?$", re.IGNORECASE),
    re.compile(r"^.*\.pem$", re.IGNORECASE),
    re.compile(r"^.*\.key$", re.IGNORECASE),
    re.compile(r"^id_rsa(?:\.pub)?$", re.IGNORECASE),
    re.compile(r"^id_ed25519(?:\.pub)?$", re.IGNORECASE),
    re.compile(r"^(?:credentials|credentials\.json|secret\.json|jwt\.key)$", re.IGNORECASE),
]


class AssetDiscoveryEngine:
    """
    Asynchronously traverses a target workspace or repository and computes
    an authoritative AssetProfile for the Scan Planner.
    """

    async def discover(
        self,
        target_path: str,
        max_files: int = 50000,
        sample_limit: int = 500,
    ) -> AssetProfile:
        """
        Main entrypoint. Discovers assets in the target directory asynchronously.
        Runs the disk traversal in a thread pool to avoid blocking the event loop.
        """
        start_time = time.monotonic()
        abs_target = os.path.abspath(target_path)

        if not os.path.exists(abs_target):
            raise FileNotFoundError(f"Target path '{target_path}' does not exist on disk")

        # Run traversal in background thread
        loop = asyncio.get_running_loop()
        profile_data = await loop.run_in_executor(
            None,
            self._sync_traverse,
            abs_target,
            max_files,
            sample_limit,
        )

        # Inspect Git metadata
        is_git, branch, commit = await self._inspect_git_metadata(abs_target)

        duration_ms = int((time.monotonic() - start_time) * 1000)

        return AssetProfile(
            target_path=abs_target,
            target_name=os.path.basename(abs_target.rstrip("\\/")) or "workspace",
            is_git_repository=is_git,
            git_branch=branch,
            git_commit_sha=commit,
            total_files_inspected=profile_data["total_files"],
            total_bytes_inspected=profile_data["total_bytes"],
            languages=profile_data["languages"],
            package_ecosystems=sorted(list(profile_data["package_ecosystems"])),
            manifest_files=profile_data["manifest_files"],
            iac_files=profile_data["iac_files"],
            container_files=profile_data["container_files"],
            ci_cd_files=profile_data["ci_cd_files"],
            secret_risk_files=profile_data["secret_risk_files"],
            discovered_assets=profile_data["sample_assets"],
            discovery_duration_ms=duration_ms,
        )

    def _sync_traverse(
        self,
        root_dir: str,
        max_files: int,
        sample_limit: int,
    ) -> Dict[str, Any]:
        """Synchronous traversal logic running in worker thread."""
        languages: Dict[str, int] = {}
        package_ecosystems: Set[str] = set()
        manifest_files: List[str] = []
        iac_files: List[str] = []
        container_files: List[str] = []
        ci_cd_files: List[str] = []
        secret_risk_files: List[str] = []
        sample_assets: List[DiscoveredAsset] = []

        total_files = 0
        total_bytes = 0

        # Fast walk using os.walk
        for root, dirs, files in os.walk(root_dir, topdown=True):
            # Mutate dirs in-place to avoid descending into ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRECTORIES and not d.startswith(".git")]

            rel_root = os.path.relpath(root, root_dir)
            if rel_root == ".":
                rel_root = ""

            for fname in files:
                total_files += 1
                if total_files > max_files:
                    break

                # Check if ignored extension
                fname_lower = fname.lower()
                if any(fname_lower.endswith(ext) for ext in IGNORED_EXTENSIONS):
                    continue

                full_path = os.path.join(root, fname)
                rel_path = os.path.join(rel_root, fname).replace("\\", "/")

                try:
                    size = os.path.getsize(full_path)
                except OSError:
                    size = 0
                total_bytes += size

                asset_type, category, metadata = self._classify_file(rel_path, fname, size)

                # Track metrics
                if asset_type == AssetType.SOURCE_CODE:
                    languages[category] = languages.get(category, 0) + 1
                elif asset_type == AssetType.PACKAGE_MANIFEST:
                    manifest_files.append(rel_path)
                    eco = metadata.get("ecosystem")
                    if eco:
                        package_ecosystems.add(eco)
                elif asset_type == AssetType.IAC_TEMPLATE:
                    iac_files.append(rel_path)
                elif asset_type in {AssetType.CONTAINER_DOCKERFILE, AssetType.CONTAINER_COMPOSE}:
                    container_files.append(rel_path)
                elif asset_type == AssetType.CI_CD_WORKFLOW:
                    ci_cd_files.append(rel_path)
                elif asset_type == AssetType.SECRETS_TARGET:
                    secret_risk_files.append(rel_path)

                # Store sample asset descriptors
                if len(sample_assets) < sample_limit:
                    sample_assets.append(
                        DiscoveredAsset(
                            path=rel_path,
                            asset_type=asset_type,
                            category=category,
                            size_bytes=size,
                            metadata=metadata,
                        )
                    )

            if total_files > max_files:
                break

        return {
            "total_files": total_files,
            "total_bytes": total_bytes,
            "languages": languages,
            "package_ecosystems": package_ecosystems,
            "manifest_files": manifest_files,
            "iac_files": iac_files,
            "container_files": container_files,
            "ci_cd_files": ci_cd_files,
            "secret_risk_files": secret_risk_files,
            "sample_assets": sample_assets,
        }

    def _classify_file(
        self,
        rel_path: str,
        filename: str,
        size_bytes: int,
    ) -> Tuple[AssetType, str, Dict[str, Any]]:
        """Determines the asset type, category, and metadata for a single file."""
        fname_lower = filename.lower()
        rel_lower = rel_path.lower()
        _, ext = os.path.splitext(fname_lower)

        # 1. Check for Secrets Risks (e.g. .env, id_rsa, *.pem)
        if any(pat.match(filename) for pat in SECRET_FILENAME_PATTERNS):
            if not fname_lower.endswith(".example") and not fname_lower.endswith(".sample"):
                return AssetType.SECRETS_TARGET, "credential", {"file_type": "potential_secret"}

        # 2. Check for CI/CD Pipelines
        if ".github/workflows" in rel_lower or filename in {
            "Jenkinsfile",
            ".gitlab-ci.yml",
            "azure-pipelines.yml",
            "bitbucket-pipelines.yml",
        }:
            return AssetType.CI_CD_WORKFLOW, "ci_cd", {"ci_type": "github_actions" if "github" in rel_lower else "pipeline"}

        # 3. Check for Container Artifacts
        if fname_lower.startswith("dockerfile") or fname_lower.endswith(".dockerfile") or fname_lower == "containerfile":
            return AssetType.CONTAINER_DOCKERFILE, "docker", {"format": "dockerfile"}
        if fname_lower.startswith("docker-compose") and fname_lower.endswith((".yml", ".yaml")):
            return AssetType.CONTAINER_COMPOSE, "docker-compose", {"format": "compose"}

        # 4. Check for Package Manifests
        if fname_lower in MANIFEST_ECOSYSTEM_MAP:
            ecosystem = MANIFEST_ECOSYSTEM_MAP[fname_lower]
            return AssetType.PACKAGE_MANIFEST, ecosystem, {"ecosystem": ecosystem}

        # 5. Check for IaC Templates
        if ext in {".tf", ".tfvars"}:
            return AssetType.IAC_TEMPLATE, "terraform", {"iac_type": "terraform"}
        if fname_lower in {"chart.yaml", "values.yaml"}:
            return AssetType.IAC_TEMPLATE, "helm", {"iac_type": "helm"}
        if ("k8s" in rel_lower or "kubernetes" in rel_lower) and ext in {".yaml", ".yml"}:
            return AssetType.IAC_TEMPLATE, "kubernetes", {"iac_type": "kubernetes"}
        if fname_lower in {"serverless.yml", "template.yaml"} and "cloudformation" in rel_lower:
            return AssetType.IAC_TEMPLATE, "cloudformation", {"iac_type": "cloudformation"}

        # 6. Check for Source Code
        if ext in LANGUAGE_EXTENSIONS:
            lang = LANGUAGE_EXTENSIONS[ext]
            return AssetType.SOURCE_CODE, lang, {"extension": ext}

        # 7. Documentation & Configs
        if ext in {".md", ".rst", ".txt", ".adoc"}:
            return AssetType.DOCUMENTATION, "docs", {}
        if ext in {".json", ".yaml", ".yml", ".toml", ".ini", ".xml"}:
            return AssetType.CONFIG_FILE, "config", {}

        return AssetType.DOCUMENTATION, "unknown", {}

    async def _inspect_git_metadata(
        self,
        target_dir: str,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Probes git repository metadata (branch and HEAD commit)."""
        git_dir = os.path.join(target_dir, ".git")
        if not os.path.exists(git_dir):
            return False, None, None

        branch: Optional[str] = None
        commit: Optional[str] = None

        try:
            # Check git head reference
            head_file = os.path.join(git_dir, "HEAD")
            if os.path.isfile(head_file):
                with open(head_file, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read().strip()
                if content.startswith("ref: refs/heads/"):
                    branch = content.replace("ref: refs/heads/", "").strip()
                    ref_path = os.path.join(git_dir, "refs", "heads", branch)
                    if os.path.isfile(ref_path):
                        with open(ref_path, "r", encoding="utf-8", errors="replace") as rf:
                            commit = rf.read().strip()
                elif len(content) == 40:
                    commit = content
        except Exception:
            pass

        return True, branch, commit
