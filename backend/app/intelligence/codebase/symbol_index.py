"""
Kavach Codebase Intelligence — Step 1.4: Symbol Index Engine
Indexes definitions, references, callers, and callees across an entire repository.
Enables cross-file symbol resolution and lookup.
"""

from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

from app.intelligence.codebase.ast_parser import CodeFileAST, ASTFunction, ASTClass, ASTCall, ASTImport


class SymbolType(str, Enum):
    CLASS = "CLASS"
    FUNCTION = "FUNCTION"
    METHOD = "METHOD"
    ENDPOINT = "ENDPOINT"
    IMPORT = "IMPORT"
    CALL = "CALL"


@dataclass
class CodeSymbol:
    id: str  # e.g. "services.auth:authenticate_user"
    name: str
    symbol_type: SymbolType
    file_path: str
    line_start: int
    line_end: int
    parameters: List[str] = field(default_factory=list)
    docstring: Optional[str] = None
    parent_class: Optional[str] = None
    endpoint_method: Optional[str] = None
    endpoint_path: Optional[str] = None
    calls_made: List[str] = field(default_factory=list)
    called_by: List[str] = field(default_factory=list)


class SymbolIndex:
    """
    Step 1.4: Authoritative Cross-File Symbol Index.
    """

    def __init__(self):
        # symbol_id -> CodeSymbol
        self.symbols: Dict[str, CodeSymbol] = {}
        # symbol_name -> list of symbol_ids (handles non-unique names across files)
        self.by_name: Dict[str, List[str]] = {}
        # file_path -> list of symbol_ids
        self.by_file: Dict[str, List[str]] = {}
        # endpoints: list of symbol_ids representing HTTP endpoints
        self.endpoints: List[str] = []

    def index_ast(self, ast_obj: CodeFileAST) -> None:
        file_path = ast_obj.file_path
        if file_path not in self.by_file:
            self.by_file[file_path] = []

        # 1. Index Classes
        for cls in ast_obj.classes:
            sym_id = f"{file_path}::{cls.name}"
            sym = CodeSymbol(
                id=sym_id,
                name=cls.name,
                symbol_type=SymbolType.CLASS,
                file_path=file_path,
                line_start=cls.line_start,
                line_end=cls.line_end,
                docstring=cls.docstring,
            )
            self._register_symbol(sym)

            # Index Methods within Class
            for m in cls.methods:
                m_id = f"{file_path}::{cls.name}.{m.name}"
                m_sym = CodeSymbol(
                    id=m_id,
                    name=m.name,
                    symbol_type=SymbolType.METHOD,
                    file_path=file_path,
                    line_start=m.line_start,
                    line_end=m.line_end,
                    parameters=m.parameters,
                    parent_class=cls.name,
                    docstring=m.docstring,
                    endpoint_method=m.endpoint_method,
                    endpoint_path=m.endpoint_path,
                    calls_made=[c.callee_name for c in m.calls],
                )
                self._register_symbol(m_sym)
                if m.is_endpoint:
                    self.endpoints.append(m_id)

        # 2. Index Functions
        for fn in ast_obj.functions:
            sym_id = f"{file_path}::{fn.name}"
            stype = SymbolType.ENDPOINT if fn.is_endpoint else SymbolType.FUNCTION
            sym = CodeSymbol(
                id=sym_id,
                name=fn.name,
                symbol_type=stype,
                file_path=file_path,
                line_start=fn.line_start,
                line_end=fn.line_end,
                parameters=fn.parameters,
                docstring=fn.docstring,
                endpoint_method=fn.endpoint_method,
                endpoint_path=fn.endpoint_path,
                calls_made=[c.callee_name for c in fn.calls],
            )
            self._register_symbol(sym)
            if fn.is_endpoint:
                self.endpoints.append(sym_id)

    def resolve_call_graph(self) -> None:
        """
        Post-indexing pass: links caller -> callee cross-references.
        """
        for sym_id, sym in self.symbols.items():
            for callee_raw in sym.calls_made:
                # Find matching symbols by simple name or attribute name
                target_name = callee_raw.split(".")[-1]
                candidates = self.by_name.get(target_name, [])
                for cid in candidates:
                    target_sym = self.symbols.get(cid)
                    if target_sym and sym_id not in target_sym.called_by:
                        target_sym.called_by.append(sym_id)

    def _register_symbol(self, sym: CodeSymbol) -> None:
        self.symbols[sym.id] = sym
        if sym.name not in self.by_name:
            self.by_name[sym.name] = []
        self.by_name[sym.name].append(sym.id)
        self.by_file[sym.file_path].append(sym.id)

    def find_symbol(self, name: str) -> List[CodeSymbol]:
        ids = self.by_name.get(name, [])
        return [self.symbols[i] for i in ids if i in self.symbols]

    def get_endpoints(self) -> List[CodeSymbol]:
        return [self.symbols[eid] for eid in self.endpoints if eid in self.symbols]

    def get_symbols_in_file(self, file_path: str) -> List[CodeSymbol]:
        clean = file_path.replace("\\", "/")
        return [
            s for s in self.symbols.values()
            if s.file_path.replace("\\", "/") == clean or clean.endswith(s.file_path.replace("\\", "/")) or s.file_path.replace("\\", "/").endswith(clean)
        ]

