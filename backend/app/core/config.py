import json
import os
from functools import lru_cache
from typing import List, Union, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application settings
    app_name: str = Field(default="SecureAI Control Plane", description="Human-readable application name")
    app_env: str = Field(default="development", description="Runtime environment: development | staging | production")
    app_host: str = Field(default="0.0.0.0", description="Host to bind server")
    app_port: int = Field(default=8000, description="Port to bind server")
    api_v1_prefix: str = Field(default="/api/v1", description="Prefix for v1 REST endpoints")
    public_app_url: str = Field(default="http://localhost:8000", description="Public URL for frontend portal or local API")
    mcp_base_url: Optional[str] = Field(default=None, description="Explicit base URL for MCP gateway endpoints (e.g. http://localhost:8000)")
    log_level: str = Field(default="INFO", description="Logging verbosity")

    # Security settings
    jwt_secret: str = Field(
        default="development-secret-key-change-in-production-min-32-chars-long",
        description="Secret key for signing tokens",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT hashing algorithm")
    access_token_expire_minutes: int = Field(default=10080, description="Access token expiration window (7 days)")

    # Database settings
    postgres_user: str = Field(default="postgres", description="PostgreSQL username")
    postgres_password: str = Field(default="secure_dev_password", description="PostgreSQL password")
    postgres_db: str = Field(default="secure_control_plane", description="PostgreSQL database name")
    postgres_host: str = Field(default="localhost", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, description="PostgreSQL port")
    database_url: Optional[str] = Field(
        default=None,
        description="Database connection URL from environment",
    )
    mongodb_url: Optional[str] = Field(
        default=None,
        description="MongoDB connection string for Thing Code & system persistence from environment",
    )
    mongodb_db_name: str = Field(default="secure_control_plane", description="MongoDB database name")
    sql_database_url: str = Field(
        default="sqlite+aiosqlite:///backend/dev.db",
        description="Fallback relational SQLite/PostgreSQL connection string",
    )

    # Mail / Invitation SMTP Configuration (Loaded from environment)
    mail_username: Optional[str] = Field(default=None, description="SMTP username / email from environment")
    mail_password: Optional[str] = Field(default=None, description="SMTP password / app password from environment")
    mail_default_sender: Optional[str] = Field(default="noreply@kavachsecurity.me", description="Default sender address")
    mail_alerts_sender: str = Field(default="alerts@kavachsecurity.me", description="Security alerts sender address")
    mail_server: str = Field(default="smtp.gmail.com", description="SMTP server host")
    mail_port: int = Field(default=587, description="SMTP server port")
    mail_starttls: bool = Field(default=True, description="Enable STARTTLS for SMTP")
    mail_ssl_tls: bool = Field(default=False, description="Enable SSL/TLS directly for SMTP")

    @field_validator("semgrep_bin", "gitleaks_bin", "trivy_bin", "osv_bin", "checkov_bin", "syft_bin", mode="before")
    @classmethod
    def sanitize_scanner_bin(cls, v: Optional[str]) -> str:
        if not v:
            return ""
        import sys, os
        # If running on Linux/Render and received a Windows-style path (e.g., C:\tools\scanners\gitleaks.exe)
        if sys.platform != "win32" and (":\\" in v or ":/" in v or v.lower().endswith(".exe") or "\\" in v):
            basename = os.path.basename(v.replace("\\", "/"))
            if basename.lower().endswith(".exe"):
                basename = basename[:-4]
            return basename
        return v

    # CORS settings
    cors_origins: Union[List[str], str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ],
        description="Allowed CORS origin domains",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins: List[str] = []
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        origins = [str(i).strip() for i in parsed if str(i).strip()]
                except Exception:
                    origins = [i.strip() for i in v.split(",") if i.strip()]
            else:
                origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, set)):
            origins = [str(i).strip() for i in v if str(i).strip()]

        # Only append production domains if running in production mode
        if os.environ.get("APP_ENV", "development").lower() == "production":
            essential = [
                "https://kavachsecurity.me",
                "https://www.kavachsecurity.me",
                "https://app.kavachsecurity.me",
                "https://api.kavachsecurity.me",
            ]
            for e in essential:
                if e not in origins:
                    origins.append(e)
        return origins

    # Redis Cache Settings
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")

    # OPA Settings
    opa_url: str = Field(default="http://localhost:8181", description="Open Policy Agent endpoint")

    # Scanners execution binaries
    semgrep_bin: str = Field(default="semgrep", description="Executable path for Semgrep")
    gitleaks_bin: str = Field(default="gitleaks", description="Executable path for Gitleaks")
    trivy_bin: str = Field(default="trivy", description="Executable path for Trivy")
    osv_bin: str = Field(default="osv-scanner", description="Executable path for OSV Scanner")
    checkov_bin: str = Field(default="checkov", description="Executable path for Checkov")
    syft_bin: str = Field(default="syft", description="Executable path for Syft SBOM generator")

    # LLM Settings
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama local LLM API base URL")
    llm_model: str = Field(default="llama3.2", description="Default model name for reasoning")
    gemini_api_key: Optional[str] = Field(default=None, description="Google Gemini API Key for Auto-Fix remediation")
    gemini_model: str = Field(default="gemini-2.5-flash-lite", description="Gemini model identifier")

    # GitHub Integration & Native App Settings
    github_app_id: Optional[str] = Field(
        default="5771182",
        description="GitHub App ID for RS256 JWT generation",
    )
    github_token: Optional[str] = Field(
        default=None,
        description="GitHub Personal Access Token for remote git operations and PR creation",
    )
    github_client_id: Optional[str] = Field(
        default="Iv23liqai7qjzsE9RllD",
        description="GitHub App / OAuth Client ID",
    )
    github_client_secret: Optional[str] = Field(
        default=None,
        description="GitHub App / OAuth Client Secret",
    )
    github_app_slug: str = Field(
        default="kavach-security",
        description="GitHub App Slug name used for installation URL",
    )
    github_app_name: Optional[str] = Field(
        default="kavach-security",
        description="GitHub App Display Name / Slug",
    )
    github_app_private_key: Optional[str] = Field(
        default=None,
        description="GitHub App Private Key in PEM format (or escaped newlines)",
    )
    github_private_key_path: Optional[str] = Field(
        default=None,
        description="Path to GitHub App Private Key PEM file",
    )
    github_webhook_secret: Optional[str] = Field(
        default="kavach_github_webhook_secret_2026",
        description="GitHub Webhook Secret for HMAC SHA-256 signature verification",
    )
    github_callback_url: str = Field(
        default="http://localhost:8000/integrations/github/callback",
        description="GitHub App installation and OAuth callback URL",
    )
    github_webhook_url: str = Field(
        default="http://localhost:8000/webhooks/github",
        description="GitHub Webhook receiver URL",
    )
    frontend_url: str = Field(
        default="http://localhost:3002",
        description="Frontend application root URL for user redirects",
    )
    github_redirect_uri: str = Field(
        default="http://localhost:8000/integrations/github/callback",
        description="GitHub OAuth Redirect URI",
    )
    github_workspace_dir: str = Field(
        default="scratch/github_workspaces",
        description="Base directory for temporary clone checkouts for scanning",
    )

    # Cal.com Scheduling Integration
    cal_api_key: str = Field(
        default="cal_live_a318f2142cfa1ac4d7053b9817947eb6",
        description="Cal.com API key for booking integration",
    )
    cal_event_type_id: int = Field(
        default=7917954,
        description="Cal.com Event Type ID for 30min walkthrough",
    )
    cal_event_slug: str = Field(
        default="30min",
        description="Cal.com Event Slug",
    )
    cal_username: str = Field(
        default="mayur-4bo7cv",
        description="Cal.com Username",
    )
    cal_api_version: str = Field(
        default="2024-08-13",
        description="Cal.com API Version",
    )

    # Google OAuth Settings
    google_client_id: Optional[str] = Field(
        default=None,
        description="Google OAuth Client ID",
    )
    google_client_secret: Optional[str] = Field(
        default=None,
        description="Google OAuth Client Secret",
    )
    google_redirect_uri: str = Field(
        default="https://kavachsecurity.me/auth/callback/google",
        description="Google OAuth Redirect URI",
    )

    # OpenAI Sign in with ChatGPT (SIWC) Settings
    openai_siwc_enabled: bool = Field(
        default=False,
        description="Whether Sign in with ChatGPT (SIWC) is enabled for Kavach",
    )
    openai_siwc_client_id: Optional[str] = Field(
        default=None,
        description="Approved OpenAI SIWC Client ID",
    )
    openai_siwc_client_secret: Optional[str] = Field(
        default=None,
        description="Approved OpenAI SIWC Client Secret",
    )
    openai_siwc_issuer: str = Field(
        default="https://auth.openai.com",
        description="OpenAI OIDC Issuer URL",
    )
    openai_siwc_auth_url: str = Field(
        default="https://auth.openai.com/oauth/authorize",
        description="OpenAI SIWC Authorization URL",
    )
    openai_siwc_token_url: str = Field(
        default="https://auth.openai.com/oauth/token",
        description="OpenAI SIWC Token Exchange URL",
    )
    openai_siwc_jwks_uri: str = Field(
        default="https://auth.openai.com/oauth/jwks",
        description="OpenAI SIWC JWKS URI for token signature verification",
    )
    openai_siwc_scopes: str = Field(
        default="openid profile email",
        description="Scopes requested from OpenAI for SIWC",
    )
    openai_siwc_redirect_uri: Optional[str] = Field(
        default=None,
        description="Kavach callback URL registered with OpenAI SIWC application",
    )

    # Enterprise SSO (SAML 2.0 / OIDC)
    sso_entrypoint_url: Optional[str] = Field(
        default="https://auth.seculayer-sso.com/login",
        description="Enterprise SSO SAML 2.0 Identity Provider entrypoint URL",
    )
    sso_issuer: str = Field(
        default="seculayer-control-plane",
        description="SSO Entity ID / Issuer",
    )
    sso_redirect_uri: str = Field(
        default="https://kavachsecurity.me/auth/callback/sso",
        description="SSO SAML / OIDC Callback URI",
    )


@lru_cache()
def get_settings() -> Settings:
    """Returns cached application settings."""
    return Settings()
