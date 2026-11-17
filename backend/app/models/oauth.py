import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class OAuthClient(Base, TimestampMixin):
    """
    OAuth 2.1 registered client (e.g. ChatGPT, Claude, Cursor, Custom Integration).
    Supports Dynamic Client Registration (RFC 7591) and static client provisioning.
    """
    __tablename__ = "oauth_clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    client_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    client_secret_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    client_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="MCP Client",
    )
    client_uri: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    logo_uri: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    redirect_uris: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    grant_types: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["authorization_code", "refresh_token"],
    )
    response_types: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["code"],
    )
    scope: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        default="projects:read scans:read scans:run findings:read remediation:propose",
    )
    token_endpoint_auth_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="none",  # "none" for PKCE public clients, "client_secret_post", "client_secret_basic"
    )
    is_confidential: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )


class OAuthAuthorizationCode(Base, TimestampMixin):
    """
    Single-use authorization code for OAuth 2.1 PKCE Authorization Code Grant.
    Lifetime is strictly 10 minutes.
    """
    __tablename__ = "oauth_authorization_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    client_id: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    redirect_uri: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    scope: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    code_challenge: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    code_challenge_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="S256",
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


class OAuthToken(Base, TimestampMixin):
    """
    Persisted record of issued OAuth 2.1 access and refresh tokens.
    Supports secure token rotation, instant revocation, and audit tracking.
    """
    __tablename__ = "oauth_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    access_token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=True,
    )
    client_id: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    scope: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    token_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Bearer",
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    access_token_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    refresh_token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
