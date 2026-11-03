import json
from functools import lru_cache
from typing import List, Union, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
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
    public_app_url: str = Field(default="http://localhost:3002", description="Public URL for frontend portal")
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
    mail_default_sender: Optional[str] = Field(default="security@seculayer.internal", description="Default sender address")
    mail_server: str = Field(default="smtp.gmail.com", description="SMTP server host")
    mail_port: int = Field(default=587, description="SMTP server port")
    mail_starttls: bool = Field(default=True, description="Enable STARTTLS for SMTP")
    mail_ssl_tls: bool = Field(default=False, description="Enable SSL/TLS directly for SMTP")

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
        ],
        description="Allowed CORS origin domains",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, set)):
            return list(v)
        return []

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

    # GitHub Integration Settings
    github_token: Optional[str] = Field(
        default=None,
        description="GitHub Personal Access Token for remote git operations and PR creation",
    )
    github_client_id: Optional[str] = Field(
        default=None,
        description="GitHub OAuth App Client ID",
    )
    github_client_secret: Optional[str] = Field(
        default=None,
        description="GitHub OAuth App Client Secret",
    )
    github_redirect_uri: str = Field(
        default="http://localhost:3002/auth/callback/github",
        description="GitHub OAuth Redirect URI",
    )
    github_workspace_dir: str = Field(
        default="scratch/github_workspaces",
        description="Base directory for temporary clone checkouts for scanning",
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
        default="http://localhost:3002/auth/callback/google",
        description="Google OAuth Redirect URI",
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
        default="http://localhost:3002/auth/callback/sso",
        description="SSO SAML / OIDC Callback URI",
    )


@lru_cache()
def get_settings() -> Settings:
    """Returns cached application settings."""
    return Settings()
