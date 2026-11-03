"""
Seed script for Founder SuperAdmin Module 03 · Part 3:
Tenant Plan Assignments, Overrides, Usage Telemetry & Audit Logs.
Populates realistic organizations (Acme Corp, Globex Inc, Initech, Umbrella Corp, Stark Industries)
with valid subscriptions, assignments, and telemetry.
"""

import asyncio
import logging
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
import app.models  # Ensure all models are registered
from app.models.organization import Organization, OrganizationSubscription
from app.models.plan import SubscriptionPlan, PlanVersion
from app.models.tenant_plan import (
    TenantPlanAssignment,
    TenantEntitlementOverride,
    TenantLimitOverride,
    TenantUsageRecord,
    TenantPlanAuditEvent,
)
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed-tenant-plans")


async def seed_tenant_plans():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check or seed subscription plans if not existing
        plans_data = [
            ("starter", "Starter", 99.0, 5, 2000, 5, 10, 50000),
            ("pro", "Pro", 299.0, 25, 10000, 20, 50, 500000),
            ("enterprise", "Enterprise", 0.0, 0, 50000, 50, 200, 2000000),
            ("custom", "Custom", 499.0, 100, 100000, 100, 500, 5000000),
        ]

        plan_models = {}
        for key, name, price, repos, scans, seats, storage, api_calls in plans_data:
            q = select(SubscriptionPlan).where(SubscriptionPlan.key == key)
            res = await session.execute(q)
            plan = res.scalar_one_or_none()
            if not plan:
                plan = SubscriptionPlan(
                    name=name,
                    key=key,
                    description=f"{name} security tier",
                    status="ACTIVE",
                    monthly_price=price,
                    annual_price=price * 10,
                )
                session.add(plan)
                await session.flush()

                # Add published version
                pv = PlanVersion(
                    plan_id=plan.id,
                    version_number=1,
                    status="PUBLISHED",
                    name=f"{name} v1.0",
                    max_repositories=repos,
                    monthly_scan_minutes=scans,
                    developer_seats=seats,
                    storage_limit_gb=storage,
                    monthly_api_calls=api_calls,
                    monthly_price=price,
                )
                session.add(pv)
            plan_models[key] = plan

        # Seed sample organizations from reference image Screen 1
        tenants_to_seed = [
            ("Acme Corp", "acme-corp", "acme.com", "PRO", "ACTIVE", 299.0, 18, 25, 6420, 10000),
            ("Globex Inc", "globex-inc", "globex.com", "ENTERPRISE", "ACTIVE", 0.0, 42, 0, 28500, 50000),
            ("Initech", "initech", "initech.com", "STARTER", "TRIALING", 99.0, 4, 5, 1200, 2000),
            ("Umbrella Corp", "umbrella-corp", "umbrella.com", "CUSTOM", "ACTIVE", 499.0, 31, 100, 41200, 100000),
            ("Stark Industries", "stark-industries", "stark.com", "PRO", "ACTIVE", 299.0, 22, 25, 8900, 10000),
        ]

        now = datetime.now(timezone.utc)

        for name, slug, domain, plan_name, sub_status, price, u_repos, m_repos, u_scans, m_scans in tenants_to_seed:
            q = select(Organization).where(Organization.slug == slug)
            res = await session.execute(q)
            org = res.scalar_one_or_none()

            org_status = "SUSPENDED" if name == "Stark Industries" else "ACTIVE"

            if not org:
                org = Organization(
                    name=name,
                    slug=slug,
                    domain=domain,
                    status=org_status,
                    org_type="Enterprise",
                )
                session.add(org)
                await session.flush()
                logger.info(f"Created organization '{name}' ({slug})")
            else:
                org.domain = domain
                org.status = org_status

            # Subscription
            sub_q = select(OrganizationSubscription).where(OrganizationSubscription.organization_id == org.id)
            sub_res = await session.execute(sub_q)
            sub = sub_res.scalar_one_or_none()

            plan_key = plan_name.lower()
            plan_ref = plan_models.get(plan_key)

            if not sub:
                sub = OrganizationSubscription(
                    organization_id=org.id,
                    plan=plan_name,
                    status=sub_status,
                    price_per_month=price,
                    billing_cycle="monthly",
                    max_repositories=m_repos,
                    used_repositories=u_repos,
                    max_scan_minutes=m_scans,
                    used_scan_minutes=u_scans,
                    max_storage_gb=100,
                    used_storage_gb=48,
                    max_api_calls=1000000,
                    used_api_calls=142560,
                    subscription_plan_id=plan_ref.id if plan_ref else None,
                )
                session.add(sub)
            else:
                sub.plan = plan_name
                sub.status = sub_status
                sub.price_per_month = price
                sub.used_repositories = u_repos
                sub.max_repositories = m_repos
                sub.used_scan_minutes = u_scans
                sub.max_scan_minutes = m_scans

            # Check if active assignment exists
            as_q = select(TenantPlanAssignment).where(
                TenantPlanAssignment.organization_id == org.id,
                TenantPlanAssignment.status == "ACTIVE",
            )
            as_res = await session.execute(as_q)
            assignment = as_res.scalar_one_or_none()

            if not assignment:
                assignment = TenantPlanAssignment(
                    organization_id=org.id,
                    plan_id=plan_ref.id if plan_ref else uuid.uuid4(),
                    plan_key=plan_key,
                    action="ASSIGNED",
                    status="ACTIVE",
                    price_per_month=price,
                    billing_cycle="monthly",
                    changed_by_name="Mayur Sharval",
                    reason="Initial platform setup",
                )
                session.add(assignment)

            # Seed initial audit events
            aud_q = select(TenantPlanAuditEvent).where(TenantPlanAuditEvent.organization_id == org.id)
            aud_res = await session.execute(aud_q)
            if not aud_res.scalars().first():
                events = [
                    TenantPlanAuditEvent(
                        organization_id=org.id,
                        plan_key=plan_key,
                        actor_name="Mayur Sharval",
                        action="Plan Assigned",
                        details=f"Assigned {plan_name.capitalize()} plan",
                        status="Success",
                        created_at=now - timedelta(days=32),
                    ),
                    TenantPlanAuditEvent(
                        organization_id=org.id,
                        plan_key=plan_key,
                        actor_name="System",
                        action="Plan Upgraded",
                        details="Upgraded to Pro tier",
                        status="Success",
                        created_at=now - timedelta(days=60),
                    ),
                ]
                session.add_all(events)

        await session.commit()
        logger.info("Successfully seeded Tenant Plan Assignments, Overrides, and Usage Telemetry.")


if __name__ == "__main__":
    asyncio.run(seed_tenant_plans())
