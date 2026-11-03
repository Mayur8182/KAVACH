from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from sqlalchemy import String, ForeignKey, DateTime, Boolean, JSON, Enum as SAEnum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from .base import Base

def now_utc():
    return datetime.now(timezone.utc)

class OSType(str, enum.Enum):
    WINDOWS = "WINDOWS"
    MACOS = "MACOS"
    LINUX = "LINUX"
    UNKNOWN = "UNKNOWN"

class GitHookType(str, enum.Enum):
    PRE_COMMIT = "PRE_COMMIT"
    PRE_PUSH = "PRE_PUSH"
    COMMIT_MSG = "COMMIT_MSG"
    POST_COMMIT = "POST_COMMIT"

class DeveloperDevice(Base):
    __tablename__ = "developer_devices"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    os_type: Mapped[OSType] = mapped_column(SAEnum(OSType), default=OSType.UNKNOWN)
    hostname: Mapped[Optional[str]] = mapped_column(String)
    last_active_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class RepositoryBinding(Base):
    __tablename__ = "repository_bindings"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("developer_devices.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    local_path_hash: Mapped[str] = mapped_column(String, nullable=False)
    remote_url: Mapped[Optional[str]] = mapped_column(String)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class GitHookInstallation(Base):
    __tablename__ = "git_hook_installations"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    binding_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repository_bindings.id"), nullable=False)
    hook_type: Mapped[GitHookType] = mapped_column(SAEnum(GitHookType), nullable=False)
    version: Mapped[str] = mapped_column(String, nullable=False)
    installed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    last_executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class HookExecutionStatus(str, enum.Enum):
    PASS = "PASS"
    WARN = "WARN"
    BLOCK = "BLOCK"
    ERROR = "ERROR"
    BYPASSED = "BYPASSED"

class GitHookExecution(Base):
    __tablename__ = "git_hook_executions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    installation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("git_hook_installations.id"), nullable=False)
    commit_sha: Mapped[Optional[str]] = mapped_column(String)
    branch: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[HookExecutionStatus] = mapped_column(SAEnum(HookExecutionStatus), nullable=False)
    duration_ms: Mapped[int] = mapped_column(default=0)
    findings_count: Mapped[int] = mapped_column(default=0)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

class GitHookBypass(Base):
    __tablename__ = "git_hook_bypasses"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    installation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("git_hook_installations.id"), nullable=False)
    commit_sha: Mapped[Optional[str]] = mapped_column(String)
    reason: Mapped[Optional[str]] = mapped_column(String)
    bypassed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class LocalAgentSession(Base):
    __tablename__ = "local_agents" # updated from local_agent_sessions to match requirement
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("developer_devices.id"), nullable=False)
    agent_version: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    last_ping_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class IDESession(Base):
    __tablename__ = "ide_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("developer_devices.id"), nullable=False)
    ide_name: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    last_active_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class CLISession(Base):
    __tablename__ = "cli_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("developer_devices.id"), nullable=False)
    command: Mapped[str] = mapped_column(String, nullable=False)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class DeveloperScanRequest(Base):
    __tablename__ = "developer_scan_requests"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("developer_devices.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    scan_type: Mapped[str] = mapped_column(String, nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class DeveloperScanResult(Base):
    __tablename__ = "developer_scan_results"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("developer_scan_requests.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class SecurityContextVersion(Base):
    __tablename__ = "security_context_versions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    intent_version: Mapped[int] = mapped_column(default=1)
    blueprint_version: Mapped[int] = mapped_column(default=1)
    policy_version: Mapped[int] = mapped_column(default=1)
    contract_version: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class ScannerCacheEntry(Base):
    __tablename__ = "scanner_cache_entries"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    cache_key: Mapped[str] = mapped_column(String, nullable=False)
    results_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class AIAgentAdapter(Base):
    __tablename__ = "ai_agent_adapters"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    version: Mapped[str] = mapped_column(String, nullable=False)

class AIAgentSession(Base):
    __tablename__ = "ai_agent_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    adapter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_agent_adapters.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

class AIAgentSecurityEvent(Base):
    __tablename__ = "ai_agent_security_events"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_agent_sessions.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    event_time: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
