import asyncio
import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.core.encryption import decrypt_secret
from app.models.integration_models import (
    RealIntegration,
    RealWebhookDelivery,
    RealWebhookEndpoint,
)

logger = logging.getLogger("notification-dispatcher")


def now_utc():
    return datetime.now(timezone.utc)


def is_safe_webhook_url(url: str) -> bool:
    """
    SSRF Protection: Validates destination URL to prevent attacks against
    internal microservices, cloud metadata services (169.254.169.254), or loopback.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        # In local development, allow localhost/127.0.0.1 if explicitly tested, but block cloud metadata
        if hostname in ("169.254.169.254", "metadata.google.internal"):
            return False

        # Resolve IP to check for private ranges
        try:
            ip_str = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_str)

            # Block cloud link-local metadata
            if ip_obj.is_link_local:
                return False

            # In strict production mode, block private IPs
            settings = get_settings()
            if getattr(settings, "app_env", "development") == "production":
                if ip_obj.is_private or ip_obj.is_loopback:
                    return False
        except socket.error:
            # Cannot resolve hostname
            return False

        return True
    except Exception as e:
        logger.warning(f"SSRF validation error for URL {url}: {e}")
        return False


class NotificationDispatcher:
    """
    Authoritative notification engine for Slack, Teams, Jira, and Outgoing Webhooks.
    Generates genuine scan alerts, formats with Slack Block Kit, and logs all deliveries.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    # =========================================================================
    # 1. Slack Integration (Block Kit)
    # =========================================================================

    async def send_slack_notification(
        self,
        webhook_url: str,
        title: str,
        repository_name: str,
        branch: str,
        event_name: str,
        status: str,
        findings_summary: Dict[str, int],
        critical_finding_title: Optional[str] = None,
        scan_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends an authentic Slack Block Kit alert with live scan results.
        """
        if not webhook_url:
            return {"success": False, "error": "No Slack webhook URL configured"}

        crit_count = findings_summary.get("critical", findings_summary.get("CRITICAL", 0))
        high_count = findings_summary.get("high", findings_summary.get("HIGH", 0))
        med_count = findings_summary.get("medium", findings_summary.get("MEDIUM", 0))
        low_count = findings_summary.get("low", findings_summary.get("LOW", 0))
        total_count = crit_count + high_count + med_count + low_count

        status_emoji = "✅" if crit_count == 0 and high_count == 0 else "🚨"
        resolved_url = scan_url or f"{self.settings.cors_origins[0] if self.settings.cors_origins else 'http://localhost:3002'}/code/repositories"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{status_emoji} KAVACH SECURITY ALERT — {repository_name}",
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Repository:*\n`{repository_name}`"},
                    {"type": "mrkdwn", "text": f"*Branch:*\n`{branch}`"},
                    {"type": "mrkdwn", "text": f"*Trigger Event:*\n{event_name}"},
                    {"type": "mrkdwn", "text": f"*Scan Status:*\n*{status}*"},
                ],
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Critical:*\n🔴 *{crit_count}*"},
                    {"type": "mrkdwn", "text": f"*High:*\n🟠 *{high_count}*"},
                    {"type": "mrkdwn", "text": f"*Medium:*\n🟡 *{med_count}*"},
                    {"type": "mrkdwn", "text": f"*Low:*\n🟢 *{low_count}*"},
                ],
            },
        ]

        if critical_finding_title:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*🚨 New Critical Vulnerability Detected:*\n>{critical_finding_title}",
                },
            })

        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "🛡️ Inspect Findings in Kavach",
                        "emoji": True,
                    },
                    "url": resolved_url,
                    "style": "danger" if crit_count > 0 else "primary",
                }
            ],
        })

        payload = {
            "text": f"{status_emoji} Kavach Alert for {repository_name}: {total_count} findings ({crit_count} critical)",
            "blocks": blocks,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(webhook_url, json=payload)
                if res.status_code == 200:
                    return {"success": True, "status_code": 200, "message": "Delivered to Slack"}
                else:
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "error": f"Slack rejected webhook: {res.text[:200]}",
                    }
        except Exception as e:
            logger.error(f"Failed delivering Slack notification: {e}")
            return {"success": False, "error": str(e)}

    async def send_slack_test(self, webhook_url: str, channel: Optional[str] = None) -> Dict[str, Any]:
        """Sends a verification test payload to a connected Slack webhook."""
        return await self.send_slack_notification(
            webhook_url=webhook_url,
            title="Kavach Connection Test",
            repository_name="kavach-security-platform",
            branch="main",
            event_name="manual.test",
            status="CONNECTED & OPERATIONAL",
            findings_summary={"critical": 0, "high": 0, "medium": 0, "low": 0},
            critical_finding_title=None,
            scan_url="http://localhost:3002/integrations",
        )

    # =========================================================================
    # 2. Microsoft Teams Integration (Adaptive Card / Connector)
    # =========================================================================

    async def send_teams_notification(
        self,
        webhook_url: str,
        repository_name: str,
        branch: str,
        event_name: str,
        findings_summary: Dict[str, int],
        scan_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sends a structured Microsoft Teams connector card."""
        if not webhook_url:
            return {"success": False, "error": "No Teams webhook URL provided"}

        crit_count = findings_summary.get("critical", findings_summary.get("CRITICAL", 0))
        high_count = findings_summary.get("high", findings_summary.get("HIGH", 0))

        theme_color = "D9383A" if crit_count > 0 else ("EA580C" if high_count > 0 else "2563EB")
        resolved_url = scan_url or "http://localhost:3002/code/repositories"

        card = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": theme_color,
            "summary": f"Kavach Security Alert: {repository_name}",
            "sections": [
                {
                    "activityTitle": f"🛡️ Kavach Security Assessment — {repository_name}",
                    "activitySubtitle": f"Branch: {branch} • Event: {event_name}",
                    "facts": [
                        {"name": "Critical Findings", "value": str(crit_count)},
                        {"name": "High Findings", "value": str(high_count)},
                        {"name": "Status", "value": "COMPLETED"},
                    ],
                    "markdown": True,
                }
            ],
            "potentialAction": [
                {
                    "@type": "OpenURI",
                    "name": "View Scan in Kavach",
                    "targets": [{"os": "default", "uri": resolved_url}],
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(webhook_url, json=card)
                if res.status_code in (200, 201):
                    return {"success": True, "status_code": res.status_code}
                return {"success": False, "status_code": res.status_code, "error": res.text[:200]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # =========================================================================
    # 3. Jira Integration (REST API Issue Creation)
    # =========================================================================

    async def create_jira_issue(
        self,
        domain: str,
        email: str,
        api_token: str,
        project_key: str,
        finding_title: str,
        finding_description: str,
        severity: str,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Creates or links a ticket in Jira Cloud for a confirmed security finding."""
        if not domain or not email or not api_token or not project_key:
            return {"success": False, "error": "Incomplete Jira credentials"}

        # Normalize Jira base URL
        base_url = domain if domain.startswith("http") else f"https://{domain}"
        endpoint = f"{base_url.rstrip('/')}/rest/api/3/issue"

        priority_map = {
            "CRITICAL": "Highest",
            "HIGH": "High",
            "MEDIUM": "Medium",
            "LOW": "Low",
        }
        jira_priority = priority_map.get(severity.upper(), "Medium")

        summary = f"[Kavach-{severity.upper()}] {finding_title}"
        if file_path:
            summary += f" in {file_path}:{line_number or 1}"

        payload = {
            "fields": {
                "project": {"key": project_key.upper()},
                "summary": summary[:250],
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"Kavach Autonomous Security Scanner identified a {severity} finding:\n{finding_description}\nFile: {file_path or 'N/A'}:{line_number or 'N/A'}",
                                }
                            ],
                        }
                    ],
                },
                "issuetype": {"name": "Bug"},
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    endpoint,
                    json=payload,
                    auth=(email, api_token),
                    headers={"Content-Type": "application/json", "Accept": "application/json"},
                )
                if res.status_code in (200, 201):
                    data = res.json()
                    return {"success": True, "issue_key": data.get("key"), "issue_id": data.get("id")}
                return {"success": False, "status_code": res.status_code, "error": res.text[:300]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # =========================================================================
    # 4. Outgoing Webhooks (Signed Payloads + SSRF Protection)
    # =========================================================================

    async def deliver_outgoing_webhook(
        self,
        endpoint_id: uuid.UUID,
        event_type: str,
        payload_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Signs and delivers an outgoing webhook to a customer-configured endpoint.
        Logs delivery latency, response code, and payload for audit.
        """
        stmt = select(RealWebhookEndpoint).where(RealWebhookEndpoint.id == endpoint_id).limit(1)
        res = await self.db.execute(stmt)
        ep = res.scalar_one_or_none()

        if not ep or ep.status != "active":
            return {"success": False, "error": "Endpoint inactive or not found"}

        if not is_safe_webhook_url(ep.url):
            error_msg = f"Delivery blocked: SSRF protection policy rejected target URL {ep.url}"
            logger.warning(error_msg)
            # Log failed delivery
            delivery = RealWebhookDelivery(
                id=uuid.uuid4(),
                webhook_id=ep.id,
                event_type=event_type,
                status_code=400,
                latency_ms=0,
                request_payload=json.dumps(payload_data)[:5000],
                response_body=error_msg,
                success=False,
                error=error_msg,
                created_at=now_utc(),
            )
            self.db.add(delivery)
            await self.db.commit()
            return {"success": False, "error": error_msg}

        raw_payload = json.dumps(payload_data, default=str)
        payload_bytes = raw_payload.encode("utf-8")

        # Compute HMAC signature if secret is present
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Kavach-Webhook-Dispatcher/2.0",
            "X-Kavach-Event": event_type,
            "X-Kavach-Delivery": str(uuid.uuid4()),
            "X-Kavach-Timestamp": str(int(time.time())),
        }

        if ep.secret_encrypted:
            try:
                secret = decrypt_secret(ep.secret_encrypted)
                mac = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256)
                headers["X-Kavach-Signature-256"] = f"sha256={mac.hexdigest()}"
            except Exception as e:
                logger.warning(f"Failed signing outgoing webhook: {e}")

        start_time = time.time()
        status_code = None
        response_text = ""
        success = False
        error_detail = None

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
                resp = await client.post(ep.url, content=payload_bytes, headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)
                status_code = resp.status_code
                response_text = resp.text[:2000]
                success = 200 <= status_code < 300
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            error_detail = str(e)
            success = False

        # Persist audit record
        delivery = RealWebhookDelivery(
            id=uuid.uuid4(),
            webhook_id=ep.id,
            event_type=event_type,
            status_code=status_code,
            latency_ms=latency_ms,
            request_payload=raw_payload[:5000],
            response_body=response_text if success else (error_detail or response_text),
            success=success,
            error=error_detail,
            created_at=now_utc(),
        )
        self.db.add(delivery)
        ep.last_delivery_at = now_utc()
        await self.db.commit()

        return {
            "success": success,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "delivery_id": str(delivery.id),
        }
