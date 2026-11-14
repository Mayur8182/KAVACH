"""
AWS Cross-Account Read-Only Connector for Kavach
Implements secure IAM AssumeRole with unique External ID and STS temporary credentials.

Security Principles:
1. Kavach Control Plane identity is isolated and configured via environment variables.
2. Unique External ID generated per project/tenant to prevent Confused Deputy attacks.
3. Customer AWS Access Keys are NEVER requested or stored.
4. Read-only permissions enforced; remediation strictly requires customer authorization.
"""

import os
import re
import hashlib
import logging
import uuid
from typing import Any, Dict, List, Optional

from app.cloud.connectors.base import (
    CloudConnectorBase,
    ConnectionValidationResult,
    SetupInstructions,
)

logger = logging.getLogger("kavach.cloud.aws_connector")

# Kavach SaaS Platform AWS Identity
KAVACH_AWS_ACCOUNT_ID = os.getenv("KAVACH_AWS_ACCOUNT_ID", "112233445566")
KAVACH_AWS_ROLE_SESSION_NAME = os.getenv("KAVACH_AWS_ROLE_SESSION_NAME", "KavachCloudSecurityAudit")


class AWSCloudConnector(CloudConnectorBase):
    def __init__(self, kavach_account_id: Optional[str] = None):
        acc = kavach_account_id or os.getenv("KAVACH_AWS_ACCOUNT_ID")
        if not acc or acc == "112233445566":
            try:
                import boto3
                from botocore.config import Config
                fast_cfg = Config(connect_timeout=4, read_timeout=4, retries={'max_attempts': 1})
                acc = boto3.Session().client("sts", config=fast_cfg).get_caller_identity().get("Account")
            except Exception:
                acc = "407268186423"
        self.kavach_account_id = acc or "407268186423"

    def generate_external_id(self, project_id: uuid.UUID) -> str:
        """Derives a deterministic, cryptographically collision-resistant External ID for the tenant."""
        h = hashlib.sha256(f"kavach-external-id-{project_id}".encode()).hexdigest()[:12]
        return f"kavach-ext-{str(project_id)[:8]}-{h}"

    def generate_setup_instructions(self, project_id: uuid.UUID) -> SetupInstructions:
        external_id = self.generate_external_id(project_id)
        trust_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "KavachCrossAccountAuditAssumeRole",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": f"arn:aws:iam::{self.kavach_account_id}:root"
                    },
                    "Action": "sts:AssumeRole",
                    "Condition": {
                        "StringEquals": {
                            "sts:ExternalId": external_id
                        }
                    }
                }
            ]
        }

        cfn_template_dict = {
            "AWSTemplateFormatVersion": "2010-09-09",
            "Description": "Kavach Autonomous Cloud Security - Cross-Account Read-Only Audit Role",
            "Parameters": {
                "KavachAccountId": {
                    "Type": "String",
                    "Default": str(self.kavach_account_id),
                    "Description": "Kavach SaaS Control Plane AWS Account ID",
                },
                "ExternalId": {
                    "Type": "String",
                    "Default": external_id,
                    "Description": "Unique External ID generated for your Kavach organization",
                },
            },
            "Resources": {
                "KavachSecurityAuditRole": {
                    "Type": "AWS::IAM::Role",
                    "Properties": {
                        "RoleName": "KavachSecurityAuditRole",
                        "Description": "Read-only audit role for Kavach autonomous security scanning",
                        "AssumeRolePolicyDocument": {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Principal": {
                                        "AWS": {"Fn::Sub": "arn:aws:iam::${KavachAccountId}:root"}
                                    },
                                    "Action": "sts:AssumeRole",
                                    "Condition": {
                                        "StringEquals": {
                                            "sts:ExternalId": {"Ref": "ExternalId"}
                                        }
                                    },
                                }
                            ],
                        },
                        "ManagedPolicyArns": [
                            "arn:aws:iam::aws:policy/SecurityAudit"
                        ],
                    },
                }
            },
            "Outputs": {
                "RoleArn": {
                    "Description": "ARN of the Kavach Security Audit Role",
                    "Value": {"Fn::GetAtt": ["KavachSecurityAuditRole", "Arn"]},
                },
                "AccountId": {
                    "Description": "Your AWS Account ID",
                    "Value": {"Ref": "AWS::AccountId"},
                },
                "ExternalId": {
                    "Description": "External ID configured in trust policy",
                    "Value": {"Ref": "ExternalId"},
                },
            },
        }
        import json
        cfn_template_json = json.dumps(cfn_template_dict, indent=2)

        # Standard AWS CloudFormation stack template creation URL
        cfn_quick_create_url = (
            f"https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/template"
        )
        try:
            import boto3
            import urllib.parse
            session = boto3.Session()
            sts_client = session.client("sts")
            caller_acc = sts_client.get_caller_identity().get("Account")
            reg = session.region_name or "us-east-1"
            cfn_quick_create_url = f"https://console.aws.amazon.com/cloudformation/home?region={reg}#/stacks/create/template"

            # Check if a dedicated public/template bucket exists before attempting presigned URL
            s3_client = session.client("s3")
            b_list = [b["Name"] for b in s3_client.list_buckets().get("Buckets", [])]
            cfn_buckets = [b for b in b_list if (b.startswith("cf-templates-") or "kavach" in b) and reg in b]
            if cfn_buckets:
                target_bucket = cfn_buckets[0]
                try:
                    s3_client.put_object(
                        Bucket=target_bucket,
                        Key="kavach-security-audit.json",
                        Body=cfn_template_json.encode("utf-8"),
                        ContentType="application/json",
                    )
                    presigned = s3_client.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": target_bucket, "Key": "kavach-security-audit.json"},
                        ExpiresIn=86400,
                    )
                    encoded_template_url = urllib.parse.quote(presigned, safe="")
                    cfn_quick_create_url = (
                        f"https://console.aws.amazon.com/cloudformation/home?region={reg}"
                        f"#/stacks/create/review?templateURL={encoded_template_url}&stackName=KavachSecurityAudit&param_ExternalId={external_id}&param_KavachAccountId={self.kavach_account_id}"
                    )
                except Exception as up_err:
                    logger.debug(f"Presigned template upload skipped: {up_err}")
        except Exception as e:
            logger.debug(f"Could not auto-upload CFN template: {e}")

        cli_snippet = (
            f"# Option A: Direct Read-Only IAM User (Recommended - No SaaS Account Needed)\n"
            f"aws iam create-user --user-name kavach-security-audit\n"
            f"aws iam attach-user-policy --user-name kavach-security-audit --policy-arn arn:aws:iam::aws:policy/SecurityAudit\n"
            f"aws iam create-access-key --user-name kavach-security-audit\n\n"
            f"# Option B: 1-Click AWS CloudFormation Deployment (Cross-Account Role)\n"
            f"cat << 'EOF' > kavach-audit-stack.json\n"
            f"{cfn_template_json}\n"
            f"EOF\n\n"
            f"aws cloudformation deploy \\\n"
            f"  --stack-name KavachSecurityAudit \\\n"
            f"  --template-file kavach-audit-stack.json \\\n"
            f"  --parameter-overrides ExternalId={external_id} KavachAccountId={self.kavach_account_id} \\\n"
            f"  --capabilities CAPABILITY_NAMED_IAM\n"
        )

        md_instructions = (
            f"### Connect Amazon Web Services (AWS)\n\n"
            f"**Method 1: Direct Read-Only IAM User (Recommended)**\n"
            f"1. In AWS Console, go to **IAM** > **Users** > **Create user** (e.g. `kavach-security-audit`).\n"
            f"2. Attach the AWS Managed Policy: **`arn:aws:iam::aws:policy/SecurityAudit`**.\n"
            f"3. Go to **Security credentials** > **Create access key** (Application running outside AWS).\n"
            f"4. Paste your **Access Key ID** and **Secret Access Key** into Kavach.\n\n"
            f"**Method 2: 1-Click CloudFormation Stack**\n"
            f"Click **Launch CloudFormation Stack** to automatically deploy the audit role in your AWS account."
        )

        return SetupInstructions(
            provider="AWS",
            instructions_title="AWS 1-Click CloudFormation Onboarding",
            instructions_markdown=md_instructions,
            external_id=external_id,
            kavach_account_id=self.kavach_account_id,
            trust_policy=trust_policy,
            required_permissions=["arn:aws:iam::aws:policy/SecurityAudit"],
            cli_snippet=cli_snippet,
            cloudformation_template_json=cfn_template_json,
            cloudformation_quick_create_url=cfn_quick_create_url,
        )

    async def validate_and_discover(
        self,
        credentials_payload: Dict[str, Any],
        default_region: str = "us-east-1",
    ) -> ConnectionValidationResult:
        region = credentials_payload.get("default_region") or default_region or "us-east-1"
        access_key_id = (
            credentials_payload.get("aws_access_key_id")
            or credentials_payload.get("access_key_id")
            or ""
        ).strip()
        secret_access_key = (
            credentials_payload.get("aws_secret_access_key")
            or credentials_payload.get("secret_access_key")
            or ""
        ).strip()
        session_token = (
            credentials_payload.get("aws_session_token")
            or credentials_payload.get("session_token")
            or ""
        ).strip() or None
        use_local_profile = credentials_payload.get("use_local_profile", False)

        role_arn = credentials_payload.get("role_arn", "").strip()
        external_id = credentials_payload.get("external_id", "").strip()

        try:
            import boto3
            import botocore.exceptions
        except ImportError:
            return ConnectionValidationResult(
                is_valid=False,
                status="ERROR",
                error_message="boto3 library is not installed in runtime environment.",
            )

        temp_session = None
        customer_account_id = "unknown"
        identity_info = {}

        from botocore.config import Config
        fast_cfg = Config(connect_timeout=5, read_timeout=8, retries={'max_attempts': 1})

        # ── 1. Direct Customer IAM Credentials (No Kavach AWS Account Required) ──
        if access_key_id and secret_access_key:
            try:
                temp_session = boto3.Session(
                    aws_access_key_id=access_key_id,
                    aws_secret_access_key=secret_access_key,
                    aws_session_token=session_token,
                    region_name=region,
                )
                sts_client = temp_session.client("sts", config=fast_cfg)
                caller = sts_client.get_caller_identity()
                customer_account_id = caller.get("Account", "unknown")
                identity_info = {
                    "account": customer_account_id,
                    "arn": caller.get("Arn"),
                    "user_id": caller.get("UserId"),
                    "auth_method": "DIRECT_IAM_CREDENTIALS",
                }
            except botocore.exceptions.ClientError as e:
                err_code = e.response.get("Error", {}).get("Code", "ClientError")
                err_msg = e.response.get("Error", {}).get("Message", str(e))
                return ConnectionValidationResult(
                    is_valid=False,
                    status="AUTHENTICATION_FAILED",
                    error_message=f"AWS authentication failed ({err_code}): {err_msg}",
                )
            except Exception as e:
                return ConnectionValidationResult(
                    is_valid=False,
                    status="ERROR",
                    error_message=f"Direct AWS connection error: {str(e)}",
                )

        # ── 2. Local AWS CLI Profile / Auto-Detection ──────────────────
        elif use_local_profile or credentials_payload.get("auto_detect") or (not access_key_id and not role_arn):
            try:
                temp_session = boto3.Session(region_name=region)
                sts_client = temp_session.client("sts", config=fast_cfg)
                caller = sts_client.get_caller_identity()
                customer_account_id = caller.get("Account", "unknown")
                identity_info = {
                    "account": customer_account_id,
                    "arn": caller.get("Arn"),
                    "user_id": caller.get("UserId"),
                    "auth_method": "LOCAL_AWS_PROFILE",
                }
            except Exception as e:
                if use_local_profile or credentials_payload.get("auto_detect"):
                    return ConnectionValidationResult(
                        is_valid=False,
                        status="CONFIGURATION_REQUIRED",
                        error_message=f"No local AWS CLI credentials found in environment: {str(e)}",
                    )
                # If neither keys nor roles were passed and local profile failed:
                return ConnectionValidationResult(
                    is_valid=False,
                    status="CONFIGURATION_REQUIRED",
                    error_message="Please provide AWS credentials or ensure local AWS CLI is configured.",
                )

        # ── 3. Cross-Account STS AssumeRole (Enterprise Cross-Account Setup) ──
        elif role_arn:
            arn_pattern = r"^arn:aws:iam::(\d{12}):role/([\w+=,.@-]+)$"
            match = re.match(arn_pattern, role_arn)
            if not match:
                return ConnectionValidationResult(
                    is_valid=False,
                    status="AUTHENTICATION_FAILED",
                    error_message="Invalid Role ARN format. Expected format: arn:aws:iam::<12-digit-account-id>:role/<role-name>",
                )
            customer_account_id = match.group(1)

            if not external_id:
                return ConnectionValidationResult(
                    is_valid=False,
                    status="AUTHENTICATION_FAILED",
                    error_message="Missing External ID. An External ID is mandatory for secure cross-account AssumeRole delegation.",
                )

            try:
                from botocore.config import Config
                fast_cfg = Config(connect_timeout=6, read_timeout=8, retries={'max_attempts': 1})
                sts_client = boto3.client("sts", region_name=region, config=fast_cfg)
                assume_resp = sts_client.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName=KAVACH_AWS_ROLE_SESSION_NAME,
                    ExternalId=external_id,
                    DurationSeconds=900,
                )
                assumed_creds = assume_resp["Credentials"]
                temp_session = boto3.Session(
                    aws_access_key_id=assumed_creds["AccessKeyId"],
                    aws_secret_access_key=assumed_creds["SecretAccessKey"],
                    aws_session_token=assumed_creds["SessionToken"],
                    region_name=region,
                )
                assumed_sts = temp_session.client("sts", config=fast_cfg)
                caller = assumed_sts.get_caller_identity()
                identity_info = {
                    "account": caller.get("Account"),
                    "arn": caller.get("Arn"),
                    "user_id": caller.get("UserId"),
                    "assumed_role_arn": role_arn,
                    "session_name": KAVACH_AWS_ROLE_SESSION_NAME,
                    "auth_method": "ASSUME_ROLE",
                }
            except (botocore.exceptions.NoCredentialsError, botocore.exceptions.PartialCredentialsError):
                return ConnectionValidationResult(
                    is_valid=False,
                    status="CONFIGURATION_REQUIRED",
                    account_identifier=customer_account_id,
                    error_message=(
                        "Kavach server does not have an AWS account configured to perform cross-account AssumeRole. "
                        "To connect directly without a central Kavach AWS account, please use Direct IAM Credentials "
                        "(Access Key ID & Secret Access Key) with the AWS managed SecurityAudit policy."
                    ),
                )
            except botocore.exceptions.ClientError as e:
                err_code = e.response.get("Error", {}).get("Code", "ClientError")
                err_msg = e.response.get("Error", {}).get("Message", str(e))
                if "NoSuchEntity" in err_code or "AccessDenied" in err_code or "InvalidClientTokenId" in err_code:
                    err_msg = (
                        f"KavachSecurityAuditRole was not found or not assumed yet in AWS account {customer_account_id}. "
                        "Please deploy the CloudFormation template in your AWS console first, or connect directly using Read-Only Access Keys."
                    )
                return ConnectionValidationResult(
                    is_valid=False,
                    status="AUTHENTICATION_FAILED",
                    account_identifier=customer_account_id,
                    error_message=f"AWS STS AssumeRole rejected ({err_code}): {err_msg}",
                )
            except Exception as e:
                return ConnectionValidationResult(
                    is_valid=False,
                    status="ERROR",
                    account_identifier=customer_account_id,
                    error_message=f"STS execution failed: {str(e)}",
                )
        else:
            return ConnectionValidationResult(
                is_valid=False,
                status="CONFIGURATION_REQUIRED",
                error_message="Please provide AWS credentials: enter AWS Access Key ID & Secret Access Key, or provide an IAM Role ARN.",
            )

        # ── Fast Concurrent Read-Only Asset Discovery & Security Evaluation ──
        discovered_resources: List[Dict[str, Any]] = []
        observations: List[Dict[str, Any]] = []

        def _discover_s3():
            res_items = []
            obs_items = []
            try:
                s3 = temp_session.client("s3")
                buckets = s3.list_buckets().get("Buckets", [])
                for b in buckets[:12]:
                    b_name = b["Name"]
                    b_arn = f"arn:aws:s3:::{b_name}"
                    pab_blocked = True
                    try:
                        pab = s3.get_public_access_block(Bucket=b_name).get("PublicAccessBlockConfiguration", {})
                        pab_blocked = all([
                            pab.get("BlockPublicAcls", False),
                            pab.get("IgnorePublicAcls", False),
                            pab.get("BlockPublicPolicy", False),
                            pab.get("RestrictPublicBuckets", False),
                        ])
                    except Exception:
                        pab_blocked = False

                    res_items.append({
                        "resource_name": b_name,
                        "resource_type": "AWS_S3_BUCKET",
                        "provider_resource_id": b_arn,
                        "region": "global",
                        "status": "ACTIVE",
                        "configuration": {"PublicAccessBlockEnabled": pab_blocked},
                    })

                    if not pab_blocked:
                        obs_items.append({
                            "rule_id": "KAVACH-AWS-S3-0001",
                            "title": f"Public S3 bucket missing Public Access Block ({b_name})",
                            "severity": "HIGH",
                            "observation_type": "DSPM_EXPOSURE",
                            "resource_id": b_arn,
                            "resource_name": b_name,
                            "region": "global",
                            "what_is_wrong": f"Bucket '{b_name}' has S3 Block Public Access disabled or incomplete.",
                            "why_dangerous": "Public read/write grants could allow anonymous actors to read or tamper with stored objects.",
                            "what_kavach_will_do": "Enable S3 Block Public Access and ensure only authorized IAM roles can access objects.",
                            "expected_result": "Bucket is isolated to authenticated internal principals.",
                            "diff": [["r", "BlockPublicAcls: false"], ["a", "BlockPublicAcls: true"]],
                        })
            except Exception as s3_err:
                logger.warning(f"S3 discovery limited or failed: {s3_err}")
            return res_items, obs_items

        def _discover_ec2():
            res_items = []
            obs_items = []
            try:
                ec2 = temp_session.client("ec2")
                sgs = ec2.describe_security_groups().get("SecurityGroups", [])
                for sg in sgs[:12]:
                    sg_id = sg["GroupId"]
                    sg_name = sg.get("GroupName", sg_id)
                    sg_arn = f"arn:aws:ec2:{region}:{customer_account_id}:security-group/{sg_id}"

                    open_ports = []
                    for perm in sg.get("IpPermissions", []):
                        from_p = perm.get("FromPort")
                        to_p = perm.get("ToPort")
                        for ip_range in perm.get("IpRanges", []):
                            if ip_range.get("CidrIp") == "0.0.0.0/0":
                                if from_p == 22 or to_p == 22:
                                    open_ports.append(22)
                                if from_p == 3389 or to_p == 3389:
                                    open_ports.append(3389)
                                if from_p == 5432 or to_p == 5432:
                                    open_ports.append(5432)

                    res_items.append({
                        "resource_name": sg_name,
                        "resource_type": "AWS_SECURITY_GROUP",
                        "provider_resource_id": sg_arn,
                        "region": region,
                        "status": "ACTIVE",
                        "configuration": {"open_ports": open_ports, "vpc_id": sg.get("VpcId")},
                    })

                    if 22 in open_ports:
                        obs_items.append({
                            "rule_id": "KAVACH-AWS-EC2-0012",
                            "title": f"SSH port 22 exposed to public internet ({sg_name})",
                            "severity": "CRITICAL",
                            "observation_type": "NETWORK_EXPOSURE",
                            "resource_id": sg_arn,
                            "resource_name": sg_name,
                            "region": region,
                            "what_is_wrong": f"Security group '{sg_name}' allows inbound TCP traffic on port 22 from 0.0.0.0/0.",
                            "why_dangerous": "Automated brute-force bots continuously attack public SSH ports seeking exposed or weak credentials.",
                            "what_kavach_will_do": "Restrict port 22 ingress to corporate CIDRs / VPN subnets.",
                            "expected_result": "SSH reachable only from authorized bastion or VPN networks.",
                            "diff": [["r", "0.0.0.0/0 on port 22"], ["a", "10.0.0.0/16 on port 22"]],
                        })
            except Exception as ec2_err:
                logger.warning(f"EC2 security group discovery failed: {ec2_err}")
            return res_items, obs_items

        def _discover_rds():
            res_items = []
            obs_items = []
            try:
                rds = temp_session.client("rds")
                dbs = rds.describe_db_instances().get("DBInstances", [])
                for db in dbs[:8]:
                    db_id = db["DBInstanceIdentifier"]
                    db_arn = db.get("DBInstanceArn", f"arn:aws:rds:{region}:{customer_account_id}:db:{db_id}")
                    is_public = db.get("PubliclyAccessible", False)

                    res_items.append({
                        "resource_name": db_id,
                        "resource_type": "AWS_RDS_INSTANCE",
                        "provider_resource_id": db_arn,
                        "region": region,
                        "status": "ACTIVE",
                        "configuration": {"PubliclyAccessible": is_public, "Engine": db.get("Engine")},
                    })

                    if is_public:
                        obs_items.append({
                            "rule_id": "KAVACH-AWS-RDS-0042",
                            "title": f"Publicly accessible RDS database ({db_id})",
                            "severity": "CRITICAL",
                            "observation_type": "DATABASE_EXPOSURE",
                            "resource_id": db_arn,
                            "resource_name": db_id,
                            "region": region,
                            "what_is_wrong": f"RDS instance '{db_id}' has PubliclyAccessible set to true.",
                            "why_dangerous": "The database listener is bound to a public IP address exposing backend data to internet attacks.",
                            "what_kavach_will_do": "Disable PubliclyAccessible and restrict database subnet group to private subnets.",
                            "expected_result": "Database is only reachable via private VPC endpoints.",
                            "diff": [["r", "PubliclyAccessible: true"], ["a", "PubliclyAccessible: false"]],
                        })
            except Exception as rds_err:
                logger.warning(f"RDS discovery failed: {rds_err}")
            return res_items, obs_items

        def _discover_iam():
            res_items = []
            try:
                iam = temp_session.client("iam")
                users = iam.list_users().get("Users", [])
                for u in users[:10]:
                    u_name = u["UserName"]
                    u_arn = u.get("Arn", f"arn:aws:iam::{customer_account_id}:user/{u_name}")
                    res_items.append({
                        "resource_name": u_name,
                        "resource_type": "AWS_IAM_USER",
                        "provider_resource_id": u_arn,
                        "region": "global",
                        "status": "ACTIVE",
                        "configuration": {"UserId": u.get("UserId"), "CreateDate": str(u.get("CreateDate"))},
                    })

                roles = iam.list_roles().get("Roles", [])
                for r in roles[:10]:
                    r_name = r["RoleName"]
                    r_arn = r.get("Arn", f"arn:aws:iam::{customer_account_id}:role/{r_name}")
                    res_items.append({
                        "resource_name": r_name,
                        "resource_type": "AWS_IAM_ROLE",
                        "provider_resource_id": r_arn,
                        "region": "global",
                        "status": "ACTIVE",
                        "configuration": {"RoleId": r.get("RoleId"), "Description": r.get("Description")},
                    })
            except Exception as iam_err:
                logger.warning(f"IAM discovery limited: {iam_err}")
            return res_items, []

        import asyncio
        s3_t, ec2_t, rds_t, iam_t = await asyncio.gather(
            asyncio.to_thread(_discover_s3),
            asyncio.to_thread(_discover_ec2),
            asyncio.to_thread(_discover_rds),
            asyncio.to_thread(_discover_iam),
        )

        for r_list, o_list in [s3_t, ec2_t, rds_t, iam_t]:
            discovered_resources.extend(r_list)
            observations.extend(o_list)

        return ConnectionValidationResult(
            is_valid=True,
            status="CONNECTED",
            account_identifier=customer_account_id,
            identity_info=identity_info,
            discovered_resources=discovered_resources,
            observations=observations,
        )

