"""
Step 18 Cloud Security Check Engine.

RULE 38 — CLOUD SECURITY FINDING != SECURITY SCORE.
RULE 39 — CLOUD READ != CLOUD SECURITY VERIFICATION.
RULE 40 — CLOUD ABSENCE OF EVIDENCE != SECURE. (Produces UNKNOWN, never PASS).

Checks produce deterministic PASS, FAIL, UNKNOWN, or NOT_APPLICABLE with evidence.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.integrations.cloud.common.models import (
    NormalizedCloudResource,
    CloudSecurityCheckResult,
)
from app.integrations.cloud.common.enums import (
    CheckResultStatus,
    CloudSecuritySeverity,
)


class CloudSecurityCheck(ABC):
    """
    Abstract base class for deterministic cloud security verification checks.
    """

    @property
    @abstractmethod
    def rule_id(self) -> str:
        pass

    @property
    @abstractmethod
    def rule_name(self) -> str:
        pass

    @property
    @abstractmethod
    def category(self) -> str:
        pass

    @property
    @abstractmethod
    def severity(self) -> CloudSecuritySeverity:
        pass

    @abstractmethod
    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        pass

    @abstractmethod
    async def evaluate(
        self,
        resource: NormalizedCloudResource,
        context: Optional[Dict[str, Any]] = None,
    ) -> CloudSecurityCheckResult:
        pass


# ============================================================================
# AWS Security Checks
# ============================================================================

class S3PublicAccessBlockCheck(CloudSecurityCheck):
    rule_id = "AWS-S3-001"
    rule_name = "S3 Bucket Public Access Block Enabled"
    category = "STORAGE"
    severity = CloudSecuritySeverity.CRITICAL

    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        return resource.provider == "AWS" and resource.resource_type == "S3_BUCKET"

    async def evaluate(self, resource: NormalizedCloudResource, context: Optional[Dict[str, Any]] = None) -> CloudSecurityCheckResult:
        config = resource.configuration or {}
        pab = config.get("public_access_block")

        if pab is None:
            return CloudSecurityCheckResult(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                severity=self.severity,
                status=CheckResultStatus.UNKNOWN,
                resource_id=resource.provider_resource_id,
                resource_type=resource.resource_type,
                observed_value="NO_DATA",
                expected_value={"BlockPublicAcls": True, "BlockPublicPolicy": True, "IgnorePublicAcls": True, "RestrictPublicBuckets": True},
                evidence={"error": "PublicAccessBlock configuration not available or accessible"},
                remediation_guidance="Enable S3 Block Public Access on bucket settings.",
            )

        is_blocked = (
            pab.get("BlockPublicAcls") is True
            and pab.get("BlockPublicPolicy") is True
            and pab.get("IgnorePublicAcls") is True
            and pab.get("RestrictPublicBuckets") is True
        )

        return CloudSecurityCheckResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            category=self.category,
            severity=self.severity,
            status=CheckResultStatus.PASS if is_blocked else CheckResultStatus.FAIL,
            resource_id=resource.provider_resource_id,
            resource_type=resource.resource_type,
            observed_value=pab,
            expected_value={"BlockPublicAcls": True, "BlockPublicPolicy": True, "IgnorePublicAcls": True, "RestrictPublicBuckets": True},
            evidence={"public_access_block": pab},
            remediation_guidance="Apply s3:PutPublicAccessBlock to block public acls and policies.",
        )


class S3BucketEncryptionCheck(CloudSecurityCheck):
    rule_id = "AWS-S3-002"
    rule_name = "S3 Bucket Server-Side Encryption Enabled"
    category = "ENCRYPTION"
    severity = CloudSecuritySeverity.HIGH

    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        return resource.provider == "AWS" and resource.resource_type == "S3_BUCKET"

    async def evaluate(self, resource: NormalizedCloudResource, context: Optional[Dict[str, Any]] = None) -> CloudSecurityCheckResult:
        config = resource.configuration or {}
        encryption = config.get("server_side_encryption")

        if encryption is None:
            return CloudSecurityCheckResult(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                severity=self.severity,
                status=CheckResultStatus.UNKNOWN,
                resource_id=resource.provider_resource_id,
                resource_type=resource.resource_type,
                observed_value="NO_DATA",
                expected_value="AES256 or aws:kms",
                evidence={"error": "Encryption configuration could not be verified"},
                remediation_guidance="Enable default SSE-S3 or SSE-KMS encryption on bucket.",
            )

        enabled = bool(encryption.get("enabled", False) or encryption.get("rules"))
        return CloudSecurityCheckResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            category=self.category,
            severity=self.severity,
            status=CheckResultStatus.PASS if enabled else CheckResultStatus.FAIL,
            resource_id=resource.provider_resource_id,
            resource_type=resource.resource_type,
            observed_value=encryption,
            expected_value={"enabled": True},
            evidence={"encryption_config": encryption},
            remediation_guidance="Enable default encryption for the S3 bucket.",
        )


class RDSPublicAccessCheck(CloudSecurityCheck):
    rule_id = "AWS-RDS-001"
    rule_name = "RDS Database Instance Not Publicly Accessible"
    category = "DATABASE"
    severity = CloudSecuritySeverity.CRITICAL

    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        return resource.provider == "AWS" and resource.resource_type == "RDS_INSTANCE"

    async def evaluate(self, resource: NormalizedCloudResource, context: Optional[Dict[str, Any]] = None) -> CloudSecurityCheckResult:
        config = resource.configuration or {}
        publicly_accessible = config.get("publicly_accessible")

        if publicly_accessible is None:
            return CloudSecurityCheckResult(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                severity=self.severity,
                status=CheckResultStatus.UNKNOWN,
                resource_id=resource.provider_resource_id,
                resource_type=resource.resource_type,
                observed_value="NO_DATA",
                expected_value=False,
                evidence={"error": "PubliclyAccessible status unknown"},
                remediation_guidance="Inspect RDS instance network placement.",
            )

        is_safe = (publicly_accessible is False)
        return CloudSecurityCheckResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            category=self.category,
            severity=self.severity,
            status=CheckResultStatus.PASS if is_safe else CheckResultStatus.FAIL,
            resource_id=resource.provider_resource_id,
            resource_type=resource.resource_type,
            observed_value=publicly_accessible,
            expected_value=False,
            evidence={"publicly_accessible": publicly_accessible},
            remediation_guidance="Modify RDS instance setting PubliclyAccessible=false.",
        )


class SecurityGroupOpenIngressCheck(CloudSecurityCheck):
    rule_id = "AWS-EC2-001"
    rule_name = "Security Group No Unrestricted Ingress to Sensitive Ports"
    category = "NETWORK"
    severity = CloudSecuritySeverity.HIGH

    SENSITIVE_PORTS = {22, 3389, 5432, 3306, 1433, 27017, 6379}

    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        return resource.provider == "AWS" and resource.resource_type == "SECURITY_GROUP"

    async def evaluate(self, resource: NormalizedCloudResource, context: Optional[Dict[str, Any]] = None) -> CloudSecurityCheckResult:
        config = resource.configuration or {}
        ip_permissions = config.get("ip_permissions")

        if ip_permissions is None:
            return CloudSecurityCheckResult(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                severity=self.severity,
                status=CheckResultStatus.UNKNOWN,
                resource_id=resource.provider_resource_id,
                resource_type=resource.resource_type,
                observed_value="NO_DATA",
                expected_value="No 0.0.0.0/0 on sensitive ports",
                evidence={"error": "Security group rules not available"},
                remediation_guidance="Ensure ingress rules restrict sensitive ports to authorized CIDRs.",
            )

        open_sensitive_rules = []
        for perm in ip_permissions:
            from_port = perm.get("from_port") or perm.get("FromPort")
            to_port = perm.get("to_port") or perm.get("ToPort")
            ip_ranges = perm.get("ip_ranges") or perm.get("IpRanges") or []

            is_open_to_world = any(
                r.get("cidr_ip") == "0.0.0.0/0" or r.get("CidrIp") == "0.0.0.0/0"
                for r in ip_ranges
            )

            if is_open_to_world and from_port is not None and to_port is not None:
                for port in self.SENSITIVE_PORTS:
                    if from_port <= port <= to_port:
                        open_sensitive_rules.append({"port": port, "cidr": "0.0.0.0/0"})

        is_safe = len(open_sensitive_rules) == 0
        return CloudSecurityCheckResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            category=self.category,
            severity=self.severity,
            status=CheckResultStatus.PASS if is_safe else CheckResultStatus.FAIL,
            resource_id=resource.provider_resource_id,
            resource_type=resource.resource_type,
            observed_value=open_sensitive_rules,
            expected_value=[],
            evidence={"open_sensitive_rules": open_sensitive_rules},
            remediation_guidance="Remove 0.0.0.0/0 ingress for sensitive administrative and database ports.",
        )


class IAMWildcardPolicyCheck(CloudSecurityCheck):
    rule_id = "AWS-IAM-001"
    rule_name = "IAM Policy No Unrestricted Wildcard Administrator Actions"
    category = "IAM"
    severity = CloudSecuritySeverity.CRITICAL

    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        return resource.provider == "AWS" and resource.resource_type in ("IAM_POLICY", "IAM_ROLE")

    async def evaluate(self, resource: NormalizedCloudResource, context: Optional[Dict[str, Any]] = None) -> CloudSecurityCheckResult:
        config = resource.configuration or {}
        policy_doc = config.get("policy_document") or config.get("trust_policy")

        if not policy_doc:
            return CloudSecurityCheckResult(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                severity=self.severity,
                status=CheckResultStatus.UNKNOWN,
                resource_id=resource.provider_resource_id,
                resource_type=resource.resource_type,
                observed_value="NO_DATA",
                expected_value="Scoped IAM actions",
                evidence={"error": "Policy document not retrieved"},
                remediation_guidance="Audit policy permissions.",
            )

        statements = policy_doc.get("Statement") or []
        if isinstance(statements, dict):
            statements = [statements]

        has_wildcard = False
        for stmt in statements:
            if stmt.get("Effect") == "Allow":
                act = stmt.get("Action")
                res = stmt.get("Resource")
                if (act == "*" or act == ["*"]) and (res == "*" or res == ["*"]):
                    has_wildcard = True
                    break

        return CloudSecurityCheckResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            category=self.category,
            severity=self.severity,
            status=CheckResultStatus.FAIL if has_wildcard else CheckResultStatus.PASS,
            resource_id=resource.provider_resource_id,
            resource_type=resource.resource_type,
            observed_value={"wildcard_admin": has_wildcard},
            expected_value={"wildcard_admin": False},
            evidence={"statements": statements},
            remediation_guidance="Scope IAM actions to specific services and resources.",
        )


# ============================================================================
# Azure Security Checks
# ============================================================================

class AzureStoragePublicAccessCheck(CloudSecurityCheck):
    rule_id = "AZURE-STORAGE-001"
    rule_name = "Azure Storage Account Disallow Public Blob Access"
    category = "STORAGE"
    severity = CloudSecuritySeverity.CRITICAL

    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        return resource.provider == "AZURE" and resource.resource_type == "STORAGE_ACCOUNT"

    async def evaluate(self, resource: NormalizedCloudResource, context: Optional[Dict[str, Any]] = None) -> CloudSecurityCheckResult:
        config = resource.configuration or {}
        allow_blob_public_access = config.get("allow_blob_public_access")

        if allow_blob_public_access is None:
            return CloudSecurityCheckResult(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                severity=self.severity,
                status=CheckResultStatus.UNKNOWN,
                resource_id=resource.provider_resource_id,
                resource_type=resource.resource_type,
                observed_value="NO_DATA",
                expected_value=False,
                evidence={"error": "Azure Storage public access configuration not present"},
                remediation_guidance="Set allowBlobPublicAccess to false on Storage Account.",
            )

        is_safe = (allow_blob_public_access is False)
        return CloudSecurityCheckResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            category=self.category,
            severity=self.severity,
            status=CheckResultStatus.PASS if is_safe else CheckResultStatus.FAIL,
            resource_id=resource.provider_resource_id,
            resource_type=resource.resource_type,
            observed_value=allow_blob_public_access,
            expected_value=False,
            evidence={"allow_blob_public_access": allow_blob_public_access},
            remediation_guidance="Disallow public blob access on the Azure storage account.",
        )


# ============================================================================
# GCP Security Checks
# ============================================================================

class GCPStorageUniformAccessCheck(CloudSecurityCheck):
    rule_id = "GCP-STORAGE-001"
    rule_name = "Cloud Storage Uniform Bucket-Level Access Enabled"
    category = "STORAGE"
    severity = CloudSecuritySeverity.HIGH

    def is_applicable(self, resource: NormalizedCloudResource) -> bool:
        return resource.provider == "GCP" and resource.resource_type == "STORAGE_BUCKET"

    async def evaluate(self, resource: NormalizedCloudResource, context: Optional[Dict[str, Any]] = None) -> CloudSecurityCheckResult:
        config = resource.configuration or {}
        ubla = config.get("uniform_bucket_level_access")

        if ubla is None:
            return CloudSecurityCheckResult(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                severity=self.severity,
                status=CheckResultStatus.UNKNOWN,
                resource_id=resource.provider_resource_id,
                resource_type=resource.resource_type,
                observed_value="NO_DATA",
                expected_value=True,
                evidence={"error": "GCP Uniform Bucket Level Access configuration not present"},
                remediation_guidance="Enable uniform bucket-level access in Cloud Storage.",
            )

        enabled = ubla.get("enabled", False) if isinstance(ubla, dict) else bool(ubla)
        return CloudSecurityCheckResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            category=self.category,
            severity=self.severity,
            status=CheckResultStatus.PASS if enabled else CheckResultStatus.FAIL,
            resource_id=resource.provider_resource_id,
            resource_type=resource.resource_type,
            observed_value=enabled,
            expected_value=True,
            evidence={"uniform_bucket_level_access": ubla},
            remediation_guidance="Enable uniform bucket-level access on GCP bucket.",
        )


# Registry of all built-in security checks
ALL_CHECKS: List[CloudSecurityCheck] = [
    S3PublicAccessBlockCheck(),
    S3BucketEncryptionCheck(),
    RDSPublicAccessCheck(),
    SecurityGroupOpenIngressCheck(),
    IAMWildcardPolicyCheck(),
    AzureStoragePublicAccessCheck(),
    GCPStorageUniformAccessCheck(),
]


class CloudSecurityEngine:
    """
    Evaluates cloud resources against applicable security checks.
    """
    def __init__(self, checks: Optional[List[CloudSecurityCheck]] = None):
        self.checks = checks or ALL_CHECKS

    async def evaluate_resource(
        self,
        resource: NormalizedCloudResource,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[CloudSecurityCheckResult]:
        results: List[CloudSecurityCheckResult] = []
        for check in self.checks:
            if check.is_applicable(resource):
                res = await check.evaluate(resource, context)
                results.append(res)
        return results
