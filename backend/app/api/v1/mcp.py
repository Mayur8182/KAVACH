import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.mcp import MCPSession, MCPTool, MCPToolInvocation
from app.models.project import Project
from app.models.user import User
from app.mcp.registry import default_tool_registry
from app.mcp.schemas import (
    MCPGatewayStatusResponse,
    MCPInvocationResponse,
    MCPSessionResponse,
    MCPToolResponse,
)

settings = get_settings()

router = APIRouter(tags=["MCP Gateway Management"])


async def _verify_project_owner(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found.",
        )
    if project.owner_id != user.id and not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage MCP settings for this project.",
        )
    return project


@router.get("/projects/{project_id}/mcp/status", response_model=MCPGatewayStatusResponse)
async def get_project_mcp_status(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPGatewayStatusResponse:
    """
    Returns live statistics and operational status of the MCP Gateway for a specific project.
    """
    await _verify_project_owner(project_id, current_user, db)

    # Count real sessions
    sess_stmt = select(func.count(MCPSession.id)).where(
        MCPSession.project_id == project_id,
        MCPSession.status == "ACTIVE",
    )
    active_sessions = (await db.execute(sess_stmt)).scalar() or 0

    # Count real invocations
    inv_stmt = select(func.count(MCPToolInvocation.id)).where(
        MCPToolInvocation.project_id == project_id
    )
    total_invocations = (await db.execute(inv_stmt)).scalar() or 0

    denied_stmt = select(func.count(MCPToolInvocation.id)).where(
        MCPToolInvocation.project_id == project_id,
        MCPToolInvocation.status.in_(["DENIED", "BLOCKED"]),
    )
    denied_invocations = (await db.execute(denied_stmt)).scalar() or 0

    appr_stmt = select(func.count(MCPToolInvocation.id)).where(
        MCPToolInvocation.project_id == project_id,
        MCPToolInvocation.status == "REQUIRES_APPROVAL",
    )
    approvals_pending = (await db.execute(appr_stmt)).scalar() or 0

    registered_tools = len(default_tool_registry.list_tools())

    return MCPGatewayStatusResponse(
        enabled=settings.mcp_enabled,
        server_name=settings.mcp_server_name,
        server_version=settings.mcp_server_version,
        transport=settings.mcp_transport,
        active_sessions_count=active_sessions,
        registered_tools_count=registered_tools,
        total_invocations_count=total_invocations,
        denied_invocations_count=denied_invocations,
        approvals_pending_count=approvals_pending,
    )


@router.get("/projects/{project_id}/mcp/tools", response_model=List[MCPToolResponse])
async def list_project_mcp_tools(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MCPToolResponse]:
    """
    Lists all registered MCP tools and their schemas, capability requirements, and risk levels.
    """
    await _verify_project_owner(project_id, current_user, db)

    tools = default_tool_registry.list_tools()
    response = []
    for t in tools:
        response.append(
            MCPToolResponse(
                id=uuid.uuid5(uuid.NAMESPACE_DNS, t.name),
                name=t.name,
                description=t.description,
                version=t.version,
                category=t.category,
                input_schema=t.input_schema,
                output_schema=t.output_schema,
                risk_level=t.risk_level,
                enabled=t.enabled,
                requires_approval=t.requires_approval,
                required_permission=t.required_permission,
            )
        )
    return response


@router.get("/projects/{project_id}/mcp/sessions", response_model=List[MCPSessionResponse])
async def list_project_mcp_sessions(
    project_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[MCPSessionResponse]:
    """
    Lists active and historical MCP agent sessions for a project.
    """
    await _verify_project_owner(project_id, current_user, db)

    stmt = select(MCPSession).where(
        MCPSession.project_id == project_id
    ).order_by(MCPSession.created_at.desc()).limit(limit)

    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [
        MCPSessionResponse(
            id=s.id,
            agent_id=s.agent_id,
            project_id=s.project_id,
            authenticated_principal=s.authenticated_principal,
            transport=s.transport,
            client_name=s.client_name,
            client_version=s.client_version,
            status=s.status,
            last_activity_at=s.last_activity_at,
            expires_at=s.expires_at,
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.get("/mcp/sessions/{session_id}", response_model=MCPSessionResponse)
async def get_mcp_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPSessionResponse:
    """
    Retrieves detailed metadata for a specific MCP session.
    """
    session = await db.get(MCPSession, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP Session '{session_id}' not found.",
        )
    await _verify_project_owner(session.project_id, current_user, db)

    return MCPSessionResponse(
        id=session.id,
        agent_id=session.agent_id,
        project_id=session.project_id,
        authenticated_principal=session.authenticated_principal,
        transport=session.transport,
        client_name=session.client_name,
        client_version=session.client_version,
        status=session.status,
        last_activity_at=session.last_activity_at,
        expires_at=session.expires_at,
        created_at=session.created_at,
    )


@router.get("/mcp/invocations/{invocation_id}", response_model=MCPInvocationResponse)
async def get_mcp_invocation(
    invocation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MCPInvocationResponse:
    """
    Inspects detailed audit evidence, authorization decision, and policy results of an MCP tool invocation.
    """
    inv = await db.get(MCPToolInvocation, invocation_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP Invocation '{invocation_id}' not found.",
        )
    await _verify_project_owner(inv.project_id, current_user, db)

    return MCPInvocationResponse(
        id=inv.id,
        session_id=inv.session_id,
        agent_id=inv.agent_id,
        project_id=inv.project_id,
        tool_name=inv.tool_name,
        tool_version=inv.tool_version,
        request_id=inv.request_id,
        operation=inv.operation,
        resource_type=inv.resource_type,
        resource_id=inv.resource_id,
        authorization_decision=inv.authorization_decision,
        policy_decision=inv.policy_decision,
        approval_id=inv.approval_id,
        status=inv.status,
        started_at=inv.started_at,
        completed_at=inv.completed_at,
        result_reference=inv.result_reference,
        input_summary=inv.input_summary,
        output_summary=inv.output_summary,
        error_code=inv.error_code,
        error_message=inv.error_message,
        created_at=inv.created_at,
    )
