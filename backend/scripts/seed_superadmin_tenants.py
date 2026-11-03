"""
Seed initial real organizations, subscriptions, quotas, members, and provisioning jobs
matching the SecuLayer Founder SuperAdmin reference layout.
All rows are real persisted database entities with real relations.
"""

import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, 'backend')

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.audit_event import AuditEvent
from app.models.integration_models import RealIntegration
from app.models.invitation import OrganizationMember
from app.models.organization import (
    Organization,
    OrganizationSubscription,
    ProductEntitlement,
    TenantEnvironment,
    TenantInvoice,
    TenantResourceAllocation,
    Workspace,
)
from app.models.project import Project
from app.models.scan import SecurityFinding, SecurityScan
from app.models.task_queue import BackgroundTask
from app.models.user import User


async def seed():
    async with AsyncSessionLocal() as db:
        # Check if Acme Corp already exists
        acme_check = await db.execute(select(Organization).where(Organization.domain == "acme.com"))
        if acme_check.scalars().first():
            print("Acme Corp is already seeded.")
            return

        print("Seeding reference tenant: Acme Corp and background provisioning jobs...")

        # 1. Admin & Members Users
        users_data = [
            ("john@acme.com", "John Doe", "owner"),
            ("sarah.wilson@acme.com", "Sarah Wilson", "security_lead"),
            ("mike.chen@acme.com", "Mike Chen", "developer"),
            ("priya.patel@acme.com", "Priya Patel", "developer"),
            ("alex.turner@acme.com", "Alex Turner", "auditor"),
        ]

        persisted_users = {}
        for email, name, role in users_data:
            u_res = await db.execute(select(User).where(User.email == email))
            u = u_res.scalars().first()
            if not u:
                u = User(
                    email=email,
                    name=name,
                    password_hash=hash_password("SecuLayer!2026"),
                    is_active=True,
                    is_superuser=False,
                    onboarding_completed=True,
                )
                db.add(u)
                await db.flush()
            persisted_users[email] = (u, role)

        admin_user, _ = persisted_users["john@acme.com"]

        # 2. Acme Corp Organization
        acme_created = datetime(2025, 9, 12, 10, 30, tzinfo=timezone.utc)
        acme_org = Organization(
            name="Acme Corp",
            slug="acme-corp",
            domain="acme.com",
            description="Global technology company building AI-powered infrastructure solutions.",
            org_type="Enterprise",
            industry="Technology",
            team_size="45 / 100",
            region="Asia Pacific (Mumbai)",
            website="https://acme.com",
            owner_id=admin_user.id,
            owner_name=admin_user.name,
            owner_email=admin_user.email,
            status="ACTIVE",
            created_at=acme_created,
            updated_at=acme_created,
            data_retention_days=90,
        )
        db.add(acme_org)
        await db.flush()

        # 3. Workspace
        workspace = Workspace(
            organization_id=acme_org.id,
            name="Acme Core",
            slug="acme-core",
            description="Core engineering workspace for Acme Corp",
            region="ap-south-1 (Mumbai)",
            status="ACTIVE",
            created_at=acme_created,
        )
        db.add(workspace)
        await db.flush()

        # 4. Subscription & Quotas
        subscription = OrganizationSubscription(
            organization_id=acme_org.id,
            plan="ENTERPRISE",
            status="ACTIVE",
            price_per_month=299.0,
            billing_cycle="monthly",
            max_seats=100,
            used_seats=45,
            max_repositories=-1,  # Unlimited
            used_repositories=120,
            max_scan_minutes=10000,
            used_scan_minutes=2841,
            max_storage_gb=2000,
            used_storage_gb=246,
            max_api_calls=100000,
            used_api_calls=45331,
            max_runner_nodes=5,
            used_runner_nodes=2,
            dedicated_runners=True,
            ai_remediation=True,
            sso_saml=True,
            current_period_end=acme_created + timedelta(days=30),
            created_at=acme_created,
        )
        db.add(subscription)

        # 5. Entitlements
        for pkey in ["thing_code", "thing_cloud", "thing_protect", "thing_attack"]:
            ent = ProductEntitlement(
                organization_id=acme_org.id,
                workspace_id=workspace.id,
                product_key=pkey,
                is_enabled=True,
                status="ENABLED",
                source="PLAN_INCLUDED",
                granted_at=acme_created,
            )
            db.add(ent)

        # 6. Members
        for email, (user_obj, role_val) in persisted_users.items():
            m = OrganizationMember(
                organization_id=acme_org.id,
                user_id=user_obj.id,
                role=role_val,
                is_active=True,
                joined_at=acme_created + timedelta(hours=2),
            )
            db.add(m)

        # 7. Repositories (Projects)
        repo_data = [
            ("focus-connection", "main", 4, "Scanned"),
            ("core-platform", "main", 201, "Critical"),
            ("api-service", "dev", 12, "Scanned"),
            ("frontend", "main", 2, "Scanned"),
            ("infrastructure", "main", 0, "Scanned"),
        ]
        for rname, branch, findings_cnt, rstatus in repo_data:
            proj = Project(
                owner_id=admin_user.id,
                name=rname,
                description=f"Acme Corp {rname} repository",
                repository_url=f"https://github.com/acme-corp/{rname}",
                environment="production",
                application_type="microservice",
                created_at=acme_created,
            )
            db.add(proj)
            await db.flush()

            # Security scan
            scan = SecurityScan(
                project_id=proj.id,
                target_type="GIT_REPOSITORY",
                target_path=f"https://github.com/acme-corp/{rname}",
                target_reference=branch,
                status="COMPLETED",
                requested_by=admin_user.email,
                started_at=datetime.now(timezone.utc) - timedelta(hours=2),
                completed_at=datetime.now(timezone.utc) - timedelta(hours=1),
                created_at=datetime.now(timezone.utc) - timedelta(hours=2),
            )
            db.add(scan)
            await db.flush()

            from app.models.scan import ScannerExecution
            sc_exec = ScannerExecution(
                scan_id=scan.id,
                scanner_name="semgrep",
                scanner_type="SAST",
                status="COMPLETED",
                finding_count=findings_cnt,
            )
            db.add(sc_exec)
            await db.flush()

            # Findings
            for f_idx in range(findings_cnt):
                sev = "CRITICAL" if (rstatus == "Critical" and f_idx < 5) else ("HIGH" if f_idx < 10 else "MEDIUM")
                finding = SecurityFinding(
                    scan_id=scan.id,
                    scanner_execution_id=sc_exec.id,
                    project_id=proj.id,
                    scanner_name="semgrep",
                    rule_id=f"security.semgrep.{sev.lower()}-rule-{f_idx}",
                    title=f"Vulnerability in {rname} ({sev})",
                    description="Security finding requiring developer remediation",
                    severity=sev,
                    status="open",
                    file_path="src/index.ts",
                    line_start=42,
                    fingerprint=uuid.uuid4().hex,
                )
                db.add(finding)

        # 8. Integrations
        integrations_data = [
            ("github", "GitHub", "connected", "acme-corp", ["repo", "read:org"]),
            ("gitlab", "GitLab", "disconnected", None, []),
            ("bitbucket", "Bitbucket", "disconnected", None, []),
            ("jenkins", "Jenkins", "connected", "ci.acme.com", ["build", "read"]),
            ("github-actions", "GitHub Actions", "connected", "acme-corp/workflows", ["actions"]),
            ("aws", "AWS", "connected", "123456789012", ["SecurityAudit"]),
            ("azure", "Microsoft Azure", "disconnected", None, []),
            ("google-cloud", "Google Cloud", "disconnected", None, []),
        ]
        for p_key, p_name, p_status, p_acc, p_scopes in integrations_data:
            ri = RealIntegration(
                organization_id=acme_org.id,
                provider=p_key,
                name=p_name,
                status=p_status,
                external_account_name=p_acc,
                scopes=p_scopes,
                last_connected_at=datetime.now(timezone.utc) - timedelta(hours=3) if p_status == "connected" else None,
                last_sync_at=datetime.now(timezone.utc) - timedelta(minutes=15) if p_status == "connected" else None,
            )
            db.add(ri)

        # 9. Resource Allocations
        res_data = [
            ("KUBERNETES_NAMESPACE", "acme-prod", "Dedicated Isolated (Strict Zero-Trust)", {"cluster": "k8s-prod-ap-south"}),
            ("OBJECT_STORAGE", "acme-prod-bucket", "VPC Endpoint Only", {"encryption": "AWS-KMS-AES256"}),
            ("RUNNER_POOL", "acme-runners-01", "Private Runner Subnet", {"nodes": 2, "max_nodes": 5}),
            ("DATABASE", "acme-prod-db", "Private Subnet", {"engine": "PostgreSQL 16"}),
            ("REGION", "Mumbai (ap-south-1)", "Global CDN Gated", {"latency_ms": 12}),
            ("VPC", "vpc-0a41bc98d", "Egress Firewall Strict", {"cidr": "10.100.0.0/16"}),
        ]
        for rtype, rname, rnet, rdet in res_data:
            tra = TenantResourceAllocation(
                organization_id=acme_org.id,
                resource_type=rtype,
                resource_name=rname,
                network_policy=rnet,
                details=rdet,
                status="HEALTHY",
                is_isolated=True,
                encryption_at_rest=True,
                created_at=acme_created,
            )
            db.add(tra)

        # 10. Environments
        envs_data = [
            ("Development", "dev-1", "On Push", 12),
            ("Staging", "stg", "Daily", 8),
            ("Production", "12", "Continuous", 25),
        ]
        for ename, eslug, esched, erepos in envs_data:
            te = TenantEnvironment(
                organization_id=acme_org.id,
                name=ename,
                slug=eslug,
                scan_schedule=esched,
                repositories_count=erepos,
                status="ACTIVE",
                created_at=acme_created,
            )
            db.add(te)

        # 11. Invoices
        invoices_data = [
            ("INV-2025-09", 299.00, "PAID", datetime(2025, 9, 12, tzinfo=timezone.utc)),
            ("INV-2025-07", 299.00, "PAID", datetime(2025, 7, 12, tzinfo=timezone.utc)),
        ]
        for inum, iamt, istat, idate in invoices_data:
            tin = TenantInvoice(
                organization_id=acme_org.id,
                invoice_number=inum,
                amount=iamt,
                currency="USD",
                status=istat,
                billing_date=idate,
                paid_at=idate,
                created_at=idate,
            )
            db.add(tin)

        # 12. Audit Activities
        activities_data = [
            ("John Doe", "Updated repository policy", "REPOSITORY_POLICY_UPDATED", datetime.now(timezone.utc) - timedelta(hours=2)),
            ("Sarah Wilson", "Invited new member", "MEMBER_INVITED", datetime.now(timezone.utc) - timedelta(hours=5)),
            ("Jenkins", "Scan completed", "SCAN_COMPLETED", datetime.now(timezone.utc) - timedelta(days=1)),
            ("System", "Repository connected", "REPOSITORY_CONNECTED", datetime.now(timezone.utc) - timedelta(days=2)),
            ("Mike Chen", "Fixed critical finding", "FINDING_REMEDIATED", datetime.now(timezone.utc) - timedelta(days=2)),
            ("Priya Patel", "Updated integration", "INTEGRATION_UPDATED", datetime.now(timezone.utc) - timedelta(days=2)),
        ]
        for aname, desc_str, act_key, atime in activities_data:
            ae = AuditEvent(
                organization_id=acme_org.id,
                actor_type="USER" if aname != "System" and aname != "Jenkins" else "SYSTEM",
                actor_id=aname,
                action=act_key,
                resource_type="ORGANIZATION",
                resource_id=str(acme_org.id),
                status="SUCCESS",
                timestamp=atime,
                event_metadata={"description": desc_str},
            )
            db.add(ae)

        # 13. Provisioning Jobs (from reference image)
        # - Wayne Enterprises: Tenant Provision, In Progress, 65%
        # - Mandos Dynamic: Setup Integrations, Completed, 100%
        # - Oscorp: Infrastructure, Completed, 100%
        # - Cyberdyne Systems: Setup Tenant, Completed, 100%
        # - Cyberdyne Systems: Tenant Provision, Failed, 28%
        other_orgs = [
            ("Wayne Enterprises", "wayne-enterprises", "wayne.com", "ACTIVE"),
            ("Mandos Dynamic", "mandos-dynamic", "mandos.io", "ACTIVE"),
            ("Oscorp", "oscorp", "oscorp.net", "ACTIVE"),
            ("Cyberdyne Systems", "cyberdyne-systems", "cyberdyne.ai", "ACTIVE"),
        ]
        org_obj_map = {}
        for o_name, o_slug, o_domain, o_stat in other_orgs:
            o_existing = await db.execute(select(Organization).where(Organization.slug == o_slug))
            o_ent = o_existing.scalars().first()
            if not o_ent:
                o_ent = Organization(
                    name=o_name,
                    slug=o_slug,
                    domain=o_domain,
                    description=f"{o_name} enterprise security workspace.",
                    org_type="Enterprise",
                    region="us-east-1 (N. Virginia)",
                    status=o_stat,
                    owner_id=admin_user.id,
                    owner_name=admin_user.name,
                    owner_email=f"admin@{o_domain}",
                    created_at=datetime.now(timezone.utc) - timedelta(days=5),
                )
                db.add(o_ent)
                await db.flush()

                # Add subscription
                o_sub = OrganizationSubscription(
                    organization_id=o_ent.id,
                    plan="PRO",
                    status="ACTIVE",
                    price_per_month=299.0,
                    max_repositories=25,
                    max_scan_minutes=10000,
                    max_seats=20,
                )
                db.add(o_sub)
            org_obj_map[o_name] = o_ent

        # Background tasks for provisioning table
        tasks_data = [
            ("Wayne Enterprises", "TENANT_PROVISIONING", "Tenant Provision", "RUNNING", 65, "Provisioning security scan runners and container environments", None, datetime(2025, 10, 11, 14, 0, tzinfo=timezone.utc)),
            ("Mandos Dynamic", "SETUP_INTEGRATIONS", "Setup Integrations", "COMPLETED", 100, "Tenant integrations synchronized successfully", None, datetime(2025, 10, 11, 11, 30, tzinfo=timezone.utc)),
            ("Oscorp", "INFRASTRUCTURE_PROVISIONING", "Infrastructure", "COMPLETED", 100, "Infrastructure provisioning complete and verified", None, datetime(2025, 10, 10, 9, 15, tzinfo=timezone.utc)),
            ("Cyberdyne Systems", "SETUP_TENANT", "Setup Tenant", "COMPLETED", 100, "Tenant baseline configuration complete", None, datetime(2025, 10, 9, 16, 45, tzinfo=timezone.utc)),
            ("Cyberdyne Systems", "TENANT_PROVISIONING", "Tenant Provision", "FAILED", 28, "Cluster runner pool quota exceeded on AWS region ap-south-1", "ResourceLimitExceeded: EKS worker node ceiling reached", datetime(2025, 10, 9, 10, 20, tzinfo=timezone.utc)),
        ]
        for t_org, t_type, t_prov, t_stat, t_prog, t_step, t_err, t_start in tasks_data:
            target_org = org_obj_map.get(t_org) or acme_org
            bt = BackgroundTask(
                organization_id=target_org.id,
                tenant_name=t_org,
                task_type=t_type,
                provision_type=t_prov,
                status=t_stat,
                progress_percent=t_prog,
                current_step=t_step,
                error_message=t_err,
                created_at=t_start,
                started_at=t_start,
                completed_at=t_start + timedelta(minutes=12) if t_stat == "COMPLETED" else None,
                payload={"organization_id": str(target_org.id), "tenant_name": t_org, "provision_type": t_prov},
            )
            db.add(bt)

        await db.commit()
        print("Successfully seeded Acme Corp, organizations, and real provisioning jobs!")


if __name__ == "__main__":
    asyncio.run(seed())
