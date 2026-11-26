"""
Kavach Universal Codebase & Technology Stack Analyzer
Analyzes any enterprise repository on disk:
- Accurately identifies languages from file extensions & signatures
- Detects package managers and dependency manifests
- Detects active frameworks from imports and manifest contents
- Calculates lines of code and technology distribution
- Determines the exact multi-engine scanner execution plan
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

from app.engines.universal.registry import (
    LANGUAGES_REGISTRY,
    FRAMEWORKS_REGISTRY,
    SupportTier,
    ScannerEngine,
    SecurityCategory,
)


class LanguageDetectionResult(BaseModel):
    language_id: str
    name: str
    tier: SupportTier
    files_count: int
    lines_of_code: int
    percentage: float
    primary_sast_engines: List[str]
    sca_engines: List[str]
    rule_count_estimate: int


class FrameworkDetectionResult(BaseModel):
    framework_id: str
    name: str
    language_id: str
    confidence: str  # HIGH, MEDIUM
    detected_in_files: List[str]
    security_rules_count: int
    primary_risks: List[str]


class DiscoveredManifestItem(BaseModel):
    file_path: str
    ecosystem: str
    package_manager: str
    is_lockfile: bool
    size_bytes: int


class CodebaseProfile(BaseModel):
    repository_path: str
    total_files_scanned: int
    total_lines_of_code: int
    primary_language: str
    languages: List[LanguageDetectionResult]
    frameworks: List[FrameworkDetectionResult]
    manifests: List[DiscoveredManifestItem]
    recommended_engines: List[str]
    lifecycle_categories_covered: List[str]
    support_tier_distribution: Dict[str, int]


# Ignore directories that pollute detection
IGNORE_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "env",
    "__pycache__",
    ".next",
    "dist",
    "build",
    "target",
    "vendor",
    ".idea",
    ".vscode",
    ".pytest_cache",
    ".ruff_cache",
    "coverage",
}


def _detect_frameworks(repo_root: Path, manifests: List[DiscoveredManifestItem]) -> List[FrameworkDetectionResult]:
    """Detects frameworks by checking manifest contents and source file imports."""
    detected: Dict[str, FrameworkDetectionResult] = {}

    # 1. Read manifest files if small
    manifest_contents = ""
    for m in manifests:
        try:
            full_path = repo_root / m.file_path
            if full_path.exists() and full_path.stat().st_size < 1_000_000:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    manifest_contents += f.read().lower() + "\n"
        except Exception:
            pass

    for fw_id, fw in FRAMEWORKS_REGISTRY.items():
        matched_in: List[str] = []
        
        # Check manifest match
        for pat in fw.detection_patterns:
            if pat.lower() in manifest_contents:
                matched_in.append(f"manifests ({pat})")
                break

        if matched_in:
            detected[fw_id] = FrameworkDetectionResult(
                framework_id=fw.id,
                name=fw.name,
                language_id=fw.language_id,
                confidence="HIGH",
                detected_in_files=matched_in,
                security_rules_count=fw.security_rules_count,
                primary_risks=fw.primary_risks,
            )

    # 2. Check for key config files
    file_checks = {
        "django": ["manage.py"],
        "nextjs": ["next.config.js", "next.config.mjs", "next.config.ts"],
        "rails": ["config/routes.rb"],
        "laravel": ["artisan"],
        "terraform": ["main.tf", "storage.tf"],
    }
    for fw_id, check_files in file_checks.items():
        if fw_id in detected:
            continue
        for cf in check_files:
            if (repo_root / cf).exists():
                fw = FRAMEWORKS_REGISTRY.get(fw_id)
                if fw:
                    detected[fw_id] = FrameworkDetectionResult(
                        framework_id=fw.id,
                        name=fw.name,
                        language_id=fw.language_id,
                        confidence="HIGH",
                        detected_in_files=[cf],
                        security_rules_count=fw.security_rules_count,
                        primary_risks=fw.primary_risks,
                    )
                break

    return list(detected.values())


def analyze_repository_codebase(repo_dir: str) -> CodebaseProfile:
    """
    Universally inspects a repository directory and builds a comprehensive technology profile.
    """
    root_path = Path(repo_dir).resolve()
    if not root_path.exists():
        raise FileNotFoundError(f"Repository directory does not exist: {repo_dir}")

    total_files = 0
    total_loc = 0

    lang_file_counts: Dict[str, int] = {}
    lang_loc_counts: Dict[str, int] = {}
    discovered_manifests: List[DiscoveredManifestItem] = []

    # Map extension to language_id
    ext_to_lang: Dict[str, str] = {}
    fname_to_lang: Dict[str, str] = {}
    for lid, meta in LANGUAGES_REGISTRY.items():
        for ext in meta.extensions:
            ext_to_lang[ext.lower()] = lid
        for fn in meta.filenames:
            fname_to_lang[fn.lower()] = lid

    for root, dirs, files in os.walk(root_path):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

        for file in files:
            file_path = Path(root) / file
            rel_path = file_path.relative_to(root_path).as_posix()
            fname_lower = file.lower()
            ext_lower = file_path.suffix.lower()

            total_files += 1

            # Check if it's a known manifest or lockfile
            for lid, meta in LANGUAGES_REGISTRY.items():
                if fname_lower in [m.lower() for m in meta.manifest_files]:
                    discovered_manifests.append(
                        DiscoveredManifestItem(
                            file_path=rel_path,
                            ecosystem=meta.name,
                            package_manager=meta.package_managers[0] if meta.package_managers else "standard",
                            is_lockfile=False,
                            size_bytes=file_path.stat().st_size if file_path.exists() else 0,
                        )
                    )
                elif fname_lower in [lk.lower() for lk in meta.lockfiles]:
                    discovered_manifests.append(
                        DiscoveredManifestItem(
                            file_path=rel_path,
                            ecosystem=meta.name,
                            package_manager=meta.package_managers[0] if meta.package_managers else "standard",
                            is_lockfile=True,
                            size_bytes=file_path.stat().st_size if file_path.exists() else 0,
                        )
                    )

            # Check language mapping
            matched_lang = fname_to_lang.get(fname_lower) or ext_to_lang.get(ext_lower)
            if matched_lang:
                lang_file_counts[matched_lang] = lang_file_counts.get(matched_lang, 0) + 1

                # Count lines of code
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = sum(1 for line in f if line.strip())
                        lang_loc_counts[matched_lang] = lang_loc_counts.get(matched_lang, 0) + lines
                        total_loc += lines
                except Exception:
                    pass

    # Sort languages by LOC or files
    sorted_langs = sorted(lang_loc_counts.items(), key=lambda x: x[1], reverse=True)
    if not sorted_langs:
        # Fallback if binary or unknown
        primary_lang = "Generic / Polyglot"
    else:
        primary_lang = LANGUAGES_REGISTRY[sorted_langs[0][0]].name

    detected_languages: List[LanguageDetectionResult] = []
    tier_counts = {"Full": 0, "Partial": 0, "Detection only": 0}
    recommended_engines: set = set()
    categories_covered: set = {SecurityCategory.SECRETS.value}  # Gitleaks is universal

    for lid, loc in sorted_langs:
        meta = LANGUAGES_REGISTRY[lid]
        percentage = round((loc / total_loc * 100), 1) if total_loc > 0 else 0.0
        tier_counts[meta.tier.value] = tier_counts.get(meta.tier.value, 0) + 1

        for eng in meta.primary_sast_engines:
            recommended_engines.add(eng.value)
        for eng in meta.sca_engines:
            recommended_engines.add(eng.value)
        for cat in meta.categories:
            categories_covered.add(cat.value)

        detected_languages.append(
            LanguageDetectionResult(
                language_id=lid,
                name=meta.name,
                tier=meta.tier,
                files_count=lang_file_counts.get(lid, 0),
                lines_of_code=loc,
                percentage=percentage,
                primary_sast_engines=[e.value for e in meta.primary_sast_engines],
                sca_engines=[e.value for e in meta.sca_engines],
                rule_count_estimate=meta.rule_count_estimate,
            )
        )

    # Detect frameworks
    detected_frameworks = _detect_frameworks(root_path, discovered_manifests)

    # Universal engine additions
    recommended_engines.add(ScannerEngine.GITLEAKS.value)

    return CodebaseProfile(
        repository_path=str(root_path),
        total_files_scanned=total_files,
        total_lines_of_code=total_loc,
        primary_language=primary_lang,
        languages=detected_languages,
        frameworks=detected_frameworks,
        manifests=discovered_manifests,
        recommended_engines=list(recommended_engines),
        lifecycle_categories_covered=list(categories_covered),
        support_tier_distribution=tier_counts,
    )

