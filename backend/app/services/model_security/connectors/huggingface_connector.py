"""
Kavach Model Security — Hugging Face Hub Connector
Connects to Hugging Face Hub API for authenticating, testing connectivity,
discovering models, querying security tags, inspecting sibling artifacts,
and checking safetensors vs pickle weights.
"""

import time
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.services.model_security.connectors.base import BaseModelSourceConnector

logger = logging.getLogger("kavach.model_security.huggingface")


class HuggingFaceConnector(BaseModelSourceConnector):
    """
    Production-grade Hugging Face Hub Connector.
    Supports authenticated (user/org access tokens) and public model discovery.
    """

    BASE_URL = "https://huggingface.co/api"

    def __init__(self, source_id: Optional[str] = None, credentials: Optional[Dict[str, Any]] = None, endpoint_url: Optional[str] = None):
        super().__init__(source_id, credentials, endpoint_url)
        self.api_token = self.credentials.get("api_token") or self.credentials.get("token")
        self.headers = {
            "User-Agent": "Kavach-Model-Security/1.0",
        }
        if self.api_token:
            self.headers["Authorization"] = f"Bearer {self.api_token}"

    async def validate_credentials(self) -> Tuple[bool, str, Dict[str, Any]]:
        """Validates API token via HF whoami-v2."""
        if not self.api_token:
            return True, "Anonymous read-only access (public models only)", {"type": "anonymous"}

        url = f"{self.BASE_URL}/whoami-v2"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=self.headers)
                if resp.status_code == 200:
                    data = resp.json()
                    name = data.get("name") or data.get("fullname") or "unknown"
                    role = data.get("auth", {}).get("accessToken", {}).get("role", "read")
                    orgs = [o.get("name") for o in data.get("orgs", []) if o.get("name")]
                    return True, f"Authenticated successfully as {name} (role: {role})", {
                        "username": name,
                        "role": role,
                        "organizations": orgs,
                        "email": data.get("email"),
                    }
                elif resp.status_code == 401:
                    return False, "Invalid or expired Hugging Face API token", {}
                else:
                    return False, f"Hugging Face API returned status {resp.status_code}: {resp.text[:200]}", {}
        except Exception as exc:
            logger.error(f"HF validate_credentials error: {exc}")
            return False, f"Connection to Hugging Face failed: {str(exc)}", {}

    async def test_connection(self) -> Tuple[bool, int, str]:
        """Tests live latency and reachability to Hugging Face Hub."""
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.BASE_URL}/models?limit=1", headers=self.headers)
                latency_ms = int((time.monotonic() - start) * 1000)
                if resp.status_code in (200, 201):
                    return True, latency_ms, f"Hugging Face Hub reachable ({latency_ms}ms)"
                return False, latency_ms, f"Hugging Face returned status {resp.status_code}"
        except Exception as exc:
            latency_ms = int((time.monotonic() - start) * 1000)
            return False, latency_ms, f"Connection failed: {str(exc)}"

    async def discover_models(self, limit: int = 50, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Discovers models available to the token (or top popular/queried models).
        Standardizes records into Kavach ModelAsset schemas.
        """
        params: Dict[str, Any] = {"limit": min(limit, 100), "full": "true"}
        if query:
            params["search"] = query
        elif self.credentials.get("author"):
            params["author"] = self.credentials["author"]

        url = f"{self.BASE_URL}/models"
        discovered: List[Dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=self.headers, params=params)
                if resp.status_code != 200:
                    logger.warning(f"HF discover_models returned {resp.status_code}: {resp.text[:200]}")
                    return []

                raw_models = resp.json()
                for item in raw_models:
                    model_id = item.get("id") or item.get("modelId")
                    if not model_id:
                        continue

                    # Analyze tags for architecture, family, pipeline
                    tags = item.get("tags", [])
                    pipeline = item.get("pipeline_tag") or "text-generation"
                    siblings = item.get("siblings", [])

                    # Detect primary format from sibling files
                    file_names = [s.get("rfilename", "").lower() for s in siblings if isinstance(s, dict)]
                    has_safetensors = any(f.endswith(".safetensors") for f in file_names)
                    has_pickle = any(f.endswith(".bin") or f.endswith(".pt") or f.endswith(".pth") or f.endswith(".pkl") for f in file_names)
                    has_onnx = any(f.endswith(".onnx") for f in file_names)
                    has_gguf = any(f.endswith(".gguf") for f in file_names)

                    if has_safetensors and not has_pickle:
                        model_format = "safetensors"
                    elif has_safetensors and has_pickle:
                        model_format = "mixed"
                    elif has_pickle:
                        model_format = "pytorch_bin"
                    elif has_onnx:
                        model_format = "onnx"
                    elif has_gguf:
                        model_format = "gguf"
                    else:
                        model_format = "safetensors"

                    # Infer model family
                    model_family = "general"
                    for fam in ["llama", "bert", "mistral", "qwen", "gemma", "falcon", "phi", "gpt2", "whisper", "clip", "roberta", "t5"]:
                        if fam in model_id.lower() or fam in tags:
                            model_family = fam
                            break

                    author = model_id.split("/")[0] if "/" in model_id else "community"

                    discovered.append({
                        "model_id_str": model_id,
                        "name": model_id.split("/")[-1] if "/" in model_id else model_id,
                        "provider": "huggingface",
                        "model_family": model_family,
                        "task_type": pipeline,
                        "model_format": model_format,
                        "author_name": author,
                        "is_private": bool(item.get("private", False)),
                        "source_repo_url": f"https://huggingface.co/{model_id}",
                        "artifact_location": f"hf://{model_id}",
                        "tags": tags,
                        "parameters_str": item.get("safetensors", {}).get("total") if isinstance(item.get("safetensors"), dict) else None,
                        "commit_sha": item.get("sha"),
                        "raw_metadata": {
                            "downloads": item.get("downloads", 0),
                            "likes": item.get("likes", 0),
                            "security_status": item.get("securityStatus"),
                            "last_modified": item.get("lastModified"),
                        }
                    })
        except Exception as exc:
            logger.error(f"HF discover_models exception: {exc}")

        return discovered

    async def get_model_details(self, model_id_str: str) -> Dict[str, Any]:
        """Fetches detailed single model metadata from Hugging Face."""
        url = f"{self.BASE_URL}/models/{model_id_str}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, headers=self.headers, params={"securityStatus": "true"})
                if resp.status_code == 200:
                    data = resp.json()
                    return data
                logger.warning(f"Failed to fetch model details for {model_id_str}: {resp.status_code}")
                return {}
        except Exception as exc:
            logger.error(f"Error fetching model details for {model_id_str}: {exc}")
            return {}

    async def get_artifact_references(self, model_id_str: str) -> List[Dict[str, Any]]:
        """Lists all files/siblings for the model."""
        details = await self.get_model_details(model_id_str)
        siblings = details.get("siblings", [])
        artifacts: List[Dict[str, Any]] = []

        for s in siblings:
            fname = s.get("rfilename")
            if not fname:
                continue

            lower_fname = fname.lower()
            if lower_fname.endswith(".safetensors"):
                ftype = "safetensors"
                is_pickle = False
            elif any(lower_fname.endswith(ext) for ext in [".bin", ".pt", ".pth", ".pkl"]):
                ftype = "pickle"
                is_pickle = True
            elif lower_fname.endswith(".json"):
                ftype = "config"
                is_pickle = False
            elif lower_fname.endswith(".onnx"):
                ftype = "onnx"
                is_pickle = False
            elif lower_fname.endswith(".gguf"):
                ftype = "gguf"
                is_pickle = False
            elif lower_fname.endswith(".py") or lower_fname.endswith(".sh"):
                ftype = "script"
                is_pickle = False
            else:
                ftype = "other"
                is_pickle = False

            artifacts.append({
                "path": fname,
                "type": ftype,
                "is_serialized_pickle": is_pickle,
                "download_url": f"https://huggingface.co/{model_id_str}/resolve/main/{fname}",
                "size_bytes": s.get("size", 0),
            })

        return artifacts

