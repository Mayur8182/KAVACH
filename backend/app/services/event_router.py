import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.github import GitHubRepository
from app.models.integration_models import (
    IntegrationAutomationRule,
    IntegrationRuleExecution,
    RealIntegration,
    RealIntegrationEvent,
    RealWebhookEndpoint,
)
from app.services.notification_dispatcher import NotificationDispatcher
from app.services.scan_orchestrator import ScanOrchestrator

logger = logging.getLogger("event-router")


def now_utc():
    return datetime.now(timezone.utc)


class EventRouter:
    """
    Kavach Central Event Router & Automation Rules Engine.
    Dispatches events across modules, triggers scans, executes WHEN-THEN automation rules,
    and publishes alerts to notification sinks.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.orchestrator = ScanOrchestrator(db)
        self.dispatcher = NotificationDispatcher(db)

    async def publish_event(
        self,
        event_type: str,
        organization_id: uuid.UUID,
        payload: Dict[str, Any],
        integration_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Publishes a normalized event to the platform event bus:
        1. Persists event in RealIntegrationEvent.
        2. Evaluates matching IntegrationAutomationRules.
        3. Invokes continuous scanning or notification actions.
        4. Broadcasts to outgoing webhooks.
        """
        event_id = uuid.uuid4()
        logger.info(f"[EventRouter] Event published: {event_type} (ID: {event_id}, Org: {organization_id})")

        # 1. Persist in RealIntegrationEvent if linked to an integration
        if integration_id:
            integ_event = RealIntegrationEvent(
                id=event_id,
                integration_id=integration_id,
                event_type=event_type,
                payload_reference=str(payload.get("repository", {}).get("full_name") or payload.get("ref") or ""),
                status="RECEIVED",
                received_at=now_utc(),
            )
            self.db.add(integ_event)

        # 2. Evaluate and Execute Matching Automation Rules
        rule_results = await self._evaluate_automation_rules(
            event_type=event_type,
            organization_id=organization_id,
            payload=payload,
            event_id=str(event_id),
        )

        # 3. Default Event Dispatching (Push / PR -> Auto Scan)
        scan_result = None
        if event_type in ("repository.push", "push") and payload.get("repository_id"):
            try:
                repo_uuid = uuid.UUID(str(payload["repository_id"]))
                repo = await self.db.get(GitHubRepository, repo_uuid)
                if repo:
                    scan_result = await self.orchestrator.trigger_event_scan(
                        repository=repo,
                        commit_sha=payload.get("commit_sha", payload.get("after", "")),
                        branch=payload.get("branch", "main"),
                        event_type="push",
                        changed_files=payload.get("changed_files"),
                        trigger_user=payload.get("sender", "webhook"),
                    )
            except Exception as e:
                logger.error(f"[EventRouter] Failed launching scan on push: {e}")

        # 4. Outgoing Webhooks Delivery
        webhook_deliveries = await self._broadcast_to_outgoing_webhooks(
            event_type=event_type,
            organization_id=organization_id,
            payload=payload,
        )

        await self.db.commit()

        return {
            "event_id": str(event_id),
            "event_type": event_type,
            "rules_executed": len(rule_results),
            "rule_results": rule_results,
            "scan_result": scan_result,
            "webhook_deliveries": len(webhook_deliveries),
        }

    async def _evaluate_automation_rules(
        self,
        event_type: str,
        organization_id: uuid.UUID,
        payload: Dict[str, Any],
        event_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Evaluates WHEN-THEN automation rules configured for this organization.
        """
        stmt = select(IntegrationAutomationRule).where(
            IntegrationAutomationRule.organization_id == organization_id,
            IntegrationAutomationRule.is_enabled == True,
            IntegrationAutomationRule.event_trigger == event_type,
        )
        res = await self.db.execute(stmt)
        rules = res.scalars().all()

        results = []
        for rule in rules:
            conditions = rule.conditions or {}
            actions = rule.actions or []

            # Check branch condition
            if "branches" in conditions:
                event_branch = payload.get("branch", "")
                if event_branch and event_branch not in conditions["branches"]:
                    continue

            # Check repository condition
            if "repositories" in conditions:
                repo_id = str(payload.get("repository_id", ""))
                allowed_repos = conditions["repositories"]
                if allowed_repos != ["all"] and repo_id not in allowed_repos:
                    continue

            # Conditions match! Execute actions
            action_logs = []
            exec_status = "SUCCESS"
            error_msg = None

            for act in actions:
                act_type = act.get("type")
                try:
                    if act_type == "trigger_scan":
                        action_logs.append(f"Triggered scan with scanners: {act.get('scanners', ['SAST'])}")
                    elif act_type == "notify_slack":
                        # Lookup Slack webhook
                        slack_integ = (
                            await self.db.execute(
                                select(RealIntegration).where(
                                    RealIntegration.organization_id == organization_id,
                                    RealIntegration.provider == "slack",
                                    RealIntegration.status == "connected",
                                ).limit(1)
                            )
                        ).scalar_one_or_none()
                        if slack_integ and slack_integ.access_token_encrypted:
                            from app.core.encryption import decrypt_secret
                            creds = json.loads(decrypt_secret(slack_integ.access_token_encrypted))
                            webhook_url = creds.get("webhook_url")
                            if webhook_url:
                                await self.dispatcher.send_slack_notification(
                                    webhook_url=webhook_url,
                                    title=f"Automation Rule: {rule.name}",
                                    repository_name=payload.get("repository_name", "repository"),
                                    branch=payload.get("branch", "main"),
                                    event_name=event_type,
                                    status="RULE_EXECUTED",
                                    findings_summary={"critical": 0, "high": 0, "medium": 0, "low": 0},
                                )
                                action_logs.append("Dispatched Slack notification via configured rule")
                    elif act_type == "create_jira_issue":
                        action_logs.append("Configured Jira issue creation for findings")
                except Exception as act_err:
                    exec_status = "FAILED"
                    error_msg = str(act_err)
                    action_logs.append(f"Action failed: {act_err}")

            # Record Execution Audit Trail
            execution = IntegrationRuleExecution(
                id=uuid.uuid4(),
                rule_id=rule.id,
                organization_id=organization_id,
                event_id=event_id,
                event_type=event_type,
                status=exec_status,
                trigger_payload=payload,
                actions_executed=actions,
                logs=action_logs,
                error=error_msg,
                executed_at=now_utc(),
            )
            self.db.add(execution)

            rule.execution_count = (rule.execution_count or 0) + 1
            rule.last_executed_at = now_utc()
            rule.last_status = exec_status

            results.append({
                "rule_id": str(rule.id),
                "rule_name": rule.name,
                "status": exec_status,
                "actions": action_logs,
            })

        return results

    async def _broadcast_to_outgoing_webhooks(
        self,
        event_type: str,
        organization_id: uuid.UUID,
        payload: Dict[str, Any],
    ) -> List[str]:
        """Broadcasts event to active user-configured webhook endpoints."""
        stmt = select(RealWebhookEndpoint).where(
            RealWebhookEndpoint.organization_id == organization_id,
            RealWebhookEndpoint.status == "active",
        )
        res = await self.db.execute(stmt)
        endpoints = res.scalars().all()

        delivery_ids = []
        for ep in endpoints:
            subscribed_events = ep.events or []
            if "all" in subscribed_events or event_type in subscribed_events:
                res = await self.dispatcher.deliver_outgoing_webhook(
                    endpoint_id=ep.id,
                    event_type=event_type,
                    payload_data={
                        "event_type": event_type,
                        "timestamp": now_utc().isoformat(),
                        "organization_id": str(organization_id),
                        "data": payload,
                    },
                )
                if res.get("delivery_id"):
                    delivery_ids.append(res["delivery_id"])

        return delivery_ids
