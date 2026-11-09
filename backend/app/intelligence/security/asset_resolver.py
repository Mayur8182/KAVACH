"""
Kavach Security Intelligence Engine — Asset & Code Entity Resolver.
Maps security findings to exact repository commits, Phase 1 AST symbols,
API route handlers, and dependency lockfiles.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple, Any

from app.intelligence.codebase.ast_parser import CodeFileAST
from app.intelligence.codebase.symbol_index import SymbolIndex, CodeSymbol
from app.intelligence.security.schemas import (
    CanonicalFinding,
    FindingEvidence,
    SecurityAsset,
    AssetExposure,
)

logger = logging.getLogger("kavach.security_intelligence.asset_resolver")


class AssetResolver:
    """
    Resolves findings to:
    1. Repository files and immutable commit snapshots.
    2. Phase 1 AST functions, classes, and methods.
    3. HTTP framework API endpoints and routes.
    4. Dependency packages and lockfiles.
    """

    @classmethod
    def resolve_to_ast_symbol(
        cls,
        finding: CanonicalFinding,
        symbol_index: Optional[SymbolIndex] = None,
        file_asts: Optional[Dict[str, CodeFileAST]] = None,
    ) -> CanonicalFinding:
        """
        Resolves the finding's file_path and line_number to a Phase 1 AST symbol.
        """
        if not finding.evidence.file_path:
            return finding

        norm_path = finding.evidence.file_path.replace("\\", "/").lstrip("./")
        target_line = finding.evidence.start_line

        # 1. Search in file ASTs if provided
        if file_asts:
            ast = file_asts.get(norm_path)
            if not ast:
                # Try matching by suffix
                for p, a in file_asts.items():
                    if p.endswith(norm_path) or norm_path.endswith(p):
                        ast = a
                        break

            if ast:
                # Find enclosing function
                for fn in ast.functions:
                    fn_start = getattr(fn, "line_start", getattr(fn, "start_line", 0))
                    fn_end = getattr(fn, "line_end", getattr(fn, "end_line", 0))
                    if fn_start <= target_line <= fn_end:
                        finding.evidence.symbol_name = fn.name
                        finding.evidence.symbol_kind = "function"
                        finding.evidence.symbol_key = f"{norm_path}:{fn.name}:{fn_start}"
                        if fn.is_endpoint:
                            finding.evidence.route_endpoint = getattr(fn, "endpoint_path", getattr(fn, "route_path", None)) or f"/{fn.name}"
                            finding.evidence.http_method = getattr(fn, "endpoint_method", getattr(fn, "http_method", None)) or "ALL"
                        return finding

                # Find enclosing class
                for cls_def in ast.classes:
                    cls_start = getattr(cls_def, "line_start", getattr(cls_def, "start_line", 0))
                    cls_end = getattr(cls_def, "line_end", getattr(cls_def, "end_line", 0))
                    if cls_start <= target_line <= cls_end:
                        for m in cls_def.methods:
                            m_start = getattr(m, "line_start", getattr(m, "start_line", 0))
                            m_end = getattr(m, "line_end", getattr(m, "end_line", 0))
                            if m_start <= target_line <= m_end:
                                finding.evidence.symbol_name = f"{cls_def.name}.{m.name}"
                                finding.evidence.symbol_kind = "method"
                                finding.evidence.symbol_key = f"{norm_path}:{cls_def.name}.{m.name}:{m_start}"
                                if m.is_endpoint:
                                    finding.evidence.route_endpoint = getattr(m, "endpoint_path", getattr(m, "route_path", None)) or f"/{m.name}"
                                    finding.evidence.http_method = getattr(m, "endpoint_method", getattr(m, "http_method", None)) or "ALL"
                                return finding

                        finding.evidence.symbol_name = cls_def.name
                        finding.evidence.symbol_kind = "class"
                        finding.evidence.symbol_key = f"{norm_path}:{cls_def.name}:{cls_start}"
                        return finding

        # 2. Search in SymbolIndex if available
        if symbol_index:
            candidates = symbol_index.get_symbols_in_file(norm_path)
            for sym in candidates:
                s_start = getattr(sym, "line_start", getattr(sym, "start_line", 0))
                s_end = getattr(sym, "line_end", getattr(sym, "end_line", 0))
                if s_start <= target_line <= s_end:
                    finding.evidence.symbol_name = sym.name
                    kind = getattr(sym, "symbol_type", getattr(sym, "kind", "symbol"))
                    finding.evidence.symbol_kind = kind.value if hasattr(kind, "value") else str(kind)
                    finding.evidence.symbol_key = getattr(sym, "id", f"{norm_path}:{sym.name}:{s_start}")
                    if getattr(sym, "endpoint_path", None):
                        finding.evidence.route_endpoint = sym.endpoint_path
                        finding.evidence.http_method = sym.endpoint_method or "GET"
                    return finding

        return finding

    @classmethod
    def resolve_assets_for_finding(
        cls,
        finding: CanonicalFinding,
    ) -> List[SecurityAsset]:
        """
        Creates SecurityAsset nodes for the entities touched by the finding.
        """
        assets: List[SecurityAsset] = []
        org_id = finding.organization_id or finding.project_id
        proj_id = finding.project_id or org_id
        if not org_id or not proj_id:
            import uuid
            dummy = uuid.uuid4()
            org_id = org_id or dummy
            proj_id = proj_id or dummy

        # Repository Asset
        if finding.repository:
            assets.append(SecurityAsset(
                organization_id=org_id,
                project_id=proj_id,
                asset_type="REPOSITORY",
                name=finding.repository,
                identifier=f"repo:{finding.repository}",
                exposure=AssetExposure.INTERNAL,
                is_production=True,
            ))

        # File Asset
        if finding.evidence.file_path:
            assets.append(SecurityAsset(
                organization_id=org_id,
                project_id=proj_id,
                asset_type="FILE",
                name=finding.evidence.file_path,
                identifier=f"file:{finding.repository or 'repo'}:{finding.evidence.file_path}",
                exposure=AssetExposure.INTERNAL,
            ))

        # API Route Asset (if route handler)
        if finding.evidence.route_endpoint:
            assets.append(SecurityAsset(
                organization_id=org_id,
                project_id=proj_id,
                asset_type="ROUTE",
                name=f"{finding.evidence.http_method or 'ANY'} {finding.evidence.route_endpoint}",
                identifier=f"route:{finding.evidence.route_endpoint}",
                exposure=AssetExposure.PUBLIC,
            ))

        # Package Asset (if SCA)
        if finding.package_name:
            assets.append(SecurityAsset(
                organization_id=org_id,
                project_id=proj_id,
                asset_type="PACKAGE",
                name=f"{finding.package_name}@{finding.installed_version or 'unknown'}",
                identifier=f"pkg:{finding.package_name}@{finding.installed_version or '0.0.0'}",
                exposure=AssetExposure.INTERNAL,
            ))

        return assets
