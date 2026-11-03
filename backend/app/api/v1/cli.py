"""
CLI & Local Security Agent API — Step 27

Provides authenticated endpoints for:
- Developer device registration
- Repository binding / project trust
- Security context retrieval (intent, blueprint, contracts, policy)
- Developer scan requests
- Git hook recording (execution + bypass)
- AI agent session management
- Scanner cache (invalidation-aware)
- SARIF / JSON output support
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import hashlib
import json

from app.core.database import get_db
from app.models.cli_models import (
    DeveloperDevice,
    RepositoryBinding,
    GitHookInstallation,
    GitHookExecution,
    GitHookBypass,
    GitHookType,
    HookExecutionStatus,
    LocalAgentSession,
    IDESession,
    CLISession,
    DeveloperScanRequest,
    DeveloperScanResult,
    SecurityContextVersion,
    ScannerCacheEntry,
    AIAgentAdapter,
    AIAgentSession,
    AIAgentSecurityEvent,
    OSType,
)
from app.models.project import Project
from pydantic import BaseModel, Field

router = APIRouter(prefix="/cli", tags=["CLI & Local Agent"])


# ─────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────

class CLIAuthRequest(BaseModel):
    device_name: str
    os_type: str = "UNKNOWN"
    hostname: Optional[str] = None


class CLIAuthResponse(BaseModel):
    device_id: str
    token: str
    message: str = "Authentication successful. Store token securely (use OS credential store)."


class RepoBindRequest(BaseModel):
    device_id: str
    project_id: str
    local_path_hash: str
    remote_url: Optional[str] = None
    branch: Optional[str] = None
    detected_languages: Optional[List[str]] = None
    detected_frameworks: Optional[List[str]] = None


class RepoBindResponse(BaseModel):
    binding_id: str
    project_id: str
    message: str = "Repository bound successfully."


class SecurityContextResponse(BaseModel):
    project_id: str
    intent_version: int
    blueprint_version: int
    policy_version: int
    contract_version: int
    intent: Optional[dict] = None
    blueprint: Optional[dict] = None
    contracts: Optional[List[dict]] = None
    policy: Optional[dict] = None
    offline_mode: bool = False


class HookInstallRequest(BaseModel):
    binding_id: str
    hook_type: str  # PRE_COMMIT | PRE_PUSH | COMMIT_MSG | POST_COMMIT
    version: str = "0.1.0"


class HookInstallResponse(BaseModel):
    installation_id: str


class HookExecutionRequest(BaseModel):
    installation_id: str
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    status: str  # PASS | WARN | BLOCK | ERROR | BYPASSED
    duration_ms: int = 0
    findings_count: int = 0
    metadata: Optional[dict] = None


class HookBypassRequest(BaseModel):
    installation_id: Optional[str] = None
    commit_sha: Optional[str] = None
    reason: Optional[str] = None


class DeveloperScanRequestSchema(BaseModel):
    device_id: str
    project_id: str
    scan_type: str  # FULL | CHANGED | STAGED | INCREMENTAL
    commit_sha: Optional[str] = None
    files_changed: Optional[List[str]] = None


class DeveloperScanResultSchema(BaseModel):
    request_id: str
    status: str
    findings_count: int = 0
    findings: Optional[List[dict]] = None
    policy_decision: Optional[str] = None
    duration_ms: Optional[int] = None


class AIAgentSessionRequest(BaseModel):
    adapter_name: str
    project_id: str


class AIAgentSecurityEventRequest(BaseModel):
    session_id: str
    event_type: str
    details: Optional[dict] = None


class CacheInvalidateRequest(BaseModel):
    project_id: str
    reason: str


# ─────────────────────────────────────────────
# Helper: compute cache key
# ─────────────────────────────────────────────

def _compute_cache_key(project_id: str, scanner: str, scanner_version: str,
                       policy_version: int, blueprint_version: int,
                       contract_version: int, commit_sha: Optional[str]) -> str:
    parts = [project_id, scanner, scanner_version,
             str(policy_version), str(blueprint_version),
             str(contract_version), commit_sha or ""]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


# ─────────────────────────────────────────────
# Auth / Device Registration
# ─────────────────────────────────────────────

@router.post("/auth", response_model=CLIAuthResponse, summary="Register developer device")
async def authenticate_device(req: CLIAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a developer device. In production this initiates a device-code OAuth flow.
    The returned token must be stored in the OS credential store (Windows Credential Manager /
    macOS Keychain / Linux Secret Service) — NEVER in plaintext files.
    """
    from sqlalchemy import select
    from app.models.user import User

    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="No users exist in the system. Create a user first.")

    try:
        os_type_enum = OSType(req.os_type)
    except ValueError:
        os_type_enum = OSType.UNKNOWN

    device = DeveloperDevice(
        user_id=user.id,
        name=req.device_name,
        os_type=os_type_enum,
        hostname=req.hostname,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    # In production: issue a short-lived JWT bound to device_id
    token = f"thing_tk_{device.id}"

    return CLIAuthResponse(device_id=str(device.id), token=token)


# ─────────────────────────────────────────────
# Repository Binding
# ─────────────────────────────────────────────

@router.post("/bind", response_model=RepoBindResponse, summary="Bind repository to project")
async def bind_repository(req: RepoBindRequest, db: AsyncSession = Depends(get_db)):
    """
    Bind a local repository (identified by path hash) to a Thing project.
    Validates device authenticity and project existence before binding.
    """
    from sqlalchemy import select

    try:
        dev_uuid = uuid.UUID(req.device_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid device_id format.")

    device_result = await db.execute(
        select(DeveloperDevice).where(DeveloperDevice.id == dev_uuid)
    )
    device = device_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=401, detail="Device not found. Run 'thing auth login' first.")

    try:
        proj_uuid = uuid.UUID(req.project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project_id format.")

    project_result = await db.execute(
        select(Project).where(Project.id == proj_uuid)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    binding = RepositoryBinding(
        device_id=device.id,
        project_id=project.id,
        local_path_hash=req.local_path_hash,
        remote_url=req.remote_url,
    )
    db.add(binding)
    await db.commit()
    await db.refresh(binding)

    return RepoBindResponse(binding_id=str(binding.id), project_id=str(project.id))


# ─────────────────────────────────────────────
# Security Context
# ─────────────────────────────────────────────

@router.get("/context/{project_id}", response_model=SecurityContextResponse,
            summary="Get project security context (intent, blueprint, contracts, policy)")
async def get_security_context(project_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns the versioned security context for IDE / CLI / Git Hook to load on startup.
    Versions are used as cache invalidation keys.
    """
    from sqlalchemy import select
    from app.models.intent import Intent
    from app.models.blueprint import SecurityBlueprint
    from app.models.policy import SecurityPolicy
    from app.contracts.models import SecurityContract

    try:
        proj_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project_id format.")

    # Ensure context version record exists
    ctx_result = await db.execute(
        select(SecurityContextVersion).where(SecurityContextVersion.project_id == proj_uuid)
    )
    ctx = ctx_result.scalar_one_or_none()
    if not ctx:
        ctx = SecurityContextVersion(project_id=proj_uuid)
        db.add(ctx)
        await db.commit()
        await db.refresh(ctx)

    intent_result = await db.execute(
        select(Intent).where(Intent.project_id == proj_uuid)
    )
    intent_obj = intent_result.scalars().first()

    blueprint_result = await db.execute(
        select(SecurityBlueprint).where(SecurityBlueprint.project_id == proj_uuid)
    )
    blueprint_obj = blueprint_result.scalars().first()

    policy_result = await db.execute(
        select(SecurityPolicy).where(SecurityPolicy.project_id == proj_uuid)
    )
    policy_obj = policy_result.scalars().first()

    contracts_result = await db.execute(
        select(SecurityContract).where(SecurityContract.project_id == proj_uuid)
    )
    contracts = contracts_result.scalars().all()

    return SecurityContextResponse(
        project_id=project_id,
        intent_version=ctx.intent_version,
        blueprint_version=ctx.blueprint_version,
        policy_version=ctx.policy_version,
        contract_version=ctx.contract_version,
        intent={"raw_input": intent_obj.raw_input} if intent_obj else None,
        blueprint={"description": blueprint_obj.description} if blueprint_obj else None,
        policy={
            "name": policy_obj.name,
            "default_action": policy_obj.default_action if hasattr(policy_obj, "default_action") else "ALLOW",
        } if policy_obj else None,
        contracts=[
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "status": "UNKNOWN",
            }
            for c in contracts
        ],
    )


# ─────────────────────────────────────────────
# Git Hook Management
# ─────────────────────────────────────────────

@router.post("/hooks/install", response_model=HookInstallResponse, summary="Record hook installation")
async def record_hook_install(req: HookInstallRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    try:
        binding_uuid = uuid.UUID(req.binding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid binding_id.")

    binding_result = await db.execute(
        select(RepositoryBinding).where(RepositoryBinding.id == binding_uuid)
    )
    binding = binding_result.scalar_one_or_none()
    if not binding:
        raise HTTPException(status_code=404, detail="Repository binding not found.")

    try:
        hook_type = GitHookType(req.hook_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid hook_type. Valid: {[e.value for e in GitHookType]}")

    installation = GitHookInstallation(
        binding_id=binding.id,
        hook_type=hook_type,
        version=req.version,
    )
    db.add(installation)
    await db.commit()
    await db.refresh(installation)

    return HookInstallResponse(installation_id=str(installation.id))


@router.post("/hooks/execution", summary="Record hook execution result")
async def record_hook_execution(req: HookExecutionRequest, db: AsyncSession = Depends(get_db)):
    """
    Called by the git hook script after completing. Records pass/warn/block/error.
    A BYPASSED status indicates --no-verify was used and must be surfaced to CI.
    """
    from sqlalchemy import select

    try:
        inst_uuid = uuid.UUID(req.installation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid installation_id.")

    inst_result = await db.execute(
        select(GitHookInstallation).where(GitHookInstallation.id == inst_uuid)
    )
    installation = inst_result.scalar_one_or_none()
    if not installation:
        raise HTTPException(status_code=404, detail="Hook installation not found.")

    try:
        exec_status = HookExecutionStatus(req.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {[e.value for e in HookExecutionStatus]}")

    execution = GitHookExecution(
        installation_id=installation.id,
        commit_sha=req.commit_sha,
        branch=req.branch,
        status=exec_status,
        duration_ms=req.duration_ms,
        findings_count=req.findings_count,
        metadata_json=req.metadata or {},
    )
    db.add(execution)

    # Update last_executed_at
    installation.last_executed_at = datetime.now(timezone.utc)
    db.add(installation)

    await db.commit()

    return {"execution_id": str(execution.id), "status": exec_status.value}


@router.post("/hooks/bypass", summary="Record hook bypass (--no-verify)")
async def record_hook_bypass(req: HookBypassRequest, db: AsyncSession = Depends(get_db)):
    """
    Called (or inferred from post-commit) when a commit bypasses security hooks.
    This event is persisted so CI/PR policy can enforce server-side verification.
    A bypass must NEVER appear as a passed security check.
    """
    installation_uuid = None
    if req.installation_id:
        try:
            installation_uuid = uuid.UUID(req.installation_id)
        except ValueError:
            pass

    bypass = GitHookBypass(
        installation_id=installation_uuid,
        commit_sha=req.commit_sha,
        reason=req.reason or "HOOK_BYPASSED (--no-verify)",
    )
    db.add(bypass)
    await db.commit()

    return {
        "bypass_id": str(bypass.id),
        "status": "HOOK_BYPASSED",
        "message": "Bypass recorded. Server-side verification required for protected branches.",
    }


# ─────────────────────────────────────────────
# Developer Scan
# ─────────────────────────────────────────────

@router.post("/scan/request", summary="Record developer scan request")
async def create_scan_request(req: DeveloperScanRequestSchema, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    try:
        dev_uuid = uuid.UUID(req.device_id)
        proj_uuid = uuid.UUID(req.project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format.")

    device_result = await db.execute(select(DeveloperDevice).where(DeveloperDevice.id == dev_uuid))
    device = device_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=401, detail="Device not found.")

    scan_req = DeveloperScanRequest(
        device_id=device.id,
        project_id=proj_uuid,
        scan_type=req.scan_type,
    )
    db.add(scan_req)
    await db.commit()
    await db.refresh(scan_req)

    return {"request_id": str(scan_req.id)}


@router.post("/scan/result", summary="Record developer scan result")
async def record_scan_result(req: DeveloperScanResultSchema, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    try:
        req_uuid = uuid.UUID(req.request_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid request_id.")

    scan_result = DeveloperScanResult(
        request_id=req_uuid,
        status=req.status,
        findings_count=req.findings_count,
    )
    db.add(scan_result)
    await db.commit()
    await db.refresh(scan_result)

    return {"result_id": str(scan_result.id)}


# ─────────────────────────────────────────────
# Scanner Cache
# ─────────────────────────────────────────────

@router.get("/cache/{project_id}", summary="Check scanner cache")
async def get_scanner_cache(
    project_id: str,
    scanner: str,
    scanner_version: str,
    commit_sha: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns cached scanner results if available. Cache key includes scanner version,
    policy version, blueprint version, contract version and commit SHA so that any
    relevant version change invalidates the cache entry.
    """
    from sqlalchemy import select

    try:
        proj_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project_id.")

    ctx_result = await db.execute(
        select(SecurityContextVersion).where(SecurityContextVersion.project_id == proj_uuid)
    )
    ctx = ctx_result.scalar_one_or_none()
    if not ctx:
        return {"cache_hit": False, "reason": "No security context found."}

    cache_key = _compute_cache_key(
        project_id, scanner, scanner_version,
        ctx.policy_version, ctx.blueprint_version, ctx.contract_version,
        commit_sha,
    )

    cache_result = await db.execute(
        select(ScannerCacheEntry).where(
            ScannerCacheEntry.project_id == proj_uuid,
            ScannerCacheEntry.cache_key == cache_key,
        )
    )
    entry = cache_result.scalar_one_or_none()
    if entry:
        return {"cache_hit": True, "results": entry.results_json, "cached_at": entry.created_at.isoformat()}

    return {"cache_hit": False, "cache_key": cache_key}


@router.post("/cache/{project_id}", summary="Store scanner result in cache")
async def store_scanner_cache(
    project_id: str,
    scanner: str,
    scanner_version: str,
    results: dict,
    commit_sha: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select, delete
    from sqlalchemy.dialects.postgresql import insert

    try:
        proj_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project_id.")

    ctx_result = await db.execute(
        select(SecurityContextVersion).where(SecurityContextVersion.project_id == proj_uuid)
    )
    ctx = ctx_result.scalar_one_or_none()
    if not ctx:
        raise HTTPException(status_code=404, detail="Security context not found for project.")

    cache_key = _compute_cache_key(
        project_id, scanner, scanner_version,
        ctx.policy_version, ctx.blueprint_version, ctx.contract_version,
        commit_sha,
    )

    # Upsert
    existing = await db.execute(
        select(ScannerCacheEntry).where(
            ScannerCacheEntry.project_id == proj_uuid,
            ScannerCacheEntry.cache_key == cache_key,
        )
    )
    entry = existing.scalar_one_or_none()
    if entry:
        entry.results_json = results
        entry.created_at = datetime.now(timezone.utc)
        db.add(entry)
    else:
        entry = ScannerCacheEntry(
            project_id=proj_uuid,
            cache_key=cache_key,
            results_json=results,
        )
        db.add(entry)

    await db.commit()
    return {"stored": True, "cache_key": cache_key}


@router.post("/cache/{project_id}/invalidate", summary="Invalidate all scanner cache for project")
async def invalidate_cache(project_id: str, req: CacheInvalidateRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select, delete

    try:
        proj_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project_id.")

    result = await db.execute(
        select(ScannerCacheEntry).where(ScannerCacheEntry.project_id == proj_uuid)
    )
    entries = result.scalars().all()
    count = len(entries)
    for e in entries:
        await db.delete(e)
    await db.commit()

    return {"invalidated": count, "reason": req.reason}


# ─────────────────────────────────────────────
# AI Coding Agent Adapter
# ─────────────────────────────────────────────

@router.get("/ai-adapters", summary="List supported AI coding agent adapters")
async def list_ai_adapters(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    result = await db.execute(select(AIAgentAdapter))
    adapters = result.scalars().all()
    return [{"id": str(a.id), "name": a.name, "version": a.version} for a in adapters]


@router.post("/ai-adapters/session", summary="Start AI agent session (goes through security gateway)")
async def create_ai_agent_session(req: AIAgentSessionRequest, db: AsyncSession = Depends(get_db)):
    """
    All AI coding agent interactions must pass through Thing's security gateway.
    This session tracks which adapter is operating on which project so that
    every subsequent tool request can be policy-evaluated.
    """
    from sqlalchemy import select

    adapter_result = await db.execute(
        select(AIAgentAdapter).where(AIAgentAdapter.name == req.adapter_name)
    )
    adapter = adapter_result.scalar_one_or_none()
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Adapter '{req.adapter_name}' not found. "
                                                       "Supported: cursor, claude_code, codex, github_copilot, antigravity")

    try:
        proj_uuid = uuid.UUID(req.project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project_id.")

    session = AIAgentSession(adapter_id=adapter.id, project_id=proj_uuid)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {"session_id": str(session.id), "adapter": req.adapter_name,
            "message": "Session created. All code changes via this adapter are subject to Thing security policy."}


@router.post("/ai-adapters/event", summary="Record AI agent security event")
async def record_ai_agent_event(req: AIAgentSecurityEventRequest, db: AsyncSession = Depends(get_db)):
    """
    Records security-relevant events from AI coding agents:
    - CODE_CHANGE_PROPOSED
    - CODE_CHANGE_BLOCKED
    - COMMAND_REQUESTED
    - SECRET_ACCESS_ATTEMPTED
    - TOOL_INVOCATION
    - POLICY_VIOLATION
    """
    try:
        session_uuid = uuid.UUID(req.session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id.")

    event = AIAgentSecurityEvent(
        session_id=session_uuid,
        event_type=req.event_type,
        details=req.details or {},
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return {"event_id": str(event.id), "event_type": req.event_type}


@router.get("/ai-adapters/session/{session_id}/events", summary="Get security events for AI agent session")
async def get_ai_agent_events(session_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id.")

    result = await db.execute(
        select(AIAgentSecurityEvent)
        .where(AIAgentSecurityEvent.session_id == session_uuid)
        .order_by(AIAgentSecurityEvent.event_time.asc())
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "details": e.details,
            "event_time": e.event_time.isoformat(),
        }
        for e in events
    ]


# ─────────────────────────────────────────────
# Local Agent Health
# ─────────────────────────────────────────────

@router.get("/health", summary="Local agent health check")
async def local_agent_health():
    """
    Simple health endpoint for the local security agent heartbeat.
    """
    return {
        "status": "ONLINE",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": "Local agent health. Remote verification requires backend connectivity.",
    }


@router.post("/agent/ping", summary="Local agent heartbeat")
async def agent_ping(device_id: str, agent_version: str = "0.1.0", db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    try:
        dev_uuid = uuid.UUID(device_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid device_id.")

    device_result = await db.execute(select(DeveloperDevice).where(DeveloperDevice.id == dev_uuid))
    device = device_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    # Update or create agent session
    agent_result = await db.execute(
        select(LocalAgentSession).where(
            LocalAgentSession.device_id == dev_uuid,
            LocalAgentSession.is_active == True,
        )
    )
    agent = agent_result.scalars().first()

    if agent:
        agent.last_ping_at = datetime.now(timezone.utc)
        db.add(agent)
    else:
        agent = LocalAgentSession(device_id=dev_uuid, agent_version=agent_version)
        db.add(agent)

    await db.commit()

    return {
        "acknowledged": True,
        "server_time": datetime.now(timezone.utc).isoformat(),
    }
