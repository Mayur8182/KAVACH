"""
IaC Findings Suite Service (Section 2: Screens 2.1 through 2.8)
Deterministic business logic and persistent state for the Section 2 Findings Suite.
"""

from typing import Dict, List, Optional
import math
from app.schemas.iac_findings_suite import (
    IaCFindingsKpis,
    IaCFindingsTrendPoint,
    IaCTopAffectedResourceItem,
    IaCTopCategoryCountItem,
    IaCFindingsOverviewResponse,
    IaCFindingRowItem,
    IaCFindingsAllResponse,
    IaCProviderCountItem,
    IaCFindingsByProviderResponse,
    IaCSeverityCountItem,
    IaCFindingsBySeverityResponse,
    IaCCategoryRowItem,
    IaCFindingsByCategoryResponse,
    IaCFrameworkCountItem,
    IaCFrameworkRuleRowItem,
    IaCFindingsByFrameworkResponse,
    IaCEnvironmentCountItem,
    IaCFindingsByEnvironmentResponse,
    ExportFindingsRequest,
    ExportFindingsResponse,
    FindingEvidenceSnippet,
    FindingRemediationGuidance,
    FindingCommentItem,
    FindingActivityItem,
    IaCFindingDetailResponse,
    AssignFindingRequest,
    CommentFindingRequest,
    RemediateFindingRequest,
    IaCFindingsTriageItem,
    IaCFindingsTriageResponse,
    BulkFindingActionRequest,
    IaCProviderTrendCount,
    IaCEnvironmentTrendPct,
    IaCFindingsTrendsResponse,
    IaCResourceFindingsRowItem,
    IaCFindingsByResourceResponse,
    IaCFrameworkSummaryRowItem,
    IaCFindingsByFrameworkSummaryResponse,
    ExportFindingsAdvancedRequest,
    ScheduledReportItem,
    ScheduledReportCreateRequest,
    ReportHistoryItem,
)

# ── Persistent Store for Findings Suite ──────────────────────────────────────────
_FINDINGS_SUITE_STORE: List[Dict] = [
    {
        "id": "FND-328",
        "title": "S3 bucket allows public access",
        "severity": "Critical",
        "resource": "aws_s3_bucket",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Access Control",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 30, 10:12",
    },
    {
        "id": "FND-327",
        "title": "Overly permissive IAM policy",
        "severity": "High",
        "resource": "aws_iam_policy",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Identity & Permissions",
        "environment": "Production",
        "status": "In Progress",
        "detected_at": "Sep 30, 08:45",
    },
    {
        "id": "FND-326",
        "title": "Unencrypted RDS instance",
        "severity": "Critical",
        "resource": "aws_db_instance",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Encryption",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 29, 19:22",
    },
    {
        "id": "FND-325",
        "title": "Security group allows 0.0.0.0/0",
        "severity": "Critical",
        "resource": "aws_security_group",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Network Security",
        "environment": "Staging",
        "status": "Resolved",
        "detected_at": "Sep 29, 16:11",
    },
    {
        "id": "FND-324",
        "title": "Container runs as root",
        "severity": "Medium",
        "resource": "kubernetes_deployment",
        "provider": "Kubernetes",
        "framework": "NIST 800-53",
        "category": "Configuration Management",
        "environment": "Development",
        "status": "Open",
        "detected_at": "Sep 28, 14:33",
    },
    {
        "id": "FND-323",
        "title": "Missing resource tags",
        "severity": "Low",
        "resource": "aws_instance",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Other",
        "environment": "Production",
        "status": "In Progress",
        "detected_at": "Sep 28, 11:20",
    },
    {
        "id": "FND-322",
        "title": "Open ALB to Internet",
        "severity": "High",
        "resource": "aws_lb",
        "provider": "AWS",
        "framework": "PCI DSS",
        "category": "Network Security",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 27, 09:12",
    },
    {
        "id": "FND-321",
        "title": "No logging enabled",
        "severity": "Low",
        "resource": "aws_s3_bucket",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Logging & Monitoring",
        "environment": "Staging",
        "status": "Resolved",
        "detected_at": "Sep 27, 08:45",
    },
    {
        "id": "FND-320",
        "title": "Outdated AMI",
        "severity": "Medium",
        "resource": "aws_instance",
        "provider": "AWS",
        "framework": "NIST 800-53",
        "category": "Vulnerability Management",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 26, 17:30",
    },
    {
        "id": "FND-319",
        "title": "Overprivileged role",
        "severity": "High",
        "resource": "aws_iam_role",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Identity & Permissions",
        "environment": "Development",
        "status": "Open",
        "detected_at": "Sep 26, 11:18",
    },
    {
        "id": "FND-318",
        "title": "Unrestricted EFS access",
        "severity": "Medium",
        "resource": "aws_efs_volume",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Access Control",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 25, 14:10",
    },
    {
        "id": "FND-311",
        "title": "Root account usage",
        "severity": "Critical",
        "resource": "aws_iam_user",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Identity & Permissions",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 24, 09:30",
    },
    {
        "id": "FND-298",
        "title": "Privileged container",
        "severity": "Critical",
        "resource": "kubernetes_deployment",
        "provider": "Kubernetes",
        "framework": "NIST 800-53",
        "category": "Configuration Management",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 23, 16:20",
    },
    {
        "id": "FND-287",
        "title": "Public ALB",
        "severity": "High",
        "resource": "aws_lb",
        "provider": "AWS",
        "framework": "PCI DSS",
        "category": "Network Security",
        "environment": "Staging",
        "status": "In Progress",
        "detected_at": "Sep 22, 11:00",
    },
    {
        "id": "FND-276",
        "title": "Unrestricted S3 bucket policy",
        "severity": "Critical",
        "resource": "aws_s3_bucket",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Access Control",
        "environment": "Production",
        "status": "Resolved",
        "detected_at": "Sep 21, 15:40",
    },
    {
        "id": "FND-255",
        "title": "Open database access",
        "severity": "Critical",
        "resource": "aws_db_instance",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Network Security",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 20, 10:15",
    },
    {
        "id": "FND-244",
        "title": "Privileged IAM role",
        "severity": "High",
        "resource": "aws_iam_role",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Identity & Permissions",
        "environment": "Development",
        "status": "Open",
        "detected_at": "Sep 19, 14:05",
    },
    {
        "id": "FND-233",
        "title": "Public CloudFront distro",
        "severity": "Medium",
        "resource": "aws_cloudfront",
        "provider": "AWS",
        "framework": "PCI DSS",
        "category": "Network Security",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 18, 08:50",
    },
    {
        "id": "FND-221",
        "title": "Metadata exposed",
        "severity": "Critical",
        "resource": "aws_instance",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Configuration Management",
        "environment": "QA",
        "status": "Open",
        "detected_at": "Sep 17, 12:35",
    },
    {
        "id": "FND-199",
        "title": "No encryption on EBS volume",
        "severity": "High",
        "resource": "aws_ebs_volume",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Encryption",
        "environment": "Staging",
        "status": "In Progress",
        "detected_at": "Sep 16, 17:15",
    },
    {
        "id": "FND-176",
        "title": "Public ALB endpoint",
        "severity": "Medium",
        "resource": "aws_lb",
        "provider": "AWS",
        "framework": "PCI DSS",
        "category": "Network Security",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 15, 13:00",
    },
    {
        "id": "FND-158",
        "title": "Missing required security tags",
        "severity": "Low",
        "resource": "aws_instance",
        "provider": "AWS",
        "framework": "CIS AWS",
        "category": "Other",
        "environment": "Production",
        "status": "Resolved",
        "detected_at": "Sep 14, 11:20",
    },
    {
        "id": "FND-140",
        "title": "Azure storage account public access",
        "severity": "Critical",
        "resource": "azurerm_storage_account",
        "provider": "Azure",
        "framework": "ISO 27001",
        "category": "Access Control",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 13, 10:05",
    },
    {
        "id": "FND-125",
        "title": "GCP Cloud Storage bucket publicly readable",
        "severity": "High",
        "resource": "google_storage_bucket",
        "provider": "GCP",
        "framework": "NIST 800-53",
        "category": "Access Control",
        "environment": "Production",
        "status": "Open",
        "detected_at": "Sep 12, 14:40",
    },
    {
        "id": "FND-110",
        "title": "Kubernetes service exposed via NodePort",
        "severity": "Medium",
        "resource": "kubernetes_service",
        "provider": "Kubernetes",
        "framework": "NIST 800-53",
        "category": "Network Security",
        "environment": "QA",
        "status": "Open",
        "detected_at": "Sep 11, 09:15",
    },
]


class IaCFindingsSuiteService:
    """Service handling all Section 2 business operations."""

    @classmethod
    def get_overview(cls, time_range: str = "Last 30 days") -> IaCFindingsOverviewResponse:
        total_findings = len(_FINDINGS_SUITE_STORE)
        sev_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        stat_counts = {"Open": 0, "In Progress": 0, "Resolved": 0, "Suppressed": 0}
        res_map: Dict[str, int] = {}
        cat_map: Dict[str, int] = {}

        for f in _FINDINGS_SUITE_STORE:
            s = f.get("severity", "").capitalize()
            if s in sev_counts:
                sev_counts[s] += 1
            st = f.get("status", "Open")
            if st in stat_counts:
                stat_counts[st] += 1
            else:
                stat_counts[st] = stat_counts.get(st, 0) + 1
            res = f.get("resource", "unknown")
            res_map[res] = res_map.get(res, 0) + 1
            cat = f.get("category", "Other")
            cat_map[cat] = cat_map.get(cat, 0) + 1

        kpis = IaCFindingsKpis(
            total_findings=total_findings,
            critical=sev_counts["Critical"],
            high=sev_counts["High"],
            medium=sev_counts["Medium"],
            low=sev_counts["Low"],
        )

        trend = [
            IaCFindingsTrendPoint(date="Sep 01", critical=max(1, sev_counts["Critical"] // 5), high=max(1, sev_counts["High"] // 5), medium=max(1, sev_counts["Medium"] // 5), low=max(1, sev_counts["Low"] // 5)),
            IaCFindingsTrendPoint(date="Sep 05", critical=max(1, sev_counts["Critical"] // 4), high=max(1, sev_counts["High"] // 4), medium=max(1, sev_counts["Medium"] // 4), low=max(1, sev_counts["Low"] // 4)),
            IaCFindingsTrendPoint(date="Sep 10", critical=max(1, sev_counts["Critical"] // 3), high=max(1, sev_counts["High"] // 3), medium=max(1, sev_counts["Medium"] // 3), low=max(1, sev_counts["Low"] // 3)),
            IaCFindingsTrendPoint(date="Sep 15", critical=max(1, sev_counts["Critical"] // 2), high=max(1, sev_counts["High"] // 2), medium=max(1, sev_counts["Medium"] // 2), low=max(1, sev_counts["Low"] // 2)),
            IaCFindingsTrendPoint(date="Sep 30", critical=sev_counts["Critical"], high=sev_counts["High"], medium=sev_counts["Medium"], low=sev_counts["Low"]),
        ]

        top_resources = [
            IaCTopAffectedResourceItem(resource=r, count=c)
            for r, c in sorted(res_map.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        top_categories = [
            IaCTopCategoryCountItem(category=c, count=cnt)
            for c, cnt in sorted(cat_map.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        return IaCFindingsOverviewResponse(
            kpis=kpis,
            trend=trend,
            severity_breakdown=sev_counts,
            status_breakdown=stat_counts,
            top_affected_resources=top_resources,
            top_findings_by_category=top_categories,
        )

    @classmethod
    def get_all(
        cls,
        severity: Optional[str] = None,
        provider: Optional[str] = None,
        framework: Optional[str] = None,
        status: Optional[str] = None,
        environment: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsAllResponse:
        filtered = list(_FINDINGS_SUITE_STORE)

        if severity and severity != "All Severities" and severity != "All":
            filtered = [f for f in filtered if f["severity"].lower() == severity.lower()]
        if provider and provider != "All Providers" and provider != "All":
            filtered = [f for f in filtered if f["provider"].lower() == provider.lower()]
        if framework and framework != "All Frameworks" and framework != "All":
            filtered = [f for f in filtered if f["framework"].lower() == framework.lower()]
        if status and status != "All Statuses" and status != "All":
            filtered = [f for f in filtered if f["status"].lower() == status.lower()]
        if environment and environment != "All Environments" and environment != "All":
            filtered = [f for f in filtered if f.get("environment", "").lower() == environment.lower()]
        if category and category != "All Categories" and category != "All":
            filtered = [f for f in filtered if f.get("category", "").lower() == category.lower()]
        if search:
            s = search.lower()
            filtered = [
                f
                for f in filtered
                if s in f["title"].lower()
                or s in f["id"].lower()
                or s in f["resource"].lower()
            ]

        total = len(filtered)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = filtered[start_idx:end_idx]

        return IaCFindingsAllResponse(
            items=[IaCFindingRowItem(**item) for item in sliced],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_by_provider(
        cls,
        provider: str = "AWS",
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsByProviderResponse:
        prov_counts: Dict[str, int] = {}
        for f in _FINDINGS_SUITE_STORE:
            p = f.get("provider", "Others")
            prov_counts[p] = prov_counts.get(p, 0) + 1
        for default_p in ["AWS", "Kubernetes", "Azure", "GCP", "Others"]:
            prov_counts.setdefault(default_p, 0)

        providers = [
            IaCProviderCountItem(provider=p, count=c)
            for p, c in sorted(prov_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        filtered = [f for f in _FINDINGS_SUITE_STORE if f.get("provider", "").lower() == provider.lower()]
        if search:
            s = search.lower()
            filtered = [
                f
                for f in filtered
                if s in f["title"].lower()
                or s in f["id"].lower()
                or s in f["resource"].lower()
            ]

        total = len(filtered)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = filtered[start_idx:end_idx]

        return IaCFindingsByProviderResponse(
            providers=providers,
            active_provider=provider,
            items=[IaCFindingRowItem(**item) for item in sliced],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_by_severity(
        cls,
        severity: str = "Critical",
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsBySeverityResponse:
        sev_counts: Dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for f in _FINDINGS_SUITE_STORE:
            s = f.get("severity", "").capitalize()
            if s in sev_counts:
                sev_counts[s] += 1

        severities = [
            IaCSeverityCountItem(severity=s, count=c)
            for s, c in sev_counts.items()
        ]

        filtered = [f for f in _FINDINGS_SUITE_STORE if f.get("severity", "").lower() == severity.lower()]
        if search:
            s = search.lower()
            filtered = [
                f
                for f in filtered
                if s in f["title"].lower()
                or s in f["id"].lower()
                or s in f["resource"].lower()
            ]

        total = len(filtered)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = filtered[start_idx:end_idx]

        return IaCFindingsBySeverityResponse(
            severities=severities,
            active_severity=severity,
            items=[IaCFindingRowItem(**item) for item in sliced],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_by_category(
        cls,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsByCategoryResponse:
        cat_map: Dict[str, Dict[str, int]] = {}
        for f in _FINDINGS_SUITE_STORE:
            c = f.get("category", "Other")
            if c not in cat_map:
                cat_map[c] = {"total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}
            cat_map[c]["total"] += 1
            sev = f.get("severity", "").lower()
            if sev in cat_map[c]:
                cat_map[c][sev] += 1

        all_categories = [
            IaCCategoryRowItem(
                category=cat,
                total=vals["total"],
                critical=vals["critical"],
                high=vals["high"],
                medium=vals["medium"],
                low=vals["low"],
            )
            for cat, vals in cat_map.items()
        ]
        all_categories.sort(key=lambda x: x.total, reverse=True)

        if search:
            s = search.lower()
            all_categories = [c for c in all_categories if s in c.category.lower()]

        total = len(all_categories)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = all_categories[start_idx:end_idx]

        return IaCFindingsByCategoryResponse(
            categories=sliced,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_by_framework(
        cls,
        framework: str = "CIS AWS",
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsByFrameworkResponse:
        fw_counts: Dict[str, int] = {}
        for f in _FINDINGS_SUITE_STORE:
            fw = f.get("framework", "Others")
            fw_counts[fw] = fw_counts.get(fw, 0) + 1
        for default_fw in ["CIS AWS", "NIST 800-53", "PCI DSS", "ISO 27001", "Others"]:
            fw_counts.setdefault(default_fw, 0)

        frameworks = [
            IaCFrameworkCountItem(framework=k, count=v)
            for k, v in sorted(fw_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        cis_rules = [
            IaCFrameworkRuleRowItem(rule_id="CIS-1.1", title="Ensure S3 buckets are not public", total=24, critical=8, high=10, medium=6, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-1.2", title="Enable MFA", total=18, critical=6, high=8, medium=4, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-2.1", title="Encrypt data at rest", total=16, critical=6, high=6, medium=4, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-3.1", title="Restrict public access", total=14, critical=4, high=6, medium=4, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-3.2", title="Use VPC endpoints", total=12, critical=4, high=4, medium=4, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-4.1", title="Enable logging", total=10, critical=4, high=4, medium=2, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-4.2", title="Monitor API activity", total=8, critical=2, high=4, medium=2, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-5.1", title="Regular backups", total=8, critical=2, high=4, medium=2, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-5.2", title="Disaster recovery plan", total=6, critical=0, high=4, medium=2, low=0),
            IaCFrameworkRuleRowItem(rule_id="CIS-6.1", title="Remove unused resources", total=4, critical=0, high=2, medium=2, low=0),
        ]

        filtered = cis_rules
        if search:
            s = search.lower()
            filtered = [r for r in filtered if s in r.title.lower() or s in r.rule_id.lower()]

        total = len(filtered)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = filtered[start_idx:end_idx]

        return IaCFindingsByFrameworkResponse(
            frameworks=frameworks,
            active_framework=framework,
            rules=sliced,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def get_by_environment(
        cls,
        environment: str = "Production",
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsByEnvironmentResponse:
        env_counts: Dict[str, int] = {}
        for f in _FINDINGS_SUITE_STORE:
            e = f.get("environment", "Unknown")
            env_counts[e] = env_counts.get(e, 0) + 1
        for default_e in ["Production", "Staging", "Development", "QA"]:
            env_counts.setdefault(default_e, 0)

        environments = [
            IaCEnvironmentCountItem(environment=k, count=v)
            for k, v in sorted(env_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        filtered = [f for f in _FINDINGS_SUITE_STORE if f.get("environment", "").lower() == environment.lower()]
        if search:
            s = search.lower()
            filtered = [
                f
                for f in filtered
                if s in f["title"].lower()
                or s in f["id"].lower()
                or s in f["resource"].lower()
            ]

        total = len(filtered)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = filtered[start_idx:end_idx]

        return IaCFindingsByEnvironmentResponse(
            environments=environments,
            active_environment=environment,
            items=[IaCFindingRowItem(**item) for item in sliced],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def export(cls, req: ExportFindingsRequest) -> ExportFindingsResponse:
        filtered = list(_FINDINGS_SUITE_STORE)
        if req.severity:
            filtered = [f for f in filtered if f["severity"].lower() == req.severity.lower()]
        if req.provider:
            filtered = [f for f in filtered if f["provider"].lower() == req.provider.lower()]

        if req.format.upper() == "CSV":
            lines = ["ID,Title,Severity,Resource,Provider,Framework,Environment,Status,DetectedAt"]
            for f in filtered:
                lines.append(
                    f'"{f["id"]}","{f["title"]}","{f["severity"]}","{f["resource"]}","{f["provider"]}","{f["framework"]}","{f["environment"]}","{f["status"]}","{f["detected_at"]}"'
                )
            content = "\n".join(lines)
            filename = "iac_findings_export.csv"
        else:
            import json
            content = json.dumps(filtered, indent=2)
            filename = "iac_findings_export.json"

        return ExportFindingsResponse(
            format=req.format.upper(),
            exported_count=len(filtered),
            download_content=content,
            filename=filename,
        )

    @classmethod
    def update_status(cls, finding_id: str, new_status: str) -> Optional[IaCFindingRowItem]:
        for f in _FINDINGS_SUITE_STORE:
            if f["id"].lower() == finding_id.lower():
                f["status"] = new_status
                try:
                    import asyncio
                    from app.core.database import AsyncSessionLocal
                    from app.models.scan import SecurityFinding
                    from sqlalchemy import update, or_

                    async def _persist():
                        async with AsyncSessionLocal() as session:
                            await session.execute(
                                update(SecurityFinding)
                                .where(or_(SecurityFinding.rule_id == finding_id, SecurityFinding.title == f.get("title")))
                                .values(status=new_status.upper())
                            )
                            await session.commit()

                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(_persist())
                    except RuntimeError:
                        pass
                except Exception:
                    pass
                return IaCFindingRowItem(**f)
        return None

    # ── 3.3 Finding Detail ────────────────────────────────────────────────────────

    @classmethod
    def get_finding_detail(cls, finding_id: str) -> Optional[IaCFindingDetailResponse]:
        target = None
        for f in _FINDINGS_SUITE_STORE:
            if f["id"].lower() == finding_id.lower():
                target = f
                break
        if not target:
            return None

        # Build evidence snippet
        evidence = FindingEvidenceSnippet(
            file_path=target.get("file_path", "terraform/modules/storage/s3.tf:14-26"),
            line_start=14,
            line_end=26,
            code_content=target.get(
                "code_snippet",
                'resource "aws_s3_bucket_public_access_block" "app" {\n'
                '  bucket = aws_s3_bucket.app.id\n\n'
                '  block_public_acls       = false\n'
                '  block_public_policy     = false\n'
                '  ignore_public_acls      = false\n'
                '  restrict_public_buckets = false\n'
                '}',
            ),
            diff_patch=target.get(
                "diff_patch",
                "@@ -16,4 +16,4 @@\n"
                "-  block_public_acls       = false\n"
                "-  block_public_policy     = false\n"
                "+  block_public_acls       = true\n"
                "+  block_public_policy     = true",
            ),
        )

        # Build remediation guidance
        remediation = FindingRemediationGuidance(
            summary=target.get(
                "remediation_summary",
                "Set block_public_acls, block_public_policy, ignore_public_acls, and restrict_public_buckets to true on aws_s3_bucket_public_access_block.",
            ),
            terraform_snippet=target.get(
                "remediation_terraform",
                'resource "aws_s3_bucket_public_access_block" "app" {\n'
                '  bucket = aws_s3_bucket.app.id\n\n'
                '  block_public_acls       = true\n'
                '  block_public_policy     = true\n'
                '  ignore_public_acls      = true\n'
                '  restrict_public_buckets = true\n'
                '}',
            ),
            steps=[
                "1. Enable S3 Block Public Access on bucket aws_s3_bucket.app",
                "2. Verify IAM bucket policy restricts anonymous Principal (*)",
                "3. Apply Terraform configuration with terraform apply",
                "4. Run IaC security scanner to confirm policy passes",
            ],
            applied=target.get("remediation_applied", False),
            pr_url=target.get("pr_url", None),
        )

        comments = [
            FindingCommentItem(**c)
            for c in target.get(
                "comments",
                [
                    {
                        "id": "c-1",
                        "author": "Security Bot",
                        "avatar": "SB",
                        "comment": f"Automated scanner detected finding {target['id']} via Checkov rule CKV_AWS_53.",
                        "created_at": "Sep 30, 2026, 10:15 AM",
                    }
                ],
            )
        ]

        activity = [
            FindingActivityItem(**a)
            for a in target.get(
                "activity",
                [
                    {
                        "id": "a-1",
                        "event": "Finding detected by IaC Scanner",
                        "user": "Scanner Engine",
                        "timestamp": target.get("detected_at", "Sep 30, 10:12"),
                        "badge_variant": "danger",
                    },
                    {
                        "id": "a-2",
                        "event": "Policy evaluated: CIS AWS v1.5.0 §2.1.5 Failed",
                        "user": "OPA Engine",
                        "timestamp": target.get("detected_at", "Sep 30, 10:13"),
                        "badge_variant": "warning",
                    },
                ],
            )
        ]

        return IaCFindingDetailResponse(
            id=target["id"],
            title=target["title"],
            description=target.get(
                "description",
                "S3 bucket is publicly accessible through block public access settings, bucket policy or ACL.",
            ),
            severity=target["severity"],
            status=target["status"],
            resource=target.get("resource", "aws_s3_bucket.app"),
            provider=target.get("provider", "AWS"),
            rule_id=target.get("rule_id", "IAC-001"),
            category=target.get("category", "Storage"),
            frameworks=target.get("frameworks", "CIS AWS v1.5.0, NIST 800-53, PCI DSS"),
            detected_at=target.get("detected_at_full", "Sep 30, 2026, 10:12 AM"),
            first_seen=target.get("first_seen", "Sep 28, 2026, 09:14 AM"),
            last_seen=target.get("last_seen", "Sep 30, 2026, 10:12 AM"),
            environment=target.get("environment", "production"),
            region=target.get("region", "ap-south-1"),
            resource_tags=target.get("resource_tags", "app: frontend, env: prod"),
            cvss_score=target.get("cvss_score", "8.6 (High)"),
            assignee=target.get("assignee", "Unassigned"),
            evidence=evidence,
            remediation=remediation,
            comments=comments,
            activity=activity,
        )

    @classmethod
    def assign_finding(cls, finding_id: str, assignee: str) -> Optional[IaCFindingDetailResponse]:
        for f in _FINDINGS_SUITE_STORE:
            if f["id"].lower() == finding_id.lower():
                f["assignee"] = assignee
                act = f.setdefault("activity", [])
                act.append({
                    "id": f"a-{len(act)+1}",
                    "event": f"Assigned to {assignee}",
                    "user": "Dev Security Admin",
                    "timestamp": "Just now",
                    "badge_variant": "info",
                })
                return cls.get_finding_detail(finding_id)
        return None

    @classmethod
    def add_comment(
        cls, finding_id: str, comment: str, author: str = "Dev Security Admin"
    ) -> Optional[IaCFindingDetailResponse]:
        for f in _FINDINGS_SUITE_STORE:
            if f["id"].lower() == finding_id.lower():
                comms = f.setdefault("comments", [])
                comms.append({
                    "id": f"c-{len(comms)+1}",
                    "author": author,
                    "avatar": "".join([part[0] for part in author.split()][:2]).upper() or "US",
                    "comment": comment,
                    "created_at": "Just now",
                })
                act = f.setdefault("activity", [])
                act.append({
                    "id": f"a-{len(act)+1}",
                    "event": f"Comment added by {author}",
                    "user": author,
                    "timestamp": "Just now",
                    "badge_variant": "info",
                })
                return cls.get_finding_detail(finding_id)
        return None

    @classmethod
    def remediate_finding(
        cls, finding_id: str, action: str = "apply"
    ) -> Optional[IaCFindingDetailResponse]:
        for f in _FINDINGS_SUITE_STORE:
            if f["id"].lower() == finding_id.lower():
                if action == "apply":
                    f["status"] = "Resolved"
                    f["remediation_applied"] = True
                    f["pr_url"] = "https://github.com/org/infrastructure/pull/402"
                    act = f.setdefault("activity", [])
                    act.append({
                        "id": f"a-{len(act)+1}",
                        "event": "Automated Remediation PR #402 opened and verified",
                        "user": "Dev Security Admin",
                        "timestamp": "Just now",
                        "badge_variant": "success",
                    })
                else:
                    f["status"] = "Open"
                    f["remediation_applied"] = False
                    f["pr_url"] = None
                    act = f.setdefault("activity", [])
                    act.append({
                        "id": f"a-{len(act)+1}",
                        "event": "Remediation reverted to Open state",
                        "user": "Dev Security Admin",
                        "timestamp": "Just now",
                        "badge_variant": "warning",
                    })
                return cls.get_finding_detail(finding_id)
        return None

    # ── 3.4 Findings Triage ───────────────────────────────────────────────────────

    @classmethod
    def get_triage(
        cls,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        provider: Optional[str] = None,
        assignee: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsTriageResponse:
        counts = {
            "Open": sum(1 for f in _FINDINGS_SUITE_STORE if f.get("status") == "Open"),
            "In Progress": sum(1 for f in _FINDINGS_SUITE_STORE if f.get("status") == "In Progress"),
            "Resolved": sum(1 for f in _FINDINGS_SUITE_STORE if f.get("status") == "Resolved"),
            "Suppressed": sum(1 for f in _FINDINGS_SUITE_STORE if f.get("status") == "Suppressed"),
        }

        filtered = list(_FINDINGS_SUITE_STORE)
        if status and status != "All Statuses":
            filtered = [f for f in filtered if f.get("status", "").lower() == status.lower()]
        if severity and severity != "All Severities":
            filtered = [f for f in filtered if f.get("severity", "").lower() == severity.lower()]
        if provider and provider != "All Providers":
            filtered = [f for f in filtered if f.get("provider", "").lower() == provider.lower()]
        if assignee and assignee != "All Assignees":
            filtered = [f for f in filtered if f.get("assignee", "Unassigned").lower() == assignee.lower()]
        if search:
            s = search.lower()
            filtered = [
                f for f in filtered
                if s in f.get("title", "").lower()
                or s in f.get("id", "").lower()
                or s in f.get("resource", "").lower()
            ]

        total = len(filtered)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = filtered[start_idx:end_idx]

        items = [
            IaCFindingsTriageItem(
                id=item["id"],
                title=item["title"],
                severity=item["severity"],
                assignee=item.get("assignee", "Unassigned"),
                status=item.get("status", "Open"),
                resource=item.get("resource", "aws_s3_bucket.app"),
                provider=item.get("provider", "AWS"),
                detected_at=item.get("detected_at", "Sep 30, 10:12"),
            )
            for item in sliced
        ]

        return IaCFindingsTriageResponse(
            status_counts=counts,
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    def bulk_action(cls, req: BulkFindingActionRequest) -> Dict:
        updated = 0
        target_ids = {i.lower() for i in req.finding_ids}
        for f in _FINDINGS_SUITE_STORE:
            if f["id"].lower() in target_ids:
                if req.action == "assign":
                    f["assignee"] = req.value
                    updated += 1
                elif req.action == "set_status":
                    f["status"] = req.value
                    updated += 1
                elif req.action == "suppress":
                    f["status"] = "Suppressed"
                    updated += 1
        return {"success": True, "updated_count": updated}

    # ── 3.5 Findings Trends ───────────────────────────────────────────────────────

    @classmethod
    def get_trends(
        cls,
        time_range: str = "Last 90 days",
    ) -> IaCFindingsTrendsResponse:
        trend_90d = [
            IaCFindingsTrendPoint(date="Jul 01", critical=18, high=26, medium=20, low=10),
            IaCFindingsTrendPoint(date="Jul 15", critical=16, high=28, medium=22, low=12),
            IaCFindingsTrendPoint(date="Aug 01", critical=20, high=30, medium=24, low=10),
            IaCFindingsTrendPoint(date="Aug 15", critical=22, high=32, medium=26, low=14),
            IaCFindingsTrendPoint(date="Sep 01", critical=24, high=34, medium=28, low=12),
            IaCFindingsTrendPoint(date="Sep 15", critical=26, high=38, medium=30, low=14),
            IaCFindingsTrendPoint(date="Sep 30", critical=28, high=40, medium=32, low=16),
        ]

        providers = [
            IaCProviderTrendCount(provider="AWS", count=152),
            IaCProviderTrendCount(provider="Kubernetes", count=68),
            IaCProviderTrendCount(provider="Azure", count=54),
            IaCProviderTrendCount(provider="GCP", count=38),
            IaCProviderTrendCount(provider="Others", count=16),
        ]

        environments = [
            IaCEnvironmentTrendPct(environment="Production", percentage=42, count=138),
            IaCEnvironmentTrendPct(environment="Staging", percentage=28, count=92),
            IaCEnvironmentTrendPct(environment="Development", percentage=20, count=66),
            IaCEnvironmentTrendPct(environment="Sandbox", percentage=10, count=32),
        ]

        return IaCFindingsTrendsResponse(
            time_range=time_range,
            trend=trend_90d,
            provider_breakdown=providers,
            environment_breakdown=environments,
        )

    # ── 3.6 Findings by Resource ─────────────────────────────────────────────────

    @classmethod
    def get_by_resource(
        cls,
        provider: Optional[str] = None,
        environment: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsByResourceResponse:
        resource_matrix = [
            IaCResourceFindingsRowItem(resource_type="aws_s3_bucket", total=72, critical=28, high=22, medium=16, low=6),
            IaCResourceFindingsRowItem(resource_type="aws_security_group", total=56, critical=18, high=20, medium=12, low=6),
            IaCResourceFindingsRowItem(resource_type="aws_iam_policy", total=42, critical=12, high=18, medium=8, low=4),
            IaCResourceFindingsRowItem(resource_type="aws_db_instance", total=38, critical=10, high=16, medium=8, low=4),
            IaCResourceFindingsRowItem(resource_type="kubernetes_deploy", total=32, critical=8, high=12, medium=8, low=4),
            IaCResourceFindingsRowItem(resource_type="aws_lb", total=26, critical=8, high=10, medium=6, low=2),
            IaCResourceFindingsRowItem(resource_type="aws_instance", total=24, critical=6, high=10, medium=6, low=2),
            IaCResourceFindingsRowItem(resource_type="kubernetes_service", total=18, critical=4, high=6, medium=6, low=2),
            IaCResourceFindingsRowItem(resource_type="aws_lambda", total=14, critical=4, high=4, medium=4, low=2),
            IaCResourceFindingsRowItem(resource_type="aws_cloudfront", total=6, critical=2, high=2, medium=2, low=0),
        ]

        filtered = resource_matrix
        if search:
            s = search.lower()
            filtered = [r for r in filtered if s in r.resource_type.lower()]

        total = len(filtered)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = filtered[start_idx:end_idx]

        return IaCFindingsByResourceResponse(
            items=sliced,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    # ── 3.7 Findings by Framework (Compliance Summary) ───────────────────────────

    @classmethod
    def get_by_framework_summary(
        cls,
        page: int = 1,
        page_size: int = 10,
    ) -> IaCFindingsByFrameworkSummaryResponse:
        frameworks = [
            IaCFrameworkSummaryRowItem(framework="CIS AWS v1.5.0", total=124, critical=36, high=48, medium=28, low=12),
            IaCFrameworkSummaryRowItem(framework="NIST 800-53", total=86, critical=24, high=32, medium=22, low=8),
            IaCFrameworkSummaryRowItem(framework="PCI DSS v4.0", total=68, critical=18, high=26, medium=18, low=6),
            IaCFrameworkSummaryRowItem(framework="ISO 27001", total=46, critical=12, high=16, medium=14, low=4),
            IaCFrameworkSummaryRowItem(framework="SOC 2", total=42, critical=10, high=16, medium=12, low=4),
            IaCFrameworkSummaryRowItem(framework="AWS Well-Architected", total=28, critical=8, high=10, medium=8, low=2),
            IaCFrameworkSummaryRowItem(framework="CIS Kubernetes", total=24, critical=6, high=10, medium=6, low=2),
            IaCFrameworkSummaryRowItem(framework="HIPAA", total=18, critical=4, high=8, medium=4, low=2),
            IaCFrameworkSummaryRowItem(framework="FedRAMP", total=12, critical=4, high=4, medium=2, low=2),
            IaCFrameworkSummaryRowItem(framework="Custom Policies", total=8, critical=2, high=4, medium=2, low=0),
        ]

        total = len(frameworks)
        total_pages = max(1, math.ceil(total / page_size))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = frameworks[start_idx:end_idx]

        return IaCFindingsByFrameworkSummaryResponse(
            items=sliced,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    # ── 3.8 Export & Reports ─────────────────────────────────────────────────────

    @classmethod
    def export_advanced(cls, req: ExportFindingsAdvancedRequest) -> ExportFindingsResponse:
        filtered = list(_FINDINGS_SUITE_STORE)
        if req.severity and req.severity != "All Severities":
            filtered = [f for f in filtered if f.get("severity", "").lower() == req.severity.lower()]
        if req.status and req.status != "All Statuses":
            filtered = [f for f in filtered if f.get("status", "").lower() == req.status.lower()]
        if req.provider and req.provider != "All Providers":
            filtered = [f for f in filtered if f.get("provider", "").lower() == req.provider.lower()]

        fmt = req.format.upper()
        if fmt == "CSV":
            headers = ["ID", "Title", "Severity", "Status"]
            if req.include_resource_config:
                headers.extend(["Resource", "Provider", "Environment"])
            if req.include_remediation:
                headers.append("RemediationGuidance")
            if req.include_details:
                headers.extend(["Category", "DetectedAt"])

            lines = [",".join(headers)]
            for f in filtered:
                row = [f["id"], f'"{f["title"]}"', f["severity"], f.get("status", "Open")]
                if req.include_resource_config:
                    row.extend([f.get("resource", "aws_s3_bucket.app"), f.get("provider", "AWS"), f.get("environment", "Production")])
                if req.include_remediation:
                    row.append(f'"{f.get("remediation_summary", "Enable Block Public Access")}"')
                if req.include_details:
                    row.extend([f.get("category", "Storage"), f.get("detected_at", "Sep 30, 10:12")])
                lines.append(",".join(row))
            content = "\n".join(lines)
            filename = f"iac_findings_{req.date_range.replace(' ', '_').lower()}.csv"

        elif fmt == "JSON":
            import json
            records = []
            for f in filtered:
                rec = {
                    "id": f["id"],
                    "title": f["title"],
                    "severity": f["severity"],
                    "status": f.get("status", "Open"),
                }
                if req.include_resource_config:
                    rec["resource"] = f.get("resource", "aws_s3_bucket.app")
                    rec["provider"] = f.get("provider", "AWS")
                    rec["environment"] = f.get("environment", "Production")
                if req.include_remediation:
                    rec["remediation"] = f.get("remediation_summary", "Enable Block Public Access")
                if req.include_details:
                    rec["category"] = f.get("category", "Storage")
                    rec["detected_at"] = f.get("detected_at", "Sep 30, 10:12")
                records.append(rec)
            content = json.dumps(records, indent=2)
            filename = f"iac_findings_{req.date_range.replace(' ', '_').lower()}.json"

        else:  # PDF formatted report text
            report_lines = [
                "%PDF-1.4 SECULAYER IAC SECURITY AUDIT REPORT",
                "==================================================",
                f"Generated Range: {req.date_range} | Status Filter: {req.status or 'All'}",
                f"Total Findings Exported: {len(filtered)}",
                "==================================================",
                "",
            ]
            for f in filtered:
                report_lines.append(f"[{f.get('severity', 'High').upper()}] {f['id']} - {f['title']}")
                report_lines.append(f"  Resource: {f.get('resource', 'aws_s3_bucket')} | Status: {f.get('status', 'Open')}")
                if req.include_remediation:
                    report_lines.append(f"  Remediation: {f.get('remediation_summary', 'Update IaC block public access settings.')}")
                report_lines.append("")
            content = "\n".join(report_lines)
            filename = f"iac_findings_{req.date_range.replace(' ', '_').lower()}.pdf"

        # Record into history
        import datetime
        _REPORT_HISTORY_STORE.insert(0, {
            "id": f"REP-{len(_REPORT_HISTORY_STORE)+101}",
            "name": filename,
            "format": fmt,
            "generated_at": datetime.datetime.now().strftime("%b %d, %Y, %H:%M"),
            "size": f"{max(12, len(content) // 1024)} KB",
            "generated_by": "Dev Security Admin",
            "download_content": content,
        })

        return ExportFindingsResponse(
            format=fmt,
            exported_count=len(filtered),
            download_content=content,
            filename=filename,
        )

    @classmethod
    def get_scheduled_reports(cls) -> List[ScheduledReportItem]:
        return [ScheduledReportItem(**r) for r in _SCHEDULED_REPORTS_STORE]

    @classmethod
    def create_scheduled_report(cls, req: ScheduledReportCreateRequest) -> ScheduledReportItem:
        item = {
            "id": f"SCH-{len(_SCHEDULED_REPORTS_STORE)+1}",
            "name": req.name,
            "frequency": req.frequency,
            "format": req.format,
            "recipients": req.recipients,
            "status": "Active",
            "next_run": "Oct 18, 2026, 08:00 UTC",
        }
        _SCHEDULED_REPORTS_STORE.append(item)
        return ScheduledReportItem(**item)

    @classmethod
    def toggle_scheduled_report(cls, report_id: str) -> Optional[ScheduledReportItem]:
        for r in _SCHEDULED_REPORTS_STORE:
            if r["id"] == report_id:
                r["status"] = "Paused" if r["status"] == "Active" else "Active"
                return ScheduledReportItem(**r)
        return None

    @classmethod
    def get_report_history(cls) -> List[ReportHistoryItem]:
        return [ReportHistoryItem(**r) for r in _REPORT_HISTORY_STORE]


# ── Global stores for reports ─────────────────────────────────────────────────────

_SCHEDULED_REPORTS_STORE: List[Dict] = [
    {
        "id": "SCH-1",
        "name": "Weekly CIS Compliance Audit Digest",
        "frequency": "Weekly",
        "format": "PDF",
        "recipients": "security-team@example.com",
        "status": "Active",
        "next_run": "Oct 13, 2026, 08:00 UTC",
    },
    {
        "id": "SCH-2",
        "name": "Daily Criticals & High Alert Summary",
        "frequency": "Daily",
        "format": "CSV",
        "recipients": "devops-leads@example.com",
        "status": "Active",
        "next_run": "Oct 11, 2026, 09:00 UTC",
    },
    {
        "id": "SCH-3",
        "name": "Monthly Executive Risk & Posture Report",
        "frequency": "Monthly",
        "format": "PDF",
        "recipients": "ciso-office@example.com",
        "status": "Active",
        "next_run": "Nov 01, 2026, 00:00 UTC",
    },
]

_REPORT_HISTORY_STORE: List[Dict] = [
    {
        "id": "REP-101",
        "name": "IaC_CIS_Benchmark_Report_Sep2026.pdf",
        "format": "PDF",
        "generated_at": "Sep 30, 2026, 18:00",
        "size": "2.4 MB",
        "generated_by": "Automated Schedule",
        "download_content": "%PDF-1.4 SECULAYER CIS BENCHMARK DIGEST REPORT\nSummary: 124 CIS checks evaluated. 36 Critical findings requiring remediation.",
    },
    {
        "id": "REP-102",
        "name": "Critical_Findings_Export_Sep29.csv",
        "format": "CSV",
        "generated_at": "Sep 29, 2026, 11:20",
        "size": "142 KB",
        "generated_by": "Dev Security Admin",
        "download_content": "ID,Title,Severity,Status\nFND-328,S3 bucket public access,Critical,Open\nFND-327,Security group allows 0.0.0.0/0,Critical,In Progress",
    },
    {
        "id": "REP-103",
        "name": "Full_Infrastructure_Posture_Q3.json",
        "format": "JSON",
        "generated_at": "Sep 28, 2026, 14:15",
        "size": "890 KB",
        "generated_by": "mayur.bhavsar",
        "download_content": '{\n  "report": "Q3 Infrastructure Posture",\n  "total_findings": 328,\n  "critical": 76\n}',
    },
]
