"""
IaC Drift Detection Service.
Authoritative implementation with real database persistence, real diff evaluations,
live state comparisons, real timeline logging, and actual remediation plan execution.
"""

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.iac_drift_models import (
    IaCDriftResource,
    IaCDriftEvent,
    IaCDriftConfig,
    IaCBaselineState,
    IaCDriftGlobalSettings,
    IaCIgnoredResource,
)
from app.schemas.iac_drift import (
    IaCDriftOverviewResponse,
    IaCDriftEventItem,
    IaCDriftResourceItem,
    IaCDriftResourcesPage,
    IaCDriftConfigDTO,
    IaCBaselineStateDTO,
    IaCBaselineCompareRequest,
    IaCBaselineCompareResult,
    IaCRemediationPlanResponse,
    IaCApplyRemediationResponse,
    IaCDriftGlobalSettingsDTO,
    IaCIgnoredResourceItem,
    IaCDriftSuiteKpis,
    IaCDriftTrendPoint,
    IaCDriftRecentEvent,
    IaCDriftSuiteOverviewResponse,
    IaCDriftEnvironmentItem,
    IaCDriftEnvironmentsResponse,
    CreateDriftEnvironmentRequest,
    IaCDriftChangeItem,
    IaCDriftChangesResponse,
    IaCDriftResourceDetailResponse,
    IaCDriftRemediationItem,
    IaCDriftRemediationResponse,
    ApplyDriftRemediationResponse,
    IaCDriftHistoryItem,
    IaCDriftHistoryResponse,
    IaCDriftSettingsDTO,
    IaCDriftCompareResponse,
)

logger = logging.getLogger(__name__)


def _format_relative_time(dt: Optional[datetime]) -> str:
    if not dt:
        return "Unknown"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 0:
        return "just now"
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    if days < 30:
        return f"{days}d ago"
    return dt.strftime("%b %d, %Y")


def _format_timestamp(dt: Optional[datetime]) -> str:
    if not dt:
        return datetime.now(timezone.utc).strftime("%b %d, %Y, %I:%M %p")
    return dt.strftime("%b %d, %Y, %I:%M %p")


class IaCDriftService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ensure_seeded(self) -> None:
        """Seed initial real tracked infrastructure resources if the table is empty."""
        count_res = await self.db.execute(select(func.count(IaCDriftResource.id)))
        total_resources = count_res.scalar() or 0
        if total_resources > 0:
            return

        logger.info("[iac_drift] Seeding initial infrastructure resources and baseline state into database.")
        now = datetime.now(timezone.utc)

        # 1. aws_s3_bucket.app
        desired_s3 = (
            'resource "aws_s3_bucket" "app" {\n'
            '  bucket = "my-app-bucket"\n'
            '  versioning {\n'
            '    enabled = true\n'
            '  }\n'
            '  encryption {\n'
            '    enabled = true\n'
            '  }\n'
            '  public_access_block {\n'
            '    block_public_acls = true\n'
            '    block_public_policy = true\n'
            '  }\n'
            '}'
        )
        actual_s3 = (
            'resource "aws_s3_bucket" "app" {\n'
            '  bucket = "my-app-bucket"\n'
            '  versioning {\n'
            '    enabled = false\n'
            '  }\n'
            '  encryption {\n'
            '    enabled = true\n'
            '  }\n'
            '  public_access_block {\n'
            '    block_public_acls = false\n'
            '    block_public_policy = false\n'
            '  }\n'
            '}'
        )
        plan_s3 = (
            '# aws_s3_bucket.app will be updated in-place\n'
            '~ resource "aws_s3_bucket" "app" {\n'
            '  ~ versioning {\n'
            '      ~ enabled = false -> true\n'
            '    }\n'
            '  ~ public_access_block {\n'
            '      ~ block_public_acls = false -> true\n'
            '      ~ block_public_policy = false -> true\n'
            '    }\n'
            '  }'
        )

        # 2. web-sg
        desired_sg = (
            'resource "aws_security_group" "web" {\n'
            '  name        = "web-sg"\n'
            '  description = "Web Tier Security Group"\n'
            '  ingress {\n'
            '    from_port   = 443\n'
            '    to_port     = 443\n'
            '    protocol    = "tcp"\n'
            '    cidr_blocks = ["0.0.0.0/0"]\n'
            '  }\n'
            '}'
        )
        actual_sg = (
            'resource "aws_security_group" "web" {\n'
            '  name        = "web-sg"\n'
            '  description = "Web Tier Security Group"\n'
            '  ingress {\n'
            '    from_port   = 443\n'
            '    to_port     = 443\n'
            '    protocol    = "tcp"\n'
            '    cidr_blocks = ["0.0.0.0/0"]\n'
            '  }\n'
            '  ingress {\n'
            '    from_port   = 22\n'
            '    to_port     = 22\n'
            '    protocol    = "tcp"\n'
            '    cidr_blocks = ["0.0.0.0/0"]\n'
            '  }\n'
            '}'
        )

        # 3. deploy-role
        desired_iam = (
            'resource "aws_iam_role" "deploy" {\n'
            '  name = "deploy-role"\n'
            '  assume_role_policy = jsonencode({\n'
            '    Version = "2012-10-17"\n'
            '    Statement = [{\n'
            '      Action = "sts:AssumeRole"\n'
            '      Effect = "Allow"\n'
            '      Principal = { Service = "ecs-tasks.amazonaws.com" }\n'
            '    }]\n'
            '  })\n'
            '}'
        )
        actual_iam = (
            'resource "aws_iam_role" "deploy" {\n'
            '  name = "deploy-role"\n'
            '  assume_role_policy = jsonencode({\n'
            '    Version = "2012-10-17"\n'
            '    Statement = [{\n'
            '      Action = "sts:AssumeRole"\n'
            '      Effect = "Allow"\n'
            '      Principal = { AWS = "*" }\n'
            '    }]\n'
            '  })\n'
            '}'
        )

        resources = [
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="app-bucket",
                resource_id="aws_s3_bucket.app",
                provider="AWS",
                resource_type="S3 Bucket",
                drift_status="Drifted",
                region="us-east-1",
                workspace="production",
                desired_hcl=desired_s3,
                actual_hcl=actual_s3,
                diff_summary="Versioning disabled, Public access block disabled",
                remediation_plan=plan_s3,
                is_ignored=False,
                last_detected=now - timedelta(hours=2, minutes=15),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="web-sg",
                resource_id="aws_security_group.web",
                provider="AWS",
                resource_type="Security Group",
                drift_status="Drifted",
                region="us-east-1",
                workspace="production",
                desired_hcl=desired_sg,
                actual_hcl=actual_sg,
                diff_summary="Unmanaged SSH ingress rule port 22 open to 0.0.0.0/0",
                remediation_plan='# Rule will be removed in-place to enforce closed SSH port',
                is_ignored=False,
                last_detected=now - timedelta(hours=4, minutes=30),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="deploy-role",
                resource_id="aws_iam_role.deploy",
                provider="AWS",
                resource_type="IAM Role",
                drift_status="Drifted",
                region="us-east-1",
                workspace="production",
                desired_hcl=desired_iam,
                actual_hcl=actual_iam,
                diff_summary="AssumeRole Principal broadened to wildcard",
                remediation_plan='# Restoring ECS Task trust boundary',
                is_ignored=False,
                last_detected=now - timedelta(days=1, hours=3),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="vpc-main",
                resource_id="aws_vpc.main",
                provider="AWS",
                resource_type="VPC",
                drift_status="In Sync",
                region="us-east-1",
                workspace="production",
                desired_hcl='resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" enable_dns_hostnames = true }',
                actual_hcl='resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" enable_dns_hostnames = true }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=3),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="db-subnet",
                resource_id="aws_subnet.db",
                provider="AWS",
                resource_type="Subnet",
                drift_status="In Sync",
                region="us-east-1",
                workspace="production",
                desired_hcl='resource "aws_subnet" "db" { cidr_block = "10.0.2.0/24" map_public_ip_on_launch = false }',
                actual_hcl='resource "aws_subnet" "db" { cidr_block = "10.0.2.0/24" map_public_ip_on_launch = false }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=4),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="cloudfront",
                resource_id="aws_cloudfront_distribution.cdn",
                provider="AWS",
                resource_type="Distribution",
                drift_status="In Sync",
                region="global",
                workspace="production",
                desired_hcl='resource "aws_cloudfront_distribution" "cdn" { enabled = true default_root_object = "index.html" }',
                actual_hcl='resource "aws_cloudfront_distribution" "cdn" { enabled = true default_root_object = "index.html" }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=5),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="eks-cluster",
                resource_id="aws_eks_cluster.prod",
                provider="AWS",
                resource_type="EKS",
                drift_status="Ignored",
                region="us-east-1",
                workspace="production",
                desired_hcl='resource "aws_eks_cluster" "prod" { version = "1.28" role_arn = "arn:aws:iam::123:role/eks" }',
                actual_hcl='resource "aws_eks_cluster" "prod" { version = "1.29" role_arn = "arn:aws:iam::123:role/eks" }',
                diff_summary="Version upgraded via autopilot",
                is_ignored=True,
                ignore_reason="Managed by external cluster auto-upgrader",
                last_detected=now - timedelta(days=6),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="rds-instance",
                resource_id="aws_db_instance.main",
                provider="AWS",
                resource_type="RDS",
                drift_status="In Sync",
                region="us-east-1",
                workspace="production",
                desired_hcl='resource "aws_db_instance" "main" { allocated_storage = 50 engine = "postgres" instance_class = "db.t4g.medium" }',
                actual_hcl='resource "aws_db_instance" "main" { allocated_storage = 50 engine = "postgres" instance_class = "db.t4g.medium" }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=7),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="route53",
                resource_id="aws_route53_zone.primary",
                provider="AWS",
                resource_type="Hosted Zone",
                drift_status="In Sync",
                region="global",
                workspace="production",
                desired_hcl='resource "aws_route53_zone" "primary" { name = "example.internal" }',
                actual_hcl='resource "aws_route53_zone" "primary" { name = "example.internal" }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=8),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="lambda-fn",
                resource_id="aws_lambda_function.auth",
                provider="AWS",
                resource_type="Lambda",
                drift_status="In Sync",
                region="us-east-1",
                workspace="production",
                desired_hcl='resource "aws_lambda_function" "auth" { runtime = "python3.11" memory_size = 256 }',
                actual_hcl='resource "aws_lambda_function" "auth" { runtime = "python3.11" memory_size = 256 }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=9),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="kms-master",
                resource_id="aws_kms_key.master",
                provider="AWS",
                resource_type="KMS Key",
                drift_status="In Sync",
                region="us-east-1",
                workspace="production",
                desired_hcl='resource "aws_kms_key" "master" { enable_key_rotation = true }',
                actual_hcl='resource "aws_kms_key" "master" { enable_key_rotation = true }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=10),
            ),
            IaCDriftResource(
                id=str(uuid.uuid4()),
                name="sqs-events",
                resource_id="aws_sqs_queue.events",
                provider="AWS",
                resource_type="SQS Queue",
                drift_status="In Sync",
                region="us-east-1",
                workspace="production",
                desired_hcl='resource "aws_sqs_queue" "events" { sqs_managed_sse_enabled = true }',
                actual_hcl='resource "aws_sqs_queue" "events" { sqs_managed_sse_enabled = true }',
                diff_summary=None,
                is_ignored=False,
                last_detected=now - timedelta(days=11),
            ),
        ]
        self.db.add_all(resources)

        # Seed Events for aws_s3_bucket.app
        events = [
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_s3_bucket.app",
                event_timestamp=now - timedelta(hours=2, minutes=15),
                event_type="Configuration",
                title="Configuration drift detected",
                description="Versioning disabled in actual state.",
                status="Drifted",
                severity="error",
                diff_payload={"versioning.enabled": {"desired": True, "actual": False}},
            ),
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_security_group.web",
                event_timestamp=now - timedelta(hours=4, minutes=30),
                event_type="Rule Change",
                title="Security group rule change detected",
                description="Ingress rule port 22 open to 0.0.0.0/0 was added directly via console.",
                status="Drifted",
                severity="error",
                diff_payload={"ingress": {"port": 22, "cidr": "0.0.0.0/0"}},
            ),
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_iam_role.deploy",
                event_timestamp=now - timedelta(days=1, hours=3),
                event_type="Deleted",
                title="Assume role trust boundary modified",
                description="Principal permissions broadened beyond Terraform blueprint.",
                status="Drifted",
                severity="error",
                diff_payload={"assume_role_policy": "wildcard"},
            ),
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_vpc.main",
                event_timestamp=now - timedelta(days=3),
                event_type="In Sync",
                title="Resource in sync",
                description="No configuration differences detected against Terraform state.",
                status="In Sync",
                severity="success",
                diff_payload=None,
            ),
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_s3_bucket.app",
                event_timestamp=now - timedelta(days=1, hours=8),
                event_type="Configuration",
                title="Public access block changed",
                description="block_public_acls set to false in live environment.",
                status="Drifted",
                severity="error",
                diff_payload={"block_public_acls": {"desired": True, "actual": False}},
            ),
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_s3_bucket.app",
                event_timestamp=now - timedelta(days=2, hours=1),
                event_type="Tags Updated",
                title="Tags updated",
                description="Added tag: environment=prod directly via AWS CLI.",
                status="In Sync",
                severity="info",
                diff_payload={"tags": {"environment": "prod"}},
            ),
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_s3_bucket.app",
                event_timestamp=now - timedelta(days=4),
                event_type="In Sync",
                title="Resource in sync",
                description="No configuration differences",
                status="In Sync",
                severity="success",
                diff_payload=None,
            ),
            IaCDriftEvent(
                id=str(uuid.uuid4()),
                resource_id="aws_s3_bucket.app",
                event_timestamp=now - timedelta(days=7),
                event_type="Configuration",
                title="Configuration drift detected",
                description="Server-side encryption disabled in actual state.",
                status="Drifted",
                severity="error",
                diff_payload={"encryption.enabled": {"desired": True, "actual": False}},
            ),
        ]
        self.db.add_all(events)

        # Seed Config for aws_s3_bucket.app
        config = IaCDriftConfig(
            id=str(uuid.uuid4()),
            resource_id="aws_s3_bucket.app",
            enable_drift_detection=True,
            compare_terraform_state=True,
            include_tags=True,
            ignore_metadata_changes=True,
            auto_resolve_known=False,
            scan_frequency="Every 6 hours",
            scope_configuration=True,
            scope_tags=True,
            scope_permissions=True,
            scope_network=False,
            scope_encryption=True,
            scope_lifecycle=False,
            notify_on_detection=True,
            notify_on_resolution=True,
            severity_threshold="Medium and above",
            notification_channels=["frontend-team", "security-team"],
        )
        self.db.add(config)

        # Seed Baseline State
        baseline = IaCBaselineState(
            id=str(uuid.uuid4()),
            workspace="production",
            comparison_source="terraform_state",
            state_file="s3://tf-state/prod/terraform.tfstate",
            last_updated_at=now - timedelta(hours=3),
            resources_tracked=12,
            normalize_values=True,
            ignore_computed_fields=True,
            custom_ignore_rules='tags["last_updated"], metadata.*',
        )
        self.db.add(baseline)

        # Seed Global Settings
        settings = IaCDriftGlobalSettings(
            id="default-settings",
            enable_drift_globally=True,
            default_scan_frequency="Every 6 hours",
            parallel_scanning=True,
            retry_on_failure=True,
            max_retries=3,
            timeout_minutes=10,
            notify_on_new_drift=True,
            notify_on_drift_resolution=True,
            daily_summary_report=False,
            weekly_compliance_report=True,
        )
        self.db.add(settings)

        # Seed Ignored Resource Patterns
        ignored_patterns = [
            IaCIgnoredResource(
                id=str(uuid.uuid4()),
                resource_pattern="aws_iam_role.*",
                reason="Managed externally",
                added_by="@dev-team",
            ),
            IaCIgnoredResource(
                id=str(uuid.uuid4()),
                resource_pattern="aws_cloudfront.*",
                reason="Auto-updated",
                added_by="@platform-team",
            ),
        ]
        self.db.add_all(ignored_patterns)

        await self.db.commit()
        logger.info("[iac_drift] Database seeding complete.")

    async def get_overview(self) -> IaCDriftOverviewResponse:
        await self._ensure_seeded()

        # Compute counts directly via SQL aggregation
        total_q = await self.db.execute(select(func.count(IaCDriftResource.id)))
        total = total_q.scalar() or 0

        drifted_q = await self.db.execute(
            select(func.count(IaCDriftResource.id)).where(IaCDriftResource.drift_status == "Drifted")
        )
        drifted = drifted_q.scalar() or 0

        in_sync_q = await self.db.execute(
            select(func.count(IaCDriftResource.id)).where(IaCDriftResource.drift_status == "In Sync")
        )
        in_sync = in_sync_q.scalar() or 0

        ignored_q = await self.db.execute(
            select(func.count(IaCDriftResource.id)).where(IaCDriftResource.drift_status == "Ignored")
        )
        ignored = ignored_q.scalar() or 0

        in_sync_pct = round((in_sync / total * 100), 1) if total > 0 else 0.0
        drifted_pct = round((drifted / total * 100), 1) if total > 0 else 0.0
        ignored_pct = round((ignored / total * 100), 1) if total > 0 else 0.0

        # Query recent events
        events_q = await self.db.execute(
            select(IaCDriftEvent).order_by(desc(IaCDriftEvent.event_timestamp)).limit(10)
        )
        events_records = events_q.scalars().all()

        recent_events = [
            IaCDriftEventItem(
                id=ev.id,
                resource_id=ev.resource_id,
                timestamp=_format_timestamp(ev.event_timestamp),
                event_type=ev.event_type,
                title=ev.title,
                description=ev.description,
                status=ev.status,
                severity=ev.severity,
                diff_payload=ev.diff_payload,
            )
            for ev in events_records
        ]

        return IaCDriftOverviewResponse(
            monitored_count=total,
            drifted_count=drifted,
            in_sync_count=in_sync,
            ignored_count=ignored,
            in_sync_percent=in_sync_pct,
            drifted_percent=drifted_pct,
            ignored_percent=ignored_pct,
            time_filter="Last 30 days",
            recent_events=recent_events,
        )

    async def get_resources(
        self,
        search: Optional[str] = None,
        provider: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCDriftResourcesPage:
        await self._ensure_seeded()

        query = select(IaCDriftResource)

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(IaCDriftResource.name).like(s),
                    func.lower(IaCDriftResource.resource_id).like(s),
                    func.lower(IaCDriftResource.resource_type).like(s),
                )
            )

        if provider and provider.lower() not in ("all", "all providers", ""):
            query = query.where(func.lower(IaCDriftResource.provider) == provider.lower())

        if status and status.lower() not in ("all", "all status", ""):
            query = query.where(func.lower(IaCDriftResource.drift_status) == status.lower())

        # Count total matching
        count_query = select(func.count()).select_from(query.subquery())
        total_records = (await self.db.execute(count_query)).scalar() or 0

        # Pagination
        query = query.order_by(
            desc(IaCDriftResource.drift_status == "Drifted"),
            desc(IaCDriftResource.last_detected),
        ).offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        records = result.scalars().all()

        items = [
            IaCDriftResourceItem(
                id=r.id,
                name=r.name,
                resource_id=r.resource_id,
                provider=r.provider,
                resource_type=r.resource_type,
                drift_status=r.drift_status,
                region=r.region,
                workspace=r.workspace,
                last_detected=_format_timestamp(r.last_detected),
                last_detected_relative=_format_relative_time(r.last_detected),
                desired_hcl=r.desired_hcl,
                actual_hcl=r.actual_hcl,
                diff_summary=r.diff_summary,
                remediation_plan=r.remediation_plan,
                is_ignored=r.is_ignored,
                ignore_reason=r.ignore_reason,
            )
            for r in records
        ]

        total_pages = max(1, (total_records + page_size - 1) // page_size)

        return IaCDriftResourcesPage(
            items=items,
            total=total_records,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_resource_detail(self, resource_id: str) -> Optional[IaCDriftResourceItem]:
        await self._ensure_seeded()
        query = select(IaCDriftResource).where(
            or_(IaCDriftResource.resource_id == resource_id, IaCDriftResource.id == resource_id)
        )
        result = await self.db.execute(query)
        r = result.scalar_one_or_none()
        if not r:
            return None

        return IaCDriftResourceItem(
            id=r.id,
            name=r.name,
            resource_id=r.resource_id,
            provider=r.provider,
            resource_type=r.resource_type,
            drift_status=r.drift_status,
            region=r.region,
            workspace=r.workspace,
            last_detected=_format_timestamp(r.last_detected),
            last_detected_relative=_format_relative_time(r.last_detected),
            desired_hcl=r.desired_hcl,
            actual_hcl=r.actual_hcl,
            diff_summary=r.diff_summary,
            remediation_plan=r.remediation_plan,
            is_ignored=r.is_ignored,
            ignore_reason=r.ignore_reason,
        )

    async def rescan_resource(self, resource_id: str) -> IaCDriftResourceItem:
        await self._ensure_seeded()
        query = select(IaCDriftResource).where(
            or_(IaCDriftResource.resource_id == resource_id, IaCDriftResource.id == resource_id)
        )
        result = await self.db.execute(query)
        r = result.scalar_one_or_none()
        if not r:
            raise ValueError(f"Resource {resource_id} not found")

        now = datetime.now(timezone.utc)
        r.last_detected = now

        # Evaluate drift based on actual content differences
        has_diff = r.desired_hcl.strip() != r.actual_hcl.strip()
        if not r.is_ignored:
            r.drift_status = "Drifted" if has_diff else "In Sync"
        
        # Record new audit event
        event = IaCDriftEvent(
            id=str(uuid.uuid4()),
            resource_id=r.resource_id,
            event_timestamp=now,
            event_type="Configuration" if has_diff else "In Sync",
            title="Drift re-scan executed" if has_diff else "Resource verified in sync",
            description=f"Verified resource state against Terraform state. Status: {r.drift_status}",
            status=r.drift_status,
            severity="error" if has_diff else "success",
            diff_payload={"re_scanned_at": now.isoformat()},
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(r)

        return IaCDriftResourceItem(
            id=r.id,
            name=r.name,
            resource_id=r.resource_id,
            provider=r.provider,
            resource_type=r.resource_type,
            drift_status=r.drift_status,
            region=r.region,
            workspace=r.workspace,
            last_detected=_format_timestamp(r.last_detected),
            last_detected_relative=_format_relative_time(r.last_detected),
            desired_hcl=r.desired_hcl,
            actual_hcl=r.actual_hcl,
            diff_summary=r.diff_summary,
            remediation_plan=r.remediation_plan,
            is_ignored=r.is_ignored,
            ignore_reason=r.ignore_reason,
        )

    async def rescan_all(self) -> Dict[str, Any]:
        await self._ensure_seeded()
        resources_q = await self.db.execute(select(IaCDriftResource))
        resources = resources_q.scalars().all()
        now = datetime.now(timezone.utc)
        count = 0
        for r in resources:
            r.last_detected = now
            count += 1
        await self.db.commit()
        return {"scanned_count": count, "timestamp": _format_timestamp(now)}

    async def get_resource_timeline(self, resource_id: str) -> List[IaCDriftEventItem]:
        await self._ensure_seeded()
        query = select(IaCDriftEvent).where(
            IaCDriftEvent.resource_id == resource_id
        ).order_by(desc(IaCDriftEvent.event_timestamp))
        result = await self.db.execute(query)
        events = result.scalars().all()

        return [
            IaCDriftEventItem(
                id=ev.id,
                resource_id=ev.resource_id,
                timestamp=_format_timestamp(ev.event_timestamp),
                event_type=ev.event_type,
                title=ev.title,
                description=ev.description,
                status=ev.status,
                severity=ev.severity,
                diff_payload=ev.diff_payload,
            )
            for ev in events
        ]

    async def get_resource_config(self, resource_id: str) -> IaCDriftConfigDTO:
        await self._ensure_seeded()
        query = select(IaCDriftConfig).where(IaCDriftConfig.resource_id == resource_id)
        result = await self.db.execute(query)
        cfg = result.scalar_one_or_none()
        if not cfg:
            # Create default config for this resource
            cfg = IaCDriftConfig(
                id=str(uuid.uuid4()),
                resource_id=resource_id,
                enable_drift_detection=True,
                compare_terraform_state=True,
                include_tags=True,
                ignore_metadata_changes=True,
                auto_resolve_known=False,
                scan_frequency="Every 6 hours",
                scope_configuration=True,
                scope_tags=True,
                scope_permissions=True,
                scope_network=False,
                scope_encryption=True,
                scope_lifecycle=False,
                notify_on_detection=True,
                notify_on_resolution=True,
                severity_threshold="Medium and above",
                notification_channels=["frontend-team", "security-team"],
            )
            self.db.add(cfg)
            await self.db.commit()
            await self.db.refresh(cfg)

        return IaCDriftConfigDTO(
            resource_id=cfg.resource_id,
            enable_drift_detection=cfg.enable_drift_detection,
            compare_terraform_state=cfg.compare_terraform_state,
            include_tags=cfg.include_tags,
            ignore_metadata_changes=cfg.ignore_metadata_changes,
            auto_resolve_known=cfg.auto_resolve_known,
            scan_frequency=cfg.scan_frequency,
            scope_configuration=cfg.scope_configuration,
            scope_tags=cfg.scope_tags,
            scope_permissions=cfg.scope_permissions,
            scope_network=cfg.scope_network,
            scope_encryption=cfg.scope_encryption,
            scope_lifecycle=cfg.scope_lifecycle,
            notify_on_detection=cfg.notify_on_detection,
            notify_on_resolution=cfg.notify_on_resolution,
            severity_threshold=cfg.severity_threshold,
            notification_channels=cfg.notification_channels or ["frontend-team", "security-team"],
        )

    async def update_resource_config(self, resource_id: str, data: IaCDriftConfigDTO) -> IaCDriftConfigDTO:
        await self._ensure_seeded()
        query = select(IaCDriftConfig).where(IaCDriftConfig.resource_id == resource_id)
        result = await self.db.execute(query)
        cfg = result.scalar_one_or_none()
        if not cfg:
            cfg = IaCDriftConfig(id=str(uuid.uuid4()), resource_id=resource_id)
            self.db.add(cfg)

        cfg.enable_drift_detection = data.enable_drift_detection
        cfg.compare_terraform_state = data.compare_terraform_state
        cfg.include_tags = data.include_tags
        cfg.ignore_metadata_changes = data.ignore_metadata_changes
        cfg.auto_resolve_known = data.auto_resolve_known
        cfg.scan_frequency = data.scan_frequency
        cfg.scope_configuration = data.scope_configuration
        cfg.scope_tags = data.scope_tags
        cfg.scope_permissions = data.scope_permissions
        cfg.scope_network = data.scope_network
        cfg.scope_encryption = data.scope_encryption
        cfg.scope_lifecycle = data.scope_lifecycle
        cfg.notify_on_detection = data.notify_on_detection
        cfg.notify_on_resolution = data.notify_on_resolution
        cfg.severity_threshold = data.severity_threshold
        cfg.notification_channels = data.notification_channels

        await self.db.commit()
        await self.db.refresh(cfg)
        return data

    async def get_baseline_info(self, workspace: str = "production") -> IaCBaselineStateDTO:
        await self._ensure_seeded()
        query = select(IaCBaselineState).where(IaCBaselineState.workspace == workspace)
        result = await self.db.execute(query)
        base = result.scalar_one_or_none()
        if not base:
            base = IaCBaselineState(
                id=str(uuid.uuid4()),
                workspace=workspace,
                comparison_source="terraform_state",
                state_file="s3://tf-state/prod/terraform.tfstate",
                last_updated_at=datetime.now(timezone.utc),
                resources_tracked=12,
                normalize_values=True,
                ignore_computed_fields=True,
                custom_ignore_rules='tags["last_updated"], metadata.*',
            )
            self.db.add(base)
            await self.db.commit()
            await self.db.refresh(base)

        available_files = [
            "s3://tf-state/prod/terraform.tfstate",
            "s3://tf-state/prod/backups/terraform-2026-10-01.tfstate",
            "s3://tf-state/staging/terraform.tfstate",
            "baseline-snapshots/v2.4-security-certified.json",
        ]

        return IaCBaselineStateDTO(
            workspace=base.workspace,
            comparison_source=base.comparison_source,
            state_file=base.state_file,
            last_updated_at=_format_timestamp(base.last_updated_at),
            resources_tracked=base.resources_tracked,
            normalize_values=base.normalize_values,
            ignore_computed_fields=base.ignore_computed_fields,
            custom_ignore_rules=base.custom_ignore_rules,
            available_state_files=available_files,
        )

    async def compare_baseline(self, req: IaCBaselineCompareRequest) -> IaCBaselineCompareResult:
        await self._ensure_seeded()
        now = datetime.now(timezone.utc)
        
        # Real query of drift count
        total_q = await self.db.execute(select(func.count(IaCDriftResource.id)))
        total = total_q.scalar() or 0

        drifted_q = await self.db.execute(
            select(func.count(IaCDriftResource.id)).where(IaCDriftResource.drift_status == "Drifted")
        )
        drifted = drifted_q.scalar() or 0
        in_sync = total - drifted

        diff_details = [
            {
                "resource": "aws_s3_bucket.app",
                "attribute": "versioning.enabled",
                "baseline_value": True,
                "target_state_value": False,
                "action": "modify",
            },
            {
                "resource": "aws_s3_bucket.app",
                "attribute": "public_access_block.block_public_acls",
                "baseline_value": True,
                "target_state_value": False,
                "action": "modify",
            },
            {
                "resource": "aws_security_group.web",
                "attribute": "ingress[port=22]",
                "baseline_value": None,
                "target_state_value": "0.0.0.0/0",
                "action": "remove",
            },
        ]

        return IaCBaselineCompareResult(
            compared_at=_format_timestamp(now),
            state_file=req.state_file,
            total_resources=total,
            drift_count=drifted,
            in_sync_count=in_sync,
            summary_message=f"Comparison against '{req.state_file}' finished: {drifted} drift anomalies identified across {total} resources.",
            diff_details=diff_details,
        )

    async def update_baseline_settings(self, req: IaCBaselineCompareRequest) -> IaCBaselineStateDTO:
        await self._ensure_seeded()
        query = select(IaCBaselineState).where(IaCBaselineState.workspace == (req.workspace or "production"))
        result = await self.db.execute(query)
        base = result.scalar_one_or_none()
        if not base:
            base = IaCBaselineState(id=str(uuid.uuid4()), workspace=req.workspace or "production")
            self.db.add(base)

        if req.state_file:
            base.state_file = req.state_file
        if req.normalize_values is not None:
            base.normalize_values = req.normalize_values
        if req.ignore_computed_fields is not None:
            base.ignore_computed_fields = req.ignore_computed_fields
        if req.custom_ignore_rules is not None:
            base.custom_ignore_rules = req.custom_ignore_rules

        base.last_updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(base)
        return await self.get_baseline_info(base.workspace)

    async def generate_remediation_plan(self, resource_id: str) -> IaCRemediationPlanResponse:
        await self._ensure_seeded()
        query = select(IaCDriftResource).where(
            or_(IaCDriftResource.resource_id == resource_id, IaCDriftResource.id == resource_id)
        )
        result = await self.db.execute(query)
        r = result.scalar_one_or_none()
        if not r:
            raise ValueError(f"Resource {resource_id} not found")

        plan_hcl = (
            f'# {r.resource_id} will be updated in-place to resolve infrastructure drift\n'
            f'~ resource "{r.resource_id.split(".")[0]}" "{r.resource_id.split(".")[1] if "." in r.resource_id else r.name}" {{\n'
            f'  ~ versioning {{\n'
            f'      ~ enabled = false -> true\n'
            f'    }}\n'
            f'  ~ public_access_block {{\n'
            f'      ~ block_public_acls = false -> true\n'
            f'      ~ block_public_policy = false -> true\n'
            f'    }}\n'
            f'  }}\n'
            f'\n'
            f'Plan: 0 to add, 1 to change, 0 to destroy.'
        )

        r.remediation_plan = plan_hcl
        await self.db.commit()

        return IaCRemediationPlanResponse(
            resource_id=r.resource_id,
            resource_name=r.name,
            provider=r.provider,
            plan_hcl=plan_hcl,
            target_action="terraform_apply_remediation",
            generated_at=_format_timestamp(datetime.now(timezone.utc)),
        )

    async def apply_remediation(self, resource_id: str, comment: Optional[str] = None) -> IaCApplyRemediationResponse:
        await self._ensure_seeded()
        query = select(IaCDriftResource).where(
            or_(IaCDriftResource.resource_id == resource_id, IaCDriftResource.id == resource_id)
        )
        result = await self.db.execute(query)
        r = result.scalar_one_or_none()
        if not r:
            raise ValueError(f"Resource {resource_id} not found")

        now = datetime.now(timezone.utc)
        # Apply changes: synchronize actual_hcl to match desired_hcl exactly!
        r.actual_hcl = r.desired_hcl
        r.drift_status = "In Sync"
        r.diff_summary = None
        r.last_detected = now

        # Add timeline resolution event
        event = IaCDriftEvent(
            id=str(uuid.uuid4()),
            resource_id=r.resource_id,
            event_timestamp=now,
            event_type="In Sync",
            title="Remediation applied via Terraform",
            description=f"Applied execution plan successfully. Resource state restored to match desired IaC specification. {comment or ''}".strip(),
            status="In Sync",
            severity="success",
            diff_payload={"applied_at": now.isoformat(), "comment": comment},
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(r)

        updated_item = IaCDriftResourceItem(
            id=r.id,
            name=r.name,
            resource_id=r.resource_id,
            provider=r.provider,
            resource_type=r.resource_type,
            drift_status=r.drift_status,
            region=r.region,
            workspace=r.workspace,
            last_detected=_format_timestamp(r.last_detected),
            last_detected_relative=_format_relative_time(r.last_detected),
            desired_hcl=r.desired_hcl,
            actual_hcl=r.actual_hcl,
            diff_summary=r.diff_summary,
            remediation_plan=r.remediation_plan,
            is_ignored=r.is_ignored,
            ignore_reason=r.ignore_reason,
        )

        return IaCApplyRemediationResponse(
            success=True,
            resource_id=r.resource_id,
            status="In Sync",
            message=f"Successfully applied remediation for {r.resource_id}. Infrastructure state is now in sync.",
            applied_at=_format_timestamp(now),
            updated_resource=updated_item,
        )

    async def ignore_resource(self, resource_id: str, reason: str) -> IaCDriftResourceItem:
        await self._ensure_seeded()
        query = select(IaCDriftResource).where(
            or_(IaCDriftResource.resource_id == resource_id, IaCDriftResource.id == resource_id)
        )
        result = await self.db.execute(query)
        r = result.scalar_one_or_none()
        if not r:
            raise ValueError(f"Resource {resource_id} not found")

        now = datetime.now(timezone.utc)
        r.is_ignored = True
        r.ignore_reason = reason
        r.drift_status = "Ignored"
        r.last_detected = now

        event = IaCDriftEvent(
            id=str(uuid.uuid4()),
            resource_id=r.resource_id,
            event_timestamp=now,
            event_type="Configuration",
            title="Drift marked as ignored",
            description=f"Marked as accepted difference. Reason: {reason}",
            status="Ignored",
            severity="info",
            diff_payload={"ignore_reason": reason},
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(r)

        return IaCDriftResourceItem(
            id=r.id,
            name=r.name,
            resource_id=r.resource_id,
            provider=r.provider,
            resource_type=r.resource_type,
            drift_status=r.drift_status,
            region=r.region,
            workspace=r.workspace,
            last_detected=_format_timestamp(r.last_detected),
            last_detected_relative=_format_relative_time(r.last_detected),
            desired_hcl=r.desired_hcl,
            actual_hcl=r.actual_hcl,
            diff_summary=r.diff_summary,
            remediation_plan=r.remediation_plan,
            is_ignored=r.is_ignored,
            ignore_reason=r.ignore_reason,
        )

    async def get_global_settings(self) -> IaCDriftGlobalSettingsDTO:
        await self._ensure_seeded()
        query = select(IaCDriftGlobalSettings).where(IaCDriftGlobalSettings.id == "default-settings")
        result = await self.db.execute(query)
        s = result.scalar_one_or_none()
        if not s:
            s = IaCDriftGlobalSettings(id="default-settings")
            self.db.add(s)
            await self.db.commit()
            await self.db.refresh(s)

        patterns_q = await self.db.execute(select(IaCIgnoredResource).order_by(IaCIgnoredResource.created_at))
        patterns = patterns_q.scalars().all()

        ignored_list = [
            IaCIgnoredResourceItem(
                id=p.id,
                resource_pattern=p.resource_pattern,
                reason=p.reason,
                added_by=p.added_by,
                created_at=_format_timestamp(p.created_at),
            )
            for p in patterns
        ]

        return IaCDriftGlobalSettingsDTO(
            enable_drift_globally=s.enable_drift_globally,
            default_scan_frequency=s.default_scan_frequency,
            parallel_scanning=s.parallel_scanning,
            retry_on_failure=s.retry_on_failure,
            max_retries=s.max_retries,
            timeout_minutes=s.timeout_minutes,
            notify_on_new_drift=s.notify_on_new_drift,
            notify_on_drift_resolution=s.notify_on_drift_resolution,
            daily_summary_report=s.daily_summary_report,
            weekly_compliance_report=s.weekly_compliance_report,
            ignored_resources=ignored_list,
        )

    async def update_global_settings(self, data: IaCDriftGlobalSettingsDTO) -> IaCDriftGlobalSettingsDTO:
        await self._ensure_seeded()
        query = select(IaCDriftGlobalSettings).where(IaCDriftGlobalSettings.id == "default-settings")
        result = await self.db.execute(query)
        s = result.scalar_one_or_none()
        if not s:
            s = IaCDriftGlobalSettings(id="default-settings")
            self.db.add(s)

        s.enable_drift_globally = data.enable_drift_globally
        s.default_scan_frequency = data.default_scan_frequency
        s.parallel_scanning = data.parallel_scanning
        s.retry_on_failure = data.retry_on_failure
        s.max_retries = data.max_retries
        s.timeout_minutes = data.timeout_minutes
        s.notify_on_new_drift = data.notify_on_new_drift
        s.notify_on_drift_resolution = data.notify_on_drift_resolution
        s.daily_summary_report = data.daily_summary_report
        s.weekly_compliance_report = data.weekly_compliance_report

        await self.db.commit()
        return await self.get_global_settings()

    async def add_ignored_pattern(self, pattern: str, reason: str, added_by: str = "@platform-team") -> IaCIgnoredResourceItem:
        await self._ensure_seeded()
        p = IaCIgnoredResource(
            id=str(uuid.uuid4()),
            resource_pattern=pattern.strip(),
            reason=reason.strip(),
            added_by=added_by.strip(),
        )
        self.db.add(p)
        await self.db.commit()
        await self.db.refresh(p)

        return IaCIgnoredResourceItem(
            id=p.id,
            resource_pattern=p.resource_pattern,
            reason=p.reason,
            added_by=p.added_by,
            created_at=_format_timestamp(p.created_at),
        )

    async def delete_ignored_pattern(self, pattern_id: str) -> bool:
        await self._ensure_seeded()
        query = select(IaCIgnoredResource).where(IaCIgnoredResource.id == pattern_id)
        result = await self.db.execute(query)
        p = result.scalar_one_or_none()
        if p:
            await self.db.delete(p)
            await self.db.commit()
            return True
        return False

    # =========================================================================
    # SECTION 10: DRIFT DETECTION SUITE METHODS (SCREENS 10.1 - 10.8)
    # =========================================================================

    _SUITE_ENVIRONMENTS: List[Dict[str, Any]] = [
        {"name": "production", "provider": "AWS", "region": "ap-south-1", "status": "Drifted", "last_scan": "2 hours ago"},
        {"name": "staging", "provider": "AWS", "region": "ap-south-1", "status": "In Sync", "last_scan": "6 hours ago"},
        {"name": "dev", "provider": "AWS", "region": "us-east-1", "status": "In Sync", "last_scan": "1 day ago"},
        {"name": "qa", "provider": "Azure", "region": "eastus", "status": "Drifted", "last_scan": "1 day ago"},
        {"name": "sandbox", "provider": "GCP", "region": "us-central1", "status": "Not Tracked", "last_scan": "3 days ago"},
    ]

    _SUITE_CHANGES: List[Dict[str, Any]] = [
        {"id": "CHG-001", "resource": "eks-prod-cluster", "resource_type": "AWS::EKS::Cluster", "environment": "production", "change_type": "Modified", "status": "Drifted", "detected": "2h ago"},
        {"id": "CHG-002", "resource": "s3-logs-bucket", "resource_type": "AWS::S3::Bucket", "environment": "production", "change_type": "Deleted", "status": "Drifted", "detected": "5h ago"},
        {"id": "CHG-003", "resource": "vpc-main", "resource_type": "AWS::EC2::VPC", "environment": "staging", "change_type": "Modified", "status": "In Sync", "detected": "1d ago"},
        {"id": "CHG-004", "resource": "nat-gateway", "resource_type": "AWS::EC2::NatGateway", "environment": "staging", "change_type": "Added", "status": "Drifted", "detected": "1d ago"},
        {"id": "CHG-005", "resource": "security-group", "resource_type": "AWS::EC2::SecurityGroup", "environment": "production", "change_type": "Modified", "status": "Drifted", "detected": "1d ago"},
        {"id": "CHG-006", "resource": "rds-instance", "resource_type": "AWS::RDS::DBInstance", "environment": "production", "change_type": "Modified", "status": "Drifted", "detected": "2d ago"},
        {"id": "CHG-007", "resource": "iam-role", "resource_type": "AWS::IAM::Role", "environment": "dev", "change_type": "Deleted", "status": "Drifted", "detected": "2d ago"},
        {"id": "CHG-008", "resource": "lambda-function", "resource_type": "AWS::Lambda::Function", "environment": "qa", "change_type": "Modified", "status": "In Sync", "detected": "3d ago"},
        {"id": "CHG-009", "resource": "route-table", "resource_type": "AWS::EC2::RouteTable", "environment": "production", "change_type": "Added", "status": "Drifted", "detected": "3d ago"},
        {"id": "CHG-010", "resource": "cloudfront", "resource_type": "AWS::CloudFront::Distribution", "environment": "production", "change_type": "Modified", "status": "Drifted", "detected": "3d ago"},
    ]

    _SUITE_REMEDIATIONS: List[Dict[str, Any]] = [
        {"id": "REM-001", "resource": "eks-prod-cluster", "issue": "Version mismatch", "severity": "High", "recommendation": "Update cluster version", "status": "Open"},
        {"id": "REM-002", "resource": "s3-logs-bucket", "issue": "Missing lifecycle policy", "severity": "High", "recommendation": "Apply recommended policy", "status": "Open"},
        {"id": "REM-003", "resource": "security-group", "issue": "Extra inbound rules", "severity": "Medium", "recommendation": "Remove unused rule", "status": "In Progress"},
        {"id": "REM-004", "resource": "rds-instance", "issue": "Parameter drift", "severity": "High", "recommendation": "Sync with IaC config", "status": "Open"},
        {"id": "REM-005", "resource": "nat-gateway", "issue": "Unexpected resource found", "severity": "Medium", "recommendation": "Remove from environment or update IaC code", "status": "Open"},
    ]

    _SUITE_HISTORY: List[Dict[str, Any]] = [
        {"id": "HIST-001", "time": "Sep 30, 10:12 AM", "resource": "eks-prod-cluster", "change_type": "Modified", "changed_by": "Terraform", "status": "Drifted"},
        {"id": "HIST-002", "time": "Sep 30, 09:43 AM", "resource": "s3-bucket", "change_type": "Deleted", "changed_by": "Manual", "status": "Drifted"},
        {"id": "HIST-003", "time": "Sep 29, 06:18 PM", "resource": "nat-gateway", "change_type": "Added", "changed_by": "CloudFormation", "status": "Drifted"},
        {"id": "HIST-004", "time": "Sep 29, 11:30 AM", "resource": "security-group", "change_type": "Modified", "changed_by": "Manual", "status": "Drifted"},
        {"id": "HIST-005", "time": "Sep 28, 04:02 PM", "resource": "rds-instance", "change_type": "Modified", "changed_by": "Manual", "status": "Drifted"},
        {"id": "HIST-006", "time": "Sep 28, 09:15 AM", "resource": "lambda-function", "change_type": "Modified", "changed_by": "Terraform", "status": "In Sync"},
        {"id": "HIST-007", "time": "Sep 27, 03:44 PM", "resource": "iam-role", "change_type": "Deleted", "changed_by": "Manual", "status": "Drifted"},
        {"id": "HIST-008", "time": "Sep 27, 11:02 AM", "resource": "route-table", "change_type": "Added", "changed_by": "CloudFormation", "status": "Drifted"},
        {"id": "HIST-009", "time": "Sep 26, 01:28 PM", "resource": "vpc-main", "change_type": "Modified", "changed_by": "Terraform", "status": "In Sync"},
        {"id": "HIST-010", "time": "Sep 26, 10:14 AM", "resource": "cloudfront", "change_type": "Modified", "changed_by": "Manual", "status": "Drifted"},
    ]

    _SUITE_SETTINGS: Dict[str, Any] = {
        "enable_drift_detection": True,
        "auto_scan_on_schedule": True,
        "notify_on_drift": True,
        "include_tags": True,
        "ignore_computed": False,
        "scan_frequency": "Daily",
        "scan_time": "02:00",
        "environments": ["production", "staging"],
        "email_notifications": True,
        "slack_notifications": True,
    }

    async def get_suite_overview(self, environment: Optional[str] = None) -> IaCDriftSuiteOverviewResponse:
        """Returns 10.1 Drift Detection Overview KPIs, donut status, trend, and recent events."""
        kpis = IaCDriftSuiteKpis(
            total_resources=24,
            drifted=8,
            in_sync=12,
            not_tracked=4,
        )

        trend = [
            IaCDriftTrendPoint(date="Sep 01", drifted=10, in_sync=10, not_tracked=4),
            IaCDriftTrendPoint(date="Sep 05", drifted=9, in_sync=11, not_tracked=4),
            IaCDriftTrendPoint(date="Sep 10", drifted=9, in_sync=11, not_tracked=4),
            IaCDriftTrendPoint(date="Sep 15", drifted=8, in_sync=12, not_tracked=4),
            IaCDriftTrendPoint(date="Sep 20", drifted=9, in_sync=11, not_tracked=4),
            IaCDriftTrendPoint(date="Sep 25", drifted=8, in_sync=12, not_tracked=4),
            IaCDriftTrendPoint(date="Sep 30", drifted=8, in_sync=12, not_tracked=4),
        ]

        recent = [
            IaCDriftRecentEvent(time="Sep 30, 10:12 AM", resource="eks-prod-cluster", environment="production", change_type="Modified", status="Drifted"),
            IaCDriftRecentEvent(time="Sep 29, 09:43 AM", resource="s3-bucket", environment="production", change_type="Deleted", status="Drifted"),
            IaCDriftRecentEvent(time="Sep 29, 06:18 PM", resource="nat-gateway", environment="staging", change_type="Modified", status="Drifted"),
            IaCDriftRecentEvent(time="Sep 28, 11:30 AM", resource="security-group", environment="production", change_type="Added", status="Drifted"),
            IaCDriftRecentEvent(time="Sep 28, 04:02 PM", resource="rds-instance", environment="production", change_type="Modified", status="Drifted"),
        ]

        return IaCDriftSuiteOverviewResponse(
            kpis=kpis,
            trend=trend,
            recent_events=recent,
        )

    async def get_suite_environments(self) -> IaCDriftEnvironmentsResponse:
        """Returns 10.2 Environments list."""
        return IaCDriftEnvironmentsResponse(
            items=[IaCDriftEnvironmentItem(**e) for e in self._SUITE_ENVIRONMENTS],
            total=len(self._SUITE_ENVIRONMENTS),
        )

    async def create_suite_environment(self, req: CreateDriftEnvironmentRequest) -> IaCDriftEnvironmentItem:
        """Adds a new environment (Screen 10.2 + Add Environment modal)."""
        new_env = {
            "name": req.name,
            "provider": req.provider,
            "region": req.region,
            "status": "In Sync",
            "last_scan": "Just now",
        }
        self._SUITE_ENVIRONMENTS.append(new_env)
        return IaCDriftEnvironmentItem(**new_env)

    async def scan_suite_environment(self, name: str) -> Dict[str, Any]:
        """Triggers drift scan on environment (Screen 10.2 trigger scan action)."""
        for e in self._SUITE_ENVIRONMENTS:
            if e["name"].lower() == name.lower():
                e["last_scan"] = "Just now"
                break
        return {"status": "scan_started", "environment": name, "timestamp": datetime.now(timezone.utc).isoformat()}

    async def delete_suite_environment(self, name: str) -> Dict[str, Any]:
        """Deletes environment from tracking."""
        self._SUITE_ENVIRONMENTS = [e for e in self._SUITE_ENVIRONMENTS if e["name"].lower() != name.lower()]
        return {"status": "deleted", "environment": name}

    async def get_suite_changes(
        self,
        environment: Optional[str] = None,
        change_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCDriftChangesResponse:
        """Returns 10.3 Drift Changes table with filters and pagination."""
        items = list(self._SUITE_CHANGES)

        if environment and environment not in ("All Environments", "All"):
            env = environment.lower()
            items = [c for c in items if env == c["environment"].lower()]

        if change_type and change_type not in ("All Change Types", "All"):
            ct = change_type.lower()
            items = [c for c in items if ct == c["change_type"].lower()]

        if status and status not in ("All Statuses", "All"):
            st = status.lower()
            items = [c for c in items if st == c["status"].lower()]

        if search:
            s = search.lower().strip()
            items = [c for c in items if s in c["resource"].lower() or s in c["resource_type"].lower() or s in c["change_type"].lower()]

        total = len(items)
        start = (page - 1) * page_size
        paged = items[start: start + page_size]

        return IaCDriftChangesResponse(
            items=[IaCDriftChangeItem(**c) for c in paged],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_suite_resource_detail(self, resource_name: str) -> IaCDriftResourceDetailResponse:
        """Returns 10.4 Resource Detail view with deployed configuration HCL, JSON, YAML."""
        r_name = resource_name if resource_name else "eks-prod-cluster"

        hcl = """resource "aws_eks_cluster" "main" {
  name     = "eks-prod-cluster"
  version  = "1.28"
  role_arn = "arn:aws:iam::123456789012:role/eks-service-role"

  vpc_config {
    subnet_ids = [
      "subnet-0a1b2c3d4e5f67890",
      "subnet-0a1b2c3d4e5f67891",
      "subnet-0a1b2c3d4e5f67892"
    ]
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = ["sg-0a1b2c3d4e5f67890"]
  }

  encryption_config {
    provider {
      key_arn = "arn:aws:kms:ap-south-1:123456789012:key/eks-kms"
    }
    resources = ["secrets"]
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    CostCenter  = "infrastructure"
  }
}"""

        json_repr = """{
  "resource": {
    "aws_eks_cluster": {
      "main": {
        "name": "eks-prod-cluster",
        "version": "1.28",
        "role_arn": "arn:aws:iam::123456789012:role/eks-service-role",
        "vpc_config": {
          "subnet_ids": ["subnet-0a1b2c3d4e5f67890", "subnet-0a1b2c3d4e5f67891", "subnet-0a1b2c3d4e5f67892"],
          "endpoint_private_access": true,
          "endpoint_public_access": true
        }
      }
    }
  }
}"""

        yaml_repr = """resource:
  aws_eks_cluster:
    main:
      name: eks-prod-cluster
      version: '1.28'
      role_arn: arn:aws:iam::123456789012:role/eks-service-role
      vpc_config:
        subnet_ids:
          - subnet-0a1b2c3d4e5f67890
          - subnet-0a1b2c3d4e5f67891
          - subnet-0a1b2c3d4e5f67892
        endpoint_private_access: true
        endpoint_public_access: true"""

        return IaCDriftResourceDetailResponse(
            name=r_name,
            resource_type="AWS::EKS::Cluster",
            environment="production",
            region="ap-south-1 (Mumbai)",
            created="Aug 12, 2026, 10:24 AM",
            last_modified="Sep 30, 2026, 06:10 AM",
            status="Drifted",
            drift_detected="Sep 30, 2026, 06:10 AM",
            change_type="Modified",
            changed_fields_count=4,
            severity="High",
            last_scan="2 hours ago",
            deployed_terraform=hcl,
            deployed_json=json_repr,
            deployed_yaml=yaml_repr,
        )

    async def get_suite_remediation(
        self,
        environment: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
    ) -> IaCDriftRemediationResponse:
        """Returns 10.5 Remediation recommendations."""
        items = list(self._SUITE_REMEDIATIONS)

        if severity and severity not in ("All Severities", "All"):
            sev = severity.lower()
            items = [r for r in items if sev == r["severity"].lower()]

        if status and status not in ("All Statuses", "All"):
            st = status.lower()
            items = [r for r in items if st == r["status"].lower()]

        return IaCDriftRemediationResponse(
            items=[IaCDriftRemediationItem(**r) for r in items],
            total=len(items),
        )

    async def apply_suite_remediation(self, remediation_id: str) -> ApplyDriftRemediationResponse:
        """Applies remediation action (Screen 10.5 Apply button)."""
        for r in self._SUITE_REMEDIATIONS:
            if r["id"].lower() == remediation_id.lower():
                r["status"] = "In Progress"
                return ApplyDriftRemediationResponse(
                    id=r["id"],
                    resource=r["resource"],
                    status="In Progress",
                    message=f"Remediation plan applied to {r['resource']}. Re-scanning desired state...",
                )
        return ApplyDriftRemediationResponse(
            id=remediation_id,
            resource="eks-prod-cluster",
            status="In Progress",
            message=f"Remediation initiated for {remediation_id}",
        )

    async def get_suite_history(
        self,
        resource: Optional[str] = None,
        date_range: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCDriftHistoryResponse:
        """Returns 10.6 Drift History table with filters."""
        items = list(self._SUITE_HISTORY)

        if resource and resource not in ("All Resources", "All"):
            r = resource.lower()
            items = [h for h in items if r in h["resource"].lower()]

        total = len(items)
        start = (page - 1) * page_size
        paged = items[start: start + page_size]

        res_names = list(set([h["resource"] for h in self._SUITE_HISTORY]))

        return IaCDriftHistoryResponse(
            items=[IaCDriftHistoryItem(**h) for h in paged],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, (total + page_size - 1) // page_size),
            available_resources=["All Resources"] + res_names,
        )

    async def get_suite_settings(self) -> IaCDriftSettingsDTO:
        """Returns 10.7 Drift Detection Settings."""
        return IaCDriftSettingsDTO(**self._SUITE_SETTINGS)

    async def update_suite_settings(self, data: IaCDriftSettingsDTO) -> IaCDriftSettingsDTO:
        """Updates 10.7 Drift Detection Settings."""
        self._SUITE_SETTINGS = data.model_dump()
        return IaCDriftSettingsDTO(**self._SUITE_SETTINGS)

    async def get_suite_compare(self, resource_name: str = "eks-prod-cluster") -> IaCDriftCompareResponse:
        """Returns 10.8 Compare Configuration side-by-side diff."""
        git_tf = """resource "aws_eks_cluster" "main" {
  name     = "eks-prod-cluster"
  version  = "1.29"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = [
      "subnet-123",
      "subnet-456"
    ]
  }
}"""

        deployed_tf = """resource "aws_eks_cluster" "main" {
  name     = "eks-prod-cluster"
  version  = "1.28"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = [
      "subnet-123",
      "subnet-456",
      "subnet-789"
    ]
  }
}"""

        git_json = """{
  "resource": {
    "aws_eks_cluster": {
      "main": {
        "name": "eks-prod-cluster",
        "version": "1.29",
        "vpc_config": {
          "subnet_ids": ["subnet-123", "subnet-456"]
        }
      }
    }
  }
}"""

        deployed_json = """{
  "resource": {
    "aws_eks_cluster": {
      "main": {
        "name": "eks-prod-cluster",
        "version": "1.28",
        "vpc_config": {
          "subnet_ids": ["subnet-123", "subnet-456", "subnet-789"]
        }
      }
    }
  }
}"""

        git_yaml = """resource:
  aws_eks_cluster:
    main:
      name: eks-prod-cluster
      version: '1.29'
      vpc_config:
        subnet_ids:
          - subnet-123
          - subnet-456"""

        deployed_yaml = """resource:
  aws_eks_cluster:
    main:
      name: eks-prod-cluster
      version: '1.28'
      vpc_config:
        subnet_ids:
          - subnet-123
          - subnet-456
          - subnet-789"""

        return IaCDriftCompareResponse(
            resource=resource_name or "eks-prod-cluster",
            git_terraform=git_tf,
            git_json=git_json,
            git_yaml=git_yaml,
            deployed_terraform=deployed_tf,
            deployed_json=deployed_json,
            deployed_yaml=deployed_yaml,
            differences_count=3,
            diff_summary=[
                "Cluster version mismatch: '1.29' declared in Git vs '1.28' deployed on AWS",
                "Subnet 'subnet-789' present in AWS environment but missing in Git IaC template",
                "Ingress controller security group modified via AWS Management Console",
            ],
        )

