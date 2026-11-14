"""
THING AGENT — FastAPI Router
Step 07: AI Agent Identity, Authorization, Delegation, Tool Control & Agent Runtime Security.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.agent.service import AgentService
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/agent", tags=["THING AGENT — AI Agent Identity & Authority"])


# ── Overview ───────────────────────────────────────────────────────────────────

@router.get("/overview")
async def get_agent_overview(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.get_overview(project_id)


# ── Agents CRUD ────────────────────────────────────────────────────────────────

@router.get("/agents")
async def list_agents(
    project_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_agents(project_id, status, risk, environment, search, limit, offset)


@router.post("/agents", status_code=status.HTTP_201_CREATED)
async def create_agent(
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.create_agent(payload, project_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/agents/{agent_id}")
async def get_agent_detail(
    agent_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    result = await service.get_agent_detail(agent_id, project_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return result


@router.post("/agents/{agent_id}/quarantine")
async def quarantine_agent(
    agent_id: str,
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.quarantine_agent(agent_id, payload.get("reason", "Security concern"), project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/agents/{agent_id}/disable")
async def disable_agent(
    agent_id: str,
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.disable_agent(agent_id, payload.get("reason", "Administrative action"), project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Identities ─────────────────────────────────────────────────────────────────

@router.get("/identities")
async def list_identities(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_identities(project_id)


# ── Permissions ────────────────────────────────────────────────────────────────

@router.get("/permissions")
async def list_permissions(
    project_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_permissions(project_id, agent_id, status, limit, offset)


@router.post("/permissions", status_code=status.HTTP_201_CREATED)
async def create_permission(
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.create_permission(payload, project_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/permissions/{permission_id}")
async def revoke_permission(
    permission_id: str,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.revoke_permission(permission_id, project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Tools ──────────────────────────────────────────────────────────────────────

@router.get("/tools")
async def list_tools(
    project_id: Optional[str] = Query(None),
    risk: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_tools(project_id, risk)


@router.get("/tools/{tool_id}")
async def get_tool_detail(
    tool_id: str,
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    result = await service.get_tool_detail(tool_id, project_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")
    return result


# ── Sessions ───────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(
    project_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_sessions(project_id, agent_id, status, limit, offset)


@router.post("/sessions/{session_id}/revoke")
async def revoke_session(
    session_id: str,
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.revoke_session(session_id, payload.get("reason", "Security action"), project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Delegations ────────────────────────────────────────────────────────────────

@router.get("/delegations")
async def list_delegations(
    project_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_delegations(project_id, agent_id, status)


@router.post("/delegations", status_code=status.HTTP_201_CREATED)
async def create_delegation(
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.create_delegation(payload, project_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/delegations/{delegation_id}/revoke")
async def revoke_delegation(
    delegation_id: str,
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.revoke_delegation(delegation_id, payload.get("reason", "Security action"), project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Actions ────────────────────────────────────────────────────────────────────

@router.get("/actions")
async def list_actions(
    project_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_actions(project_id, agent_id, decision, limit, offset)


# ── Data Access ────────────────────────────────────────────────────────────────

@router.get("/data-access")
async def list_data_access(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_data_accesses(project_id)


# ── Behavior ───────────────────────────────────────────────────────────────────

@router.get("/behavior")
async def list_behavior(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_behavior(project_id)


# ── Approvals ──────────────────────────────────────────────────────────────────

@router.get("/approvals")
async def list_approvals(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_approvals(project_id)


@router.post("/approvals/{approval_id}/resolve")
async def resolve_approval(
    approval_id: str,
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        decision = payload.get("decision", "")
        if decision not in ("APPROVED", "REJECTED"):
            raise HTTPException(status_code=400, detail="decision must be APPROVED or REJECTED")
        return await service.resolve_approval(
            approval_id, decision, payload.get("reason", ""), project_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Evidence ───────────────────────────────────────────────────────────────────

@router.get("/evidence")
async def list_evidence(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_evidence(project_id)


# ── Activity / Audit ───────────────────────────────────────────────────────────

@router.get("/activity")
async def list_activity(
    project_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.list_activity(project_id, limit)


# ── Risk ───────────────────────────────────────────────────────────────────────

@router.get("/risk")
async def get_risk(
    project_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.get_risk(project_id)


# ── Execution / Run ────────────────────────────────────────────────────────────

@router.get("/roles")
async def list_agent_roles():
    """Returns available specialized agent roles and their descriptions."""
    from app.agent.prompts import AGENT_PROMPTS
    return [
        {"role": role, "name": role.replace("_", "-"), "is_active": True}
        for role in AGENT_PROMPTS.keys()
    ]


@router.post("/run")
async def run_agent(
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes an autonomous agent task loop.
    Enforces that all tool actions pass strictly through the MCP Security Gateway.
    """
    from app.agent.runner import AgentRunner
    service = AgentService(db)
    proj_uuid = await service.resolve_project_id(project_id or payload.get("project_id"))

    agent_id = payload.get("agent_id") or payload.get("agent_name") or "code-agent"
    task = payload.get("task") or payload.get("prompt")
    if not task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required 'task' or 'prompt' in payload."
        )

    max_turns = min(int(payload.get("max_turns", 6)), 12)

    runner = AgentRunner(db)
    try:
        result = await runner.run(
            project_id=proj_uuid,
            agent_identifier=agent_id,
            task_prompt=task,
            max_turns=max_turns,
        )
        return result.to_dict()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution encountered an error: {str(exc)}"
        )


@router.post("/run/stream")
async def run_agent_stream(
    payload: dict,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes an autonomous agent task loop with live Server-Sent Events (SSE) streaming.
    Streams thought reasoning, tool dispatches, and final results in real time.
    """
    import json
    from fastapi.responses import StreamingResponse
    from app.agent.runner import AgentRunner

    service = AgentService(db)
    proj_uuid = await service.resolve_project_id(project_id or payload.get("project_id"))

    agent_id = payload.get("agent_id") or payload.get("agent_name") or "code-agent"
    task = payload.get("task") or payload.get("prompt")
    if not task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required 'task' or 'prompt' in payload."
        )

    max_turns = min(int(payload.get("max_turns", 6)), 12)
    runner = AgentRunner(db)

    async def event_generator():
        try:
            async for item in runner.run_stream(
                project_id=proj_uuid,
                agent_identifier=agent_id,
                task_prompt=task,
                max_turns=max_turns,
            ):
                event_name = item.get("event", "message")
                data_json = json.dumps(item.get("data", {}))
                yield f"event: {event_name}\ndata: {data_json}\n\n"
        except Exception as exc:
            err_data = json.dumps({"error": str(exc)})
            yield f"event: error\ndata: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


