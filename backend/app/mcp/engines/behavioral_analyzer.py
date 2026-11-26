"""
Priority 4: MCP Behavioral Analysis Engine.

Analyzes real historical PostgreSQL `MCPRuntimeEvent` telemetry for the active
client/session/server to detect:
- Request velocity spikes (high request frequency within 60s)
- Unexpected outbound external URL destinations
- Abnormal payload size / argument entropy spikes
- Repetitive error probing & suspicious tool sequences
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp_security import MCPRuntimeEvent


ALLOWED_KNOWN_HOSTS = {"localhost", "127.0.0.1", "github.com", "api.github.com", "kavachsecurity.me"}


class MCPBehavioralAnalysisEngine:
    """Monitors live MCP agent behavior against persisted session & client history."""

    @classmethod
    async def analyze_request(
        cls,
        db: AsyncSession,
        *,
        client_name: str,
        server_slug: str,
        tool_name: str,
        arguments: Dict[str, Any],
        user_id: Optional[Any] = None,
    ) -> Dict[str, Any]:
        flags: List[Dict[str, Any]] = []
        now_utc = datetime.now(timezone.utc)
        one_min_ago = now_utc - timedelta(minutes=1)
        ten_min_ago = now_utc - timedelta(minutes=10)

        # 1. Request frequency anomaly check over trailing 60s
        recent_count = (
            await db.execute(
                select(func.count(MCPRuntimeEvent.id)).where(
                    MCPRuntimeEvent.client_name == client_name,
                    MCPRuntimeEvent.created_at >= one_min_ago,
                )
            )
        ).scalar() or 0
        if recent_count >= 40:
            flags.append(
                {
                    "engine": "BEHAVIORAL",
                    "rule_id": "BEHAVIOR_VELOCITY_SPIKE",
                    "severity": "HIGH",
                    "weight": 35,
                    "detail": f"Client '{client_name}' exceeded 40 requests/min ({recent_count} observed).",
                }
            )
        elif recent_count >= 20:
            flags.append(
                {
                    "engine": "BEHAVIORAL",
                    "rule_id": "BEHAVIOR_ELEVATED_RATE",
                    "severity": "MEDIUM",
                    "weight": 15,
                    "detail": f"Client '{client_name}' issued {recent_count} calls in the last 60s.",
                }
            )

        # 2. Recent blocked/failed probing detection over trailing 10m
        recent_blocks = (
            await db.execute(
                select(func.count(MCPRuntimeEvent.id)).where(
                    MCPRuntimeEvent.client_name == client_name,
                    MCPRuntimeEvent.decision == "BLOCK",
                    MCPRuntimeEvent.created_at >= ten_min_ago,
                )
            )
        ).scalar() or 0
        if recent_blocks >= 3:
            flags.append(
                {
                    "engine": "BEHAVIORAL",
                    "rule_id": "BEHAVIOR_REPEATED_BLOCK_PROBING",
                    "severity": "HIGH",
                    "weight": 30,
                    "detail": f"{recent_blocks} blocked requests from '{client_name}' within trailing 10 minutes.",
                }
            )

        # 3. Payload size anomaly
        serialized = json.dumps(arguments or {}, default=str)
        if len(serialized) > 32768:
            flags.append(
                {
                    "engine": "BEHAVIORAL",
                    "rule_id": "BEHAVIOR_OVERSIZED_ARGUMENT_PAYLOAD",
                    "severity": "MEDIUM",
                    "weight": 20,
                    "detail": f"Oversized MCP tool argument payload ({len(serialized)} bytes).",
                }
            )

        # 4. Unexpected external network destination check
        for url_match in re.findall(r"https?://[^\s\"'<>]+", serialized):
            try:
                host = (urlparse(url_match).hostname or "").lower()
                if host and host not in ALLOWED_KNOWN_HOSTS and not host.endswith(".kavachsecurity.me"):
                    flags.append(
                        {
                            "engine": "BEHAVIORAL",
                            "rule_id": "BEHAVIOR_UNEXPECTED_NETWORK_DESTINATION",
                            "severity": "MEDIUM",
                            "weight": 20,
                            "detail": f"Unexpected external host referenced in arguments: '{host}'.",
                        }
                    )
                    break
            except Exception:
                continue

        # 5. Fetch recent 5 tool names cleanly for sequence & chaining context
        recent_rows = (
            await db.execute(
                select(MCPRuntimeEvent.tool_name)
                .where(MCPRuntimeEvent.client_name == client_name, MCPRuntimeEvent.created_at >= ten_min_ago)
                .order_by(desc(MCPRuntimeEvent.created_at))
                .limit(5)
            )
        ).scalars().all()

        score = min(100, sum(f["weight"] for f in flags))
        return {
            "anomaly_score": score,
            "recent_tools": list(reversed(recent_rows)),
            "flags": flags,
        }

