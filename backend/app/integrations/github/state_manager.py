"""
Kavach Platform — GitHub OAuth & Installation CSRF State Manager
Generates cryptographically random state parameters bound to user, workspace, and project.
Enforces 15-minute expiration and strict single-use validation (replay attack prevention).
"""

import secrets
import time
from typing import Any, Dict, Optional
import uuid


class GitHubStateManager:
    def __init__(self, ttl_seconds: int = 900):
        self.ttl_seconds = ttl_seconds
        # In-memory store: state -> {user_id, workspace_id, project_id, redirect_url, expires_at}
        self._states: Dict[str, Dict[str, Any]] = {}
        # Track consumed state tokens / nonces to prevent replay attacks even with JWTs
        self._consumed: Dict[str, float] = {}

    def _cleanup_expired(self) -> None:
        """Removes expired states and consumed tokens."""
        now = time.time()
        expired = [s for s, data in self._states.items() if data.get("expires_at", 0) < now]
        for s in expired:
            self._states.pop(s, None)
        expired_consumed = [s for s, exp in self._consumed.items() if exp < now]
        for s in expired_consumed:
            self._consumed.pop(s, None)

    def create_installation_state(
        self,
        user_id: Optional[uuid.UUID] = None,
        workspace_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        redirect_url: Optional[str] = None,
    ) -> str:
        """
        Creates a cryptographically secure random state parameter bound to the authenticated identity.
        Generates a signed JWT with fallback to in-memory lookup.
        """
        self._cleanup_expired()
        now = time.time()
        uid_str = str(user_id) if user_id else None
        wid_str = str(workspace_id) if workspace_id else None
        pid_str = str(project_id) if project_id else None

        from app.core.config import get_settings
        import jwt
        settings = get_settings()

        payload = {
            "provider": "github",
            "user_id": uid_str,
            "workspace_id": wid_str,
            "project_id": pid_str,
            "return_url": redirect_url,
            "nonce": secrets.token_hex(16),
            "iat": int(now),
            "exp": int(now + self.ttl_seconds),
        }
        state = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

        self._states[state] = {
            "user_id": uid_str,
            "workspace_id": wid_str,
            "project_id": pid_str,
            "redirect_url": redirect_url,
            "created_at": now,
            "expires_at": now + self.ttl_seconds,
        }
        return state

    def verify_and_consume_state(self, state: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Validates state authenticity and expiration, immediately consuming it (single use).
        Supports both in-memory state lookup and signed JWT verification with replay attack prevention.
        Returns state payload if valid, None otherwise.
        """
        if not state:
            return None

        self._cleanup_expired()
        if state in self._consumed:
            return None

        data = self._states.pop(state, None)
        if data:
            if time.time() <= data.get("expires_at", 0):
                self._consumed[state] = data.get("expires_at", time.time() + self.ttl_seconds)
                return data

        # Fallback: decode signed JWT if state token was signed with server secret
        try:
            from app.core.config import get_settings
            import jwt
            settings = get_settings()
            decoded = jwt.decode(state, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            nonce = decoded.get("nonce")
            if nonce and nonce in self._consumed:
                return None
            if decoded.get("provider") == "github":
                exp = decoded.get("exp", time.time() + self.ttl_seconds)
                self._consumed[state] = exp
                if nonce:
                    self._consumed[nonce] = exp
                return {
                    "user_id": decoded.get("user_id"),
                    "workspace_id": decoded.get("workspace_id"),
                    "project_id": decoded.get("project_id"),
                    "redirect_url": decoded.get("return_url") or decoded.get("redirect_url"),
                }
        except Exception:
            pass

        return None


# Global singleton instance
github_state_manager = GitHubStateManager()

