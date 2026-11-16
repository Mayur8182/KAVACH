"""Centralized Notification Service for Kavach Platform.

Authoritative notification orchestrator coordinating:
- Backend Event Ingestion
- User & Workspace Preference Checking
- Template Rendering via EmailTemplateService
- Real SMTP Delivery via EmailService
- Idempotency & Duplicate Prevention
- Delivery Tracking in EmailDeliveryLog
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.models.account import UserNotificationPreferences
from app.models.email_models import EmailDeliveryLog, WorkspaceNotificationSettings
from app.services.email_service import EmailService
from app.services.email_template_service import email_template_service, EMAIL_TEMPLATES

logger = logging.getLogger("kavach.notification_service")


# Categories considered essential/mandatory security & transactional communications (cannot be unsubscribed)
MANDATORY_CATEGORIES = {
    "account_welcome",
    "auth_email_verification",
    "auth_password_reset_requested",
    "auth_password_changed",
    "auth_new_signin_detected",
    "auth_email_changed",
    "billing_payment_failed",
    "account_deletion_confirmed",
    "finding_critical_detected",
}


class NotificationService:
    """
    Centralized, enterprise-grade notification service for Kavach.
    Sends real emails via SMTP, enforces idempotency, respects user preferences,
    and logs immutable delivery records.
    """

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self.email_sender = EmailService()
        self.settings = get_settings()

    async def _get_db_session(self):
        """Helper to get a database session if none was injected."""
        if self.db is not None:
            return self.db, False
        return AsyncSessionLocal(), True

    async def should_send_email(
        self,
        session: AsyncSession,
        template_id: str,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Evaluates whether an email should be sent based on mandatory policies,
        user notification preferences, and workspace settings.
        Returns: (should_send: bool, reason: str)
        """
        # 1. Mandatory security & authentication emails are always delivered
        if template_id in MANDATORY_CATEGORIES:
            return True, "Mandatory security/transactional notice"

        # 2. Check user notification preferences if user_id is provided
        if user_id:
            try:
                user_uuid = uuid.UUID(str(user_id))
                stmt = select(UserNotificationPreferences).where(
                    UserNotificationPreferences.user_id == user_uuid
                )
                res = await session.execute(stmt)
                user_prefs = res.scalar_one_or_none()

                if user_prefs:
                    # Scan notifications
                    if template_id in ("scan_started", "scan_completed", "scan_failed"):
                        if not getattr(user_prefs, "email_scan_completed", True):
                            return False, "User disabled scan completion emails"

                    # Security alerts & findings
                    if template_id in ("findings_new_detected", "finding_resolved", "remediation_pr_created"):
                        if not getattr(user_prefs, "email_security_alerts", True):
                            return False, "User disabled non-critical security alert emails"

                    # Weekly digest / general updates
                    if template_id in ("billing_renewal_reminder", "billing_trial_ending"):
                        if not getattr(user_prefs, "email_weekly_digest", True):
                            return False, "User disabled routine digest and billing reminder emails"
            except Exception as e:
                logger.warning(f"Error checking user notification preferences for user {user_id}: {e}")

        # 3. Check workspace notification settings if workspace_id is provided
        if workspace_id:
            try:
                w_stmt = select(WorkspaceNotificationSettings).where(
                    WorkspaceNotificationSettings.workspace_id == str(workspace_id)
                )
                w_res = await session.execute(w_stmt)
                w_settings = w_res.scalar_one_or_none()

                if w_settings:
                    if not w_settings.email_enabled:
                        return False, "Workspace disabled email notifications"
                    if w_settings.critical_only_mode and template_id not in MANDATORY_CATEGORIES:
                        return False, "Workspace is in critical-only notification mode"
            except Exception as e:
                logger.warning(f"Error checking workspace settings for {workspace_id}: {e}")

        return True, "Allowed by preferences"

    async def dispatch(
        self,
        template_id: str,
        recipient_email: str,
        context: Dict[str, Any],
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        event_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        sync_delivery: bool = False,
    ) -> Dict[str, Any]:
        """
        Dispatches an authoritative email notification with template validation,
        idempotency check, preference check, real SMTP transmission, and delivery logging.
        """
        if not recipient_email or "@" not in recipient_email:
            logger.error(f"Cannot dispatch email: invalid recipient '{recipient_email}'")
            return {"success": False, "error": "Invalid recipient email"}

        session, should_close = await self._get_db_session()
        log_id = str(uuid.uuid4())
        auto_idempotency_key = idempotency_key or f"{template_id}:{recipient_email}:{event_id or log_id[:12]}"

        try:
            # 1. Idempotency Check: Prevent duplicate email sends
            stmt = select(EmailDeliveryLog).where(
                EmailDeliveryLog.idempotency_key == auto_idempotency_key
            )
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if existing and existing.status in ("SENT", "DELIVERED"):
                logger.info(f"Duplicate email prevented by idempotency key: {auto_idempotency_key}")
                return {
                    "success": True,
                    "deduplicated": True,
                    "delivery_log_id": existing.id,
                    "status": existing.status,
                }

            # 2. Preference Check
            can_send, reason = await self.should_send_email(
                session=session,
                template_id=template_id,
                user_id=user_id,
                workspace_id=workspace_id,
            )

            # 3. Render Subject, HTML and Plain Text
            tpl_def = email_template_service.get_template_def(template_id)
            subject, html_body, text_body = email_template_service.render(template_id, context)

            if not can_send:
                logger.info(f"Email skipped due to preferences: {template_id} to {recipient_email} ({reason})")
                log_entry = EmailDeliveryLog(
                    id=log_id,
                    recipient_email=recipient_email,
                    template_id=template_id,
                    category=tpl_def["category"],
                    subject=subject,
                    status="SKIPPED_PREFERENCE",
                    error_message=reason,
                    idempotency_key=auto_idempotency_key,
                    event_id=event_id,
                    user_id=str(user_id) if user_id else None,
                    project_id=str(project_id) if project_id else None,
                    workspace_id=str(workspace_id) if workspace_id else None,
                    context_data={k: v for k, v in context.items() if not str(k).lower().endswith("password") and not str(k).lower().endswith("secret")},
                )
                session.add(log_entry)
                await session.commit()
                return {"success": True, "skipped": True, "reason": reason}

            # 4. Create Initial Delivery Log (QUEUED)
            log_entry = EmailDeliveryLog(
                id=log_id,
                recipient_email=recipient_email,
                template_id=template_id,
                category=tpl_def["category"],
                subject=subject,
                status="QUEUED",
                idempotency_key=auto_idempotency_key,
                event_id=event_id,
                user_id=str(user_id) if user_id else None,
                project_id=str(project_id) if project_id else None,
                workspace_id=str(workspace_id) if workspace_id else None,
                context_data={k: v for k, v in context.items() if not str(k).lower().endswith("password") and not str(k).lower().endswith("secret")},
            )
            session.add(log_entry)
            await session.commit()

            # 5. Execute Real Delivery
            async def _execute_send():
                delivery_session = AsyncSessionLocal()
                try:
                    # Deliver via EmailService
                    from email.mime.multipart import MIMEMultipart
                    from email.mime.text import MIMEText

                    msg = MIMEMultipart("alternative")
                    sender_display = f"Kavach Security <{self.email_sender.default_sender}>"
                    msg["Subject"] = subject
                    msg["From"] = sender_display
                    msg["To"] = recipient_email

                    msg.attach(MIMEText(text_body, "plain"))
                    msg.attach(MIMEText(html_body, "html"))

                    send_res = await asyncio.to_thread(self.email_sender._send_sync, msg, recipient_email)
                    
                    # Update Log to SENT
                    log_update_stmt = select(EmailDeliveryLog).where(EmailDeliveryLog.id == log_id)
                    cur_log = (await delivery_session.execute(log_update_stmt)).scalar_one_or_none()
                    if cur_log:
                        cur_log.status = "SENT"
                        cur_log.sent_at = datetime.now(timezone.utc)
                        cur_log.provider_message_id = f"smtp_{uuid.uuid4().hex[:12]}"
                        await delivery_session.commit()
                    logger.info(f"Email {template_id} successfully dispatched to {recipient_email}")
                    return send_res
                except Exception as exc:
                    logger.error(f"Failed to deliver email {template_id} to {recipient_email}: {exc}", exc_info=True)
                    log_update_stmt = select(EmailDeliveryLog).where(EmailDeliveryLog.id == log_id)
                    cur_log = (await delivery_session.execute(log_update_stmt)).scalar_one_or_none()
                    if cur_log:
                        cur_log.status = "FAILED"
                        cur_log.error_message = str(exc)
                        cur_log.retry_count += 1
                        await delivery_session.commit()
                finally:
                    await delivery_session.close()

            if sync_delivery:
                await _execute_send()
            else:
                asyncio.create_task(_execute_send())

            return {
                "success": True,
                "delivery_log_id": log_id,
                "template_id": template_id,
                "recipient": recipient_email,
                "status": "QUEUED" if not sync_delivery else "SENT",
                "subject": subject,
            }

        except Exception as e:
            logger.error(f"Error in NotificationService.dispatch: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
        finally:
            if should_close:
                await session.close()

    async def list_logs(
        self,
        recipient: Optional[str] = None,
        template_id: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        project_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Queries delivery logs with administrative filtering."""
        session, should_close = await self._get_db_session()
        try:
            stmt = select(EmailDeliveryLog).order_by(EmailDeliveryLog.created_at.desc())
            if recipient:
                stmt = stmt.where(EmailDeliveryLog.recipient_email.ilike(f"%{recipient}%"))
            if template_id:
                stmt = stmt.where(EmailDeliveryLog.template_id == template_id)
            if category:
                stmt = stmt.where(EmailDeliveryLog.category == category)
            if status:
                stmt = stmt.where(EmailDeliveryLog.status == status)
            if project_id:
                stmt = stmt.where(EmailDeliveryLog.project_id == project_id)

            res = await session.execute(stmt.offset(offset).limit(limit))
            logs = res.scalars().all()
            
            # Simple total count
            count_stmt = select(EmailDeliveryLog.id)
            total_count = len((await session.execute(count_stmt)).scalars().all())

            return {
                "total": total_count,
                "items": [
                    {
                        "id": log.id,
                        "recipient_email": log.recipient_email,
                        "template_id": log.template_id,
                        "category": log.category,
                        "subject": log.subject,
                        "status": log.status,
                        "error_message": log.error_message,
                        "retry_count": log.retry_count,
                        "sent_at": log.sent_at.isoformat() if log.sent_at else None,
                        "created_at": log.created_at.isoformat() if log.created_at else None,
                        "project_id": log.project_id,
                        "event_id": log.event_id,
                    }
                    for log in logs
                ],
            }
        finally:
            if should_close:
                await session.close()


# Global singleton instance
notification_service = NotificationService()
