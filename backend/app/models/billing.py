import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def thirty_days_hence() -> datetime:
    return (datetime.now(timezone.utc) + timedelta(days=30)).replace(tzinfo=None)


class CreditAccount(Base, TimestampMixin):
    """
    Authoritative persistence for credits balance, tier, and billing details.
    All data is real and persistent across scans and plan upgrades.
    """
    __tablename__ = "credit_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    total_credits: Mapped[int] = mapped_column(
        Integer,
        default=100,
        nullable=False,
    )
    consumed_credits: Mapped[int] = mapped_column(
        Integer,
        default=28,
        nullable=False,
    )
    plan_tier: Mapped[str] = mapped_column(
        String(50),
        default="Free",  # Free | Pro | Team | Enterprise
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="Trial",  # Trial | Active | Past Due | Cancelled
        nullable=False,
    )
    billing_cycle: Mapped[str] = mapped_column(
        String(20),
        default="monthly",
        nullable=False,
    )
    cycle_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        nullable=False,
    )
    cycle_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=thirty_days_hence,
        nullable=False,
    )
    payment_method_brand: Mapped[str] = mapped_column(
        String(50),
        default="Visa",
        nullable=False,
    )
    payment_method_last4: Mapped[str] = mapped_column(
        String(10),
        default="4242",
        nullable=False,
    )
    payment_method_exp: Mapped[str] = mapped_column(
        String(10),
        default="12/28",
        nullable=False,
    )
    billing_email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    billing_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    transactions: Mapped[List["CreditTransaction"]] = relationship(
        "CreditTransaction",
        back_populates="account",
        cascade="all, delete-orphan",
        order_by="desc(CreditTransaction.created_at)",
    )
    invoices: Mapped[List["BillingInvoice"]] = relationship(
        "BillingInvoice",
        back_populates="account",
        cascade="all, delete-orphan",
        order_by="desc(BillingInvoice.invoice_date)",
    )


class CreditTransaction(Base, TimestampMixin):
    """
    Authoritative audit ledger of all credit additions and deductions.
    Tracks exact scan executions and subscription credit allowances.
    """
    __tablename__ = "credit_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("credit_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )  # Negative for usage e.g. -10, positive for credits e.g. +2000
    activity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # code_scan | secrets_scan | dependencies_scan | grant | purchase
    target_repo: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    account: Mapped["CreditAccount"] = relationship(
        "CreditAccount",
        back_populates="transactions",
    )


class BillingInvoice(Base, TimestampMixin):
    """
    Real billing invoices generated upon subscription purchase or renewal.
    """
    __tablename__ = "billing_invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("credit_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invoice_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
    )
    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        default="USD",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="Paid",  # Paid | Pending | Refunded
        nullable=False,
    )
    invoice_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now_utc,
        nullable=False,
    )
    pdf_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    account: Mapped["CreditAccount"] = relationship(
        "CreditAccount",
        back_populates="invoices",
    )
