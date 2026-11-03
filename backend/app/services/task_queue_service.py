"""
Task Queue Service — Database-persisted asynchronous job management.
Adheres strictly to AGENTS.md Rule 6 (PostgreSQL persistence) and Rule 12 (Real async jobs).
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import and_, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task_queue import BackgroundTask
from app.schemas.task_queue import (
    TaskCancelResponse,
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
    TaskRetryResponse,
)


class TaskQueueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def enqueue(
        self,
        task_type: str,
        project_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        priority: int = 0,
    ) -> TaskResponse:
        """Enqueue a new job with status QUEUED."""
        pid_uuid = None
        if project_id:
            if isinstance(project_id, uuid.UUID):
                pid_uuid = project_id
            else:
                try:
                    pid_uuid = uuid.UUID(str(project_id))
                except (ValueError, TypeError, AttributeError):
                    pass

        now = datetime.now(timezone.utc)
        task = BackgroundTask(
            id=uuid.uuid4(),
            project_id=pid_uuid,
            task_type=task_type,
            status="QUEUED",
            priority=priority,
            progress_percent=0,
            current_step="Waiting in queue",
            payload=payload or {},
            result={},
            created_at=now,
            updated_at=now,
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return TaskResponse(**task.to_dict())

    async def get_task(self, task_id: str) -> Optional[TaskResponse]:
        """Fetch task status and diagnostics by UUID."""
        try:
            t_uuid = uuid.UUID(task_id)
        except ValueError:
            return None

        task = await self.db.get(BackgroundTask, t_uuid)
        if not task:
            return None
        return TaskResponse(**task.to_dict())

    async def list_tasks(
        self,
        project_id: Optional[str] = None,
        task_type: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> TaskListResponse:
        """List tasks with pagination, filters, and state counter summary."""
        q = select(BackgroundTask)

        if project_id:
            try:
                pid_uuid = uuid.UUID(project_id)
                q = q.where(BackgroundTask.project_id == pid_uuid)
            except ValueError:
                pass

        if task_type and task_type != "ALL":
            q = q.where(BackgroundTask.task_type == task_type)

        if status and status != "ALL":
            q = q.where(BackgroundTask.status == status)

        # Count total
        count_stmt = select(func.count()).select_from(q.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # State breakdowns
        queued_count = (await self.db.execute(select(func.count(BackgroundTask.id)).where(BackgroundTask.status == "QUEUED"))).scalar() or 0
        running_count = (await self.db.execute(select(func.count(BackgroundTask.id)).where(BackgroundTask.status == "RUNNING"))).scalar() or 0
        completed_count = (await self.db.execute(select(func.count(BackgroundTask.id)).where(BackgroundTask.status == "COMPLETED"))).scalar() or 0
        failed_count = (await self.db.execute(select(func.count(BackgroundTask.id)).where(BackgroundTask.status == "FAILED"))).scalar() or 0

        # Fetch page
        offset = (page - 1) * page_size
        items_stmt = q.order_by(desc(BackgroundTask.created_at)).offset(offset).limit(page_size)
        rows = (await self.db.execute(items_stmt)).scalars().all()

        items = [TaskResponse(**t.to_dict()) for t in rows]
        return TaskListResponse(
            items=items,
            total=total,
            queued_count=queued_count,
            running_count=running_count,
            completed_count=completed_count,
            failed_count=failed_count,
            page=page,
            page_size=page_size,
        )

    async def cancel_task(self, task_id: str) -> Optional[TaskCancelResponse]:
        """Cancel a QUEUED or RUNNING task."""
        try:
            t_uuid = uuid.UUID(task_id)
        except ValueError:
            return None

        task = await self.db.get(BackgroundTask, t_uuid)
        if not task:
            return None

        if task.status in ("COMPLETED", "FAILED", "CANCELLED"):
            return TaskCancelResponse(
                task_id=task_id,
                status=task.status,
                message=f"Task is already {task.status} and cannot be cancelled.",
            )

        task.status = "CANCELLED"
        task.completed_at = datetime.now(timezone.utc)
        task.current_step = "Cancelled by user"
        await self.db.commit()

        return TaskCancelResponse(
            task_id=task_id,
            status="CANCELLED",
            message="Task was successfully cancelled.",
        )

    async def retry_task(self, task_id: str) -> Optional[TaskRetryResponse]:
        """Retry a failed or cancelled task by creating a fresh QUEUED record."""
        try:
            t_uuid = uuid.UUID(task_id)
        except ValueError:
            return None

        original = await self.db.get(BackgroundTask, t_uuid)
        if not original:
            return None

        new_task = await self.enqueue(
            task_type=original.task_type,
            project_id=str(original.project_id) if original.project_id else None,
            payload=original.payload,
            priority=original.priority,
        )

        return TaskRetryResponse(
            new_task_id=new_task.id,
            original_task_id=task_id,
            status="QUEUED",
            message=f"Job re-queued successfully as task '{new_task.id}'.",
        )
