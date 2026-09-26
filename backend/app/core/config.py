import json
from functools import lru_cache
from typing import List, Union
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
    log_level: str = Field(default="INFO", description="Logging verbosity")

    # Security settings
    jwt_secret: str = Field(
        default="development-secret-key-change-in-production-min-32-chars-long",
        description="Secret key for signing tokens",
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT hashing algorithm")
    access_token_expire_minutes: int = Field(default=60, description="Access token expiration window")

    # Database settings
    postgres_user: str = Field(default="postgres", description="PostgreSQL username")
    postgres_password: str = Field(default="secure_dev_password", description="PostgreSQL password")
    postgres_db: str = Field(default="secure_control_plane", description="PostgreSQL database name")
    postgres_host: str = Field(default="localhost", description="PostgreSQL host")
    postgres_port: int = Field(default=5432, description="PostgreSQL port")
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:secure_dev_password@localhost:5432/secure_control_plane",
        description="Async SQLAlchemy database connection URL",
    )

    # CORS settings
    cors_origins: Union[List[str], str] = Field(
        default=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
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

    # LLM Settings
    ollama_base_url: str = Field(default="http://localhost:11434", description="Ollama local LLM API base URL")
    llm_model: str = Field(default="llama3.2", description="Default model name for reasoning")


@lru_cache()
def get_settings() -> Settings:
    """Returns cached application settings."""
    return Settings()
