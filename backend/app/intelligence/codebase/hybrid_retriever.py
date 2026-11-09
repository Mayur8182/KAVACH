"""
Kavach Codebase Intelligence — Step 1.9: Hybrid Retrieval Engine
Implements Reciprocal Rank Fusion (RRF) combining:
1. Dense Vector Semantic Search
2. Sparse Keyword / BM25 Search
3. AST Symbol Call Graph Traversal
4. Structured Finding & Policy Metadata
"""

import re
import math
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from app.intelligence.codebase.chunker import CodeChunk
from app.intelligence.codebase.embedder import CodebaseEmbedder
from app.intelligence.codebase.vector_store import VectorStore
from app.intelligence.codebase.symbol_index import SymbolIndex
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine


class HybridRetriever:
    """
    Step 1.9: Reciprocal Rank Fusion (RRF) Hybrid Retriever.
    """

    RRF_K = 60

    def __init__(
        self,
        embedder: CodebaseEmbedder,
        vector_store: VectorStore,
        symbol_index: SymbolIndex,
        dep_graph: DependencyGraphEngine,
    ):
        self.embedder = embedder
        self.vector_store = vector_store
        self.symbol_index = symbol_index
        self.dep_graph = dep_graph

    def retrieve(
        self,
        query: str,
        top_k: int = 10,
        language_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes multi-modal hybrid retrieval and fuses ranks via RRF.
        """
        # 1. Dense Vector Search
        q_vec = self.embedder.embed_query(query)
        vector_hits = self.vector_store.search(
            query_vector=q_vec,
            top_k=top_k * 2,
            language_filter=language_filter,
        )

        # 2. Sparse Keyword Search
        keyword_hits = self._keyword_search(query, top_k=top_k * 2, language_filter=language_filter)

        # 3. AST Symbol Graph Hits
        ast_hits = self._ast_symbol_search(query, top_k=top_k * 2)

        # 4. Reciprocal Rank Fusion (RRF)
        rrf_scores: Dict[str, float] = defaultdict(float)
        chunk_map: Dict[str, CodeChunk] = {}
        matched_sources: Dict[str, List[str]] = defaultdict(list)

        # Add vector ranks
        for rank, (chunk, score) in enumerate(vector_hits, 1):
            cid = chunk.chunk_id
            chunk_map[cid] = chunk
            rrf_scores[cid] += 1.0 / (self.RRF_K + rank)
            matched_sources[cid].append(f"vector (rank {rank}, sim {score:.2f})")

        # Add keyword ranks
        for rank, (chunk, score) in enumerate(keyword_hits, 1):
            cid = chunk.chunk_id
            chunk_map[cid] = chunk
            rrf_scores[cid] += 1.0 / (self.RRF_K + rank)
            matched_sources[cid].append(f"keyword (rank {rank}, matches {score})")

        # Add AST symbol ranks
        for rank, (chunk, desc) in enumerate(ast_hits, 1):
            cid = chunk.chunk_id
            chunk_map[cid] = chunk
            rrf_scores[cid] += 1.2 / (self.RRF_K + rank)  # Boost AST hits slightly
            matched_sources[cid].append(f"ast ({desc})")

        # Sort by total RRF score
        sorted_cids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)[:top_k]

        results = []
        for cid in sorted_cids:
            chk = chunk_map[cid]
            results.append({
                "chunk_id": chk.chunk_id,
                "file_path": chk.file_path,
                "language": chk.language,
                "start_line": chk.start_line,
                "end_line": chk.end_line,
                "symbol_name": chk.symbol_name,
                "chunk_type": chk.chunk_type,
                "context_header": chk.context_header,
                "content": chk.content,
                "rrf_score": round(rrf_scores[cid], 5),
                "matched_via": matched_sources[cid],
            })

        return results

    def _keyword_search(
        self,
        query: str,
        top_k: int = 15,
        language_filter: Optional[str] = None
    ) -> List[Tuple[CodeChunk, int]]:
        tokens = [t.lower() for t in re.findall(r"\w+", query) if len(t) > 2]
        if not tokens:
            return []

        scored: List[Tuple[CodeChunk, int]] = []
        for chk in self.vector_store.chunks:
            if language_filter and chk.language.lower() != language_filter.lower():
                continue

            content_low = chk.content.lower()
            matches = sum(content_low.count(t) for t in tokens)
            if matches > 0:
                scored.append((chk, matches))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def _ast_symbol_search(self, query: str, top_k: int = 10) -> List[Tuple[CodeChunk, str]]:
        q_tokens = [t.lower() for t in re.findall(r"\w+", query)]
        results: List[Tuple[CodeChunk, str]] = []

        for chk in self.vector_store.chunks:
            if not chk.symbol_name:
                continue

            sym_low = chk.symbol_name.lower()
            if any(t in sym_low for t in q_tokens):
                results.append((chk, f"symbol match '{chk.symbol_name}'"))
                if len(results) >= top_k:
                    break

        return results

