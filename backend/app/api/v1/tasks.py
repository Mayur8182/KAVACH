"""
Background Tasks API Router — /api/v1/tasks
Poll, monitor, submit, and cancel real asynchronous jobs per AGENTS.md Rule 12.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.task_queue import (
    TaskCancelResponse,
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
    TaskRetryResponse,
)
from app.services.task_queue_service import TaskQueueService

router = APIRouter(prefix="/tasks", tags=["Thing Control Plane — Background Tasks"])


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue an asynchronous task",
    description="Creates a database-persisted task in QUEUED state for worker processing.",
)
async def enqueue_task(
    payload: TaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    service = TaskQueueService(db)
    return await service.enqueue(
        task_type=payload.task_type,
        project_id=payload.project_id,
        payload=payload.payload,
        priority=payload.priority,
    )


@router.get(
    "/metrics/backlog",
    summary="Monitor queue backlog metrics and concurrency health",
    description="Returns real queue backlog metrics, queue wait time, active task concurrency, and health status.",
)
async def get_backlog_metrics(
    current_user: User = Depends(get_current_user),
):
    from app.core.task_worker import get_queue_backlog_metrics
    return await get_queue_backlog_metrics()


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get status, progress, and result of a background task",
)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    service = TaskQueueService(db)
    task = await service.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found",
        )
    return task


@router.get(
    "",
    response_model=TaskListResponse,
    summary="List background tasks with state breakdown",
)
async def list_tasks(
    project_id: Optional[str] = Query(None, description="Optional project filter"),
    task_type: Optional[str] = Query(None, description="Filter by task_type"),
    status: Optional[str] = Query(None, description="Filter by status (QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskListResponse:
    service = TaskQueueService(db)
    return await service.list_tasks(
        project_id=project_id,
        task_type=task_type,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/{task_id}/cancel",
    response_model=TaskCancelResponse,
    summary="Cancel a running or queued background task",
)
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskCancelResponse:
    service = TaskQueueService(db)
    result = await service.cancel_task(task_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found",
        )
    return result


@router.post(
    "/{task_id}/retry",
    response_model=TaskRetryResponse,
    summary="Retry a failed or cancelled background task",
)
async def retry_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskRetryResponse:
    service = TaskQueueService(db)
    result = await service.retry_task(task_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found",
        )
    return result
