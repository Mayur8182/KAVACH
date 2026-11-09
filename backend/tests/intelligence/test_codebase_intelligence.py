"""
Kavach Codebase Intelligence Engine — Test Suite
Validates Steps 1.1 to 1.10 of Phase 1:
- Ingestion & Boundary Containment
- Language Detection
- AST Parsing & Route/Sink Extraction
- Symbol Indexing & Cross-File Resolution
- NetworkX Dependency Graph & Taint Reachability
- Syntax-Aware Code Chunking
- Semantic Embeddings & Vector Search
- Reciprocal Rank Fusion Hybrid Retrieval
- End-to-End Taint Query: "Find all API endpoints where user input reaches an SQL query without sanitization"
"""

import os
import tempfile
import shutil
import pytest
import pytest_asyncio
import uuid
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.models.base import Base

from app.intelligence.codebase.ingestion import RepositoryIngestionService
from app.intelligence.codebase.language_detector import LanguageDetector
from app.intelligence.codebase.ast_parser import MultiLanguageASTParser
from app.intelligence.codebase.symbol_index import SymbolIndex
from app.intelligence.codebase.dependency_graph import DependencyGraphEngine
from app.intelligence.codebase.chunker import CodeChunker
from app.intelligence.codebase.embedder import CodebaseEmbedder
from app.intelligence.codebase.vector_store import VectorStore
from app.intelligence.codebase.hybrid_retriever import HybridRetriever
from app.intelligence.codebase.engine import CodebaseIntelligenceEngine
from app.models.user import User
from app.models.project import Project
from app.intelligence.action_orchestrator import CentralActionOrchestrator


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="security.analyst@kavach.me",
        password_hash="mock_hash",
        name="Security Analyst",
        is_active=True,
    )


@pytest.fixture
def sample_repo(tmp_path):
    """
    Creates a real multi-file test repository demonstrating cross-file taint:
    - routes/order_route.py: Defines @router.post("/orders") calling OrderController.create_order
    - controllers/order_controller.py: OrderController calls OrderDAO.save_order
    - models/order_dao.py: OrderDAO executes raw SQL cursor.execute(query)
    - routes/user_api.ts: Express route router.get("/users")
    """
    repo_dir = tmp_path / "sample_vulnerable_repo"
    repo_dir.mkdir()

    # File 1: routes/order_route.py
    routes_dir = repo_dir / "routes"
    routes_dir.mkdir()
    (routes_dir / "order_route.py").write_text("""
from fastapi import APIRouter
from controllers.order_controller import OrderController

router = APIRouter()

@router.post("/orders")
def handle_create_order(payload: dict):
    '''Endpoint receiving raw user order'''
    user_input = payload.get("raw_query")
    controller = OrderController()
    return controller.create_order(user_input)
""", encoding="utf-8")

    # File 2: controllers/order_controller.py
    ctrl_dir = repo_dir / "controllers"
    ctrl_dir.mkdir()
    (ctrl_dir / "order_controller.py").write_text("""
from models.order_dao import OrderDAO

class OrderController:
    def create_order(self, raw_input):
        '''Processes input and delegates to database'''
        dao = OrderDAO()
        return dao.save_order(raw_input)
""", encoding="utf-8")

    # File 3: models/order_dao.py
    models_dir = repo_dir / "models"
    models_dir.mkdir()
    (models_dir / "order_dao.py").write_text("""
import sqlite3

class OrderDAO:
    def save_order(self, query_string):
        '''Vulnerable sink: executes unsanitized user query'''
        conn = sqlite3.connect(":memory:")
        cursor = conn.cursor()
        sql = f"INSERT INTO orders VALUES ('{query_string}')"
        cursor.execute(sql)
        conn.commit()
        return True
""", encoding="utf-8")

    # File 4: routes/user_api.ts (TypeScript express route)
    (routes_dir / "user_api.ts").write_text("""
import { Router } from 'express';
const router = Router();

router.get("/users", (req, res) => {
    res.json({ status: "ok" });
});
export default router;
""", encoding="utf-8")

    return str(repo_dir)


def test_repository_ingestion_and_language_detection(sample_repo):
    ingestor = RepositoryIngestionService(sample_repo)
    inv = ingestor.ingest()

    assert inv.total_files == 4
    rel_paths = [f.relative_path for f in inv.files]
    assert "routes/order_route.py" in rel_paths
    assert "controllers/order_controller.py" in rel_paths
    assert "models/order_dao.py" in rel_paths
    assert "routes/user_api.ts" in rel_paths

    stats = LanguageDetector.analyze_repository(inv.files)
    assert "Python" in stats
    assert "TypeScript" in stats
    assert stats["Python"].file_count == 3
    assert stats["TypeScript"].file_count == 1


def test_ast_parsing_and_symbol_indexing(sample_repo):
    ingestor = RepositoryIngestionService(sample_repo)
    inv = ingestor.ingest()

    asts = [MultiLanguageASTParser.parse_file(f) for f in inv.files]
    py_ast = next(a for a in asts if a.file_path == "routes/order_route.py")

    assert len(py_ast.endpoints) == 1
    assert py_ast.endpoints[0].name == "handle_create_order"
    assert py_ast.endpoints[0].endpoint_method == "POST"
    assert py_ast.endpoints[0].endpoint_path == "/orders"

    # Index into SymbolIndex
    index = SymbolIndex()
    for a in asts:
        index.index_ast(a)
    index.resolve_call_graph()

    dao_syms = index.find_symbol("save_order")
    assert len(dao_syms) == 1
    assert dao_syms[0].file_path == "models/order_dao.py"
    assert "cursor.execute" in dao_syms[0].calls_made

    endpoints = index.get_endpoints()
    assert len(endpoints) >= 1


def test_dependency_graph_and_cross_file_taint_reachability(sample_repo):
    engine = CodebaseIntelligenceEngine(sample_repo)
    stats = engine.index_repository()

    assert stats["total_files_ingested"] == 4
    assert stats["total_endpoints"] >= 1
    assert stats["graph_nodes"] > 5

    # Trace reachability from API endpoint to SQL execution sink
    flow_findings = engine.dep_graph.trace_dataflow_to_sinks("execute")
    assert len(flow_findings) >= 1

    match = flow_findings[0]
    assert match["endpoint_name"] == "handle_create_order"
    assert match["endpoint_file"] == "routes/order_route.py"
    assert match["sink_file"] == "models/order_dao.py"
    assert match["path_length"] >= 3


def test_syntax_aware_code_chunking(sample_repo):
    ingestor = RepositoryIngestionService(sample_repo)
    inv = ingestor.ingest()
    file_dao = next(f for f in inv.files if f.relative_path == "models/order_dao.py")
    ast_dao = MultiLanguageASTParser.parse_file(file_dao)

    chunks = CodeChunker.chunk_file(file_dao, ast_dao)
    assert len(chunks) >= 1
    # Check that save_order method was captured as a discrete chunk
    method_chunk = next((c for c in chunks if c.chunk_type == "METHOD" and "save_order" in (c.symbol_name or "")), None)
    assert method_chunk is not None
    assert "cursor.execute" in method_chunk.content


def test_embedding_and_vector_store_cosine_similarity():
    embedder = CodebaseEmbedder()
    store = VectorStore()

    from app.intelligence.codebase.chunker import CodeChunk
    c1 = CodeChunk(
        chunk_id="chk_sql_1",
        file_path="models/order.py",
        language="Python",
        start_line=1,
        end_line=15,
        chunk_type="FUNCTION",
        symbol_name="execute_sql",
        content="cursor.execute('SELECT * FROM users WHERE id = ' + user_id)",
        context_header="// File: models/order.py > function execute_sql()",
        token_estimate=12,
    )
    c2 = CodeChunk(
        chunk_id="chk_css_2",
        file_path="styles/main.css",
        language="CSS",
        start_line=1,
        end_line=10,
        chunk_type="GENERIC_BLOCK",
        symbol_name=None,
        content=".button { background-color: #2563EB; color: white; }",
        context_header="// File: styles/main.css",
        token_estimate=10,
    )

    v1 = embedder.embed_chunk(c1)
    v2 = embedder.embed_chunk(c2)
    store.add_chunks([c1, c2], [v1, v2])

    # Query for database execution
    q_vec = embedder.embed_query("SQL query database execute unsanitized")
    results = store.search(q_vec, top_k=2)

    assert len(results) == 2
    # c1 (SQL) must score significantly higher than c2 (CSS)
    top_chunk, top_score = results[0]
    assert top_chunk.chunk_id == "chk_sql_1"
    assert top_score > results[1][1]


def test_hybrid_retrieval_rrf(sample_repo):
    engine = CodebaseIntelligenceEngine(sample_repo)
    engine.index_repository()

    hits = engine.hybrid_search("handle_create_order SQL cursor execute", top_k=3)
    assert len(hits) >= 1
    top_hit = hits[0]
    assert "rrf_score" in top_hit
    assert len(top_hit["matched_via"]) >= 1


def test_end_to_end_cross_file_taint_query(sample_repo):
    """
    Simulates the primary user request:
    'Find all API endpoints where user input reaches an SQL query without sanitization'
    """
    engine = CodebaseIntelligenceEngine(sample_repo)
    query = "Find all API endpoints where user input reaches an SQL query without sanitization"
    ctx = engine.query_cross_file_taint(query=query, sink_keyword="execute")

    assert ctx.total_endpoints_analyzed >= 1
    assert ctx.dataflow_paths_found >= 1
    assert "routes/order_route.py" in ctx.formatted_agent_prompt
    assert "models/order_dao.py" in ctx.formatted_agent_prompt
    assert len(ctx.relevant_chunks) >= 1


@pytest.mark.asyncio
async def test_action_orchestrator_routes_codebase_intelligence(async_db, mock_user, sample_repo):
    async_db.add(mock_user)
    await async_db.commit()

    proj = Project(
        id=uuid.uuid4(),
        name="test-repo",
        owner_id=mock_user.id,
        description="Test Repository Workspace",
    )
    async_db.add(proj)
    await async_db.commit()

    orchestrator = CentralActionOrchestrator(async_db)

    # Patch working directory to sample_repo so engine inspects it
    with patch("os.getcwd", return_value=sample_repo):
        query = "Find all API endpoints where user input reaches an SQL query without sanitization"
        res = await orchestrator.process_user_query(
            query=query,
            current_user=mock_user,
            project_id=proj.id,
        )

    assert "Codebase Intelligence & Cross-File Dataflow Engine" in res.get("message", "")
    assert res.get("structured_data", {}).get("type") == "codebase_intelligence"
    assert res.get("structured_data", {}).get("paths_found", 0) >= 1
