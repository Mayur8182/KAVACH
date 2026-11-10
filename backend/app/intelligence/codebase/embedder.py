"""
Kavach Codebase Intelligence — Step 1.7: Embedding Pipeline
Generates 768-dimensional semantic embeddings for code chunks and security queries.
Uses Google Gemini Embedding API with deterministic token-projection fallback for zero-API offline execution.
"""

import os
import re
import math
import hashlib
import logging
from typing import List, Dict, Any, Optional

try:
    import numpy as np
except ImportError:
    np = None

from app.core.config import get_settings
from app.intelligence.codebase.chunker import CodeChunk

logger = logging.getLogger("kavach.intelligence.embedder")

EMBEDDING_DIM = 768


class CodebaseEmbedder:
    """
    Step 1.7: Authoritative Embedding Pipeline.
    """

    def __init__(self):
        self.settings = get_settings()
        self.api_key = getattr(self.settings, "gemini_api_key", None)
        self.has_gemini = bool(self.api_key and self.api_key != "mock-gemini-key")
        if self.has_gemini:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
            except Exception as ex:
                logger.warning(f"Could not initialize Google GenAI embedder: {ex}")
                self.has_gemini = False

    def embed_chunk(self, chunk: CodeChunk) -> List[float]:
        """
        Embeds a single code chunk, injecting file & symbol breadcrumbs into context.
        """
        text = f"{chunk.context_header}\n\n{chunk.content}"
        return self.embed_text(text)

    def embed_query(self, query: str) -> List[float]:
        """
        Embeds a user query (e.g., 'Find all API endpoints where user input reaches an SQL query')
        """
        return self.embed_text(query)

    def embed_text(self, text: str) -> List[float]:
        # Clean text & mask secrets
        clean_text = self._sanitize_text(text)

        if self.has_gemini:
            try:
                import google.generativeai as genai
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=clean_text[:4000],
                    task_type="retrieval_document",
                )
                embedding = result.get("embedding")
                if embedding and len(embedding) > 0:
                    # Pad or truncate to EMBEDDING_DIM
                    return self._normalize_dim(embedding, EMBEDDING_DIM)
            except Exception as ex:
                logger.debug(f"Gemini API embed fallback triggered: {ex}")

        # Deterministic offline dense vector projection (reproducible, zero-cost)
        return self._deterministic_dense_projection(clean_text, EMBEDDING_DIM)

    def _sanitize_text(self, text: str) -> str:
        # Strip potential keys/tokens
        masked = re.sub(r"""(?i)(?:password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]""", "secret=REDACTED", text)
        return masked

    def _deterministic_dense_projection(self, text: str, dim: int) -> List[float]:
        """
        Deterministic, sub-millisecond dense projection using token-hashing & subword n-grams.
        Preserves cosine distance similarity for semantically identical terms.
        """
        vec = np.zeros(dim, dtype=np.float32)
        words = re.findall(r"\w+", text.lower())

        if not words:
            return vec.tolist()

        for w in words:
            h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if (h >> 8) & 1 else -1.0
            weight = 1.0 + math.log(1.0 + len(w))
            vec[idx] += sign * weight

            # Also hash character bigrams for code token similarity (e.g. `execute_query` ~ `query`)
            for i in range(len(w) - 2):
                gram = w[i:i+3]
                gh = int(hashlib.sha256(gram.encode("utf-8")).hexdigest(), 16)
                g_idx = gh % dim
                g_sign = 1.0 if (gh >> 8) & 1 else -1.0
                vec[g_idx] += g_sign * 0.5

        # L2 Normalize
        norm = np.linalg.norm(vec)
        if norm > 1e-8:
            vec = vec / norm

        return vec.tolist()

    def _normalize_dim(self, vec: List[float], target_dim: int) -> List[float]:
        arr = np.array(vec, dtype=np.float32)
        if len(arr) == target_dim:
            norm = np.linalg.norm(arr)
            return (arr / norm if norm > 1e-8 else arr).tolist()
        elif len(arr) > target_dim:
            arr = arr[:target_dim]
        else:
            arr = np.pad(arr, (0, target_dim - len(arr)))
        norm = np.linalg.norm(arr)
        return (arr / norm if norm > 1e-8 else arr).tolist()

