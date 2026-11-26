"""
Kavach Universal Security Coverage & Capability API
Exposes the complete multi-language capability matrix, framework registry, and live codebase technology detector.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from app.engines.universal.registry import (
    LANGUAGES_REGISTRY,
    FRAMEWORKS_REGISTRY,
    SupportTier,
    SecurityCategory,
    ScannerEngine,
)
from app.engines.universal.detector import analyze_repository_codebase, CodebaseProfile

router = APIRouter(prefix="/coverage", tags=["Universal Security Coverage"])


class DetectRequest(BaseModel):
    repository_path: Optional[str] = Field(
        None,
        description="Path on disk to analyze. Defaults to active scratch repository workspace if omitted.",
    )
    repository_name: Optional[str] = Field(
        "JOB-FINDER-NEW",
        description="Optional repository slug or name.",
    )


@router.get("/stats")
async def get_coverage_statistics() -> Dict[str, Any]:
    """
    Returns enterprise-grade platform coverage statistics across all dimensions.
    """
    total_languages = len(LANGUAGES_REGISTRY)
    tier_counts = {
        "Full": sum(1 for l in LANGUAGES_REGISTRY.values() if l.tier == SupportTier.FULL),
        "Partial": sum(1 for l in LANGUAGES_REGISTRY.values() if l.tier == SupportTier.PARTIAL),
        "Detection only": sum(1 for l in LANGUAGES_REGISTRY.values() if l.tier == SupportTier.DETECTION_ONLY),
    }
    total_frameworks = len(FRAMEWORKS_REGISTRY)
    total_rules = sum(l.rule_count_estimate for l in LANGUAGES_REGISTRY.values()) + sum(
        f.security_rules_count for f in FRAMEWORKS_REGISTRY.values()
    )

    all_package_managers = set()
    for l in LANGUAGES_REGISTRY.values():
        all_package_managers.update(l.package_managers)

    all_engines = [e.value for e in ScannerEngine]
    all_categories = [c.value for c in SecurityCategory]

    return {
        "total_languages_supported": total_languages,
        "languages_by_tier": tier_counts,
        "total_frameworks_supported": total_frameworks,
        "total_security_rules_count": total_rules,
        "package_managers_supported": sorted(list(all_package_managers)),
        "package_managers_count": len(all_package_managers),
        "orchestrated_engines": all_engines,
        "engines_count": len(all_engines),
        "lifecycle_categories": all_categories,
        "categories_count": len(all_categories),
        "platform_grade": "Enterprise / Universal Multi-Engine (Scale: 10M+ LOC Monorepos)",
    }


@router.get("/matrix")
async def get_coverage_matrix(
    tier: Optional[str] = Query(None, description="Filter by tier: Full, Partial, Detection only"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search language or framework name"),
) -> Dict[str, Any]:
    """
    Returns the authoritative capability matrix for every programming language and framework.
    """
    results: List[Dict[str, Any]] = []

    for lid, meta in LANGUAGES_REGISTRY.items():
        if tier and meta.tier.value.lower() != tier.lower():
            continue

        if category and not any(category.lower() in c.value.lower() for c in meta.categories):
            continue

        if search:
            q = search.lower()
            matched = (
                q in meta.name.lower()
                or q in meta.id.lower()
                or any(q in ext.lower() for ext in meta.extensions)
                or any(q in fw.lower() for fw in meta.supported_frameworks)
            )
            if not matched:
                continue

        results.append(
            {
                "id": meta.id,
                "name": meta.name,
                "tier": meta.tier.value,
                "extensions": meta.extensions,
                "filenames": meta.filenames,
                "package_managers": meta.package_managers,
                "manifest_files": meta.manifest_files,
                "lockfiles": meta.lockfiles,
                "primary_sast_engines": [e.value for e in meta.primary_sast_engines],
                "sca_engines": [e.value for e in meta.sca_engines],
                "supported_frameworks": meta.supported_frameworks,
                "categories": [c.value for c in meta.categories],
                "rule_count_estimate": meta.rule_count_estimate,
                "description": meta.description,
            }
        )

    return {
        "count": len(results),
        "languages": results,
        "frameworks_count": len(FRAMEWORKS_REGISTRY),
    }


@router.get("/languages/{language_id}")
async def get_language_details(language_id: str) -> Dict[str, Any]:
    """
    Returns in-depth security capabilities and framework details for a single language.
    """
    lid = language_id.lower().strip()
    meta = LANGUAGES_REGISTRY.get(lid)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Language '{language_id}' not found in registry.")

    # Find associated frameworks
    frameworks = [
        {
            "id": f.id,
            "name": f.name,
            "security_rules_count": f.security_rules_count,
            "primary_risks": f.primary_risks,
            "description": f.description,
        }
        for f in FRAMEWORKS_REGISTRY.values()
        if f.language_id == lid
    ]

    return {
        "id": meta.id,
        "name": meta.name,
        "tier": meta.tier.value,
        "extensions": meta.extensions,
        "package_managers": meta.package_managers,
        "manifest_files": meta.manifest_files,
        "lockfiles": meta.lockfiles,
        "primary_sast_engines": [e.value for e in meta.primary_sast_engines],
        "sca_engines": [e.value for e in meta.sca_engines],
        "categories": [c.value for c in meta.categories],
        "rule_count_estimate": meta.rule_count_estimate,
        "description": meta.description,
        "frameworks": frameworks,
    }


@router.post("/detect")
async def detect_repository_technologies(
    req: DetectRequest = Body(default_factory=DetectRequest),
) -> CodebaseProfile:
    """
    Scans a real codebase on disk and identifies its languages, frameworks, manifests, and scanner plan.
    """
    target_dir: Optional[str] = req.repository_path

    if not target_dir:
        # Fallback 1: check standard scratch repository workspace
        scratch_repo = Path("scratch/github_workspaces") / (req.repository_name or "JOB-FINDER-NEW")
        if not scratch_repo.exists():
            scratch_repo = Path("backend/scratch/github_workspaces") / (req.repository_name or "JOB-FINDER-NEW")

        if scratch_repo.exists():
            target_dir = str(scratch_repo.resolve())
        else:
            # Fallback 2: current workspace root
            target_dir = str(Path(".").resolve())

    try:
        profile = analyze_repository_codebase(target_dir)
        return profile
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Codebase analysis failed: {str(e)}")

