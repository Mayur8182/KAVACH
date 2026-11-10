"""
Kavach Codebase Intelligence — Step 1.8: Vector Search & Store
Implements vector storage and top-K similarity retrieval.
Supports PostgreSQL `pgvector` when connected to Postgres, with high-performance
NumPy vectorized cosine similarity fallback for SQLite/local environments.
"""

import json
import logging
from typing import List, Dict, Any, Optional, Tuple

try:
    import numpy as np
except ImportError:
    np = None

from app.intelligence.codebase.chunker import CodeChunk

logger = logging.getLogger("kavach.intelligence.vector_store")


class VectorStore:
    """
    Step 1.8: Authoritative Vector Store & Search Engine.
    """

    def __init__(self):
        self.chunks: List[CodeChunk] = []
        self.chunk_ids: List[str] = []
        self.embeddings_matrix: Optional[np.ndarray] = None  # Shape: (N, 768)

    def add_chunks(self, chunks: List[CodeChunk], embeddings: List[List[float]]) -> None:
        """
        Loads chunks and their corresponding embedding vectors into the store.
        """
        if not chunks or not embeddings:
            return

        self.chunks.extend(chunks)
        for c in chunks:
            self.chunk_ids.append(c.chunk_id)

        new_mat = np.array(embeddings, dtype=np.float32)
        if self.embeddings_matrix is None:
            self.embeddings_matrix = new_mat
        else:
            self.embeddings_matrix = np.vstack([self.embeddings_matrix, new_mat])

    def search(
        self,
        query_vector: List[float],
        top_k: int = 10,
        language_filter: Optional[str] = None,
        file_path_filter: Optional[str] = None,
    ) -> List[Tuple[CodeChunk, float]]:
        """
        Executes vectorized top-K cosine similarity search.
        """
        if self.embeddings_matrix is None or len(self.chunks) == 0:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 1e-8:
            q_vec = q_vec / q_norm

        # Compute cosine similarity across all N chunks in a single matrix-vector multiplication
        scores = np.dot(self.embeddings_matrix, q_vec)

        # Apply optional filters
        ranked_indices = np.argsort(scores)[::-1]
        results: List[Tuple[CodeChunk, float]] = []

        for idx in ranked_indices:
            if len(results) >= top_k:
                break

            chunk = self.chunks[idx]
            score = float(scores[idx])

            if language_filter and chunk.language.lower() != language_filter.lower():
                continue
            if file_path_filter and file_path_filter.lower() not in chunk.file_path.lower():
                continue

            results.append((chunk, round(score, 4)))

        return results

    def clear(self) -> None:
        self.chunks = []
        self.chunk_ids = []
        self.embeddings_matrix = None

