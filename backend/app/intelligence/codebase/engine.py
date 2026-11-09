"""
Kavach Codebase Intelligence — Unified Engine
Orchestrates Steps 1.1 to 1.10 into a cohesive Codebase Intelligence Engine.
Enables cross-file vulnerability understanding, dataflow analysis, and hybrid semantic retrieval.
"""

import os
import logging
from typing import Dict, Any, List, Optional

from app.intelligence.codebase.ingestion import RepositoryIngestionService, RepositoryInventory
from app.intelligence.codebase.language_detector import LanguageDetector, LanguageStats
from app.intelligence.codebase.ast_parser import MultiLanguageASTParser, CodeFileAST
from app.intelligence.codebase.symbol_index import SymbolIndex
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine
from app.intelligence.codebase.chunker import CodeChunker, CodeChunk
from app.intelligence.codebase.embedder import CodebaseEmbedder
from app.intelligence.codebase.vector_store import VectorStore
from app.intelligence.codebase.hybrid_retriever import HybridRetriever
from app.intelligence.codebase.context_builder import CrossFileContextBuilder, CrossFileDataflowContext

logger = logging.getLogger("kavach.intelligence.codebase_engine")


class CodebaseIntelligenceEngine:
    """
    Phase 1 Master Engine: Complete Repository Understanding.
    """

    def __init__(self, root_path: str):
        self.root_path = os.path.abspath(root_path)
        self.ingestion_service = RepositoryIngestionService(self.root_path)
        self.symbol_index = SymbolIndex()
        self.dep_graph = DependencyGraphEngine(self.symbol_index)
        self.embedder = CodebaseEmbedder()
        self.vector_store = VectorStore()
        self.hybrid_retriever = HybridRetriever(
            self.embedder,
            self.vector_store,
            self.symbol_index,
            self.dep_graph,
        )
        self.context_builder = CrossFileContextBuilder(
            self.symbol_index,
            self.dep_graph,
            self.hybrid_retriever,
        )

        self.inventory: Optional[RepositoryInventory] = None
        self.language_stats: Dict[str, LanguageStats] = {}
        self.parsed_asts: List[CodeFileAST] = []
        self.all_chunks: List[CodeChunk] = []
        self.is_indexed: bool = False

    @property
    def file_asts(self) -> Dict[str, CodeFileAST]:
        return {a.file_path: a for a in self.parsed_asts}

    @property
    def dependency_graph_engine(self) -> DependencyGraphEngine:
        return self.dep_graph

    def index_repository(self, max_files: int = 500, compute_embeddings: bool = True) -> Dict[str, Any]:
        """
        Executes Steps 1.1 to 1.8 across the repository.
        """
        logger.info(f"Indexing repository at {self.root_path}")

        # Step 1.1: Ingestion
        self.inventory = self.ingestion_service.ingest(max_files=max_files)

        # Step 1.2: Language Detection
        self.language_stats = LanguageDetector.analyze_repository(self.inventory.files)

        # Step 1.3 & 1.4: AST Parsing & Symbol Indexing
        self.parsed_asts = []
        self.symbol_index = SymbolIndex()

        for file in self.inventory.files:
            ast_obj = MultiLanguageASTParser.parse_file(file)
            self.parsed_asts.append(ast_obj)
            self.symbol_index.index_ast(ast_obj)

        self.symbol_index.resolve_call_graph()

        # Step 1.5: Dependency Graph
        self.dep_graph = DependencyGraphEngine(self.symbol_index)
        self.dep_graph.build_from_asts(self.parsed_asts)

        if compute_embeddings:
            # Step 1.6: Code Chunking
            self.all_chunks = []
            ast_by_path = {a.file_path: a for a in self.parsed_asts}
            for file in self.inventory.files:
                chunks = CodeChunker.chunk_file(file, ast_by_path.get(file.relative_path))
                self.all_chunks.extend(chunks)

            # Step 1.7 & 1.8: Embedding & Vector Storage
            self.vector_store.clear()
            embeddings = [self.embedder.embed_chunk(c) for c in self.all_chunks]
            self.vector_store.add_chunks(self.all_chunks, embeddings)

        # Re-link Retriever and Context Builder
        self.hybrid_retriever = HybridRetriever(
            self.embedder,
            self.vector_store,
            self.symbol_index,
            self.dep_graph,
        )
        self.context_builder = CrossFileContextBuilder(
            self.symbol_index,
            self.dep_graph,
            self.hybrid_retriever,
        )

        self.is_indexed = True

        return {
            "root_path": self.root_path,
            "total_files_ingested": self.inventory.total_files,
            "total_size_bytes": self.inventory.total_size_bytes,
            "languages": {k: v.file_count for k, v in self.language_stats.items()},
            "total_symbols": len(self.symbol_index.symbols),
            "total_endpoints": len(self.symbol_index.endpoints),
            "total_chunks": len(self.all_chunks),
            "graph_nodes": self.dep_graph.graph.number_of_nodes(),
            "graph_edges": self.dep_graph.graph.number_of_edges(),
        }

    def query_cross_file_taint(
        self,
        query: str = "Find all API endpoints where user input reaches an SQL query without sanitization",
        sink_keyword: str = "execute",
    ) -> CrossFileDataflowContext:
        """
        Executes Steps 1.9 & 1.10: Returns cross-file dataflow taint context.
        """
        if not self.is_indexed:
            self.index_repository()

        return self.context_builder.build_cross_file_taint_context(query, sink_keyword=sink_keyword)

    def hybrid_search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Executes Step 1.9 Reciprocal Rank Fusion search.
        """
        if not self.is_indexed:
            self.index_repository()

        return self.hybrid_retriever.retrieve(query, top_k=top_k)

