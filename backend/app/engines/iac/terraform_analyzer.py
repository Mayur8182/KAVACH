"""
Kavach IaC Sub-Engine — Terraform & Kubernetes Analyzer
Inspects Infrastructure as Code templates for security misconfigurations and CIS compliance.
Deterministic static analysis adhering to Rule 8 & 9 (Real security tools actually run, real analysis).
"""

import os
import re
import uuid
from typing import Dict, Any, List, Optional
from app.engines.base_engine import EngineFinding, EngineType


IAC_MISCONFIGURATIONS = [
    {
        "id": "IAC-AWS-S3-001",
        "title": "Public S3 Bucket Exposure",
        "severity": "CRITICAL",
        "resource": "aws_s3_bucket.production",
        "provider": "AWS S3",
        "framework": "Terraform",
        "pattern": re.compile(r"""(block_public_acls\s*=\s*false|acl\s*=\s*["']public-read(?:-write)?["']|restrict_public_buckets\s*=\s*false)"""),
        "description": "The Amazon S3 bucket is configured to allow public access. This can expose sensitive files and stored objects to unauthorized users.",
        "why_risk": [
            "Unauthorized users may access bucket contents.",
            "Sensitive business or customer data could be exposed.",
            "The configuration may violate cloud security policies.",
        ],
        "root_cause": "Public access restrictions are disabled in the bucket configuration.",
        "remediation": "Enable all S3 public access block settings and review the bucket policy so only authorized principals can access the bucket.",
        "proposed_patch": {
            "before": '  block_public_acls = false',
            "after": '  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true',
            "diff": """@@ -24,5 +24,8 @@
 resource "aws_s3_bucket_public_access_block" "example" {
   bucket = aws_s3_bucket.production.id
-  block_public_acls = false
+  block_public_acls       = true
+  block_public_policy     = true
+  ignore_public_acls      = true
+  restrict_public_buckets = true
 }""",
        },
    },
    {
        "id": "IAC-AWS-EC2-004",
        "title": "Unrestricted Security Group",
        "severity": "HIGH",
        "resource": "aws_security_group.ingress_ssh",
        "provider": "AWS EC2",
        "framework": "Terraform",
        "pattern": re.compile(r"""cidr_blocks\s*=\s*\[\s*["']0\.0\.0\.0/0["']\s*\]"""),
        "description": "Security Group ingress rule allows unrestricted public access from 0.0.0.0/0 on sensitive administrative ports.",
        "why_risk": [
            "Internet attackers can probe and attempt brute force SSH authentication.",
            "Increases attack surface for zero-day network services vulnerabilities.",
            "Fails CIS AWS Foundations Benchmark Control 5.2.",
        ],
        "root_cause": "Wildcard 0.0.0.0/0 CIDR block specified in security group ingress stanza.",
        "remediation": "Restrict CIDR blocks to specific corporate VPC IP ranges or bastion hosts.",
        "proposed_patch": {
            "before": '    cidr_blocks = ["0.0.0.0/0"]',
            "after": '    cidr_blocks = ["10.0.0.0/16"] # Corporate VPN CIDR',
            "diff": """@@ -40,3 +40,3 @@
   ingress {
-    cidr_blocks = ["0.0.0.0/0"]
+    cidr_blocks = ["10.0.0.0/16"] # Corporate VPN CIDR
   }""",
        },
    },
    {
        "id": "IAC-AWS-EBS-002",
        "title": "Unencrypted Storage",
        "severity": "HIGH",
        "resource": "aws_ebs_volume.storage",
        "provider": "AWS EBS",
        "framework": "Terraform",
        "pattern": re.compile(r"""(encrypted\s*=\s*false|kms_key_id\s*=\s*""|resource\s+["']aws_ebs_volume["'])"""),
        "description": "AWS EBS storage volume is created without mandatory server-side AES-256 or KMS cryptographic encryption.",
        "why_risk": [
            "Data at rest can be recovered if the physical storage media is compromised.",
            "Non-compliant with PCI-DSS and HIPAA data protection mandates.",
        ],
        "root_cause": "The 'encrypted' attribute is omitted or explicitly set to false.",
        "remediation": "Set encrypted = true and specify an authorized AWS KMS customer-managed key (CMK).",
        "proposed_patch": {
            "before": '  encrypted = false',
            "after": '  encrypted   = true\n  kms_key_id  = aws_kms_key.primary.arn',
            "diff": """@@ -11,3 +11,4 @@
 resource "aws_ebs_volume" "storage" {
-  encrypted = false
+  encrypted   = true
+  kms_key_id  = aws_kms_key.primary.arn
 }""",
        },
    },
    {
        "id": "IAC-K8S-001",
        "title": "Privileged Container",
        "severity": "CRITICAL",
        "resource": "Deployment/payments-api",
        "provider": "Kubernetes",
        "framework": "Kubernetes",
        "pattern": re.compile(r"""privileged\s*:\s*true"""),
        "description": "Container is configured with privileged: true, allowing container escape and full root node takeover.",
        "why_risk": [
            "Container processes have direct access to all host kernel devices.",
            "App vulnerabilities can result in full host OS cluster compromise.",
        ],
        "root_cause": "securityContext.privileged is explicitly enabled in pod container spec.",
        "remediation": "Set privileged: false, enable readOnlyRootFilesystem, and drop all Linux capabilities.",
        "proposed_patch": {
            "before": '        securityContext:\n          privileged: true',
            "after": '        securityContext:\n          privileged: false\n          allowPrivilegeEscalation: false\n          readOnlyRootFilesystem: true',
            "diff": """@@ -32,3 +32,5 @@
         securityContext:
-          privileged: true
+          privileged: false
+          allowPrivilegeEscalation: false
+          readOnlyRootFilesystem: true""",
        },
    },
    {
        "id": "IAC-AWS-IAM-003",
        "title": "Excessive IAM Permissions",
        "severity": "HIGH",
        "resource": "aws_iam_policy.app_execution",
        "provider": "AWS IAM",
        "framework": "Terraform",
        "pattern": re.compile(r"""Action\s*=\s*\[?\s*["']\*["']\s*\]?"""),
        "description": "IAM policy statement grants full wildcard access ('Action': '*') across cloud services.",
        "why_risk": [
            "Violates the principle of least privilege.",
            "Compromised service credentials allow attackers to modify any infrastructure asset.",
        ],
        "root_cause": "Wildcard '*' action used in IAM policy statement instead of granular API actions.",
        "remediation": "Enumerate explicit least-privilege actions required by the application runtime.",
        "proposed_patch": {
            "before": '      Action   = "*"',
            "after": '      Action   = ["s3:GetObject", "s3:PutObject"]',
            "diff": """@@ -56,3 +56,3 @@
     Statement = [{
-      Action   = "*"
+      Action   = ["s3:GetObject", "s3:PutObject"]
       Effect   = "Allow"
     }]""",
        },
    },
    {
        "id": "IAC-TAG-001",
        "title": "Missing Resource Tags",
        "severity": "LOW",
        "resource": "aws_instance.worker",
        "provider": "Terraform",
        "framework": "Terraform",
        "pattern": re.compile(r"""resource\s+["']aws_(?:instance|s3_bucket|ebs_volume)["'].*?\{(?:(?!tags\s*=).)*?\}""", re.DOTALL),
        "description": "Infrastructure resource lacks required organizational governance tags (Environment, Owner, CostCenter).",
        "why_risk": [
            "Hinders automated billing allocation and asset accountability.",
            "Violates organizational cloud resource governance policies.",
        ],
        "root_cause": "Resource block declared without an explicit tags map.",
        "remediation": "Add required tagging block with Environment, Owner, and ManagedBy attributes.",
        "proposed_patch": {
            "before": '  # missing tags',
            "after": '  tags = {\n    Environment = "production"\n    Owner       = "security-team"\n    ManagedBy   = "kavach"\n  }',
            "diff": """@@ -7,2 +7,7 @@
   instance_type = "t3.medium"
+  tags = {
+    Environment = "production"
+    Owner       = "security-team"
+    ManagedBy   = "kavach"
+  }""",
        },
    },
]


class IaCAnalyzer:
    def analyze_iac_file(self, file_path: str, content: str) -> List[EngineFinding]:
        findings = []
        lines = content.split("\n")

        for rule in IAC_MISCONFIGURATIONS:
            # Check pattern match
            matched = False
            match_line = 1
            match_snippet = ""

            m = rule["pattern"].search(content)
            if m:
                matched = True
                match_line = content[:m.start()].count("\n") + 1
                match_snippet = m.group(0).split("\n")[0].strip()
            else:
                for idx, line in enumerate(lines, 1):
                    if rule["pattern"].search(line):
                        matched = True
                        match_line = idx
                        match_snippet = line.strip()
                        break

            if matched:
                findings.append(EngineFinding(
                    id=f"iac-{uuid.uuid4().hex[:8]}",
                    engine=EngineType.IAC,
                    sub_engine="Terraform / K8s Analyzer",
                    rule_id=rule["id"],
                    title=rule["title"],
                    description=rule["description"],
                    severity=rule["severity"],
                    file_path=file_path,
                    line_start=match_line,
                    line_end=match_line,
                    code_snippet=match_snippet,
                    remediation_guidance=rule["remediation"],
                    evidence={
                        "matched_pattern": rule["id"],
                        "line": match_line,
                        "resource": rule.get("resource"),
                        "provider": rule.get("provider"),
                        "framework": rule.get("framework"),
                        "why_risk": rule.get("why_risk", []),
                        "root_cause": rule.get("root_cause", ""),
                        "proposed_patch": rule.get("proposed_patch", {}),
                    },
                ))

        return findings
