"""
GitHub Webhook and CI/CD Evidence Collector.
Integrates with Step 8 GitHub jobs, pull requests, and commit verification events.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.runtime.collectors.base import BaseEvidenceCollector
from app.runtime.enums import EvidenceEventType, EvidenceSourceStatus, EvidenceSourceType
from app.runtime.schemas import RuntimeEvidenceIngestRequest


class GitHubEvidenceCollector(BaseEvidenceCollector):
    source_type = EvidenceSourceType.GITHUB

    def is_configured(self, config: Optional[Dict[str, Any]] = None) -> bool:
        return True

    def get_status(self, config: Optional[Dict[str, Any]] = None) -> EvidenceSourceStatus:
        return EvidenceSourceStatus.ACTIVE

    def translate_event(self, raw_event: Dict[str, Any], project_id: str) -> RuntimeEvidenceIngestRequest:
        delivery_id = raw_event.get("delivery_id") or raw_event.get("id")
        commit_sha = raw_event.get("commit_sha") or raw_event.get("after")
        repo_name = raw_event.get("repository", {}).get("full_name") if isinstance(raw_event.get("repository"), dict) else raw_event.get("repository", "org/repo")
        actor = raw_event.get("sender", {}).get("login") if isinstance(raw_event.get("sender"), dict) else raw_event.get("actor", "github-user")

        occurred_at = raw_event.get("timestamp") or raw_event.get("created_at") or datetime.now(timezone.utc)
        if isinstance(occurred_at, str):
            occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))

        subject = {
            "type": "USER",
            "id": actor,
            "username": actor,
        }

        action = {
            "type": raw_event.get("action_type", "DEPLOY"),
            "event": raw_event.get("event", "push"),
            "ref": raw_event.get("ref", "refs/heads/main"),
            "branch": raw_event.get("branch", "main"),
        }

        resource = {
            "type": "REPOSITORY",
            "id": repo_name,
            "commit_sha": commit_sha,
            "pull_request_number": raw_event.get("pull_request_number"),
        }

        context = {
            "delivery_id": delivery_id,
            "commit_sha": commit_sha,
            "check_run_id": raw_event.get("check_run_id"),
            "environment": raw_event.get("environment", "production"),
        }

        result = {
            "status": raw_event.get("status", "SUCCESS"),
            "conclusion": raw_event.get("conclusion", "success"),
        }

        trace = {
            "commit_sha": commit_sha,
            "delivery_id": delivery_id,
        }

        return RuntimeEvidenceIngestRequest(
            event_id=f"gh-{delivery_id}" if delivery_id else None,
            source_type=EvidenceSourceType.GITHUB.value,
            source_id=repo_name,
            source_event_id=str(delivery_id) if delivery_id else None,
            event_type=EvidenceEventType.DEPLOYMENT.value if "deploy" in str(action.get("type", "")).lower() else EvidenceEventType.GITHUB_EVENT.value,
            occurred_at=occurred_at,
            subject=subject,
            action=action,
            resource=resource,
            context=context,
            result=result,
            trace=trace,
            classification="INTERNAL",
            environment=raw_event.get("environment", "production"),
            raw_payload=raw_event,
        )
