import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
import app.models  # Ensure all models are registered
from app.models.organization import Organization
from app.models.quota_seat_trial import (
    QuotaPolicy,
    QuotaAlertRule,
    QuotaAlertEvent,
    SeatPolicy,
    SeatLimitOverride,
    OrganizationTrial,
    TrialEvent,
)
from sqlalchemy import select


async def seed_part4():
    print("[INFO] Creating any missing tables and seeding Part 4...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Fetch or create organizations
        q = select(Organization).order_by(Organization.name)
        res = await session.execute(q)
        orgs = {o.name.lower(): o for o in res.scalars().all()}

        canonical_org_names = [
            ("Acme Corp", "acme-corp", "acme.com"),
            ("Globex Inc", "globex-inc", "globex.com"),
            ("Initech", "initech", "initech.com"),
            ("Umbrella Corp", "umbrella-corp", "umbrella.com"),
            ("Stark Industries", "stark-industries", "stark.com"),
            ("Wayne Enterprises", "wayne-enterprises", "wayne.com"),
            ("Hooli", "hooli", "hooli.com"),
            ("Pied Piper", "pied-piper", "piedpiper.com"),
            ("Massive Dynamic", "massive-dynamic", "massivedynamic.com"),
        ]

        for name, slug, dom in canonical_org_names:
            if name.lower() not in orgs:
                new_org = Organization(
                    name=name,
                    slug=slug,
                    domain=dom,
                    status="ACTIVE",
                )
                session.add(new_org)
                orgs[name.lower()] = new_org

        await session.flush()

        # 2. Seed Quota Policies
        policies = [
            (
                "repositories",
                {
                    "block_at_limit": True,
                    "allow_temporary_overage": False,
                    "notify_admins_at_80": True,
                    "include_archived": False,
                },
            ),
            (
                "scans",
                {
                    "block_scans_when_limit_reached": True,
                    "allow_burst_usage": False,
                    "notify_admins_at_80": True,
                    "reset_period": "Monthly",
                },
            ),
            (
                "api_usage",
                {
                    "enforce_rate_limits": True,
                    "block_requests_when_nearly_limit_reached": True,
                    "allow_whitelisted_ip_ranges": False,
                    "log_all_blocked_requests": True,
                },
            ),
            (
                "storage",
                {
                    "include_scan_artifacts": True,
                    "auto_delete_scan_artifacts_after_90_days": False,
                    "allow_tenant_configure_retention": True,
                    "notify_admins_at_80": True,
                },
            ),
            (
                "notifications",
                {
                    "send_daily_summary": False,
                    "notify_tenant_admins": True,
                    "notify_platform_users": True,
                },
            ),
        ]

        for cat, rules in policies:
            qp_q = select(QuotaPolicy).where(QuotaPolicy.category == cat)
            qp_res = await session.execute(qp_q)
            existing = qp_res.scalar_one_or_none()
            if not existing:
                session.add(QuotaPolicy(category=cat, rules_json=rules, updated_by="Founder SuperAdmin"))

        # 3. Seed Alert Rules (Screen 8)
        rules_to_seed = [
            ("High Repository Usage", "Repositories", 85, "Email, Slack"),
            ("Scan Limit Warning", "Scan Minutes", 80, "Email, Slack"),
            ("API Limit Alert", "API Calls", 90, "Email"),
            ("Storage Limit Alert", "Storage", 80, "Email"),
            ("Concurrent Scan Alert", "Concurrent Scans", 90, "Email, Slack"),
        ]

        for name, qtype, thresh, chans in rules_to_seed:
            ar_q = select(QuotaAlertRule).where(QuotaAlertRule.rule_name == name)
            ar_res = await session.execute(ar_q)
            if not ar_res.scalar_one_or_none():
                session.add(QuotaAlertRule(
                    rule_name=name,
                    quota_type=qtype,
                    threshold_percent=thresh,
                    channels=chans,
                    status="Active",
                ))

        # 4. Seed Quota Alert Events (Screen 7 Recent Events)
        events_to_seed = [
            ("Initech", "Scan Minutes", "Usage reached 90%", "9,000 / 10,000"),
            ("Umbrella Corp", "API Calls", "Limit exceeded", "520,000 / 500,000"),
            ("Globex Inc", "Repositories", "Override updated", "25 → 50"),
        ]

        for oname, qtype, etype, det in events_to_seed:
            ev_q = select(QuotaAlertEvent).where(
                QuotaAlertEvent.organization_name == oname,
                QuotaAlertEvent.quota_type == qtype,
            )
            ev_res = await session.execute(ev_q)
            if not ev_res.scalar_one_or_none():
                o = orgs.get(oname.lower())
                session.add(QuotaAlertEvent(
                    organization_id=o.id if o else None,
                    organization_name=oname,
                    quota_type=qtype,
                    event_type=etype,
                    details=det,
                ))

        # 5. Seed Seat Policy (Screen 11)
        sp_q = select(SeatPolicy)
        sp_res = await session.execute(sp_q)
        if not sp_res.scalar_one_or_none():
            session.add(SeatPolicy(
                allow_invite_beyond_limit=False,
                auto_revoke_inactive_after_90_days=True,
                send_usage_alerts_at_80=True,
                default_role_mapping="Developer",
                plan_defaults_json={
                    "starter": {"developers": 5, "security": 2, "auditors": 1},
                    "pro": {"developers": 15, "security": 5, "auditors": 3},
                    "enterprise": {"developers": 100, "security": 20, "auditors": 10},
                },
            ))

        # 6. Seed Seat Overrides (Screen 12)
        seat_overrides = [
            ("Acme Corp", "Developers", 15, 25, datetime(2025, 12, 31, tzinfo=timezone.utc)),
            ("Globex Inc", "Security Engineers", 20, 30, datetime(2025, 11, 30, tzinfo=timezone.utc)),
            ("Umbrella Corp", "All Roles", 10, 15, datetime(2026, 1, 31, tzinfo=timezone.utc)),
        ]

        for oname, role, dlim, olim, valid in seat_overrides:
            so_q = select(SeatLimitOverride).where(
                SeatLimitOverride.organization_name == oname,
                SeatLimitOverride.role == role,
            )
            so_res = await session.execute(so_q)
            if not so_res.scalar_one_or_none():
                o = orgs.get(oname.lower())
                session.add(SeatLimitOverride(
                    organization_id=o.id if o else uuid.uuid4(),
                    organization_name=oname,
                    domain=o.domain if o else f"{oname.lower()}.com",
                    role=role,
                    default_limit=dlim,
                    override_limit=olim,
                    valid_till=valid,
                    status="Active",
                    actor_name="Founder SuperAdmin",
                ))

        # 7. Seed Organization Trials (Screen 13 & 15)
        now = datetime.now(timezone.utc)
        trials_to_seed = [
            ("Hooli", "pro", 14, now - timedelta(days=11), now + timedelta(days=3), "EXPIRING"),
            ("Pied Piper", "starter", 14, now - timedelta(days=30), now - timedelta(days=16), "EXPIRED"),
            ("Massive Dynamic", "enterprise", 14, now - timedelta(days=25), now - timedelta(days=11), "CONVERTED"),
            ("Stark Industries", "pro", 14, now - timedelta(days=7), now + timedelta(days=7), "ACTIVE"),
            ("Initech", "starter", 30, now - timedelta(days=18), now + timedelta(days=12), "ACTIVE"),
        ]

        for oname, pkey, dur, sdate, edate, st in trials_to_seed:
            tr_q = select(OrganizationTrial).where(OrganizationTrial.organization_name == oname)
            tr_res = await session.execute(tr_q)
            if not tr_res.scalar_one_or_none():
                o = orgs.get(oname.lower())
                trial = OrganizationTrial(
                    organization_id=o.id if o else uuid.uuid4(),
                    organization_name=oname,
                    domain=o.domain if o else f"{oname.lower()}.com",
                    plan_key=pkey,
                    duration_days=dur,
                    start_date=sdate,
                    end_date=edate,
                    status=st,
                    converted_at=sdate + timedelta(days=13) if st == "CONVERTED" else None,
                    target_plan_key=pkey if st == "CONVERTED" else None,
                    cancellation_reason="Trial expired" if st == "EXPIRED" else None,
                )
                session.add(trial)
                await session.flush()

                # Add initial event
                session.add(TrialEvent(
                    trial_id=trial.id,
                    event_type="CREATED",
                    details=f"Created {dur}-day {pkey.capitalize()} trial",
                    performed_by="Founder SuperAdmin",
                    created_at=sdate,
                ))

        await session.commit()
        print("[SUCCESS] Successfully seeded Part 4: Quotas, Seats, and Trials.")


if __name__ == "__main__":
    asyncio.run(seed_part4())
