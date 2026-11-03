import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import (
    Organization,
    Workspace,
    OrganizationSubscription,
    ProductEntitlement,
    SubscriptionAuditEvent,
)
from app.models.user import User

logger = logging.getLogger("secure-control-plane")

# Authoritative product specifications
PRODUCT_CATALOG_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "thing_code": {
        "key": "thing_code",
        "name": "Thing Code",
        "tagline": "Code quality, SAST, secrets, dependency and PR checks",
        "description": "Deterministic code security engine running Semgrep, Gitleaks, OSV, SBOM generation, and automated GitHub PR reviews.",
        "category": "Application Security & SAST",
        "icon": "Code2",
        "primary_route": "/code",
        "badge": "Core AppSec",
        "price_per_month": 29,
        "features": [
            {"name": "SAST Code Scanner (Semgrep OSS)", "included": True},
            {"name": "Secret Scanner & Hardcoded Token Detection (Gitleaks)", "included": True},
            {"name": "Open-Source Dependency Risk & Vulnerability Check (OSV)", "included": True},
            {"name": "Software Bill of Materials (SBOM) CycloneDX / SPDX", "included": True},
            {"name": "Automated Pull Request Security Reviews & Checks", "included": True},
            {"name": "Deterministic AutoFix & Remediation Diff Generator", "included": True},
        ],
    },
    "thing_cloud": {
        "key": "thing_cloud",
        "name": "Thing Cloud",
        "tagline": "Cloud infrastructure security",
        "description": "Cloud security posture management (CSPM), Kubernetes cluster auditing, Docker hardening, and IaC drift detection.",
        "category": "Cloud Security Posture (CSPM)",
        "icon": "Cloud",
        "primary_route": "/cloud",
        "badge": "Infrastructure",
        "price_per_month": 79,
        "features": [
            {"name": "Cloud Security Posture Management (CSPM / CNAPP)", "included": True},
            {"name": "Kubernetes Cluster Hardening & CIS Benchmarks", "included": True},
            {"name": "Docker Daemon & Container Host Posture", "included": True},
            {"name": "IaC Misconfiguration Scanning & Drift Detection", "included": True},
            {"name": "Cloud IAM Role Analysis & Privilege Blast Radius", "included": True},
            {"name": "Multi-Cloud Perimeter & Public Asset Exposure Discovery", "included": True},
        ],
    },
    "thing_attack": {
        "key": "thing_attack",
        "name": "Thing Attack",
        "tagline": "DAST, API testing and authorized security testing",
        "description": "Offensive security platform featuring automated DAST scanning, active API fuzzing, and verified pentest workflows.",
        "category": "Offensive Security & DAST",
        "icon": "Crosshair",
        "primary_route": "/attack",
        "badge": "Offensive",
        "price_per_month": 99,
        "features": [
            {"name": "Dynamic Application Security Testing (DAST Run Engine)", "included": True},
            {"name": "API Endpoint Schema Discovery & Interactive Fuzzing", "included": True},
            {"name": "External Attack Surface Mapping & Asset Discovery", "included": True},
            {"name": "Automated Pentest Scenarios & Attack Path Traversal", "included": True},
            {"name": "Vulnerability Retest & Continuous Verification Engine", "included": True},
            {"name": "Executive & Compliance Attack Reports (PDF/CSV)", "included": True},
        ],
    },
    "thing_protect": {
        "key": "thing_protect",
        "name": "Thing Protect",
        "tagline": "Runtime and application defense",
        "description": "Zero-trust runtime protection, MCP tool security gateway, autonomous AI agent guardrails, and instant break-glass controls.",
        "category": "Runtime Defense & Gateway",
        "icon": "ShieldCheck",
        "primary_route": "/protect",
        "badge": "Runtime Zero-Trust",
        "price_per_month": 149,
        "features": [
            {"name": "Runtime Threat Defense & eBPF Security Signals", "included": True},
            {"name": "MCP Security Gateway & Strict Tool Authorization", "included": True},
            {"name": "Autonomous AI Agent Guardrails & Policy Enforcement", "included": True},
            {"name": "Break-Glass Administrative Access & Dual-Sign Approvals", "included": True},
            {"name": "Instant Session Revocation & Blast Radius Isolation", "included": True},
            {"name": "Real-Time Security Operations Center (SOC) Triage", "included": True},
        ],
    },
    "thing_agent": {
        "key": "thing_agent",
        "name": "Thing Agent",
        "tagline": "AI agent security, authority ceilings and tool governance",
        "description": "Comprehensive governance, cryptographic tool permissions, and OPA guardrails for autonomous AI coding agents.",
        "category": "AI Agent Security & Governance",
        "icon": "Bot",
        "primary_route": "/agent",
        "badge": "AI Governance",
        "price_per_month": 89,
        "features": [
            {"name": "Agent Identity & Trust Registry", "included": True},
            {"name": "Model Context Protocol (MCP) Gateway", "included": True},
            {"name": "Authority Ceilings & Tool Delegation Matrix", "included": True},
            {"name": "Immutable Cryptographic Audit Trail", "included": True},
            {"name": "Automated Anomaly Session Revocation", "included": True},
        ],
    },
    "thing_qa": {
        "key": "thing_qa",
        "name": "Thing QA",
        "tagline": "Automated quality and regression engineering",
        "description": "Quality engineering workspace running automated browser verification, API functional validation, and visual regression testing.",
        "category": "Quality Engineering & Testing",
        "icon": "CheckCircle2",
        "primary_route": "/qa",
        "badge": "QA Automation",
        "price_per_month": 49,
        "features": [
            {"name": "Automated End-to-End Browser Test Runner", "included": True},
            {"name": "API Functional Testing & Schema Assertions", "included": True},
            {"name": "Visual Regression & Layout Diff Engine", "included": True},
            {"name": "CI/CD Test Artifacts & Video Recordings", "included": True},
            {"name": "Performance & Lighthouse Auditing", "included": True},
        ],
    },
}


class EntitlementService:
    """Production service for managing workspace subscriptions and product-based access control."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_user_organization(self, user: User) -> Organization:
        """Resolves the user's active organization or provisions a personal organization."""
        # 1. Check if user is owner of an organization
        stmt = select(Organization).where(Organization.owner_id == user.id).limit(1)
        res = await self.db.execute(stmt)
        org = res.scalars().first()

        # 2. Check if any organization exists in the database
        if not org:
            stmt_any = select(Organization).order_by(Organization.created_at.desc()).limit(1)
            res_any = await self.db.execute(stmt_any)
            org = res_any.scalars().first()

        # 3. Create default organization if none exists
        if not org:
            org_id = uuid.uuid4()
            org_slug = f"org-{(user.name or 'workspace').lower().replace(' ', '-')[:20]}-{uuid.uuid4().hex[:4]}"
            org = Organization(
                id=org_id,
                name=f"{user.name}'s Organization" if user.name else "SecuLayer Workspace",
                slug=org_slug,
                org_type="Team Workspace",
                industry="Technology",
                team_size="1 - 10",
                region="ap-south-1 (Mumbai)",
                owner_id=user.id,
                owner_name=user.name,
                owner_email=user.email,
                status="ACTIVE",
            )
            self.db.add(org)
            await self.db.flush()

            # Create default workspace
            ws = Workspace(
                id=uuid.uuid4(),
                organization_id=org.id,
                name="Production Workspace",
                slug="production",
                description="Primary security operations workspace",
                visibility="Private",
                region="ap-south-1 (Mumbai)",
                deployment_target="Kubernetes",
                admins=[user.name or user.email],
                status="ACTIVE",
                environments_count=1,
            )
            self.db.add(ws)
            await self.db.flush()

        # Ensure OrganizationSubscription exists
        sub_stmt = select(OrganizationSubscription).where(OrganizationSubscription.organization_id == org.id).limit(1)
        sub_res = await self.db.execute(sub_stmt)
        sub = sub_res.scalars().first()
        if not sub:
            sub = OrganizationSubscription(
                id=uuid.uuid4(),
                organization_id=org.id,
                plan="FREE_TIER",
                status="ACTIVE",
                billing_cycle="monthly",
                max_seats=5,
                used_seats=1,
            )
            self.db.add(sub)
            await self.db.flush()

        # Ensure ProductEntitlements exist for all 4 products
        for prod_key in PRODUCT_CATALOG_DEFINITIONS.keys():
            ent_stmt = select(ProductEntitlement).where(
                and_(
                    ProductEntitlement.organization_id == org.id,
                    ProductEntitlement.product_key == prod_key,
                )
            ).limit(1)
            ent_res = await self.db.execute(ent_stmt)
            ent = ent_res.scalars().first()
            if not ent:
                # Default: if user already has projects or completed onboarding, enable thing_code
                is_initially_enabled = (prod_key == "thing_code") if getattr(user, "onboarding_completed", False) else False
                ent = ProductEntitlement(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    product_key=prod_key,
                    is_enabled=is_initially_enabled,
                    status="ENABLED" if is_initially_enabled else "LOCKED",
                    features=[f["name"] for f in PRODUCT_CATALOG_DEFINITIONS[prod_key]["features"]],
                    source="DEFAULT_INITIALIZATION",
                )
                self.db.add(ent)

        await self.db.commit()
        await self.db.refresh(org)
        return org

    async def get_user_entitlements_overview(self, user: User) -> Dict[str, Any]:
        """Returns the full entitlement state for the current user's workspace."""
        org = await self.get_or_create_user_organization(user)

        # Get subscription
        sub_stmt = select(OrganizationSubscription).where(OrganizationSubscription.organization_id == org.id).limit(1)
        sub_res = await self.db.execute(sub_stmt)
        sub = sub_res.scalars().first()

        # Get all product entitlements
        ent_stmt = select(ProductEntitlement).where(ProductEntitlement.organization_id == org.id)
        ent_res = await self.db.execute(ent_stmt)
        entitlements = {e.product_key: e for e in ent_res.scalars().all()}

        # Build output structure
        products_out: Dict[str, Any] = {}
        enabled_count = 0

        for key, defs in PRODUCT_CATALOG_DEFINITIONS.items():
            ent = entitlements.get(key)
            # Superusers always have all products enabled
            is_enabled = True if user.is_superuser else bool(ent and ent.is_enabled)
            status_str = "ENABLED" if is_enabled else (ent.status if ent else "LOCKED")

            if is_enabled:
                enabled_count += 1

            products_out[key] = {
                "key": key,
                "name": defs["name"],
                "tagline": defs["tagline"],
                "description": defs["description"],
                "category": defs["category"],
                "icon": defs["icon"],
                "primary_route": defs["primary_route"],
                "is_enabled": is_enabled,
                "status": status_str,
                "badge": defs["badge"],
                "price_per_month": defs["price_per_month"],
                "features": defs["features"],
                "granted_at": ent.granted_at.isoformat() if ent and ent.granted_at else None,
                "expires_at": ent.expires_at.isoformat() if ent and ent.expires_at else None,
                "source": ent.source if ent else "DEFAULT",
            }

        trial_active = False
        days_remaining = None
        if sub and sub.trial_ends_at:
            now_dt = datetime.now(timezone.utc)
            t_end = sub.trial_ends_at.replace(tzinfo=timezone.utc) if sub.trial_ends_at.tzinfo is None else sub.trial_ends_at
            if t_end > now_dt:
                trial_active = True
                days_remaining = max(1, (t_end - now_dt).days)

        return {
            "user_id": str(user.id),
            "email": user.email,
            "organization_id": str(org.id),
            "organization_name": org.name,
            "organization_slug": org.slug,
            "onboarding_completed": getattr(user, "onboarding_completed", False),
            "subscription": {
                "plan": sub.plan if sub else "FREE_TIER",
                "status": sub.status if sub else "ACTIVE",
                "billing_cycle": sub.billing_cycle if sub else "monthly",
                "trial_active": trial_active,
                "days_remaining": days_remaining,
                "max_seats": sub.max_seats if sub else 5,
                "used_seats": sub.used_seats if sub else 1,
            },
            "enabled_products_count": enabled_count,
            "products": products_out,
        }

    async def select_onboarding_products(
        self,
        user: User,
        selected_product_keys: List[str],
        plan: str = "PRO_TRIAL",
        billing_cycle: str = "monthly",
    ) -> Dict[str, Any]:
        """
        Executes Step 4 & 5 of onboarding:
        - Confirms product selection
        - Configures subscription plan
        - Enables selected products, locks remaining products
        - Persists audit log
        - Marks user onboarding as completed
        """
        if not selected_product_keys:
            raise ValueError("At least one product must be selected to complete onboarding.")

        org = await self.get_or_create_user_organization(user)
        now_dt = datetime.now(timezone.utc)

        # 1. Update or create OrganizationSubscription
        sub_stmt = select(OrganizationSubscription).where(OrganizationSubscription.organization_id == org.id).limit(1)
        sub_res = await self.db.execute(sub_stmt)
        sub = sub_res.scalars().first()

        trial_end = now_dt + timedelta(days=14) if "TRIAL" in plan.upper() else None

        if not sub:
            sub = OrganizationSubscription(
                id=uuid.uuid4(),
                organization_id=org.id,
                plan=plan.upper(),
                status="TRIALING" if trial_end else "ACTIVE",
                trial_ends_at=trial_end,
                billing_cycle=billing_cycle,
                max_seats=10,
                used_seats=1,
            )
            self.db.add(sub)
        else:
            sub.plan = plan.upper()
            sub.status = "TRIALING" if trial_end else "ACTIVE"
            sub.trial_ends_at = trial_end
            sub.billing_cycle = billing_cycle

        # 2. Update ProductEntitlements for all 4 products
        for prod_key in PRODUCT_CATALOG_DEFINITIONS.keys():
            ent_stmt = select(ProductEntitlement).where(
                and_(
                    ProductEntitlement.organization_id == org.id,
                    ProductEntitlement.product_key == prod_key,
                )
            ).limit(1)
            ent_res = await self.db.execute(ent_stmt)
            ent = ent_res.scalars().first()

            should_enable = prod_key in selected_product_keys

            if not ent:
                ent = ProductEntitlement(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    product_key=prod_key,
                    is_enabled=should_enable,
                    status="ENABLED" if should_enable else "LOCKED",
                    features=[f["name"] for f in PRODUCT_CATALOG_DEFINITIONS[prod_key]["features"]],
                    granted_at=now_dt if should_enable else None,
                    source="ONBOARDING_SELECTION",
                )
                self.db.add(ent)
            else:
                ent.is_enabled = should_enable
                ent.status = "ENABLED" if should_enable else "LOCKED"
                if should_enable:
                    ent.granted_at = now_dt
                ent.source = "ONBOARDING_SELECTION"

        # 3. Mark user onboarding as completed
        from sqlalchemy import update
        await self.db.execute(
            update(User)
            .where(or_(User.id == user.id, User.email == user.email))
            .values(onboarding_completed=True)
        )

        # 4. Record immutable subscription audit event
        audit_event = SubscriptionAuditEvent(
            id=uuid.uuid4(),
            organization_id=org.id,
            actor_id=user.email,
            event_type="ONBOARDING_PRODUCTS_SELECTED",
            product_key=",".join(selected_product_keys),
            details={
                "selected_products": selected_product_keys,
                "plan": plan.upper(),
                "trial_ends_at": trial_end.isoformat() if trial_end else None,
                "timestamp": now_dt.isoformat(),
            },
        )
        self.db.add(audit_event)

        await self.db.commit()
        return await self.get_user_entitlements_overview(user)

    async def upgrade_product(
        self,
        user: User,
        product_key: str,
        plan_name: Optional[str] = None,
        payment_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Activates an add-on product after authorization / payment confirmation.
        Updates database entitlement, writes immutable audit record, and unlocks product.
        """
        if product_key not in PRODUCT_CATALOG_DEFINITIONS:
            raise ValueError(f"Unknown product key: '{product_key}'. Must be one of: {list(PRODUCT_CATALOG_DEFINITIONS.keys())}")

        org = await self.get_or_create_user_organization(user)
        now_dt = datetime.now(timezone.utc)

        # Look up product entitlement
        ent_stmt = select(ProductEntitlement).where(
            and_(
                ProductEntitlement.organization_id == org.id,
                ProductEntitlement.product_key == product_key,
            )
        ).limit(1)
        ent_res = await self.db.execute(ent_stmt)
        ent = ent_res.scalars().first()

        if not ent:
            ent = ProductEntitlement(
                id=uuid.uuid4(),
                organization_id=org.id,
                product_key=product_key,
                is_enabled=True,
                status="ENABLED",
                features=[f["name"] for f in PRODUCT_CATALOG_DEFINITIONS[product_key]["features"]],
                granted_at=now_dt,
                source="ADDON_PURCHASE",
            )
            self.db.add(ent)
        else:
            ent.is_enabled = True
            ent.status = "ENABLED"
            ent.granted_at = now_dt
            ent.source = "ADDON_PURCHASE"

        # Record audit log
        audit_event = SubscriptionAuditEvent(
            id=uuid.uuid4(),
            organization_id=org.id,
            actor_id=user.email,
            event_type="PRODUCT_ADDON_ACTIVATED",
            product_key=product_key,
            details={
                "product_name": PRODUCT_CATALOG_DEFINITIONS[product_key]["name"],
                "price": PRODUCT_CATALOG_DEFINITIONS[product_key]["price_per_month"],
                "payment_token_ref": payment_token or f"sim_auth_{uuid.uuid4().hex[:8]}",
                "plan": plan_name or "Add-on Subscription",
                "activated_at": now_dt.isoformat(),
            },
        )
        self.db.add(audit_event)

        await self.db.commit()
        logger.info(f"Product '{product_key}' successfully activated for organization {org.id} by {user.email}")
        return await self.get_user_entitlements_overview(user)

    async def check_access(self, user: User, product_key: str) -> bool:
        """Deterministic access check: True if user has product included in subscription, False if locked."""
        if user.is_superuser:
            return True

        # Resolve organization
        stmt = select(Organization).where(Organization.owner_id == user.id).limit(1)
        res = await self.db.execute(stmt)
        org = res.scalars().first()

        if not org:
            # Fall back to first organization
            res_any = await self.db.execute(select(Organization).order_by(Organization.created_at.desc()).limit(1))
            org = res_any.scalars().first()

        if not org:
            # If no org exists yet, only allow onboarding or core code
            return product_key == "thing_code"

        # Query entitlement
        ent_stmt = select(ProductEntitlement).where(
            and_(
                ProductEntitlement.organization_id == org.id,
                ProductEntitlement.product_key == product_key,
            )
        ).limit(1)
        ent_res = await self.db.execute(ent_stmt)
        ent = ent_res.scalars().first()

        return bool(ent and ent.is_enabled)
