import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def now_utc():
    return datetime.now(timezone.utc)


class RepositorySnapshot(Base, TimestampMixin):
    """
    Commit-pinned repository intelligence snapshot.
    Every scan or sync binds to a specific commit SHA and records complete codebase architecture.
    """
    __tablename__ = "repository_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    commit_sha: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        index=True,
    )
    branch: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="main",
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="INITIALIZING",  # INITIALIZING, INDEXING, READY, OUTDATED, FAILED
        index=True,
    )
    understanding_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_files_indexed: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_symbols_indexed: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_endpoints_mapped: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_dependencies_mapped: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_modules_identified: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    primary_language: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Unknown",
    )
    architecture_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Modular Application",
    )
    frameworks: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    languages: Mapped[Dict[str, int]] = mapped_column(
        JSON,
        default=dict,
    )
    entry_points: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
    )

    # Relationships
    files: Mapped[List["RepositoryFileIndex"]] = relationship(
        "RepositoryFileIndex",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    symbols: Mapped[List["RepositoryCodeSymbol"]] = relationship(
        "RepositoryCodeSymbol",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    endpoints: Mapped[List["RepositoryApiEndpoint"]] = relationship(
        "RepositoryApiEndpoint",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    architecture_map: Mapped[Optional["RepositoryArchitectureMap"]] = relationship(
        "RepositoryArchitectureMap",
        back_populates="snapshot",
        uselist=False,
        cascade="all, delete-orphan",
    )
    dependencies: Mapped[List["RepositoryDependencyRelation"]] = relationship(
        "RepositoryDependencyRelation",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )


class RepositoryFileIndex(Base):
    """
    Indexed source file with language, size, hash, and functional role.
    """
    __tablename__ = "repository_file_indices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        index=True,
    )
    language: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Unknown",
    )
    size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    line_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    file_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    is_binary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )
    is_generated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="source",  # entry_point, controller, service, model, middleware, config, test, component, utility
    )
    imports: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    exports: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
    )

    snapshot: Mapped["RepositorySnapshot"] = relationship(
        "RepositorySnapshot",
        back_populates="files",
    )


class RepositoryCodeSymbol(Base):
    """
    AST-derived code symbol (Class, Function, Method, Endpoint, Model) with exact line ranges.
    """
    __tablename__ = "repository_code_symbols"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    symbol_identifier: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    symbol_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # CLASS, FUNCTION, METHOD, INTERFACE, ENDPOINT, MODEL
        index=True,
    )
    file_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        index=True,
    )
    line_start: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    line_end: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    parameters: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    parent_symbol: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    docstring: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_exported: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )
    calls_made: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    called_by: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
    )

    snapshot: Mapped["RepositorySnapshot"] = relationship(
        "RepositorySnapshot",
        back_populates="symbols",
    )


class RepositoryApiEndpoint(Base):
    """
    Discovered HTTP route/API endpoint, method, middleware, and handler function.
    """
    __tablename__ = "repository_api_endpoints"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    http_method: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="GET",
        index=True,
    )
    path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        index=True,
    )
    handler_function: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    file_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    line_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    middleware: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    auth_required: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )
    auth_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    parameters: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        default=list,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
    )

    snapshot: Mapped["RepositorySnapshot"] = relationship(
        "RepositorySnapshot",
        back_populates="endpoints",
    )


class RepositoryArchitectureMap(Base):
    """
    High-level architecture map: Frontend, Backend, Databases, Auth, Modules, and Data flows.
    """
    __tablename__ = "repository_architecture_maps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    project_purpose: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="Application codebase",
    )
    architecture_style: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Modular Application",
    )
    frontend_frameworks: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    backend_frameworks: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    database_technologies: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    orm_libraries: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    auth_mechanisms: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    external_integrations: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    modules: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        default=list,
    )
    data_flows: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        default=list,
    )
    execution_entry_points: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    understanding_metrics: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
    )

    snapshot: Mapped["RepositorySnapshot"] = relationship(
        "RepositorySnapshot",
        back_populates="architecture_map",
    )


class RepositoryDependencyRelation(Base):
    """
    Import, call, or structural dependency between internal modules or external packages.
    """
    __tablename__ = "repository_dependency_relations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_module: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True,
    )
    target_module: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True,
    )
    relationship_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="IMPORTS",  # IMPORTS, CALLS, EXTENDS, DEPENDS_ON, WRITES_TO
        index=True,
    )
    is_external: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )
    file_path: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    line_number: Mapped[int] = mapped_column(
        Integer,
        default=1,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
    )

    snapshot: Mapped["RepositorySnapshot"] = relationship(
        "RepositorySnapshot",
        back_populates="dependencies",
    )


class RepositorySyncEvent(Base):
    """
    Audit log of full or incremental context synchronizations between Git commits.
    """
    __tablename__ = "repository_sync_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("github_repositories.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    previous_commit_sha: Mapped[Optional[str]] = mapped_column(
        String(40),
        nullable=True,
    )
    current_commit_sha: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        index=True,
    )
    sync_mode: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="INCREMENTAL",  # FULL, INCREMENTAL, WEBHOOK, MANUAL
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="QUEUED",  # QUEUED, RUNNING, COMPLETED, FAILED
    )
    files_added: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    files_modified: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    files_deleted: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    affected_modules: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    duration_seconds: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
    )

