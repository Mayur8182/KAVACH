import os
import time
from abc import ABC, abstractmethod
from typing import Dict, Optional, Tuple
import jwt
from app.core.config import get_settings


class SecretProvider(ABC):
    """Abstract interface for retrieving sensitive credentials."""

    @abstractmethod
    def get_github_private_key(self) -> Optional[str]:
        """Returns the GitHub App RSA Private Key in PEM format."""
        pass

    @abstractmethod
    def get_webhook_secret(self) -> Optional[str]:
        """Returns the GitHub Webhook secret string."""
        pass


class EnvSecretProvider(SecretProvider):
    """Retrieves secrets from environment variables and configured files."""

    def get_github_private_key(self) -> Optional[str]:
        settings = get_settings()
        key_or_path = settings.github_app_private_key
        if not key_or_path:
            return None

        # If it points to an existing file on disk, read it
        if os.path.exists(key_or_path) and os.path.isfile(key_or_path):
            with open(key_or_path, "r", encoding="utf-8") as f:
                return f.read().strip()

        # Otherwise treat as raw PEM string (handle possible escaped newlines)
        return key_or_path.replace("\\n", "\n").strip()

    def get_webhook_secret(self) -> Optional[str]:
        settings = get_settings()
        return settings.github_webhook_secret


# Default singleton provider
default_secret_provider = EnvSecretProvider()


class GitHubAppAuth:
    """
    Handles GitHub App JWT authentication and manages short-lived installation access tokens.
    Installation access tokens are cached in memory and refreshed before expiry.
    Tokens are NEVER persisted to database.
    """

    def __init__(self, secret_provider: Optional[SecretProvider] = None):
        self.secret_provider = secret_provider or default_secret_provider
        # In-memory token cache: installation_id -> (token, expires_at_timestamp)
        self._token_cache: Dict[int, Tuple[str, float]] = {}

    def is_configured(self) -> bool:
        """Checks if the GitHub App ID and Private Key are configured."""
        settings = get_settings()
        key = self.secret_provider.get_github_private_key()
        return bool(settings.github_app_id and key)

    def generate_app_jwt(self) -> str:
        """
        Generates a short-lived RS256 JWT for GitHub App authentication.
        Valid for 9 minutes (GitHub allows maximum 10 minutes).
        """
        settings = get_settings()
        if not settings.github_app_id:
            raise ValueError("GITHUB_APP_ID is not configured")

        private_key = self.secret_provider.get_github_private_key()
        if not private_key:
            raise ValueError("GITHUB_APP_PRIVATE_KEY is not configured or could not be loaded")

        now = int(time.time())
        payload = {
            "iat": now - 60,  # 60s in the past to allow for server clock drift
            "exp": now + (9 * 60),  # Expires in 9 minutes
            "iss": str(settings.github_app_id),
        }

        encoded_jwt = jwt.encode(payload, private_key, algorithm="RS256")
        return encoded_jwt

    def get_cached_installation_token(self, installation_id: int) -> Optional[str]:
        """Returns cached installation token if still valid for at least 2 minutes."""
        if installation_id in self._token_cache:
            token, expires_at = self._token_cache[installation_id]
            # If token is still valid for > 120 seconds, reuse it
            if time.time() < (expires_at - 120):
                return token
        return None

    def store_cached_installation_token(
        self, installation_id: int, token: str, expires_at: float
    ) -> None:
        """Stores token in short-lived in-memory cache."""
        self._token_cache[installation_id] = (token, expires_at)

    def clear_cache(self) -> None:
        """Clears all cached tokens."""
        self._token_cache.clear()
