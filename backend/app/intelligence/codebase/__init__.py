"""
Kavach Codebase Intelligence Engine Package
Phase 1 Implementation: Complete Repository Understanding
"""

from app.intelligence.codebase.ingestion import RepositoryIngestionService, IngestedFile, RepositoryInventory
from app.intelligence.codebase.language_detector import LanguageDetector, LanguageStats
from app.intelligence.codebase.ast_parser import MultiLanguageASTParser, CodeFileAST, ASTFunction, ASTClass, ASTCall, ASTImport
from app.intelligence.codebase.symbol_index import SymbolIndex, CodeSymbol, SymbolType
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine
from app.intelligence.codebase.chunker import CodeChunker, CodeChunk
from app.intelligence.codebase.embedder import CodebaseEmbedder
from app.intelligence.codebase.vector_store import VectorStore
from app.intelligence.codebase.hybrid_retriever import HybridRetriever
from app.intelligence.codebase.context_builder import CrossFileContextBuilder, CrossFileDataflowContext
from app.intelligence.codebase.engine import CodebaseIntelligenceEngine

__all__ = [
    "RepositoryIngestionService",
    "IngestedFile",
    "RepositoryInventory",
    "LanguageDetector",
    "LanguageStats",
    "MultiLanguageASTParser",
    "CodeFileAST",
    "ASTFunction",
    "ASTClass",
    "ASTCall",
    "ASTImport",
    "SymbolIndex",
    "CodeSymbol",
    "SymbolType",
    "DependencyGraphEngine",
    "CodeChunker",
    "CodeChunk",
    "CodebaseEmbedder",
    "VectorStore",
    "HybridRetriever",
    "CrossFileContextBuilder",
    "CrossFileDataflowContext",
    "CodebaseIntelligenceEngine",
]

