import difflib
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import get_settings

logger = logging.getLogger("gemini.remediation")


class GeminiRemediationService:
    """
    Production-grade Google Gemini AI Remediation Service.
    Acts as the reasoning engine for security vulnerability root cause analysis and patch generation.
    Enforces structured JSON output and least-privilege boundary (Gemini proposes, Kavach verifies).
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or getattr(settings, "gemini_api_key", None)
        self.model = model or getattr(settings, "gemini_model", "gemini-2.5-flash")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def analyze_and_remediate(
        self,
        finding: Dict[str, Any],
        file_content: Optional[str] = None,
        repository_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Sends structured finding, file context, and AST snippet to Gemini reasoning engine.
        Falls back to deterministic AST/line-grounded synthesis using real file lines when API is unavailable.
        """
        prompt = self._construct_prompt(finding, file_content, repository_context)

        gemini_result = None
        error_detail = None

        if self.api_key:
            try:
                gemini_result = await self._call_gemini_api(prompt)
            except Exception as exc:
                logger.warning(f"Google Gemini API call failed: {exc}. Engaging deterministic security engine fallback.")
                error_detail = str(exc)
        else:
            error_detail = "GEMINI_API_KEY not configured"

        if gemini_result and isinstance(gemini_result, dict) and gemini_result.get("patch"):
            if "strategies" not in gemini_result or not gemini_result["strategies"]:
                gemini_result["strategies"] = self._derive_strategies(finding, gemini_result.get("patch", ""))
            gemini_result.setdefault("is_fixable", True)
            return gemini_result

        logger.info(f"Using deterministic security remediation engine for rule: {finding.get('rule_id')}")
        return self._generate_deterministic_remediation(finding, file_content, error_detail)

    def _construct_prompt(
        self,
        finding: Dict[str, Any],
        file_content: Optional[str],
        repo_context: Optional[Dict[str, Any]],
    ) -> str:
        file_path = finding.get("file_path", "")
        line_num = int(finding.get("line_number") or finding.get("line_start") or 1)
        rule_id = finding.get("rule_id", "SECURITY_VULNERABILITY")
        severity = finding.get("severity", "HIGH")
        title = finding.get("title", "")
        snippet = finding.get("snippet", "")

        context_lines = ""
        if file_content:
            lines = file_content.splitlines()
            start = max(0, line_num - 20)
            end = min(len(lines), line_num + 20)
            annotated = [f"{i+1:4d}: {lines[i]}" for i in range(start, end)]
            context_lines = "\n".join(annotated)
            if not snippet and 0 <= line_num - 1 < len(lines):
                snippet = lines[line_num - 1].strip()

        return f"""You are a Principal Security Engineer and AI Remediation Engine for Kavach Control Plane.
Analyze the following security finding and produce a secure, minimal, production-grade fix against the EXACT file lines shown below.

FINDING DETAILS:
- Rule ID: {rule_id}
- Title: {title}
- Severity: {severity}
- File Path: {file_path}
- Line Number: {line_num}
- Vulnerable Snippet:
```
{snippet}
```

FILE CONTEXT (Around line {line_num}):
```
{context_lines}
```

REPOSITORY METADATA:
{json.dumps(repo_context or {}, indent=2)}

REQUIREMENTS:
1. Provide a precise, minimal patch in standard unified diff format (starting with `--- a/{file_path}` and `+++ b/{file_path}`) matching the EXACT lines from FILE CONTEXT.
2. Never invent placeholder code or comments. Only fix using valid syntax for `{file_path}`.
3. Suggest exact test or lint commands for verifying the fix.
4. Output strictly valid JSON matching this schema:
{{
  "is_fixable": true,
  "root_cause": "<concise explanation of why this code is vulnerable>",
  "explanation": "<how the proposed patch remediates the root cause>",
  "files_changed": ["{file_path}"],
  "patch": "<unified diff string>",
  "tests": ["pytest -q"],
  "security_validation_required": true,
  "risk": "low",
  "confidence": 0.95,
  "strategies": [
    {{
      "name": "Secure Code",
      "description": "Remediate directly in source code",
      "diff": "<unified diff string>"
    }}
  ]
}}
Only return raw JSON. No markdown code fences outside JSON."""

    async def _call_gemini_api(self, prompt: str) -> Optional[Dict[str, Any]]:
        if not self.api_key or self.api_key.startswith(("AQ.", "dummy")) or os.environ.get("TESTING"):
            return None
        candidate_models = [self.model, "gemini-2.5-flash-lite"]
        seen = set()
        models = [m for m in candidate_models if m and not (m in seen or seen.add(m))]
        last_error = None

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.15,
                "topP": 0.95,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            for model_name in models:
                url = f"{self.base_url}/models/{model_name}:generateContent"
                try:
                    resp = await client.post(
                        url,
                        params={"key": self.api_key},
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        parts = (
                            data.get("candidates", [{}])[0]
                            .get("content", {})
                            .get("parts", [])
                        )
                        if parts:
                            parsed = self._parse_gemini_json(parts[0].get("text", ""))
                            if parsed and isinstance(parsed, dict):
                                parsed["engine"] = f"Google Gemini ({model_name})"
                                return parsed
                    else:
                        last_error = f"{model_name} returned {resp.status_code}: {resp.text[:150]}"
                except Exception as exc:
                    last_error = f"{model_name} request failed: {str(exc)}"

        if last_error:
            raise RuntimeError(last_error)
        return None

    def _parse_gemini_json(self, text: str) -> Optional[Dict[str, Any]]:
        if not text:
            return None
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(cleaned[start : end + 1])
                except Exception:
                    pass
        return None

    def _derive_strategies(self, finding: Dict[str, Any], primary_diff: str) -> List[Dict[str, Any]]:
        return [
            {
                "name": "Secure Code",
                "description": "Direct source-grounded security remediation",
                "diff": primary_diff,
            }
        ]

    @staticmethod
    def _build_unified_diff_from_lines(
        file_path: str,
        orig_lines: List[str],
        updated_lines: List[str],
    ) -> str:
        clean_path = (file_path or "file").lstrip("/")
        diff_iter = difflib.unified_diff(
            orig_lines,
            updated_lines,
            fromfile=f"a/{clean_path}",
            tofile=f"b/{clean_path}",
            lineterm="",
            n=3,
        )
        return "\n".join(diff_iter) + "\n"

    def _synthesize_grounded_line_fix(
        self,
        *,
        file_path: str,
        rule_id: str,
        title: str,
        target_line: str,
        full_lines: Optional[List[str]],
        target_idx: Optional[int],
    ) -> Optional[Tuple[str, str, str, List[str], List[str]]]:
        """
        Applies deterministic language-aware transforms directly against `target_line`.
        Returns (root_cause, explanation, patched_line_or_block, updated_full_lines_or_pair, tests)
        or None if no verified non-breaking source fix can be derived without inventing code.
        """
        combined = f"{rule_id} {title} {target_line}".lower()
        indent = target_line[: len(target_line) - len(target_line.lstrip())]
        stripped = target_line.strip()
        lower_path = (file_path or "").lower()

        def _make_pair(new_line: str) -> List[str]:
            if full_lines is not None and target_idx is not None:
                updated = list(full_lines)
                updated[target_idx] = new_line
                return updated
            return [new_line]

        # 1. Command Injection: shell=True / os.system
        if ("command" in combined and "injection" in combined) or "shell=true" in stripped.lower():
            if "shell=true" in stripped.lower():
                new_line = re.sub(r"shell\s*=\s*True", "shell=False", target_line, flags=re.IGNORECASE)
                return (
                    "Subprocess invoked with shell=True enables shell metacharacter command injection.",
                    "Disabled shell interpretation (shell=False) so arguments remain isolated.",
                    new_line,
                    _make_pair(new_line),
                    ["py -m py_compile " + file_path] if lower_path.endswith(".py") else ["git diff --check"],
                )

        # 2. Unsafe YAML / Deserialization / Eval
        if "yaml.load(" in stripped and "safe_load" not in stripped and "Loader=" not in stripped:
            new_line = target_line.replace("yaml.load(", "yaml.safe_load(")
            return (
                "Unrestricted yaml.load() permits arbitrary Python object deserialization.",
                "Replaced yaml.load() with yaml.safe_load() to restrict deserialization to safe YAML tags.",
                new_line,
                _make_pair(new_line),
                ["py -m py_compile " + file_path] if lower_path.endswith(".py") else ["git diff --check"],
            )
        if "eval(" in stripped and "literal_eval" not in stripped and lower_path.endswith(".py"):
            if "ast.literal_eval" not in stripped:
                new_line = target_line.replace("eval(", "ast.literal_eval(")
                return (
                    "Dynamic Python eval() executes arbitrary code when tainted input reaches the expression.",
                    "Replaced eval() with ast.literal_eval() (ensure `import ast` is present in module imports).",
                    new_line,
                    _make_pair(new_line),
                    ["py -m py_compile " + file_path],
                )

        # 3. Hardcoded secrets / tokens / DB URIs / keys
        if (
            "sec-001" in combined
            or "sec-002" in combined
            or "sec-003" in combined
            or any(k in combined for k in ("hardcoded", "secret", "aws access key", "slack webhook", "database uri", "password", "api_key"))
        ):
            m_py_assign = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(['\"])(.+)\2\s*(#.*)?$", stripped)
            m_js_assign = re.match(r"^((?:const|let|var)\s+[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(['\"`])(.+)\2\s*;?\s*$", stripped)
            if m_py_assign and lower_path.endswith(".py"):
                var_name = m_py_assign.group(1)
                env_name = var_name.upper()
                new_line = f'{indent}{var_name} = os.getenv("{env_name}", "")'
                return (
                    f"Hardcoded secret literal assigned directly to `{var_name}` in Python source.",
                    f"Moved secret lookup to environment variable `os.getenv('{env_name}')`.",
                    new_line,
                    _make_pair(new_line),
                    ["py -m py_compile " + file_path],
                )
            if m_js_assign and lower_path.endswith((".js", ".ts", ".jsx", ".tsx")):
                decl = m_js_assign.group(1)
                var_name = decl.split()[-1].upper()
                new_line = f"{indent}{decl} = process.env.{var_name} || '';"
                return (
                    f"Hardcoded credential literal embedded in `{decl}`.",
                    f"Replaced literal credential with `process.env.{var_name}` runtime lookup.",
                    new_line,
                    _make_pair(new_line),
                    ["git diff --check"],
                )
            if ":" in stripped and any(k in lower_path for k in (".yml", ".yaml", ".env")):
                key_part = stripped.split(":", 1)[0].strip() if ":" in stripped else stripped.split("=", 1)[0].strip()
                env_key = re.sub(r"[^A-Z0-9_]", "_", key_part.upper())
                new_line = f"{indent}{key_part}: ${{{env_key}}}" if ":" in stripped else f'{indent}{env_key}=""'
                return (
                    "Plaintext secret or connection URI embedded in configuration file.",
                    f"Substituted environment placeholder `${{{env_key}}}`.",
                    new_line,
                    _make_pair(new_line),
                    ["git diff --check"],
                )

        # 4. Kubernetes / IaC: privileged: true, runAsRoot / allowPrivilegeEscalation / 0.0.0.0/0 / S3 encryption
        if re.search(r"\bprivileged\s*:\s*true\b", stripped, re.IGNORECASE):
            new_line = re.sub(r"privileged\s*:\s*true", "privileged: false", target_line, flags=re.IGNORECASE)
            return (
                "Kubernetes container securityContext grants full host privileges (`privileged: true`).",
                "Set `privileged: false` to enforce container isolation.",
                new_line,
                _make_pair(new_line),
                ["git diff --check"],
            )
        if re.search(r"\ballowPrivilegeEscalation\s*:\s*true\b", stripped, re.IGNORECASE):
            new_line = re.sub(r"allowPrivilegeEscalation\s*:\s*true", "allowPrivilegeEscalation: false", target_line, flags=re.IGNORECASE)
            return (
                "Container permits privilege escalation.",
                "Restricted `allowPrivilegeEscalation: false`.",
                new_line,
                _make_pair(new_line),
                ["git diff --check"],
            )
        if re.search(r"\bhostNetwork\s*:\s*true\b", stripped, re.IGNORECASE):
            new_line = re.sub(r"hostNetwork\s*:\s*true", "hostNetwork: false", target_line, flags=re.IGNORECASE)
            return (
                "Pod exposes host network namespace (`hostNetwork: true`).",
                "Disabled `hostNetwork: false` to isolate pod networking.",
                new_line,
                _make_pair(new_line),
                ["git diff --check"],
            )
        if "0.0.0.0/0" in stripped:
            new_line = target_line.replace("0.0.0.0/0", "10.0.0.0/8")
            return (
                "Security group allows unrestricted ingress/egress across all IPv4 addresses (`0.0.0.0/0`).",
                "Restricted CIDR range to internal VPC subnet `10.0.0.0/8` (adjust to specific bastion/LB CIDR).",
                new_line,
                _make_pair(new_line),
                ["git diff --check"],
            )

        # 5. Dockerfile ADD -> COPY / missing USER
        if "dockerfile" in lower_path:
            if re.match(r"^ADD\s+(?!https?://)", stripped, re.IGNORECASE):
                new_line = re.sub(r"^ADD\b", "COPY", target_line, flags=re.IGNORECASE)
                return (
                    "Dockerfile uses ADD where COPY suffices, risking unintended archive extraction or remote fetches.",
                    "Replaced ADD instruction with explicit COPY.",
                    new_line,
                    _make_pair(new_line),
                    ["git diff --check"],
                )
            if "root user" in combined or "container-001" in combined or "iac-001" in combined:
                if full_lines is not None:
                    has_user = any(ln.strip().upper().startswith("USER ") for ln in full_lines)
                    if not has_user:
                        updated = list(full_lines)
                        insert_pos = len(updated)
                        for i, ln in enumerate(updated):
                            if ln.strip().upper().startswith(("CMD ", "ENTRYPOINT ")):
                                insert_pos = i
                                break
                        updated.insert(insert_pos, "USER nonroot")
                        return (
                            "Container image executes as privileged UID 0 (root).",
                            "Added non-root `USER nonroot` instruction prior to container entrypoint.",
                            "USER nonroot",
                            updated,
                            ["git diff --check"],
                        )

        return None

    def _generate_deterministic_remediation(
        self,
        finding: Dict[str, Any],
        file_content: Optional[str],
        error_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        file_path = str(finding.get("file_path") or "unknown_file")
        rule = str(finding.get("rule_id") or "")
        title = str(finding.get("title") or "")
        snippet = str(finding.get("snippet") or "").strip()
        line_num = max(1, int(finding.get("line_number") or finding.get("line_start") or 1))

        full_lines: Optional[List[str]] = None
        target_idx: Optional[int] = None
        target_line = snippet

        if file_content:
            full_lines = file_content.splitlines()
            if full_lines:
                candidate_idx = min(max(0, line_num - 1), len(full_lines) - 1)
                if snippet:
                    for offset in range(0, 15):
                        for idx in (candidate_idx - offset, candidate_idx + offset):
                            if 0 <= idx < len(full_lines) and (
                                snippet in full_lines[idx] or full_lines[idx].strip() == snippet
                            ):
                                candidate_idx = idx
                                break
                target_idx = candidate_idx
                target_line = full_lines[candidate_idx]

        synth = (
            self._synthesize_grounded_line_fix(
                file_path=file_path,
                rule_id=rule,
                title=title,
                target_line=target_line,
                full_lines=full_lines,
                target_idx=target_idx,
            )
            if target_line
            else None
        )

        if synth:
            root_cause, explanation, _patched_line, updated_lines, tests = synth
            orig_slice = full_lines if full_lines is not None else [target_line]
            patch = self._build_unified_diff_from_lines(file_path, orig_slice, updated_lines)
            return {
                "is_fixable": True,
                "root_cause": root_cause,
                "explanation": explanation,
                "files_changed": [file_path],
                "patch": patch,
                "diff": patch,
                "patched_content": "\n".join(updated_lines) + ("\n" if file_content and file_content.endswith("\n") else "") if full_lines else None,
                "tests": tests,
                "security_validation_required": True,
                "risk": "low",
                "confidence": 0.9,
                "strategies": self._derive_strategies(finding, patch),
                "engine": "deterministic-source-grounded",
                "diagnostics": {"api_call_status": error_reason or "deterministic_grounded"},
                "remediation_state": "PATCH_GENERATED",
                "state_label": "Patch Ready for Review",
                "requires_approval": True,
                "is_verified": False,
            }

        missing_hint = (
            "Call `get_file_content` to retrieve exact source lines from the connected repository, "
            "or pass `file_content` / configure GEMINI_API_KEY so an exact source-grounded unified diff can be generated."
            if not file_content
            else "Automated deterministic rule did not match safely against these exact source lines; review file context via `get_file_content` and supply a targeted unified diff via `apply_remediation_patch`."
        )
        return {
            "is_fixable": False,
            "root_cause": f"{title or rule} at {file_path}:{line_num} requires source-grounded remediation.",
            "explanation": missing_hint,
            "files_changed": [file_path],
            "patch": "",
            "diff": "",
            "tests": ["git diff --check"],
            "security_validation_required": True,
            "risk": "medium",
            "confidence": 0.0,
            "strategies": [],
            "engine": "deterministic-source-grounded",
            "diagnostics": {"api_call_status": error_reason or "manual_or_llm_context_needed"},
            "remediation_state": "NEEDS_SOURCE_CONTEXT",
            "state_label": "Source Context Needed",
            "requires_approval": True,
            "is_verified": False,
        }
