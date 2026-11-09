"""
Kavach Codebase Intelligence — Step 1.3: Multi-Language AST Parser
Extracts classes, functions, parameters, imports, calls, and API routes.
Combines Python's native `ast` engine with structural AST parsers for TypeScript, JavaScript, Go, and Java.
"""

import ast
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

from app.intelligence.codebase.ingestion import IngestedFile
from app.intelligence.codebase.language_detector import LanguageDetector


@dataclass
class ASTImport:
    module: str
    imported_name: str
    alias: Optional[str] = None
    line_number: int = 1
    is_wildcard: bool = False


@dataclass
class ASTCall:
    callee_name: str
    line_number: int
    arguments: List[str] = field(default_factory=list)
    is_tainted_sink: bool = False  # e.g., cursor.execute, eval, os.system


@dataclass
class ASTFunction:
    name: str
    file_path: str
    line_start: int
    line_end: int
    parameters: List[str] = field(default_factory=list)
    decorators: List[str] = field(default_factory=list)
    docstring: Optional[str] = None
    calls: List[ASTCall] = field(default_factory=list)
    is_async: bool = False
    is_method: bool = False
    parent_class: Optional[str] = None
    is_endpoint: bool = False
    endpoint_method: Optional[str] = None
    endpoint_path: Optional[str] = None


@dataclass
class ASTClass:
    name: str
    file_path: str
    line_start: int
    line_end: int
    base_classes: List[str] = field(default_factory=list)
    methods: List[ASTFunction] = field(default_factory=list)
    docstring: Optional[str] = None


@dataclass
class CodeFileAST:
    file_path: str
    language: str
    imports: List[ASTImport] = field(default_factory=list)
    classes: List[ASTClass] = field(default_factory=list)
    functions: List[ASTFunction] = field(default_factory=list)
    top_level_calls: List[ASTCall] = field(default_factory=list)
    endpoints: List[ASTFunction] = field(default_factory=list)


SQL_SINKS = {"execute", "cursor.execute", "raw", "query", "exec", "executemany", "select"}
COMMAND_SINKS = {"system", "os.system", "popen", "subprocess.run", "subprocess.Popen", "exec", "eval"}


class MultiLanguageASTParser:
    """
    Step 1.3: Authoritative AST Parser for Codebases.
    """

    @classmethod
    def parse_file(cls, file: IngestedFile) -> CodeFileAST:
        lang = LanguageDetector.detect_file_language(file)

        if lang == "Python":
            return cls._parse_python(file)
        elif lang in ("TypeScript", "JavaScript"):
            return cls._parse_javascript_typescript(file, lang)
        else:
            return cls._parse_generic(file, lang)

    # ─────────────────────────────────────────────────────────────────────────
    # Python Native AST Parsing
    # ─────────────────────────────────────────────────────────────────────────
    @classmethod
    def _parse_python(cls, file: IngestedFile) -> CodeFileAST:
        res = CodeFileAST(file_path=file.relative_path, language="Python")

        try:
            tree = ast.parse(file.content, filename=file.relative_path)
        except SyntaxError:
            # Fallback to generic regex extraction on syntax error
            return cls._parse_generic(file, "Python")

        for node in ast.iter_child_nodes(tree):
            # 1. Imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    res.imports.append(ASTImport(
                        module=alias.name,
                        imported_name=alias.name,
                        alias=alias.asname,
                        line_number=node.lineno,
                    ))
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                for alias in node.names:
                    res.imports.append(ASTImport(
                        module=mod,
                        imported_name=alias.name,
                        alias=alias.asname,
                        line_number=node.lineno,
                        is_wildcard=(alias.name == "*"),
                    ))

            # 2. Classes
            elif isinstance(node, ast.ClassDef):
                cls_obj = cls._extract_python_class(node, file.relative_path)
                res.classes.append(cls_obj)
                for m in cls_obj.methods:
                    if m.is_endpoint:
                        res.endpoints.append(m)

            # 3. Functions
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fn_obj = cls._extract_python_function(node, file.relative_path)
                res.functions.append(fn_obj)
                if fn_obj.is_endpoint:
                    res.endpoints.append(fn_obj)

            # 4. Top-level calls
            elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
                call = cls._extract_python_call(node.value)
                if call:
                    res.top_level_calls.append(call)

        return res

    @classmethod
    def _extract_python_class(cls, node: ast.ClassDef, file_path: str) -> ASTClass:
        bases = []
        for b in node.bases:
            if isinstance(b, ast.Name):
                bases.append(b.id)
            elif isinstance(b, ast.Attribute):
                bases.append(cls._get_attribute_name(b))

        methods: List[ASTFunction] = []
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                m = cls._extract_python_function(item, file_path, is_method=True, parent_class=node.name)
                methods.append(m)

        doc = ast.get_docstring(node)
        return ASTClass(
            name=node.name,
            file_path=file_path,
            line_start=node.lineno,
            line_end=getattr(node, "end_lineno", node.lineno),
            base_classes=bases,
            methods=methods,
            docstring=doc,
        )

    @classmethod
    def _extract_python_function(
        cls,
        node: Any,
        file_path: str,
        is_method: bool = False,
        parent_class: Optional[str] = None
    ) -> ASTFunction:
        params = [arg.arg for arg in node.args.args]
        decorators = []
        is_endpoint = False
        ep_method = None
        ep_path = None

        for d in node.decorator_list:
            dec_str = ""
            if isinstance(d, ast.Name):
                dec_str = d.id
            elif isinstance(d, ast.Attribute):
                dec_str = cls._get_attribute_name(d)
            elif isinstance(d, ast.Call):
                if isinstance(d.func, ast.Attribute):
                    dec_str = cls._get_attribute_name(d.func)
                    # Check FastAPI / Flask router decorator: e.g. @router.get("/users") or @app.post(...)
                    attr_low = dec_str.lower()
                    for verb in ("get", "post", "put", "delete", "patch", "route"):
                        if attr_low.endswith(f".{verb}") or attr_low == verb:
                            is_endpoint = True
                            ep_method = verb.upper()
                            if d.args and isinstance(d.args[0], ast.Constant):
                                ep_path = str(d.args[0].value)
                elif isinstance(d.func, ast.Name):
                    dec_str = d.func.id
            if dec_str:
                decorators.append(dec_str)

        calls: List[ASTCall] = []
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                c = cls._extract_python_call(child)
                if c:
                    calls.append(c)

        return ASTFunction(
            name=node.name,
            file_path=file_path,
            line_start=node.lineno,
            line_end=getattr(node, "end_lineno", node.lineno),
            parameters=params,
            decorators=decorators,
            docstring=ast.get_docstring(node),
            calls=calls,
            is_async=isinstance(node, ast.AsyncFunctionDef),
            is_method=is_method,
            parent_class=parent_class,
            is_endpoint=is_endpoint,
            endpoint_method=ep_method,
            endpoint_path=ep_path,
        )

    @classmethod
    def _extract_python_call(cls, node: ast.Call) -> Optional[ASTCall]:
        name = ""
        if isinstance(node.func, ast.Name):
            name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            name = cls._get_attribute_name(node.func)

        if not name:
            return None

        # Determine if it's a known sink
        is_sink = any(name.endswith(f".{s}") or name == s for s in (SQL_SINKS | COMMAND_SINKS))

        args_repr = []
        for a in node.args:
            if isinstance(a, ast.Name):
                args_repr.append(a.id)
            elif isinstance(a, ast.Constant):
                args_repr.append(repr(a.value))
            elif isinstance(a, ast.JoinedStr):
                args_repr.append("f-string")

        return ASTCall(
            callee_name=name,
            line_number=node.lineno,
            arguments=args_repr,
            is_tainted_sink=is_sink,
        )

    @classmethod
    def _get_attribute_name(cls, node: ast.Attribute) -> str:
        parts = [node.attr]
        curr = node.value
        while isinstance(curr, ast.Attribute):
            parts.append(curr.attr)
            curr = curr.value
        if isinstance(curr, ast.Name):
            parts.append(curr.id)
        return ".".join(reversed(parts))

    # ─────────────────────────────────────────────────────────────────────────
    # TypeScript / JavaScript Structural Parsing
    # ─────────────────────────────────────────────────────────────────────────
    @classmethod
    def _parse_javascript_typescript(cls, file: IngestedFile, language: str) -> CodeFileAST:
        res = CodeFileAST(file_path=file.relative_path, language=language)
        content = file.content
        lines = content.splitlines()

        # 1. Imports: import { foo, bar } from 'module'; OR const x = require('module');
        import_re = re.compile(r"""(?:import\s+(?:(?:\{([^}]+)\})|([*\w]+))\s+from\s+['"]([^'"]+)['"])|(?:const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\))""")
        for i, line in enumerate(lines, 1):
            m = import_re.search(line)
            if m:
                named, default_imp, mod1, req_var, mod2 = m.groups()
                mod = mod1 or mod2 or ""
                names = named.split(",") if named else [default_imp or req_var or "*"]
                for n in names:
                    clean_n = n.strip().split(" as ")[0].strip()
                    if clean_n:
                        res.imports.append(ASTImport(
                            module=mod,
                            imported_name=clean_n,
                            line_number=i,
                        ))

        # 2. Routes & Endpoints: router.get('/path', (req, res) => ...), app.post(...)
        route_re = re.compile(r"""(?:\b(?:router|app)\.(get|post|put|delete|patch))\s*\(\s*['"]([^'"]+)['"]""")
        for i, line in enumerate(lines, 1):
            m = route_re.search(line)
            if m:
                verb, path = m.groups()
                fn = ASTFunction(
                    name=f"{verb.upper()} {path}",
                    file_path=file.relative_path,
                    line_start=i,
                    line_end=min(i + 30, len(lines)),
                    parameters=["req", "res"],
                    is_endpoint=True,
                    endpoint_method=verb.upper(),
                    endpoint_path=path,
                )
                res.functions.append(fn)
                res.endpoints.append(fn)

        # 3. Class definitions: class UserService extends BaseService {
        class_re = re.compile(r"""\bclass\s+(\w+)(?:\s+extends\s+(\w+))?""")
        for i, line in enumerate(lines, 1):
            m = class_re.search(line)
            if m:
                cname, bname = m.groups()
                res.classes.append(ASTClass(
                    name=cname,
                    file_path=file.relative_path,
                    line_start=i,
                    line_end=min(i + 50, len(lines)),
                    base_classes=[bname] if bname else [],
                ))

        # 4. Standard Function definitions: function authenticateUser(u, p) {
        func_re = re.compile(r"""(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)""")
        for i, line in enumerate(lines, 1):
            m = func_re.search(line)
            if m:
                fname, raw_params = m.groups()
                params = [p.strip().split(":")[0].strip() for p in raw_params.split(",") if p.strip()]
                res.functions.append(ASTFunction(
                    name=fname,
                    file_path=file.relative_path,
                    line_start=i,
                    line_end=min(i + 25, len(lines)),
                    parameters=params,
                ))

        # 5. Calls & Sinks: db.query(sql), pool.execute(sql)
        call_re = re.compile(r"""(?:\b(\w+(?:\.\w+)?))\s*\(([^)]*)\)""")
        for i, line in enumerate(lines, 1):
            for m in call_re.finditer(line):
                callee, raw_args = m.groups()
                is_sink = any(callee.endswith(f".{s}") or callee == s for s in (SQL_SINKS | COMMAND_SINKS))
                if is_sink:
                    res.top_level_calls.append(ASTCall(
                        callee_name=callee,
                        line_number=i,
                        arguments=[a.strip() for a in raw_args.split(",") if a.strip()],
                        is_tainted_sink=True,
                    ))

        return res

    # ─────────────────────────────────────────────────────────────────────────
    # Generic Pattern Extractor for Go, Java, Rust
    # ─────────────────────────────────────────────────────────────────────────
    @classmethod
    def _parse_generic(cls, file: IngestedFile, language: str) -> CodeFileAST:
        res = CodeFileAST(file_path=file.relative_path, language=language)
        lines = file.content.splitlines()

        func_re = re.compile(r"""(?:func|def|public\s+void|public\s+\w+)\s+(\w+)\s*\(([^)]*)\)""")
        for i, line in enumerate(lines, 1):
            m = func_re.search(line)
            if m:
                fname, raw_params = m.groups()
                res.functions.append(ASTFunction(
                    name=fname,
                    file_path=file.relative_path,
                    line_start=i,
                    line_end=min(i + 25, len(lines)),
                    parameters=[p.strip() for p in raw_params.split(",") if p.strip()],
                ))
        return res

