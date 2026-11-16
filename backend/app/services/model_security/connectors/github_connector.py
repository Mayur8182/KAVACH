"""
Kavach Model Security — GitHub Model Artifact Connector
Discovers and inspects model artifacts, model cards, configuration files,
and ML dependencies residing in GitHub repositories.
"""

import time
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.services.model_security.connectors.base import BaseModelSourceConnector

logger = logging.getLogger("kavach.model_security.github")


class GitHubModelConnector(BaseModelSourceConnector):
    """
    Connects to GitHub Repositories to discover machine learning models,
    weights, ONNX exports, and model configuration files.
    """

    BASE_URL = "https://api.github.com"

    def __init__(self, source_id: Optional[str] = None, credentials: Optional[Dict[str, Any]] = None, endpoint_url: Optional[str] = None):
        super().__init__(source_id, credentials, endpoint_url)
        self.token = self.credentials.get("token") or self.credentials.get("access_token")
        self.owner = self.credentials.get("owner")
        self.repo = self.credentials.get("repo")
        self.headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "Kavach-Model-Security/1.0",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    async def validate_credentials(self) -> Tuple[bool, str, Dict[str, Any]]:
        """Validates GitHub token via /user or /rate_limit."""
        if not self.token:
            return False, "GitHub Personal Access Token or OAuth token is required", {}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.BASE_URL}/user", headers=self.headers)
                if resp.status_code == 200:
                    data = resp.json()
                    login = data.get("login", "unknown")
                    return True, f"Authenticated with GitHub as @{login}", {
                        "login": login,
                        "id": data.get("id"),
                        "name": data.get("name"),
                        "scopes": resp.headers.get("x-oauth-scopes", ""),
                    }
                elif resp.status_code == 401:
                    return False, "Invalid or expired GitHub access token", {}
                else:
                    return False, f"GitHub API error: HTTP {resp.status_code}", {}
        except Exception as exc:
            return False, f"GitHub connection failed: {exc}", {}

    async def test_connection(self) -> Tuple[bool, int, str]:
        """Tests GitHub API latency."""
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.BASE_URL}/rate_limit", headers=self.headers)
                latency_ms = int((time.monotonic() - start) * 1000)
                if resp.status_code == 200:
                    return True, latency_ms, f"GitHub API reachable ({latency_ms}ms)"
                return False, latency_ms, f"GitHub returned HTTP {resp.status_code}"
        except Exception as exc:
            latency_ms = int((time.monotonic() - start) * 1000)
            return False, latency_ms, f"Connection failed: {exc}"

    async def discover_models(self, limit: int = 50, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Discovers repositories containing model files or specific model folders.
        If specific owner/repo configured, inspects its tree.
        """
        discovered: List[Dict[str, Any]] = []

        if self.owner and self.repo:
            repo_full = f"{self.owner}/{self.repo}"
            details = await self._inspect_repo_tree(self.owner, self.repo)
            if details:
                discovered.append(details)
            return discovered

        # Otherwise query user repositories
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"{self.BASE_URL}/user/repos?per_page={min(limit, 30)}&sort=updated"
                resp = await client.get(url, headers=self.headers)
                if resp.status_code != 200:
                    return []

                repos = resp.json()
                for r in repos:
                    full_name = r.get("full_name")
                    owner = r.get("owner", {}).get("login")
                    name = r.get("name")
                    if not owner or not name:
                        continue

                    # Check topics / language / description for ML hints
                    topics = r.get("topics", [])
                    desc = (r.get("description") or "").lower()
                    lang = (r.get("language") or "").lower()

                    is_ml_candidate = (
                        any(t in ["machine-learning", "deep-learning", "pytorch", "huggingface", "llm", "transformers", "onnx", "ai"] for t in topics)
                        or any(k in desc for k in ["model", "weights", "checkpoint", "llm", "classifier", "transformer"])
                        or lang in ["python", "jupyter notebook"]
                    )

                    if is_ml_candidate:
                        model_info = await self._inspect_repo_tree(owner, name, r.get("default_branch", "main"))
                        if model_info:
                            discovered.append(model_info)
        except Exception as exc:
            logger.error(f"GitHub discover_models failed: {exc}")

        return discovered

    async def _inspect_repo_tree(self, owner: str, repo: str, branch: str = "main") -> Optional[Dict[str, Any]]:
        """Inspects Git tree for model weight files and config files."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"{self.BASE_URL}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
                resp = await client.get(url, headers=self.headers)
                if resp.status_code != 200:
                    return None

                tree = resp.json().get("tree", [])
                file_paths = [t.get("path", "") for t in tree if t.get("type") == "blob"]

                weight_files = [f for f in file_paths if f.endswith((".safetensors", ".bin", ".pt", ".pth", ".onnx", ".gguf"))]
                config_files = [f for f in file_paths if f.endswith(("config.json", "model.json", "requirements.txt"))]

                if not weight_files and not config_files:
                    return None

                # Determine primary format
                has_safetensors = any(f.endswith(".safetensors") for f in weight_files)
                has_pickle = any(f.endswith((".bin", ".pt", ".pth")) for f in weight_files)
                has_onnx = any(f.endswith(".onnx") for f in weight_files)

                if has_safetensors and not has_pickle:
                    fmt = "safetensors"
                elif has_safetensors and has_pickle:
                    fmt = "mixed"
                elif has_pickle:
                    fmt = "pytorch_bin"
                elif has_onnx:
                    fmt = "onnx"
                else:
                    fmt = "custom"

                return {
                    "model_id_str": f"github/{owner}/{repo}",
                    "name": repo,
                    "provider": "github",
                    "model_family": "custom",
                    "task_type": "custom",
                    "model_format": fmt,
                    "author_name": owner,
                    "is_private": False,
                    "source_repo_url": f"https://github.com/{owner}/{repo}",
                    "artifact_location": f"github://{owner}/{repo}/tree/{branch}",
                    "tags": ["github", fmt],
                    "raw_metadata": {
                        "weight_files": weight_files,
                        "config_files": config_files,
                        "default_branch": branch,
                    }
                }
        except Exception as exc:
            logger.error(f"Error inspecting repo tree for {owner}/{repo}: {exc}")
            return None

    async def get_model_details(self, model_id_str: str) -> Dict[str, Any]:
        """Gets GitHub repo details."""
        parts = model_id_str.replace("github/", "").split("/")
        if len(parts) >= 2:
            owner, repo = parts[0], parts[1]
            tree_info = await self._inspect_repo_tree(owner, repo)
            return tree_info or {}
        return {}

    async def get_artifact_references(self, model_id_str: str) -> List[Dict[str, Any]]:
        """Lists files in the repository."""
        parts = model_id_str.replace("github/", "").split("/")
        if len(parts) < 2:
            return []
        owner, repo = parts[0], parts[1]

        artifacts: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"{self.BASE_URL}/repos/{owner}/{repo}/git/trees/main?recursive=1"
                resp = await client.get(url, headers=self.headers)
                if resp.status_code != 200:
                    return artifacts

                tree = resp.json().get("tree", [])
                for item in tree:
                    if item.get("type") != "blob":
                        continue
                    path = item.get("path", "")
                    size = item.get("size", 0)
                    lower = path.lower()

                    if lower.endswith(".safetensors"):
                        ftype = "safetensors"
                        is_pickle = False
                    elif any(lower.endswith(ext) for ext in [".bin", ".pt", ".pth", ".pkl"]):
                        ftype = "pickle"
                        is_pickle = True
                    elif lower.endswith(".json"):
                        ftype = "config"
                        is_pickle = False
                    elif lower.endswith(".onnx"):
                        ftype = "onnx"
                        is_pickle = False
                    elif lower.endswith(".gguf"):
                        ftype = "gguf"
                        is_pickle = False
                    elif lower.endswith((".py", ".sh")):
                        ftype = "script"
                        is_pickle = False
                    else:
                        continue  # only keep ML relevant files

                    artifacts.append({
                        "path": path,
                        "type": ftype,
                        "is_serialized_pickle": is_pickle,
                        "size_bytes": size,
                        "sha256": item.get("sha"),
                        "download_url": f"https://raw.githubusercontent.com/{owner}/{repo}/main/{path}",
                    })
        except Exception as exc:
            logger.error(f"Error getting GitHub artifacts for {model_id_str}: {exc}")

        return artifacts

