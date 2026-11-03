"""
IaC Rule Detail Suite Service — Section 7: Screens 7.1 through 7.8
Authoritative business logic and persistent state for Rule Detail, Definition,
AST Logic, Severity & Risk, Framework Mappings, Affected Resources, Exceptions,
and Rule Version History.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.schemas.iac_rule_detail_suite import (
    RuleDetailOverviewResponse,
    RuleDetailKpis,
    RuleInformation,
    RuleDefinitionResponse,
    RuleReferenceLink,
    RuleLogicResponse,
    RuleLogicEngineSpec,
    RuleRiskDetailsResponse,
    RiskTrendMonth,
    RuleFrameworkMappingsResponse,
    ComplianceMappingItem,
    RelatedRequirementDTO,
    AffectedResourcesPageResponse,
    AffectedResourcesKpis,
    AffectedResourceItem,
    RuleExceptionsPageResponse,
    RuleExceptionsKpis,
    RuleExceptionItem,
    CreateRuleExceptionRequest,
    RuleHistoryResponse,
    RuleHistoryItem,
    TriggerRuleScanResponse,
)


class IaCRuleDetailSuiteService:
    """Service providing stateful operations and deterministic data for Rule Detail Suite."""

    # In-memory store for active exceptions per rule
    _exceptions_store: Dict[str, List[Dict[str, Any]]] = {
        "IAC-AWS-001": [
            {
                "id": "exc-001",
                "rule_id": "IAC-AWS-001",
                "resource": "logs-bucket",
                "reason": "Temporary public access for testing",
                "expires_at": "Oct 15, 2026",
                "status": "Active",
                "created_at": "Sep 20, 2026",
                "created_by": "mayur.bhanvad",
            },
            {
                "id": "exc-002",
                "rule_id": "IAC-AWS-001",
                "resource": "website-content",
                "reason": "Required for static website hosting",
                "expires_at": "Nov 01, 2026",
                "status": "Active",
                "created_at": "Sep 22, 2026",
                "created_by": "mayur.bhanvad",
            },
            {
                "id": "exc-003",
                "rule_id": "IAC-AWS-001",
                "resource": "test-sandbox-bucket",
                "reason": "Developer evaluation sandbox",
                "expires_at": "Sep 01, 2026",
                "status": "Expired",
                "created_at": "Aug 15, 2026",
                "created_by": "system",
            },
        ]
    }

    # Baseline resources matching Screen 7.6
    _resources_db: List[Dict[str, Any]] = [
        {
            "id": "res-1",
            "resource": "my-public-bucket",
            "resource_type": "aws_s3_bucket",
            "environment": "production",
            "region": "ap-south-1",
            "status": "Failed",
            "last_seen": "Sep 28, 10:12",
        },
        {
            "id": "res-2",
            "resource": "logs-bucket",
            "resource_type": "aws_s3_bucket",
            "environment": "staging",
            "region": "ap-south-1",
            "status": "Failed",
            "last_seen": "Sep 28, 08:43",
        },
        {
            "id": "res-3",
            "resource": "assets-bucket",
            "resource_type": "aws_s3_bucket",
            "environment": "production",
            "region": "us-east-1",
            "status": "Failed",
            "last_seen": "Sep 28, 02:15",
        },
        {
            "id": "res-4",
            "resource": "backup-bucket",
            "resource_type": "aws_s3_bucket",
            "environment": "dev",
            "region": "ap-south-1",
            "status": "Failed",
            "last_seen": "Sep 27, 11:34",
        },
        {
            "id": "res-5",
            "resource": "data-bucket",
            "resource_type": "aws_s3_bucket",
            "environment": "dev",
            "region": "us-west-2",
            "status": "Passed",
            "last_seen": "Sep 27, 09:21",
        },
        {
            "id": "res-6",
            "resource": "cloudtrail-logs",
            "resource_type": "aws_s3_bucket",
            "environment": "production",
            "region": "ap-south-1",
            "status": "Passed",
            "last_seen": "Sep 26, 09:18",
        },
        {
            "id": "res-7",
            "resource": "terraform-state",
            "resource_type": "aws_s3_bucket",
            "environment": "production",
            "region": "us-east-1",
            "status": "Passed",
            "last_seen": "Sep 25, 04:32",
        },
        {
            "id": "res-8",
            "resource": "website-content",
            "resource_type": "aws_s3_bucket",
            "environment": "staging",
            "region": "us-east-1",
            "status": "Failed",
            "last_seen": "Sep 24, 10:11",
        },
        {
            "id": "res-9",
            "resource": "app-uploads",
            "resource_type": "aws_s3_bucket",
            "environment": "qa",
            "region": "ap-south-1",
            "status": "Failed",
            "last_seen": "Sep 24, 09:05",
        },
        {
            "id": "res-10",
            "resource": "media-bucket",
            "resource_type": "aws_s3_bucket",
            "environment": "qa",
            "region": "us-west-2",
            "status": "Passed",
            "last_seen": "Sep 23, 03:18",
        },
    ]

    # Baseline rule history matching Screen 7.8
    _history_db: List[Dict[str, Any]] = [
        {
            "version": "v2.3.0",
            "date": "Sep 25, 2026",
            "changes": "Updated logic to include block_public_policy check",
            "updated_by": "mayur.bhanvad",
        },
        {
            "version": "v2.2.0",
            "date": "Aug 14, 2026",
            "changes": "Added support for CloudFormation",
            "updated_by": "system",
        },
        {
            "version": "v2.1.0",
            "date": "Jul 03, 2026",
            "changes": "Updated remediation guidance",
            "updated_by": "mayur.bhanvad",
        },
        {
            "version": "v2.0.0",
            "date": "May 20, 2026",
            "changes": "Added NIST and PCI DSS mappings",
            "updated_by": "system",
        },
        {
            "version": "v1.1.0",
            "date": "Mar 11, 2026",
            "changes": "Improved rule logic for ACL check",
            "updated_by": "mayur.bhanvad",
        },
        {
            "version": "v1.0.0",
            "date": "Jan 15, 2026",
            "changes": "Initial version",
            "updated_by": "system",
        },
    ]

    @classmethod
    def get_overview(cls, rule_id: str) -> RuleDetailOverviewResponse:
        """7.1 Rule Detail - Overview Screen with 4 KPIs and Rule Information."""
        rule_name = "S3 bucket should not allow public access" if "AWS" in rule_id.upper() or "001" in rule_id else f"IaC Security Policy for {rule_id}"
        return RuleDetailOverviewResponse(
            rule_id=rule_id,
            rule_name=rule_name,
            severity="Critical",
            description="Detects S3 buckets with public access (block public access disabled or public ACL/policy).",
            kpis=RuleDetailKpis(
                total_findings=24,
                open_findings=18,
                resolved_findings=5,
                suppressed_findings=1,
            ),
            rule_info=RuleInformation(
                rule_id=rule_id,
                rule_name=rule_name,
                category="Storage",
                provider="AWS",
                service="S3",
                severity="Critical",
                rule_type="Misconfiguration",
                frameworks=["CIS AWS", "NIST 800-53", "PCI DSS"],
                status="Enabled",
                last_updated="Sep 25, 2026, 10:14 AM",
                version="v2.3.0",
            ),
        )

    @classmethod
    def get_definition(cls, rule_id: str) -> RuleDefinitionResponse:
        """7.2 Rule Definition Screen (Title, Description, Rationale, Impact, Recommendation, References, Labels)."""
        rule_name = "S3 bucket should not allow public access" if "AWS" in rule_id.upper() or "001" in rule_id else f"IaC Security Policy for {rule_id}"
        return RuleDefinitionResponse(
            rule_id=rule_id,
            title=rule_name,
            description="Checks if an S3 bucket is publicly accessible through block public access settings, bucket policy or ACL.",
            rationale="Public S3 buckets can lead to data leaks and unauthorized access to sensitive information.",
            impact="Sensitive data exposure, compliance violation, potential financial and reputational risk.",
            recommendation="Enable block public access and remove any public ACLs or policies.",
            references=[
                RuleReferenceLink(
                    title="AWS S3 Block Public Access",
                    url="https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html",
                ),
                RuleReferenceLink(
                    title="CIS AWS Benchmark v1.5.0 (3.1)",
                    url="https://www.cisecurity.org/benchmark/amazon_web_services",
                ),
                RuleReferenceLink(
                    title="NIST 800-53 SC-28",
                    url="https://csrc.nist.gov/projects/cprt/catalog#/cprt/framework/version/SP_800_53_5_1_1/home?element=SC-28",
                ),
                RuleReferenceLink(
                    title="PCI DSS 4.0 (1.2.1)",
                    url="https://www.pcisecuritystandards.org/",
                ),
            ],
            labels=["aws", "s3", "public-access", "misconfiguration", "critical"],
        )

    @classmethod
    def get_logic(cls, rule_id: str) -> RuleLogicResponse:
        """7.3 Rule Logic AST Detection Logic & Test Resource (Checkov, CloudFormation, Crossplane, Others)."""
        checkov_ast = (
            "metadata:\n"
            f"  id: {rule_id}\n"
            "  name: S3 bucket should not allow public access\n"
            "  category: AWS\n"
            "  severity: CRITICAL\n"
            "  description: |\n"
            "    Ensure S3 bucket does not allow public access\n\n"
            "resource_types:\n"
            "  - aws_s3_bucket\n\n"
            "checks:\n"
            "  - condition: |\n"
            "      not block_public_acls == false\n"
            "      and not block_public_policy == false\n"
            "      and not ignore_public_acls == false\n"
            "      and not restrict_public_buckets == false\n"
            '    error_message: "S3 bucket allows public access."'
        )

        terraform_test = (
            'resource "aws_s3_bucket" "example" {\n'
            '  bucket = "my-public-bucket"\n'
            '  acl    = "public-read"\n'
            "}"
        )

        cloudformation_ast = (
            "Type: AWS::S3::Bucket\n"
            "Properties:\n"
            "  PublicAccessBlockConfiguration:\n"
            "    BlockPublicAcls: true\n"
            "    BlockPublicPolicy: true\n"
            "    IgnorePublicAcls: true\n"
            "    RestrictPublicBuckets: true"
        )

        cfn_test = (
            "Resources:\n"
            "  VulnerableBucket:\n"
            "    Type: AWS::S3::Bucket\n"
            "    Properties:\n"
            "      AccessControl: PublicRead"
        )

        crossplane_ast = (
            "apiVersion: s3.aws.upbound.io/v1beta1\n"
            "kind: BucketPublicAccessBlock\n"
            "metadata:\n"
            "  name: secure-s3-block\n"
            "spec:\n"
            "  forProvider:\n"
            "    blockPublicAcls: true\n"
            "    blockPublicPolicy: true\n"
            "    ignorePublicAcls: true\n"
            "    restrictPublicBuckets: true"
        )

        crossplane_test = (
            "apiVersion: s3.aws.upbound.io/v1beta1\n"
            "kind: Bucket\n"
            "metadata:\n"
            "  name: public-bucket\n"
            "spec:\n"
            "  forProvider:\n"
            '    acl: "public-read"'
        )

        engines = [
            RuleLogicEngineSpec(
                engine_id="terraform_checkov",
                engine_label="Terraform (Checkov)",
                format="yaml",
                ast_code=checkov_ast,
                test_resource_type="Terraform",
                test_resource_code=terraform_test,
            ),
            RuleLogicEngineSpec(
                engine_id="cloudformation",
                engine_label="CloudFormation",
                format="yaml",
                ast_code=cloudformation_ast,
                test_resource_type="CloudFormation",
                test_resource_code=cfn_test,
            ),
            RuleLogicEngineSpec(
                engine_id="kubernetes_crossplane",
                engine_label="Kubernetes (Crossplane)",
                format="yaml",
                ast_code=crossplane_ast,
                test_resource_type="Kubernetes",
                test_resource_code=crossplane_test,
            ),
            RuleLogicEngineSpec(
                engine_id="others",
                engine_label="Others",
                format="yaml",
                ast_code=(
                    f"# Generic Open Policy Agent (OPA) / Rego AST Specification\n"
                    f"package rules.iac.{rule_id.lower().replace('-', '_')}\n\n"
                    "default allow = false\n\n"
                    "allow {\n"
                    "  input.resource_type == \"aws_s3_bucket\"\n"
                    "  input.properties.public_access_block.block_public_acls == true\n"
                    "}"
                ),
                test_resource_type="Terraform",
                test_resource_code=terraform_test,
            ),
        ]

        return RuleLogicResponse(
            rule_id=rule_id,
            active_engine="terraform_checkov",
            engines=engines,
        )

    @classmethod
    def get_risk(cls, rule_id: str) -> RuleRiskDetailsResponse:
        """7.4 Severity & Risk Screen (Risk details, CVSS, Risk factors checklist, Risk trend chart)."""
        return RuleRiskDetailsResponse(
            rule_id=rule_id,
            severity="Critical",
            severity_description="This misconfiguration can expose sensitive data to the public internet.",
            likelihood="High",
            impact="High",
            risk_score=9.2,
            cvss_score=8.6,
            cvss_rating="High",
            data_sensitivity="Confidential / Sensitive",
            business_impact="Data leak, compliance violation, fines",
            exploitability="Easy (if public access enabled)",
            risk_factors=[
                "Bucket is publicly accessible",
                "Contains sensitive or regulated data",
                "No access logging enabled",
                "Used in production environment",
            ],
            risk_trend=[
                RiskTrendMonth(month="Apr", value=30),
                RiskTrendMonth(month="May", value=24),
                RiskTrendMonth(month="Jun", value=20),
                RiskTrendMonth(month="Jul", value=16),
                RiskTrendMonth(month="Aug", value=12),
                RiskTrendMonth(month="Sep", value=10),
            ],
        )

    @classmethod
    def get_mappings(cls, rule_id: str) -> RuleFrameworkMappingsResponse:
        """7.5 Framework Mappings Screen (Compliance Framework Mappings table + Related Requirements card)."""
        mappings = [
            ComplianceMappingItem(
                id="map-1",
                framework="CIS AWS",
                control_id="3.1",
                control_name="Ensure S3 buckets are not public",
                status="Mapped",
            ),
            ComplianceMappingItem(
                id="map-2",
                framework="NIST 800-53",
                control_id="SC-28",
                control_name="Protection of Information at Rest",
                status="Mapped",
            ),
            ComplianceMappingItem(
                id="map-3",
                framework="PCI DSS",
                control_id="1.2.1",
                control_name="Restrict inbound and outbound traffic",
                status="Mapped",
            ),
            ComplianceMappingItem(
                id="map-4",
                framework="ISO 27001",
                control_id="A.8.2.3",
                control_name="Information access restriction",
                status="Mapped",
            ),
            ComplianceMappingItem(
                id="map-5",
                framework="SOC 2",
                control_id="CC6.1",
                control_name="Logical and physical access controls",
                status="Mapped",
            ),
        ]

        related = RelatedRequirementDTO(
            framework="CIS AWS Benchmark v1.5.0",
            control_id="3.1",
            title="Ensure S3 buckets are not public",
            description="3.1 Ensure S3 buckets are not public. S3 buckets should have block public access enabled and should not allow public ACLs or policies.",
            requirement_url="https://www.cisecurity.org/benchmark/amazon_web_services",
        )

        return RuleFrameworkMappingsResponse(
            rule_id=rule_id,
            mappings=mappings,
            related_requirement=related,
        )

    @classmethod
    def get_resources(
        cls,
        rule_id: str,
        status: Optional[str] = None,
        environment: Optional[str] = None,
        region: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> AffectedResourcesPageResponse:
        """7.6 Affected Resources Screen with multi-filters and pagination."""
        items = list(cls._resources_db)

        if status and status != "All Statuses":
            items = [r for r in items if r["status"].lower() == status.lower()]
        if environment and environment != "All Environments":
            items = [r for r in items if r["environment"].lower() == environment.lower()]
        if region and region != "All Regions":
            items = [r for r in items if r["region"].lower() == region.lower()]
        if search:
            s = search.lower()
            items = [
                r for r in items
                if s in r["resource"].lower()
                or s in r["resource_type"].lower()
                or s in r["environment"].lower()
                or s in r["region"].lower()
            ]

        total = len(items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = items[start_idx:end_idx]

        total_pages = max(1, (total + page_size - 1) // page_size)

        return AffectedResourcesPageResponse(
            kpis=AffectedResourcesKpis(
                total_resources=24,
                non_compliant=18,
                compliant=5,
                suppressed=1,
            ),
            items=[AffectedResourceItem(**item) for item in paginated],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            environments=["All Environments", "production", "staging", "dev", "qa"],
            regions=["All Regions", "ap-south-1", "us-east-1", "us-west-2"],
            statuses=["All Statuses", "Failed", "Passed"],
        )

    @classmethod
    def get_exceptions(
        cls,
        rule_id: str,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> RuleExceptionsPageResponse:
        """7.7 Exceptions Screen with active, expired counts and search."""
        items = cls._exceptions_store.get(rule_id, cls._exceptions_store.get("IAC-AWS-001", []))

        filtered = list(items)
        if status and status != "All Statuses":
            filtered = [e for e in filtered if e["status"].lower() == status.lower()]
        if search:
            s = search.lower()
            filtered = [
                e for e in filtered
                if s in e["resource"].lower()
                or s in e["reason"].lower()
                or s in e["created_by"].lower()
            ]

        active_count = sum(1 for e in items if e["status"] == "Active")
        expired_count = sum(1 for e in items if e["status"] == "Expired")
        pending_count = sum(1 for e in items if e["status"] == "Pending Review")

        return RuleExceptionsPageResponse(
            kpis=RuleExceptionsKpis(
                active_exceptions=active_count,
                expired=expired_count,
                pending_review=pending_count,
            ),
            items=[RuleExceptionItem(**e) for e in filtered],
            total=len(filtered),
        )

    @classmethod
    def create_exception(cls, rule_id: str, payload: CreateRuleExceptionRequest) -> RuleExceptionItem:
        """Add exception to the rule's active exception registry."""
        if rule_id not in cls._exceptions_store:
            cls._exceptions_store[rule_id] = []

        new_id = f"exc-{uuid.uuid4().hex[:6]}"
        now_str = datetime.now().strftime("%b %d, %Y")

        new_record = {
            "id": new_id,
            "rule_id": rule_id,
            "resource": payload.resource,
            "reason": payload.reason,
            "expires_at": payload.expires_at,
            "status": "Active",
            "created_at": now_str,
            "created_by": "devsecops-admin",
        }

        cls._exceptions_store[rule_id].insert(0, new_record)
        return RuleExceptionItem(**new_record)

    @classmethod
    def delete_exception(cls, rule_id: str, exception_id: str) -> Dict[str, Any]:
        """Revoke / delete an active exception."""
        items = cls._exceptions_store.get(rule_id, cls._exceptions_store.get("IAC-AWS-001", []))
        before_count = len(items)
        cls._exceptions_store[rule_id] = [e for e in items if e["id"] != exception_id]
        deleted = len(cls._exceptions_store[rule_id]) < before_count
        return {
            "success": deleted,
            "rule_id": rule_id,
            "exception_id": exception_id,
            "message": f"Exception {exception_id} revoked successfully" if deleted else "Exception not found",
        }

    @classmethod
    def get_history(cls, rule_id: str) -> RuleHistoryResponse:
        """7.8 Rule History Screen with versions v2.3.0 through v1.0.0."""
        return RuleHistoryResponse(
            rule_id=rule_id,
            items=[RuleHistoryItem(**item) for item in cls._history_db],
        )

    @classmethod
    def trigger_scan(cls, rule_id: str, environment: str = "production") -> TriggerRuleScanResponse:
        """Trigger scan for this rule across repositories."""
        scan_id = f"scan-job-{uuid.uuid4().hex[:8]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        return TriggerRuleScanResponse(
            rule_id=rule_id,
            scan_job_id=scan_id,
            status="QUEUED",
            started_at=now_str,
            message=f"Rule scan triggered for {rule_id} across {environment} resources.",
        )
