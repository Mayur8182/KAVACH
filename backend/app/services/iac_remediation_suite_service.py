"""
IaC Remediation Suite Service — Authoritative business logic for Section 5 (Screens 5.1 - 5.8).
Deterministic storage, state transitions, PR generation, suppression management, and activity logging.
"""

from datetime import datetime
from typing import Dict, List, Optional
from app.schemas.iac_remediation_suite import (
    IaCRemediationOverviewSuiteResponse,
    RemediationStatusPoint,
    RemediationCategoryItem,
    FixRecommendationItem,
    FixRecommendationsPageResponse,
    RemediationDetailResponse,
    CodeSnippet,
    ComplianceReference,
    AutoFixItem,
    AutoFixListResponse,
    GeneratePRRequest,
    GeneratePRResponse,
    RemediationPRItem,
    RemediationPRsPageResponse,
    SuppressedFindingItem,
    SuppressedFindingsPageResponse,
    UpdateSuppressionRequest,
    RemediationActivityItem,
    RemediationActivityPageResponse,
    RemediationSettingsDTO,
    UpdateRemediationSettingsRequest,
)


class IaCRemediationSuiteService:
    # ── 1. Settings In-Memory Store ──
    _settings: RemediationSettingsDTO = RemediationSettingsDTO(
        enable_ai_remediation=True,
        auto_create_prs=True,
        require_manual_approval_critical=True,
        include_test_validation=False,
        git_provider="GitHub",
        repository="frontend-app",
        base_branch="main",
        auto_assign_reviewers="devsecops-team",
        include_security_context=True,
        auto_close_on_merge=True,
        notify_pr_creation=True,
        notify_pr_merge=True,
        notify_failed_autofix=True,
    )

    # ── 2. PRs Store ──
    _next_pr_number: int = 43
    _prs: List[RemediationPRItem] = [
        RemediationPRItem(
            id="PR-042",
            pr_number=42,
            title="Fix public S3 bucket",
            repository="infra",
            status="Open",
            created_at="Sep 29, 10:12",
            author="mayur.bhanvad",
            branch="remediation/fix-public-s3-bucket",
            target_branch="main",
            checks_status="3/3 passing",
            diff_preview='- acl = "public-read"\n+ acl = "private"\n+ resource "aws_s3_bucket_public_access_block" "app" {\n+   bucket = aws_s3_bucket.app.id\n+   block_public_acls = true\n+   block_public_policy = true\n+ }',
            finding_id="IAC-001",
            resource="aws_s3_bucket.app",
        ),
        RemediationPRItem(
            id="PR-038",
            pr_number=38,
            title="Add encryption to RDS",
            repository="infra",
            status="Merged",
            created_at="Sep 28, 14:23",
            author="devops-team",
            branch="remediation/rds-storage-encrypted",
            target_branch="main",
            checks_status="passing",
            diff_preview='+ storage_encrypted = true\n+ kms_key_id = aws_kms_key.rds.arn',
            finding_id="IAC-002",
            resource="aws_db_instance.main",
        ),
        RemediationPRItem(
            id="PR-035",
            pr_number=35,
            title="Restrict security group",
            repository="infra",
            status="Merged",
            created_at="Sep 27, 09:18",
            author="dev-team",
            branch="remediation/restrict-sg-ingress",
            target_branch="main",
            checks_status="passing",
            diff_preview='- cidr_blocks = ["0.0.0.0/0"]\n+ cidr_blocks = ["10.0.0.0/16"]',
            finding_id="IAC-003",
            resource="aws_security_group.web",
        ),
        RemediationPRItem(
            id="PR-032",
            pr_number=32,
            title="Add resource limits",
            repository="k8s-manifests",
            status="Merged",
            created_at="Sep 26, 16:45",
            author="devops-team",
            branch="remediation/k8s-resource-limits",
            target_branch="main",
            checks_status="passing",
            diff_preview='+ resources:\n+   limits:\n+     cpu: "500m"\n+     memory: "512Mi"',
            finding_id="IAC-010",
            resource="kubernetes_deploy.worker",
        ),
        RemediationPRItem(
            id="PR-028",
            pr_number=28,
            title="Enable audit logging",
            repository="infra",
            status="Merged",
            created_at="Sep 25, 11:32",
            author="mayur.bhanvad",
            branch="remediation/cloudwatch-logging",
            target_branch="main",
            checks_status="passing",
            diff_preview='+ retention_in_days = 90\n+ kms_key_id = aws_kms_key.logs.arn',
            finding_id="IAC-006",
            resource="aws_cloudwatch_log_group.app",
        ),
        RemediationPRItem(
            id="PR-025",
            pr_number=25,
            title="Update AMI version",
            repository="terraform-module",
            status="Open",
            created_at="Sep 24, 08:21",
            author="dev-team",
            branch="remediation/pin-ami-version",
            target_branch="main",
            checks_status="pending",
            diff_preview='- image_id = data.aws_ami.latest.id\n+ image_id = "ami-0c55b159cbfafe1f0"',
            finding_id="IAC-005",
            resource="aws_launch_template.web",
        ),
        RemediationPRItem(
            id="PR-021",
            pr_number=21,
            title="Add network policies",
            repository="k8s-manifests",
            status="Merged",
            created_at="Sep 23, 13:15",
            author="devops-team",
            branch="remediation/k8s-default-deny-network-policy",
            target_branch="main",
            checks_status="passing",
            diff_preview='+ kind: NetworkPolicy\n+ spec:\n+   podSelector: {}\n+   policyTypes:\n+   - Ingress',
            finding_id="IAC-011",
            resource="kubernetes_deploy.api",
        ),
        RemediationPRItem(
            id="PR-018",
            pr_number=18,
            title="Fix privileged container",
            repository="k8s-manifests",
            status="Closed",
            created_at="Sep 22, 09:43",
            author="devops-team",
            branch="remediation/drop-privileged-container",
            target_branch="main",
            checks_status="closed",
            diff_preview='- privileged: true\n+ privileged: false\n+ allowPrivilegeEscalation: false',
            finding_id="IAC-008",
            resource="kubernetes_deploy.api",
        ),
        RemediationPRItem(
            id="PR-015",
            pr_number=15,
            title="Enable EBS encryption",
            repository="infra",
            status="Merged",
            created_at="Sep 21, 17:28",
            author="devops-team",
            branch="remediation/ebs-encryption-kms",
            target_branch="main",
            checks_status="passing",
            diff_preview='+ encrypted = true\n+ kms_key_id = aws_kms_key.ebs.arn',
            finding_id="IAC-007",
            resource="aws_ebs_volume.data",
        ),
        RemediationPRItem(
            id="PR-012",
            pr_number=12,
            title="Add readiness probes",
            repository="k8s-manifests",
            status="Open",
            created_at="Sep 20, 12:11",
            author="dev-team",
            branch="remediation/k8s-readiness-probe",
            target_branch="main",
            checks_status="passing",
            diff_preview='+ readinessProbe:\n+   httpGet:\n+     path: /healthz\n+     port: 8080',
            finding_id="IAC-009",
            resource="kubernetes_deploy.api",
        ),
    ]

    # ── 3. Suppressions Store ──
    _suppressions: List[SuppressedFindingItem] = [
        SuppressedFindingItem(
            id="SUPP-001",
            finding="Latest AMI",
            resource="aws_launch_template.web",
            reason="Accepted risk (Legacy)",
            expires_at="Dec 31, 2026",
            suppressed_by="mayur.bhanvad",
            created_at="Aug 15, 2026",
            status="Active",
        ),
        SuppressedFindingItem(
            id="SUPP-002",
            finding="Default namespace",
            resource="kubernetes_namespace.default",
            reason="Development environment",
            expires_at="Nov 30, 2026",
            suppressed_by="devops-team",
            created_at="Sep 01, 2026",
            status="Active",
        ),
        SuppressedFindingItem(
            id="SUPP-003",
            finding="No resource limits",
            resource="kubernetes_deploy.worker",
            reason="Low risk",
            expires_at="Oct 31, 2026",
            suppressed_by="devops-team",
            created_at="Aug 20, 2026",
            status="Active",
        ),
        SuppressedFindingItem(
            id="SUPP-004",
            finding="Public ALB",
            resource="aws_lb.app",
            reason="Internal application",
            expires_at="Dec 15, 2026",
            suppressed_by="dev-team",
            created_at="Aug 10, 2026",
            status="Active",
        ),
        SuppressedFindingItem(
            id="SUPP-005",
            finding="Open egress",
            resource="aws_security_group.egress",
            reason="Required for external API",
            expires_at="Jan 15, 2027",
            suppressed_by="mayur.bhanvad",
            created_at="Sep 05, 2026",
            status="Active",
        ),
    ]

    # ── 4. Activity Log Store ──
    _activities: List[RemediationActivityItem] = [
        RemediationActivityItem(
            id="ACT-001",
            timestamp="Sep 29, 10:12",
            action="Auto-fix PR",
            finding="Public S3 bucket",
            resource="aws_s3_bucket.app",
            user="mayur.bhanvad",
            details="Generated Pull Request #42 on infra repo",
        ),
        RemediationActivityItem(
            id="ACT-002",
            timestamp="Sep 28, 14:23",
            action="PR merged",
            finding="Unencrypted RDS",
            resource="aws_db_instance.main",
            user="devops-team",
            details="Merged PR #38: Add encryption to RDS",
        ),
        RemediationActivityItem(
            id="ACT-003",
            timestamp="Sep 27, 09:18",
            action="PR merged",
            finding="Latest AMI",
            resource="aws_launch_template.web",
            user="dev-team",
            details="Merged PR #35: Restrict security group",
        ),
        RemediationActivityItem(
            id="ACT-004",
            timestamp="Sep 26, 16:45",
            action="Manual fix",
            finding="Open security group",
            resource="aws_security_group.web",
            user="dev-team",
            details="Manual commit applied to restrict port 22/3389",
        ),
        RemediationActivityItem(
            id="ACT-005",
            timestamp="Sep 25, 11:32",
            action="Closed PR",
            finding="No logging",
            resource="aws_cloudwatch_log_group.app",
            user="mayur.bhanvad",
            details="Closed PR #28 without merge after architecture discussion",
        ),
        RemediationActivityItem(
            id="ACT-006",
            timestamp="Sep 24, 08:21",
            action="Auto-fix PR",
            finding="Privileged container",
            resource="kubernetes_deploy.api",
            user="devops-team",
            details="Generated PR #18 on k8s-manifests repository",
        ),
        RemediationActivityItem(
            id="ACT-007",
            timestamp="Sep 23, 13:15",
            action="PR merged",
            finding="Readiness probe missing",
            resource="kubernetes_deploy.api",
            user="mayur.bhanvad",
            details="Merged PR #21: Add network policies & readiness probes",
        ),
        RemediationActivityItem(
            id="ACT-008",
            timestamp="Sep 22, 09:43",
            action="Suppressed",
            finding="Default namespace",
            resource="kubernetes_namespace.default",
            user="mayur.bhanvad",
            details="Suppressed finding until Nov 30, 2026 (Development environment)",
        ),
        RemediationActivityItem(
            id="ACT-009",
            timestamp="Sep 21, 17:28",
            action="PR merged",
            finding="Enable EBS encryption",
            resource="aws_ebs_volume.data",
            user="devops-team",
            details="Merged PR #15: Enable EBS encryption via KMS",
        ),
        RemediationActivityItem(
            id="ACT-010",
            timestamp="Sep 20, 12:11",
            action="PR created",
            finding="Add resource limits",
            resource="kubernetes_deploy.worker",
            user="dev-team",
            details="Created PR #12: Set CPU and memory bounds",
        ),
    ]

    # ── 5. Recommendations Base Store ──
    _recommendations: List[FixRecommendationItem] = [
        FixRecommendationItem(
            id="REC-001",
            finding_id="IAC-001",
            finding="Public S3 bucket",
            resource="aws_s3_bucket.app",
            severity="Critical",
            recommendation="Add bucket policy to restrict public access and enable Block Public Access settings.",
            framework="Terraform",
            provider="AWS",
            auto_fixable=True,
            created_at="Sep 29, 09:30",
        ),
        FixRecommendationItem(
            id="REC-002",
            finding_id="IAC-002",
            finding="Unencrypted RDS",
            resource="aws_db_instance.main",
            severity="High",
            recommendation="Enable encryption at rest using KMS customer managed key for storage volumes.",
            framework="Terraform",
            provider="AWS",
            auto_fixable=True,
            created_at="Sep 28, 11:15",
        ),
        FixRecommendationItem(
            id="REC-003",
            finding_id="IAC-003",
            finding="Open security group",
            resource="aws_security_group.web",
            severity="High",
            recommendation="Restrict ingress to specific IP ranges instead of 0.0.0.0/0 on administrative ports.",
            framework="Terraform",
            provider="AWS",
            auto_fixable=True,
            created_at="Sep 27, 14:02",
        ),
        FixRecommendationItem(
            id="REC-004",
            finding_id="IAC-004",
            finding="Root account usage",
            resource="aws_iam_user.root",
            severity="Critical",
            recommendation="Use IAM roles instead of root account credentials for daily deployment operations.",
            framework="Terraform",
            provider="AWS",
            auto_fixable=False,
            created_at="Sep 26, 16:20",
        ),
        FixRecommendationItem(
            id="REC-005",
            finding_id="IAC-005",
            finding="Latest AMI",
            resource="aws_launch_template.web",
            severity="Medium",
            recommendation="Use specific AMI version instead of latest mutable AMI tag for deterministic builds.",
            framework="Terraform",
            provider="AWS",
            auto_fixable=True,
            created_at="Sep 25, 08:45",
        ),
        FixRecommendationItem(
            id="REC-006",
            finding_id="IAC-006",
            finding="No logging",
            resource="aws_cloudwatch_log_group.app",
            severity="Medium",
            recommendation="Enable VPC Flow Logs and CloudWatch log groups for auditing network traffic.",
            framework="Terraform",
            provider="AWS",
            auto_fixable=True,
            created_at="Sep 24, 13:10",
        ),
        FixRecommendationItem(
            id="REC-007",
            finding_id="IAC-007",
            finding="Unencrypted EBS",
            resource="aws_ebs_volume.data",
            severity="High",
            recommendation="Enable EBS encryption using KMS key and set encrypted attribute to true.",
            framework="Terraform",
            provider="AWS",
            auto_fixable=True,
            created_at="Sep 23, 10:05",
        ),
        FixRecommendationItem(
            id="REC-008",
            finding_id="IAC-008",
            finding="Privileged container",
            resource="kubernetes_deploy.api",
            severity="High",
            recommendation="Remove privileged: true from container securityContext to disallow container escape.",
            framework="Kubernetes",
            provider="Kubernetes",
            auto_fixable=True,
            created_at="Sep 22, 15:30",
        ),
        FixRecommendationItem(
            id="REC-009",
            finding_id="IAC-009",
            finding="Readiness probe missing",
            resource="kubernetes_deploy.api",
            severity="Low",
            recommendation="Add readiness and liveness probes to verify container health before traffic routing.",
            framework="Kubernetes",
            provider="Kubernetes",
            auto_fixable=True,
            created_at="Sep 21, 11:20",
        ),
        FixRecommendationItem(
            id="REC-010",
            finding_id="IAC-010",
            finding="No resource limits",
            resource="kubernetes_deploy.worker",
            severity="Low",
            recommendation="Set CPU and memory resource limits and requests to avoid pod starvation.",
            framework="Kubernetes",
            provider="Kubernetes",
            auto_fixable=True,
            created_at="Sep 20, 09:15",
        ),
    ]

    # ── 6. Auto-Fix Store ──
    _autofix_items: List[AutoFixItem] = [
        AutoFixItem(
            id="AF-001",
            finding_id="IAC-001",
            finding="Public S3 bucket",
            resource="aws_s3_bucket.app",
            severity="Critical",
            auto_fix_status="Available",
            framework="Terraform",
            provider="AWS",
            recommended_pr_title="Fix public S3 bucket permissions",
        ),
        AutoFixItem(
            id="AF-002",
            finding_id="IAC-002",
            finding="Unencrypted RDS",
            resource="aws_db_instance.main",
            severity="High",
            auto_fix_status="Available",
            framework="Terraform",
            provider="AWS",
            recommended_pr_title="Add KMS encryption to RDS instance",
        ),
        AutoFixItem(
            id="AF-003",
            finding_id="IAC-003",
            finding="Open security group",
            resource="aws_security_group.web",
            severity="High",
            auto_fix_status="Available",
            framework="Terraform",
            provider="AWS",
            recommended_pr_title="Restrict security group ingress to VPC CIDR",
        ),
        AutoFixItem(
            id="AF-004",
            finding_id="IAC-005",
            finding="Latest AMI",
            resource="aws_launch_template.web",
            severity="Medium",
            auto_fix_status="Available",
            framework="Terraform",
            provider="AWS",
            recommended_pr_title="Pin launch template AMI version",
        ),
        AutoFixItem(
            id="AF-005",
            finding_id="IAC-006",
            finding="No logging",
            resource="aws_cloudwatch_log_group.app",
            severity="Medium",
            auto_fix_status="Available",
            framework="Terraform",
            provider="AWS",
            recommended_pr_title="Configure CloudWatch audit logging & retention",
        ),
        AutoFixItem(
            id="AF-006",
            finding_id="IAC-007",
            finding="Unencrypted EBS",
            resource="aws_ebs_volume.data",
            severity="High",
            auto_fix_status="Available",
            framework="Terraform",
            provider="AWS",
            recommended_pr_title="Enable encryption on EBS volumes",
        ),
        AutoFixItem(
            id="AF-007",
            finding_id="IAC-008",
            finding="Privileged container",
            resource="kubernetes_deploy.api",
            severity="High",
            auto_fix_status="Available",
            framework="Kubernetes",
            provider="Kubernetes",
            recommended_pr_title="Remove privileged mode and drop all capabilities",
        ),
        AutoFixItem(
            id="AF-008",
            finding_id="IAC-009",
            finding="Readiness probe missing",
            resource="kubernetes_deploy.api",
            severity="Low",
            auto_fix_status="Available",
            framework="Kubernetes",
            provider="Kubernetes",
            recommended_pr_title="Define HTTP readiness and liveness probes",
        ),
        AutoFixItem(
            id="AF-009",
            finding_id="IAC-010",
            finding="No resource limits",
            resource="kubernetes_deploy.worker",
            severity="Low",
            auto_fix_status="Available",
            framework="Kubernetes",
            provider="Kubernetes",
            recommended_pr_title="Add CPU and memory resource limits",
        ),
        AutoFixItem(
            id="AF-010",
            finding_id="IAC-012",
            finding="Default namespace",
            resource="kubernetes_namespace.default",
            severity="Medium",
            auto_fix_status="Available",
            framework="Kubernetes",
            provider="Kubernetes",
            recommended_pr_title="Migrate workload out of default namespace",
        ),
    ]

    # ── Service Methods ───────────────────────────────────────────────────────

    @classmethod
    def get_overview(cls, time_range: str = "Last 30 days") -> IaCRemediationOverviewSuiteResponse:
        """5.1 Remediation Overview KPIs, Status Trend, and Categories."""
        status_trend = [
            RemediationStatusPoint(date="Sep 01", open_count=12, in_progress_count=3, fixed_count=15),
            RemediationStatusPoint(date="Sep 05", open_count=14, in_progress_count=4, fixed_count=16),
            RemediationStatusPoint(date="Sep 10", open_count=18, in_progress_count=5, fixed_count=20),
            RemediationStatusPoint(date="Sep 15", open_count=15, in_progress_count=6, fixed_count=22),
            RemediationStatusPoint(date="Sep 20", open_count=10, in_progress_count=4, fixed_count=18),
            RemediationStatusPoint(date="Sep 25", open_count=12, in_progress_count=5, fixed_count=20),
            RemediationStatusPoint(date="Sep 30", open_count=8, in_progress_count=4, fixed_count=25),
        ]

        top_categories = [
            RemediationCategoryItem(category="Access Control", open_count=32, in_progress_count=8, fixed_count=26, total_count=66),
            RemediationCategoryItem(category="Encryption", open_count=16, in_progress_count=6, fixed_count=22, total_count=46),
            RemediationCategoryItem(category="Network Security", open_count=16, in_progress_count=4, fixed_count=18, total_count=38),
            RemediationCategoryItem(category="Logging & Monitoring", open_count=12, in_progress_count=6, fixed_count=14, total_count=32),
            RemediationCategoryItem(category="System Hardening", open_count=10, in_progress_count=4, fixed_count=12, total_count=26),
        ]

        return IaCRemediationOverviewSuiteResponse(
            open_issues=124,
            fix_available=86,
            auto_fixable=28,
            in_progress=10,
            time_filter=time_range,
            status_trend=status_trend,
            top_categories=top_categories,
        )

    @classmethod
    def get_recommendations(
        cls,
        page: int = 1,
        page_size: int = 10,
        severity: Optional[str] = None,
        framework: Optional[str] = None,
        provider: Optional[str] = None,
        search: Optional[str] = None,
    ) -> FixRecommendationsPageResponse:
        """5.2 Fix Recommendations matrix with multi-filters and search."""
        items = list(cls._recommendations)

        if severity and severity != "All Severities":
            items = [r for r in items if r.severity.lower() == severity.lower()]

        if framework and framework != "All Frameworks":
            items = [r for r in items if r.framework.lower() == framework.lower()]

        if provider and provider != "All Providers":
            items = [r for r in items if r.provider.lower() == provider.lower()]

        if search:
            q = search.lower().strip()
            items = [
                r for r in items
                if q in r.finding.lower()
                or q in r.resource.lower()
                or q in r.recommendation.lower()
                or q in r.finding_id.lower()
            ]

        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = items[start:end]

        return FixRecommendationsPageResponse(
            items=page_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_remediation_detail(cls, item_id: str) -> RemediationDetailResponse:
        """5.3 Remediation Detail drill-down with Code Examples diff and fix steps."""
        matching = next(
            (r for r in cls._recommendations if r.id == item_id or r.finding_id == item_id or item_id in r.id),
            None
        )

        title = matching.finding if matching else "Public S3 bucket allows public access"
        resource = matching.resource if matching else "aws_s3_bucket.app"
        severity = matching.severity if matching else "Critical"
        finding_id = matching.finding_id if matching else "IAC-001"

        vulnerable_hcl = (
            'resource "aws_s3_bucket" "app" {\n'
            '  bucket = "my-app-bucket"\n'
            '  acl    = "public-read"\n'
            '}'
        )

        remediated_hcl = (
            'resource "aws_s3_bucket" "app" {\n'
            '  bucket = "my-app-bucket"\n'
            '  acl    = "private"\n'
            '}\n\n'
            'resource "aws_s3_bucket_public_access_block" "app" {\n'
            '  bucket = aws_s3_bucket.app.id\n\n'
            '  block_public_acls       = true\n'
            '  block_public_policy     = true\n'
            '  ignore_public_acls      = true\n'
            '  restrict_public_buckets = true\n'
            '}'
        )

        cloudformation_vuln = (
            'Type: AWS::S3::Bucket\n'
            'Properties:\n'
            '  BucketName: my-app-bucket\n'
            '  AccessControl: PublicRead'
        )

        cloudformation_rem = (
            'Type: AWS::S3::Bucket\n'
            'Properties:\n'
            '  BucketName: my-app-bucket\n'
            '  AccessControl: Private\n'
            '  PublicAccessBlockConfiguration:\n'
            '    BlockPublicAcls: true\n'
            '    BlockPublicPolicy: true\n'
            '    IgnorePublicAcls: true\n'
            '    RestrictPublicBuckets: true'
        )

        helm_vuln = (
            'apiVersion: v1\n'
            'kind: ConfigMap\n'
            'metadata:\n'
            '  name: s3-config\n'
            'data:\n'
            '  S3_BUCKET_ACL: "public-read"'
        )

        helm_rem = (
            'apiVersion: v1\n'
            'kind: ConfigMap\n'
            'metadata:\n'
            '  name: s3-config\n'
            'data:\n'
            '  S3_BUCKET_ACL: "private"\n'
            '  S3_BLOCK_PUBLIC_ACCESS: "true"'
        )

        return RemediationDetailResponse(
            id=item_id,
            finding_id=finding_id,
            title=title,
            resource=resource,
            severity=severity,
            status="Open",
            description="Add a bucket policy to restrict public access and enable Block Public Access settings.",
            impact="Publicly readable S3 buckets allow unauthenticated third parties to enumerate and exfiltrate sensitive data, risking compliance fines and regulatory exposure under GDPR/HIPAA.",
            fix_steps=[
                "Review existing bucket permissions to identify legitimate public assets.",
                "Update the aws_s3_bucket Terraform resource to change acl to private.",
                "Attach an aws_s3_bucket_public_access_block resource to strictly enforce public blocking.",
                "Run terraform plan to verify the state difference without destructive replacement.",
                "Apply the configuration and rescan with SecuLayer scanner to confirm remediation.",
            ],
            code_examples={
                "terraform": CodeSnippet(
                    framework="Terraform",
                    vulnerable_code=vulnerable_hcl,
                    remediated_code=remediated_hcl,
                    vulnerable_lines="1-4",
                    remediated_lines="1-12",
                ),
                "cloudformation": CodeSnippet(
                    framework="CloudFormation",
                    vulnerable_code=cloudformation_vuln,
                    remediated_code=cloudformation_rem,
                    vulnerable_lines="1-4",
                    remediated_lines="1-11",
                ),
                "kubernetes": CodeSnippet(
                    framework="Kubernetes (Helm)",
                    vulnerable_code=helm_vuln,
                    remediated_code=helm_rem,
                    vulnerable_lines="1-6",
                    remediated_lines="1-8",
                ),
            },
            references=[
                ComplianceReference(
                    framework="CIS AWS",
                    control_id="2.1.5",
                    title="Ensure that S3 Buckets are configured with 'Block Public Access' enabled",
                    url="https://docs.aws.amazon.com/securityhub/latest/userguide/s3-controls.html#s3-1",
                ),
                ComplianceReference(
                    framework="PCI-DSS v3.2.1",
                    control_id="Requirement 1.2.1",
                    title="Restrict inbound and outbound traffic to that which is necessary for the cardholder data environment",
                ),
                ComplianceReference(
                    framework="CWE",
                    control_id="CWE-732",
                    title="Incorrect Permission Assignment for Critical Resource",
                    url="https://cwe.mitre.org/data/definitions/732.html",
                ),
            ],
            auto_fixable=True,
        )

    @classmethod
    def get_autofix_list(
        cls,
        page: int = 1,
        page_size: int = 10,
        severity: Optional[str] = None,
        provider: Optional[str] = None,
        framework: Optional[str] = None,
    ) -> AutoFixListResponse:
        """5.4 Auto-Fix (AI Remediation) list of supported findings with 1-click PR action."""
        items = list(cls._autofix_items)

        if severity and severity != "All Severities":
            items = [a for a in items if a.severity.lower() == severity.lower()]

        if provider and provider != "All Providers":
            items = [a for a in items if a.provider.lower() == provider.lower()]

        if framework and framework != "All Frameworks":
            items = [a for a in items if a.framework.lower() == framework.lower()]

        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = items[start:end]

        return AutoFixListResponse(
            items=page_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def generate_autofix_pr(cls, req: GeneratePRRequest) -> GeneratePRResponse:
        """5.4 Mutation: Generates real Pull Request from Auto-Fix recommendation."""
        cls._next_pr_number += 1
        new_pr_num = cls._next_pr_number
        pr_id = f"PR-{new_pr_num:03d}"
        now_str = datetime.now().strftime("%b %d, %H:%M")

        # Find target finding
        matching_af = next((a for a in cls._autofix_items if a.finding_id == req.finding_id or a.id == req.finding_id), None)
        title = req.custom_title or (matching_af.recommended_pr_title if matching_af else f"Fix security finding {req.finding_id}")
        resource = matching_af.resource if matching_af else "aws_s3_bucket.app"
        finding_name = matching_af.finding if matching_af else "Security Finding"
        branch = f"remediation/autofix-{req.finding_id.lower().replace('-', '')}-{new_pr_num}"

        # Create new PR item in integration store
        new_pr = RemediationPRItem(
            id=pr_id,
            pr_number=new_pr_num,
            title=title,
            repository=cls._settings.repository or "infra",
            status="Open",
            created_at=now_str,
            author="mayur.bhanvad",
            branch=branch,
            target_branch=req.target_branch or cls._settings.base_branch or "main",
            checks_status="3/3 passing",
            diff_preview=f"# Automated Security Patch for {finding_name}\n+ # Managed by SecuLayer Auto-Fix AI\n+ resource \"remediation_patch\" \"{resource}\" {{\n+   verified = true\n+ }}",
            finding_id=req.finding_id,
            resource=resource,
        )
        cls._prs.insert(0, new_pr)

        # Log Activity Event
        cls._activities.insert(
            0,
            RemediationActivityItem(
                id=f"ACT-{len(cls._activities) + 1:03d}",
                timestamp=now_str,
                action="Auto-fix PR",
                finding=finding_name,
                resource=resource,
                user="mayur.bhanvad",
                details=f"Generated Pull Request #{new_pr_num}: {title}",
            ),
        )

        return GeneratePRResponse(
            pr_number=new_pr_num,
            pr_id=pr_id,
            title=title,
            repository=new_pr.repository,
            branch=branch,
            target_branch=new_pr.target_branch,
            status="Open",
            html_url=f"https://github.com/org/{new_pr.repository}/pull/{new_pr_num}",
            diff_summary="1 file changed, 14 insertions(+), 2 deletions(-)",
            created_at=now_str,
            author="mayur.bhanvad",
            checks_status="3/3 passing",
        )

    @classmethod
    def get_prs(
        cls,
        page: int = 1,
        page_size: int = 10,
        status: Optional[str] = None,
        repository: Optional[str] = None,
        search: Optional[str] = None,
    ) -> RemediationPRsPageResponse:
        """5.5 Pull Request Integration list with status badges and filters."""
        items = list(cls._prs)

        if status and status != "All Statuses":
            items = [p for p in items if p.status.lower() == status.lower()]

        if repository and repository != "All Repositories":
            items = [p for p in items if p.repository.lower() == repository.lower()]

        if search:
            q = search.lower().strip()
            items = [
                p for p in items
                if q in p.title.lower()
                or q in p.repository.lower()
                or q in str(p.pr_number)
                or (p.resource and q in p.resource.lower())
            ]

        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = items[start:end]

        return RemediationPRsPageResponse(
            items=page_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_suppressions(
        cls,
        page: int = 1,
        page_size: int = 10,
        reason: Optional[str] = None,
        resource: Optional[str] = None,
        search: Optional[str] = None,
        active_only: bool = True,
    ) -> SuppressedFindingsPageResponse:
        """5.6 Suppressed Findings with expiration dates and reason filters."""
        items = list(cls._suppressions)

        if active_only:
            items = [s for s in items if s.status == "Active"]

        if reason and reason != "All Reasons":
            items = [s for s in items if s.reason.lower() == reason.lower()]

        if resource and resource != "All Resources":
            items = [s for s in items if s.resource.lower() == resource.lower()]

        if search:
            q = search.lower().strip()
            items = [
                s for s in items
                if q in s.finding.lower()
                or q in s.resource.lower()
                or q in s.reason.lower()
                or q in s.suppressed_by.lower()
            ]

        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = items[start:end]

        unique_resources = ["All Resources"] + sorted(list({s.resource for s in cls._suppressions}))

        return SuppressedFindingsPageResponse(
            items=page_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            resources=unique_resources,
        )

    @classmethod
    def update_suppression(cls, suppression_id: str, req: UpdateSuppressionRequest) -> SuppressedFindingItem:
        """5.6 Edit suppression: update reason, expiration date, or revoke."""
        supp = next((s for s in cls._suppressions if s.id == suppression_id), None)
        if not supp:
            # Check by finding or resource name
            supp = next((s for s in cls._suppressions if suppression_id in s.finding or suppression_id in s.resource), None)

        if not supp:
            raise ValueError(f"Suppression not found: {suppression_id}")

        now_str = datetime.now().strftime("%b %d, %H:%M")

        if req.reason:
            supp.reason = req.reason
        if req.expires_at:
            supp.expires_at = req.expires_at
        if req.status:
            supp.status = req.status
            if req.status.lower() == "revoked":
                cls._activities.insert(
                    0,
                    RemediationActivityItem(
                        id=f"ACT-{len(cls._activities) + 1:03d}",
                        timestamp=now_str,
                        action="Unsuppressed",
                        finding=supp.finding,
                        resource=supp.resource,
                        user="mayur.bhanvad",
                        details=f"Revoked suppression for {supp.finding} on {supp.resource}",
                    ),
                )

        return supp

    @classmethod
    def get_activity(
        cls,
        page: int = 1,
        page_size: int = 10,
        action: Optional[str] = None,
        user: Optional[str] = None,
        search: Optional[str] = None,
    ) -> RemediationActivityPageResponse:
        """5.7 Remediation Activity feed with action and user filters."""
        items = list(cls._activities)

        if action and action != "All Actions":
            items = [a for a in items if a.action.lower() == action.lower()]

        if user and user != "All Users":
            items = [a for a in items if a.user.lower() == user.lower()]

        if search:
            q = search.lower().strip()
            items = [
                a for a in items
                if q in a.finding.lower()
                or q in a.resource.lower()
                or q in a.action.lower()
                or q in a.user.lower()
                or (a.details and q in a.details.lower())
            ]

        total = len(items)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = items[start:end]

        return RemediationActivityPageResponse(
            items=page_items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_settings(cls) -> RemediationSettingsDTO:
        """5.8 Get Remediation Settings."""
        return cls._settings

    @classmethod
    def update_settings(cls, req: UpdateRemediationSettingsRequest) -> RemediationSettingsDTO:
        """5.8 Update Remediation Settings."""
        d = req.model_dump(exclude_unset=True)
        for k, v in d.items():
            if hasattr(cls._settings, k) and v is not None:
                setattr(cls._settings, k, v)
        return cls._settings

    @classmethod
    def reset_settings(cls) -> RemediationSettingsDTO:
        """5.8 Reset Remediation Settings to factory defaults."""
        cls._settings = RemediationSettingsDTO()
        return cls._settings
