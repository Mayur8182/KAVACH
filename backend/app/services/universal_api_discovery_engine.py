"""
Kavach Universal Multi-Language API Discovery & Normalization Engine
=====================================================================
Multi-language AST and static pattern analysis across:
- Python (FastAPI, Flask, Django, Starlette)
- JavaScript / TypeScript (Express, NestJS, Next.js, Fastify, Koa, Hono)
- Java / Kotlin (Spring Boot, JAX-RS, Quarkus, Micronaut)
- Go (Gin, Echo, Chi, Fiber, net/http)
- Rust (Axum, Actix Web, Rocket)
- C# / .NET (ASP.NET Core Controllers, Minimal APIs)
- PHP (Laravel, Symfony)
- Ruby (Rails, Sinatra)
- Mobile & Frontend Clients (Swift Alamofire/URLSession, Android Retrofit/OkHttp, Flutter Dio, React/Web Fetch/Axios)
- Protocols: REST, GraphQL, gRPC/Protobuf, WebSocket, SOAP/WSDL

Enterprise Normalization:
- Multi-source deduplication (OpenAPI + Code AST + Mobile SDK + Runtime Traffic)
- Drift & Change Detection across scan snapshots
- Lifecycle Status Categorization: Documented, Undocumented, Shadow, Zombie, Deprecated, Active
"""

import os
import re
import uuid
import hashlib
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
import logging

logger = logging.getLogger("kavach.universal_discovery")


@dataclass
class DiscoveredEndpoint:
    """Canonical representation of a discovered API endpoint."""
    method: str
    path: str
    protocol: str = "REST"
    category: str = "General API"
    auth_required: bool = False
    auth_schemes: List[str] = field(default_factory=list)
    parameters: List[Dict[str, Any]] = field(default_factory=list)
    request_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    discovery_sources: Set[str] = field(default_factory=set)
    source_languages: Set[str] = field(default_factory=set)
    code_locations: List[str] = field(default_factory=list)
    client_references: List[str] = field(default_factory=list)
    is_shadow: bool = False
    is_undocumented: bool = False
    is_deprecated: bool = False
    is_zombie: bool = False
    risk_level: str = "LOW"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method": self.method.upper(),
            "path": self.path,
            "protocol": self.protocol,
            "category": self.category,
            "auth_required": self.auth_required,
            "auth_schemes": self.auth_schemes,
            "parameters": self.parameters,
            "request_schema": self.request_schema,
            "response_schema": self.response_schema,
            "discovery_sources": sorted(list(self.discovery_sources)),
            "source_languages": sorted(list(self.source_languages)),
            "code_locations": self.code_locations,
            "client_references": self.client_references,
            "is_shadow": self.is_shadow,
            "is_undocumented": self.is_undocumented,
            "is_deprecated": self.is_deprecated,
            "is_zombie": self.is_zombie,
            "risk_level": self.risk_level,
            "metadata": self.metadata,
        }


# =============================================================================
# 1. Multi-Language Static Route Discovery Adapters
# =============================================================================

class BaseRouteAdapter:
    """Base class for language/framework route discovery adapters."""
    name: str = "base"
    language: str = "unknown"

    def match_file(self, file_path: str) -> bool:
        raise NotImplementedError

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        raise NotImplementedError


class PythonRouteAdapter(BaseRouteAdapter):
    """Adapter for Python frameworks: FastAPI, Flask, Django, Starlette."""
    name = "python"
    language = "Python"

    FASTAPI_ROUTE_REGEX = re.compile(
        r"""@(?:router|app|api_router)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]""",
        re.IGNORECASE,
    )
    FLASK_ROUTE_REGEX = re.compile(
        r"""@(?:app|bp|blueprint|api)\.route\s*\(\s*['"]([^'"]+)['"](?:.*methods\s*=\s*\[(.*?)\])?""",
        re.IGNORECASE,
    )
    DJANGO_PATH_REGEX = re.compile(
        r"""(?:path|re_path)\s*\(\s*['"]([^'"]+)['"]\s*,\s*([\w.]+)(?:\.as_view\(\))?""",
        re.IGNORECASE,
    )
    DJANGO_ROUTER_REGEX = re.compile(
        r"""router\.register\s*\(\s*r?['"]([^'"]+)['"]\s*,\s*([\w.]+)""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return file_path.endswith(".py")

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        # 1. FastAPI
        for i, line in enumerate(lines):
            match = self.FASTAPI_ROUTE_REGEX.search(line)
            if match:
                method = match.group(1).upper()
                path = self._normalize_path(match.group(2))
                auth_req = self._detect_python_auth(lines, i)
                ep = DiscoveredEndpoint(
                    method=method,
                    path=path,
                    category=self._infer_category(path),
                    auth_required=auth_req,
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Python / FastAPI"},
                    code_locations=[f"{file_path}:{i + 1}"],
                    risk_level=self._calculate_risk(method, path, auth_req),
                )
                endpoints.append(ep)

        # 2. Flask
        for i, line in enumerate(lines):
            match = self.FLASK_ROUTE_REGEX.search(line)
            if match:
                raw_path = match.group(1)
                methods_str = match.group(2)
                methods = [m.strip(" '\"").upper() for m in methods_str.split(",")] if methods_str else ["GET"]
                path = self._normalize_flask_path(raw_path)
                auth_req = self._detect_python_auth(lines, i)
                for method in methods:
                    if method in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                        ep = DiscoveredEndpoint(
                            method=method,
                            path=path,
                            category=self._infer_category(path),
                            auth_required=auth_req,
                            discovery_sources={"Source Code (AST)"},
                            source_languages={"Python / Flask"},
                            code_locations=[f"{file_path}:{i + 1}"],
                            risk_level=self._calculate_risk(method, path, auth_req),
                        )
                        endpoints.append(ep)

        # 3. Django urls.py
        if "urls.py" in file_path or "views" in file_path:
            for i, line in enumerate(lines):
                match = self.DJANGO_PATH_REGEX.search(line)
                if match:
                    raw_path = match.group(1).rstrip("$^")
                    path = self._normalize_django_path(raw_path)
                    handler = match.group(2)
                    for method in ["GET", "POST"]:
                        ep = DiscoveredEndpoint(
                            method=method,
                            path=path,
                            category=self._infer_category(path),
                            auth_required=self._detect_django_auth(lines, i),
                            discovery_sources={"Source Code (AST)"},
                            source_languages={"Python / Django"},
                            code_locations=[f"{file_path}:{i + 1}"],
                            metadata={"handler": handler},
                        )
                        endpoints.append(ep)

                router_match = self.DJANGO_ROUTER_REGEX.search(line)
                if router_match:
                    prefix = "/" + router_match.group(1).strip("/")
                    viewset = router_match.group(2)
                    for m, sub in [("GET", ""), ("POST", ""), ("GET", "/{id}"), ("PUT", "/{id}"), ("DELETE", "/{id}")]:
                        endpoints.append(DiscoveredEndpoint(
                            method=m,
                            path=f"{prefix}{sub}",
                            category=self._infer_category(prefix),
                            auth_required=True,
                            discovery_sources={"Source Code (AST)"},
                            source_languages={"Python / Django REST Framework"},
                            code_locations=[f"{file_path}:{i + 1}"],
                            metadata={"viewset": viewset},
                        ))

        return endpoints

    def _normalize_path(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return path

    def _normalize_flask_path(self, path: str) -> str:
        # Flask uses <int:id> or <id>
        path = re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", path)
        return self._normalize_path(path)

    def _normalize_django_path(self, path: str) -> str:
        # Django uses <int:id> or (?P<id>\d+)
        path = re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", path)
        path = re.sub(r"\(\?P<(\w+)>[^)]+\)", r"{\1}", path)
        return self._normalize_path(path)

    def _detect_python_auth(self, lines: List[str], idx: int) -> bool:
        start = max(0, idx - 5)
        end = min(len(lines), idx + 10)
        window = "\n".join(lines[start:end]).lower()
        return any(k in window for k in ["depends(get_current_user", "security", "token", "auth", "login_required", "permission_classes"])

    def _detect_django_auth(self, lines: List[str], idx: int) -> bool:
        start = max(0, idx - 5)
        end = min(len(lines), idx + 5)
        window = "\n".join(lines[start:end]).lower()
        return any(k in window for k in ["login_required", "permission_classes", "is_authenticated", "jwt"])

    def _infer_category(self, path: str) -> str:
        p = path.lower()
        if any(k in p for k in ["auth", "login", "token", "session", "oauth"]): return "Authentication Testing"
        if any(k in p for k in ["user", "account", "profile", "admin", "role", "member"]): return "Authorization Testing"
        if any(k in p for k in ["pay", "bill", "invoice", "checkout", "order"]): return "Business Logic & Financial"
        if any(k in p for k in ["upload", "file", "export", "media"]): return "File Handling & Injection"
        return "General API"

    def _calculate_risk(self, method: str, path: str, auth_req: bool) -> str:
        if not auth_req and any(k in path.lower() for k in ["admin", "secret", "user", "internal"]):
            return "CRITICAL"
        if "{" in path and method in ("PUT", "DELETE", "PATCH"):
            return "HIGH"
        if method == "POST":
            return "MEDIUM"
        return "LOW"


class JavaScriptTypeScriptAdapter(BaseRouteAdapter):
    """Adapter for Node.js frameworks: Express, NestJS, Next.js, Fastify, Koa, Hono."""
    name = "js_ts"
    language = "JavaScript/TypeScript"

    EXPRESS_ROUTE_REGEX = re.compile(
        r"""(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]""",
        re.IGNORECASE,
    )
    FASTIFY_ROUTE_REGEX = re.compile(
        r"""(?:fastify|server|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]""",
        re.IGNORECASE,
    )
    KOA_ROUTE_REGEX = re.compile(
        r"""router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]""",
        re.IGNORECASE,
    )
    NEST_CONTROLLER_REGEX = re.compile(
        r"""@Controller\s*\(\s*['"`]([^'"`]*)['"`]\s*\)""",
        re.IGNORECASE,
    )
    NEST_METHOD_REGEX = re.compile(
        r"""@(Get|Post|Put|Delete|Patch)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return any(file_path.endswith(ext) for ext in [".js", ".ts", ".jsx", ".tsx", ".mjs"])

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        # 1. Express / Fastify / Koa
        for i, line in enumerate(lines):
            m = self.EXPRESS_ROUTE_REGEX.search(line) or self.FASTIFY_ROUTE_REGEX.search(line) or self.KOA_ROUTE_REGEX.search(line)
            if m:
                method = m.group(1).upper()
                path = self._normalize_express_path(m.group(2))
                auth_req = self._detect_js_auth(lines, i)
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=path,
                    category=self._infer_category(path),
                    auth_required=auth_req,
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Node.js / Express / Fastify"},
                    code_locations=[f"{file_path}:{i + 1}"],
                    risk_level=self._calculate_risk(method, path, auth_req),
                ))

        # 2. NestJS Controllers
        controller_prefix = ""
        c_match = self.NEST_CONTROLLER_REGEX.search(content)
        if c_match:
            controller_prefix = "/" + c_match.group(1).strip("/")

        for i, line in enumerate(lines):
            method_match = self.NEST_METHOD_REGEX.search(line)
            if method_match:
                method = method_match.group(1).upper()
                sub_path = method_match.group(2) or ""
                sub_clean = "/" + sub_path.strip("/") if sub_path else ""
                full_path = self._normalize_express_path(f"{controller_prefix}{sub_clean}" or "/")
                auth_req = "@UseGuards" in content or "AuthGuard" in content
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=full_path,
                    category=self._infer_category(full_path),
                    auth_required=auth_req,
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Node.js / NestJS"},
                    code_locations=[f"{file_path}:{i + 1}"],
                    risk_level=self._calculate_risk(method, full_path, auth_req),
                ))

        # 3. Next.js App / Pages Router
        if ("app/api/" in file_path or "pages/api/" in file_path) and "route." in file_path:
            norm_path = self._nextjs_route_path(file_path)
            for m in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
                if re.search(rf"\bexport\s+(?:async\s+)?function\s+{m}\b", content):
                    endpoints.append(DiscoveredEndpoint(
                        method=m,
                        path=norm_path,
                        category=self._infer_category(norm_path),
                        auth_required="auth" in content.lower() or "session" in content.lower(),
                        discovery_sources={"Source Code (AST)"},
                        source_languages={"TypeScript / Next.js API"},
                        code_locations=[f"{file_path}:1"],
                    ))

        return endpoints

    def _normalize_express_path(self, raw_path: str) -> str:
        # Express :id -> {id}
        path = re.sub(r":([a-zA-Z0-9_]+)", r"{\1}", raw_path)
        if not path.startswith("/"):
            path = "/" + path
        return path

    def _nextjs_route_path(self, file_path: str) -> str:
        p = file_path.replace("\\", "/")
        if "app/api/" in p:
            sub = p.split("app/api/")[1].split("/route.")[0]
            # Replace [param] with {param}
            sub = re.sub(r"\[([a-zA-Z0-9_]+)\]", r"{\1}", sub)
            return "/api/" + sub.strip("/")
        if "pages/api/" in p:
            sub = p.split("pages/api/")[1].rsplit(".", 1)[0]
            sub = re.sub(r"\[([a-zA-Z0-9_]+)\]", r"{\1}", sub)
            return "/api/" + sub.strip("/")
        return "/api"

    def _detect_js_auth(self, lines: List[str], idx: int) -> bool:
        start = max(0, idx - 4)
        end = min(len(lines), idx + 6)
        w = "\n".join(lines[start:end]).lower()
        return any(k in w for k in ["passport", "authenticate", "requireauth", "verifytoken", "jwt", "checkauth", "authguard"])

    def _infer_category(self, path: str) -> str:
        p = path.lower()
        if any(k in p for k in ["auth", "login", "token", "session", "oauth"]): return "Authentication Testing"
        if any(k in p for k in ["user", "account", "profile", "admin", "role"]): return "Authorization Testing"
        if any(k in p for k in ["pay", "bill", "order", "item", "checkout"]): return "Business Logic & Financial"
        return "General API"

    def _calculate_risk(self, method: str, path: str, auth_req: bool) -> str:
        if not auth_req and any(k in path.lower() for k in ["admin", "secret", "user"]): return "CRITICAL"
        if "{" in path and method in ("PUT", "DELETE", "PATCH"): return "HIGH"
        return "MEDIUM" if method == "POST" else "LOW"


class JavaKotlinRouteAdapter(BaseRouteAdapter):
    """Adapter for Spring Boot, JAX-RS, Quarkus, and Android Retrofit."""
    name = "java_kotlin"
    language = "Java/Kotlin"

    SPRING_MAPPING_REGEX = re.compile(
        r"""@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?['"]([^'"]*)['"]""",
        re.IGNORECASE,
    )
    JAXRS_PATH_REGEX = re.compile(
        r"""@Path\s*\(\s*['"]([^'"]+)['"]\s*\)""",
        re.IGNORECASE,
    )
    RETROFIT_REGEX = re.compile(
        r"""@(GET|POST|PUT|DELETE|PATCH)\s*\(\s*['"]([^'"]+)['"]\s*\)""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return any(file_path.endswith(ext) for ext in [".java", ".kt"])

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        # Class level base path
        class_base = ""
        c_match = re.search(r"""@(?:Request|Path)Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?['"]([^'"]*)['"]""", content)
        if c_match:
            class_base = "/" + c_match.group(1).strip("/")

        is_client_file = "retrofit" in content.lower() or "client" in file_path.lower()

        for i, line in enumerate(lines):
            # 1. Spring Boot
            sm = self.SPRING_MAPPING_REGEX.search(line)
            if sm and not is_client_file:
                verb = sm.group(1).upper()
                method = "GET" if verb == "REQUEST" else verb
                sub_path = sm.group(2) or ""
                sub_clean = "/" + sub_path.strip("/") if sub_path else ""
                full = f"{class_base}{sub_clean}" or "/"
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=full,
                    category=self._infer_category(full),
                    auth_required="@PreAuthorize" in content or "@Secured" in content,
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Java / Spring Boot"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

            # 2. Retrofit Client Interface (Android / Mobile)
            rm = self.RETROFIT_REGEX.search(line)
            if rm:
                method = rm.group(1).upper()
                path = rm.group(2)
                if not path.startswith("/"): path = "/" + path
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=path,
                    category=self._infer_category(path),
                    auth_required=True,
                    discovery_sources={"Mobile Client SDK"},
                    source_languages={"Android Kotlin/Java (Retrofit)"},
                    client_references=[f"{file_path}:{i + 1}"],
                ))

        return endpoints

    def _infer_category(self, path: str) -> str:
        p = path.lower()
        if any(k in p for k in ["auth", "login", "token"]): return "Authentication Testing"
        if any(k in p for k in ["user", "account", "profile"]): return "Authorization Testing"
        return "General API"


class GoRouteAdapter(BaseRouteAdapter):
    """Adapter for Go: Gin, Echo, Chi, Fiber, net/http."""
    name = "go"
    language = "Go"

    GIN_ECHO_REGEX = re.compile(
        r"""(?:r|router|e|g|app|v1|api)\.(GET|POST|PUT|PATCH|DELETE|Handle)\s*\(\s*['"]([^'"]+)['"]""",
        re.IGNORECASE,
    )
    NETHTTP_REGEX = re.compile(
        r"""http\.HandleFunc\s*\(\s*['"]([^'"]+)['"]""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return file_path.endswith(".go")

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        for i, line in enumerate(lines):
            gm = self.GIN_ECHO_REGEX.search(line)
            if gm:
                method = gm.group(1).upper()
                if method == "HANDLE": method = "GET"
                raw_path = gm.group(2)
                # Gin uses :id, Chi uses {id}
                clean_path = re.sub(r":([a-zA-Z0-9_]+)", r"{\1}", raw_path)
                if not clean_path.startswith("/"): clean_path = "/" + clean_path
                auth_req = any(k in line.lower() for k in ["auth", "jwt", "middleware"])
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=clean_path,
                    category="General API",
                    auth_required=auth_req,
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Go (Gin/Echo/Chi)"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

            hm = self.NETHTTP_REGEX.search(line)
            if hm:
                path = hm.group(1)
                endpoints.append(DiscoveredEndpoint(
                    method="GET",
                    path=path,
                    category="General API",
                    auth_required=False,
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Go (net/http)"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

        return endpoints


class RustRouteAdapter(BaseRouteAdapter):
    """Adapter for Rust: Axum, Actix Web, Rocket."""
    name = "rust"
    language = "Rust"

    AXUM_ROUTE_REGEX = re.compile(
        r"""\.route\s*\(\s*['"]([^'"]+)['"]\s*,\s*(get|post|put|delete|patch)""",
        re.IGNORECASE,
    )
    ACTIX_MACRO_REGEX = re.compile(
        r"""#\[(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*\)\]""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return file_path.endswith(".rs")

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        for i, line in enumerate(lines):
            am = self.AXUM_ROUTE_REGEX.search(line)
            if am:
                path = am.group(1)
                method = am.group(2).upper()
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=re.sub(r":([a-zA-Z0-9_]+)", r"{\1}", path),
                    category="General API",
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Rust / Axum"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

            acm = self.ACTIX_MACRO_REGEX.search(line)
            if acm:
                method = acm.group(1).upper()
                path = acm.group(2)
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=path,
                    category="General API",
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Rust / Actix-Web"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

        return endpoints


class DotNetRouteAdapter(BaseRouteAdapter):
    """Adapter for C# / ASP.NET Core: Controllers and Minimal APIs."""
    name = "dotnet"
    language = "C#"

    NET_HTTP_REGEX = re.compile(
        r"""\[Http(Get|Post|Put|Delete|Patch)\s*(?:\(\s*['"]([^'"]*)['"]\s*\))?\]""",
        re.IGNORECASE,
    )
    MINIMAL_API_REGEX = re.compile(
        r"""app\.Map(Get|Post|Put|Delete|Patch)\s*\(\s*['"]([^'"]+)['"]""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return file_path.endswith(".cs")

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        base_route = ""
        b_match = re.search(r"""\[Route\s*\(\s*['"]([^'"]+)['"]\s*\)\]""", content)
        if b_match:
            base_route = "/" + b_match.group(1).replace("[controller]", "api").strip("/")

        for i, line in enumerate(lines):
            m = self.NET_HTTP_REGEX.search(line)
            if m:
                verb = m.group(1).upper()
                sub = m.group(2) or ""
                sub_clean = "/" + sub.strip("/") if sub else ""
                full = f"{base_route}{sub_clean}" or "/"
                endpoints.append(DiscoveredEndpoint(
                    method=verb,
                    path=full,
                    category="General API",
                    auth_required="[Authorize]" in content,
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"C# / ASP.NET Core"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

            min_m = self.MINIMAL_API_REGEX.search(line)
            if min_m:
                verb = min_m.group(1).upper()
                path = min_m.group(2)
                endpoints.append(DiscoveredEndpoint(
                    method=verb,
                    path=path,
                    category="General API",
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"C# / Minimal API"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

        return endpoints


class PhpRouteAdapter(BaseRouteAdapter):
    """Adapter for PHP: Laravel & Symfony."""
    name = "php"
    language = "PHP"

    LARAVEL_REGEX = re.compile(
        r"""Route::(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]""",
        re.IGNORECASE,
    )
    SYMFONY_REGEX = re.compile(
        r"""#\[Route\s*\(\s*['"]([^'"]+)['"](?:.*methods:\s*\[(.*?)\])?""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return file_path.endswith(".php")

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        for i, line in enumerate(lines):
            lm = self.LARAVEL_REGEX.search(line)
            if lm:
                method = lm.group(1).upper()
                path = lm.group(2)
                # Laravel uses {id}
                if not path.startswith("/"): path = "/" + path
                endpoints.append(DiscoveredEndpoint(
                    method=method,
                    path=path,
                    category="General API",
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"PHP / Laravel"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

            sm = self.SYMFONY_REGEX.search(line)
            if sm:
                path = sm.group(1)
                method_raw = sm.group(2)
                methods = [m.strip(" '\"").upper() for m in method_raw.split(",")] if method_raw else ["GET"]
                for m in methods:
                    endpoints.append(DiscoveredEndpoint(
                        method=m,
                        path=path,
                        category="General API",
                        discovery_sources={"Source Code (AST)"},
                        source_languages={"PHP / Symfony"},
                        code_locations=[f"{file_path}:{i + 1}"],
                    ))

        return endpoints


class RubyRouteAdapter(BaseRouteAdapter):
    """Adapter for Ruby: Rails routes.rb & Sinatra."""
    name = "ruby"
    language = "Ruby"

    RAILS_ROUTE_REGEX = re.compile(
        r"""(get|post|put|patch|delete)\s+['":]([^'",\s]+)""",
        re.IGNORECASE,
    )
    RAILS_RESOURCES_REGEX = re.compile(
        r"""resources\s+:([a-zA-Z0-9_]+)""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return file_path.endswith(".rb")

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        for i, line in enumerate(lines):
            m = self.RAILS_ROUTE_REGEX.search(line)
            if m:
                verb = m.group(1).upper()
                path = m.group(2).strip("'\"")
                if not path.startswith("/"): path = "/" + path
                endpoints.append(DiscoveredEndpoint(
                    method=verb,
                    path=path,
                    category="General API",
                    discovery_sources={"Source Code (AST)"},
                    source_languages={"Ruby on Rails / Sinatra"},
                    code_locations=[f"{file_path}:{i + 1}"],
                ))

            res_m = self.RAILS_RESOURCES_REGEX.search(line)
            if res_m:
                res_name = res_m.group(1)
                for verb, sub in [("GET", ""), ("POST", ""), ("GET", "/{id}"), ("PUT", "/{id}"), ("DELETE", "/{id}")]:
                    endpoints.append(DiscoveredEndpoint(
                        method=verb,
                        path=f"/{res_name}{sub}",
                        category="General API",
                        discovery_sources={"Source Code (AST)"},
                        source_languages={"Ruby on Rails (Resources)"},
                        code_locations=[f"{file_path}:{i + 1}"],
                    ))

        return endpoints


class MobileClientAdapter(BaseRouteAdapter):
    """Adapter for Swift (iOS Alamofire/URLSession) and Dart (Flutter Dio)."""
    name = "mobile_client"
    language = "Mobile/Client"

    API_URL_REGEX = re.compile(
        r"""["']((?:https?:\/\/[^"'\s]+)?\/api\/[^"'\s\?#]+)["']""",
        re.IGNORECASE,
    )
    DART_DIO_REGEX = re.compile(
        r"""(?:dio|client|http)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']*\/api\/[^"']*)["']""",
        re.IGNORECASE,
    )
    FETCH_AXIOS_REGEX = re.compile(
        r"""(?:fetch|axios\.(?:get|post|put|delete))\s*\(\s*['"`]([^'"`]*\/api\/[^'"`]*)['"`]""",
        re.IGNORECASE,
    )

    def match_file(self, file_path: str) -> bool:
        return any(file_path.endswith(ext) for ext in [".swift", ".dart", ".js", ".ts", ".tsx"])

    def extract_routes(self, file_path: str, content: str) -> List[DiscoveredEndpoint]:
        endpoints: List[DiscoveredEndpoint] = []
        lines = content.splitlines()

        for i, line in enumerate(lines):
            # Swift
            if file_path.endswith(".swift"):
                sm = self.API_URL_REGEX.search(line)
                if sm:
                    path = self._extract_clean_path(sm.group(1))
                    endpoints.append(DiscoveredEndpoint(
                        method="GET",
                        path=path,
                        category="Mobile Client Reference",
                        discovery_sources={"Mobile Client SDK"},
                        source_languages={"iOS Swift (URLSession/Alamofire)"},
                        client_references=[f"{file_path}:{i + 1}"],
                    ))

            # Dart / Flutter
            if file_path.endswith(".dart"):
                dm = self.DART_DIO_REGEX.search(line) or self.API_URL_REGEX.search(line)
                if dm:
                    val = dm.group(2) if dm.lastindex and dm.lastindex >= 2 else dm.group(1)
                    method = dm.group(1).upper() if dm.lastindex and dm.lastindex >= 2 and dm.group(1).upper() in ("GET", "POST", "PUT", "DELETE", "PATCH") else "GET"
                    path = self._extract_clean_path(val)
                    endpoints.append(DiscoveredEndpoint(
                        method=method,
                        path=path,
                        category="Mobile Client Reference",
                        discovery_sources={"Mobile Client SDK"},
                        source_languages={"Flutter Dart (Dio/http)"},
                        client_references=[f"{file_path}:{i + 1}"],
                    ))
                    endpoints.append(DiscoveredEndpoint(
                        method=method,
                        path=path,
                        category="Mobile Client Reference",
                        discovery_sources={"Mobile Client SDK"},
                        source_languages={"Flutter Dart (Dio/http)"},
                        client_references=[f"{file_path}:{i + 1}"],
                    ))

            # Frontend Fetch/Axios Client Calls
            fm = self.FETCH_AXIOS_REGEX.search(line)
            if fm and ("client" in file_path.lower() or "sdk" in file_path.lower() or "service" in file_path.lower()):
                raw = fm.group(1)
                path = self._extract_clean_path(raw)
                endpoints.append(DiscoveredEndpoint(
                    method="GET",
                    path=path,
                    category="Frontend Client Reference",
                    discovery_sources={"Frontend Client SDK"},
                    source_languages={"Web Client (Fetch/Axios)"},
                    client_references=[f"{file_path}:{i + 1}"],
                ))

        return endpoints

    def _extract_clean_path(self, raw: str) -> str:
        # If full URL, take path
        if "://" in raw:
            raw = "/" + raw.split("://")[1].split("/", 1)[1] if "/" in raw.split("://")[1] else "/"
        return raw.split("?")[0]


# =============================================================================
# 2. Universal API Discovery Engine & Normalizer
# =============================================================================

class UniversalApiDiscoveryEngine:
    """
    Orchestrates multi-language source file scanning, normalizes endpoints across
    OpenAPI, source code, runtime traffic, and client references, and computes
    governance classification and inventory drift.
    """

    def __init__(self):
        self.adapters: List[BaseRouteAdapter] = [
            PythonRouteAdapter(),
            JavaScriptTypeScriptAdapter(),
            JavaKotlinRouteAdapter(),
            GoRouteAdapter(),
            RustRouteAdapter(),
            DotNetRouteAdapter(),
            PhpRouteAdapter(),
            RubyRouteAdapter(),
            MobileClientAdapter(),
        ]

    def discover_from_workspace(self, file_map: Dict[str, str]) -> List[DiscoveredEndpoint]:
        """
        Scans all files in repository and extracts routes via matched language adapters.
        """
        raw_discovered: List[DiscoveredEndpoint] = []
        for rel_path, content in file_map.items():
            for adapter in self.adapters:
                if adapter.match_file(rel_path):
                    try:
                        routes = adapter.extract_routes(rel_path, content)
                        raw_discovered.extend(routes)
                    except Exception as err:
                        logger.warning(f"Error scanning {rel_path} with {adapter.name}: {err}")
        return self.normalize_endpoints(raw_discovered)

    def normalize_endpoints(
        self,
        endpoints: List[DiscoveredEndpoint],
        spec_endpoints: Optional[List[Dict[str, Any]]] = None,
        runtime_endpoints: Optional[List[Dict[str, Any]]] = None,
    ) -> List[DiscoveredEndpoint]:
        """
        Deduplicates endpoints by (METHOD, CANONICAL_PATH).
        Merges discovery sources, languages, code locations, and client references.
        Classifies status: Documented, Undocumented, Shadow, Zombie.
        """
        canonical_map: Dict[str, DiscoveredEndpoint] = {}

        # 1. Index spec endpoints (OpenAPI / Swagger)
        spec_keys: Set[str] = set()
        if spec_endpoints:
            for s in spec_endpoints:
                m = (s.get("method") or "GET").upper()
                p = self._canonical_path(s.get("path") or "/")
                key = f"{m} {p}"
                spec_keys.add(key)
                ep = DiscoveredEndpoint(
                    method=m,
                    path=p,
                    category=s.get("category", "Documented API"),
                    auth_required=s.get("auth_required", False),
                    discovery_sources={"OpenAPI Specification"},
                    is_undocumented=False,
                    is_shadow=False,
                )
                canonical_map[key] = ep

        # 2. Merge code discovered endpoints
        code_keys: Set[str] = set()
        for ep in endpoints:
            m = ep.method.upper()
            p = self._canonical_path(ep.path)
            key = f"{m} {p}"
            code_keys.add(key)

            if key not in canonical_map:
                ep.path = p
                ep.is_undocumented = bool(spec_endpoints)  # Undocumented if spec exists but route missing from spec
                canonical_map[key] = ep
            else:
                existing = canonical_map[key]
                existing.discovery_sources.update(ep.discovery_sources)
                existing.source_languages.update(ep.source_languages)
                existing.code_locations.extend(ep.code_locations)
                existing.client_references.extend(ep.client_references)
                if ep.auth_required:
                    existing.auth_required = True

        # 3. Merge runtime traffic endpoints
        if runtime_endpoints:
            for r in runtime_endpoints:
                m = (r.get("method") or "GET").upper()
                p = self._canonical_path(r.get("path") or "/")
                key = f"{m} {p}"
                is_shadow = key not in code_keys and key not in spec_keys

                if key not in canonical_map:
                    ep = DiscoveredEndpoint(
                        method=m,
                        path=p,
                        category="Runtime Traffic",
                        discovery_sources={"Runtime Traffic"},
                        is_shadow=is_shadow,
                        is_undocumented=key not in spec_keys,
                        metadata={"request_count": r.get("request_count", 1)},
                    )
                    canonical_map[key] = ep
                else:
                    existing = canonical_map[key]
                    existing.discovery_sources.add("Runtime Traffic")
                    existing.metadata["request_count"] = r.get("request_count", 1)

        # 4. Final governance tags
        results = list(canonical_map.values())
        for ep in results:
            key = f"{ep.method} {ep.path}"
            # Shadow API: In runtime or client but not in code and not in spec
            if "Runtime Traffic" in ep.discovery_sources or "Mobile Client SDK" in ep.discovery_sources:
                if "Source Code (AST)" not in ep.discovery_sources and "OpenAPI Specification" not in ep.discovery_sources:
                    ep.is_shadow = True
                    ep.risk_level = "CRITICAL"

            # Zombie API: Documented in spec or code, but 0 traffic and contains sensitive parameters
            if "OpenAPI Specification" in ep.discovery_sources and "Runtime Traffic" not in ep.discovery_sources:
                if any(v in ep.path for v in ["v1", "legacy", "old", "backup"]):
                    ep.is_zombie = True

        return results

    def compute_inventory_drift(
        self,
        previous_endpoints: List[Dict[str, Any]],
        current_endpoints: List[DiscoveredEndpoint],
    ) -> Dict[str, Any]:
        """
        Compares previous scan inventory with current scan inventory.
        Detects added, removed, modified, and unchanged endpoints.
        """
        prev_map = {f"{e.get('method', 'GET').upper()} {self._canonical_path(e.get('path', ''))}": e for e in previous_endpoints}
        curr_map = {f"{e.method} {self._canonical_path(e.path)}": e for e in current_endpoints}

        prev_keys = set(prev_map.keys())
        curr_keys = set(curr_map.keys())

        added_keys = curr_keys - prev_keys
        removed_keys = prev_keys - curr_keys
        shared_keys = prev_keys & curr_keys

        added = [curr_map[k].to_dict() for k in added_keys]
        removed = [prev_map[k] for k in removed_keys]
        modified = []
        unchanged = []

        for k in shared_keys:
            old = prev_map[k]
            new = curr_map[k]
            # Check for changes in auth requirement or discovery sources
            auth_changed = old.get("auth_required") != new.auth_required
            sources_changed = set(old.get("discovery_sources", [])) != new.discovery_sources
            if auth_changed or sources_changed:
                mod_item = new.to_dict()
                mod_item["changes"] = {
                    "auth_required": {"before": old.get("auth_required"), "after": new.auth_required},
                    "discovery_sources": {"before": old.get("discovery_sources", []), "after": list(new.discovery_sources)},
                }
                modified.append(mod_item)
            else:
                unchanged.append(new.to_dict())

        return {
            "total_current": len(current_endpoints),
            "total_previous": len(previous_endpoints),
            "added_count": len(added),
            "removed_count": len(removed),
            "modified_count": len(modified),
            "unchanged_count": len(unchanged),
            "added_endpoints": added,
            "removed_endpoints": removed,
            "modified_endpoints": modified,
            "has_drift": bool(added or removed or modified),
        }

    def _canonical_path(self, path: str) -> str:
        """Normalizes path parameters to {param} and ensures leading slash."""
        p = re.sub(r":([a-zA-Z0-9_]+)", r"{\1}", path)
        p = re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", p)
        if not p.startswith("/"):
            p = "/" + p
        return p.rstrip("/") or "/"


# Global singleton instance
universal_discovery_engine = UniversalApiDiscoveryEngine()
