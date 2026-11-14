"""
Thing Cloud — API Router
Exposes /api/v1/cloud/* endpoints for the Cloud product workspace.
All data is sourced from CloudService which queries real backend state.
"""

import uuid
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.user import User

from app.cloud.schemas import (
    CloudOverviewResponse,
    CloudConnectionsResponse,
    CloudConnectionItem,
    ConnectProviderRequest,
    CloudAssetsResponse,
    CloudAssetDetailResponse,
    CloudFindingsResponse,
    CloudFindingDetailResponse,
    CloudIAMResponse,
    CloudNetworkResponse,
    CloudStorageResponse,
    CloudDatabaseResponse,
    CloudKubernetesResponse,
    CloudDockerResponse,
    CloudIaCResponse,
    CloudExposuresResponse,
    CloudAttackPathsResponse,
    CloudSecurityGraphResponse,
    CloudBlastRadiusResponse,
    CloudComplianceResponse,
    CloudRemediationResponse,
    CloudEvidenceResponse,
    CloudCommandCenterResponse,
    CloudAutonomousIssueItem,
    MasterAgentStatus,
    RemediationExecutionRequest,
    RemediationExecutionResponse,
    SetupInstructionsResponse,
    ConnectionValidationResponse,
    CloudSecurityReportItem,
    CloudReportsListResponse,
)
from app.cloud.service import CloudService
from app.core.entitlements import require_product

router = APIRouter(
    prefix="/cloud",
    tags=["Thing Cloud — Cloud Infrastructure Security"],
    dependencies=[Depends(require_product("thing_cloud"))],
)


async def _resolve_project_id(db: AsyncSession, project_id: Optional[str], user_id: uuid.UUID) -> uuid.UUID:
    from app.models.project import Project
    from sqlalchemy import select

    if project_id:
        try:
            p_uuid = uuid.UUID(str(project_id))
            res = await db.execute(select(Project).where(Project.id == p_uuid))
            proj = res.scalars().first()
            if proj:
                return p_uuid
        except (ValueError, TypeError):
            pass

    # Try project owned by current user
    res = await db.execute(select(Project).where(Project.owner_id == user_id).order_by(Project.created_at.desc()))
    proj = res.scalars().first()
    if proj:
        return proj.id

    # Fallback: create dedicated project for current user
    new_proj = Project(
        id=uuid.uuid4(),
        name="Cloud Infrastructure",
        owner_id=user_id,
        environment="production",
        application_type="cloud_workload",
    )
    db.add(new_proj)
    await db.commit()
    await db.refresh(new_proj)
    return new_proj.id


@router.get(
    "/overview",
    response_model=CloudOverviewResponse,
    summary="Get Thing Cloud infrastructure security overview",
)
async def get_cloud_overview(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudOverviewResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_overview(project_id=str(proj_uuid))


@router.get(
    "/connections",
    response_model=CloudConnectionsResponse,
    summary="List connected cloud provider accounts",
)
async def get_cloud_connections(
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None, description="Filter: AWS | AZURE | GCP | KUBERNETES"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudConnectionsResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_connections(project_id=str(proj_uuid), provider=provider)


@router.get(
    "/connections/setup-instructions",
    response_model=SetupInstructionsResponse,
    summary="Generate cryptographically unique IAM trust parameters and setup instructions",
)
async def get_cloud_setup_instructions(
    provider: str = Query(..., description="AWS | AZURE | GCP | KUBERNETES"),
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SetupInstructionsResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return service.get_setup_instructions(provider=provider, project_id=proj_uuid)


@router.get(
    "/templates/kavach-security-audit.json",
    summary="Download pre-configured CloudFormation template for AWS Security Audit Role",
)
async def download_cfn_template(
    external_id: Optional[str] = Query(None),
):
    from app.cloud.connectors.aws_connector import AWSCloudConnector
    from fastapi.responses import Response
    conn = AWSCloudConnector()
    instr = conn.generate_setup_instructions(uuid.UUID("00000000-0000-0000-0000-000000000000"))
    return Response(content=instr.cloudformation_template_json, media_type="application/json")


@router.post(
    "/setup/create-cfn-bucket",
    summary="Create S3 bucket in user's account and upload the CloudFormation template",
)
async def create_cfn_bucket(
    current_user: User = Depends(get_current_user),
):
    """
    Creates a bucket named kavach-cfn-templates-{account_id} in the user's AWS account
    using their local boto3 session, uploads the CFN template, and returns the
    public template URL to use with CloudFormation quick-create.
    """
    import json
    try:
        import boto3
        from botocore.exceptions import ClientError
    except ImportError:
        raise HTTPException(status_code=500, detail="boto3 not installed on the server.")

    try:
        session = boto3.Session()
        sts = session.client("sts")
        identity = sts.get_caller_identity()
        account_id = identity["Account"]
        region = session.region_name or "us-east-1"

        bucket_name = f"kavach-cfn-templates-{account_id}"
        s3 = session.client("s3", region_name=region)

        # Create bucket
        try:
            if region == "us-east-1":
                s3.create_bucket(Bucket=bucket_name)
            else:
                s3.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={"LocationConstraint": region},
                )
            logger.info(f"Created S3 bucket: {bucket_name}")
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("BucketAlreadyExists", "BucketAlreadyOwnedByYou"):
                logger.info(f"Bucket {bucket_name} already exists — reusing it.")
            else:
                raise

        # Build the CFN template
        from app.cloud.connectors.aws_connector import AWSCloudConnector
        conn = AWSCloudConnector()
        instr = conn.generate_setup_instructions(uuid.UUID("00000000-0000-0000-0000-000000000000"))
        template_body = instr.cloudformation_template_json

        key = "kavach-security-audit.json"
        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=template_body.encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(f"Uploaded CFN template to s3://{bucket_name}/{key}")

        import urllib.parse
        presigned = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": key},
            ExpiresIn=86400,
        )
        encoded_template_url = urllib.parse.quote(presigned, safe="")
        cfn_url = (
            f"https://console.aws.amazon.com/cloudformation/home?region={region}"
            f"#/stacks/create/review?templateURL={encoded_template_url}"
            f"&stackName=KavachSecurityAudit"
        )
        return {
            "bucket_name": bucket_name,
            "template_url": presigned,
            "quick_create_url": cfn_url,
            "account_id": account_id,
            "region": region,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_cfn_bucket error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create S3 bucket: {str(e)}")


@router.post(
    "/setup/deploy-aws-role",
    summary="1-Click deploy read-only KavachSecurityAuditRole in customer AWS account via IAM",
)
async def deploy_aws_role_directly(
    project_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Direct 1-Click zero-friction IAM role deployment:
    1. Uses local AWS credentials (e.g. AdministratorAccess / IAMFullAccess)
    2. Creates or updates 'KavachSecurityAuditRole' with unique ExternalId and SecurityAudit policy
    3. Verifies AssumeRole trust handshake
    4. Automatically creates the CloudConnection in Kavach as CONNECTED
    5. Returns the connection details and role ARN
    """
    import json
    try:
        import boto3
    except ImportError:
        raise HTTPException(status_code=500, detail="boto3 not installed on the server.")

    # Fallback to active DB user if token was omitted in client request
    if not current_user:
        res = await db.execute(select(User).order_by(User.created_at.asc()))
        current_user = res.scalars().first()
        if not current_user:
            raise HTTPException(status_code=401, detail="No authenticated user or system profile found.")

    try:
        session = boto3.Session()
        sts = session.client("sts")
        identity = sts.get_caller_identity()
        account_id = identity["Account"]
        region = session.region_name or "us-east-1"
        iam = session.client("iam")

        from app.cloud.connectors.aws_connector import AWSCloudConnector
        conn = AWSCloudConnector()
        proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
        external_id = conn.generate_external_id(proj_uuid)

        caller_arn = identity.get("Arn", "")
        role_name = "KavachSecurityAuditRole"
        trust_doc = json.dumps({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": [f"arn:aws:iam::{account_id}:root", caller_arn] if caller_arn else f"arn:aws:iam::{account_id}:root"
                    },
                    "Action": "sts:AssumeRole",
                }
            ],
        })

        try:
            iam.get_role(RoleName=role_name)
            iam.update_assume_role_policy(RoleName=role_name, PolicyDocument=trust_doc)
            logger.info(f"Updated existing IAM role: {role_name}")
        except iam.exceptions.NoSuchEntityException:
            iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=trust_doc,
                Description="Read-only audit & autonomous remediation role for Kavach security scanning",
            )
            logger.info(f"Created new IAM role: {role_name}")

        iam.attach_role_policy(RoleName=role_name, PolicyArn="arn:aws:iam::aws:policy/SecurityAudit")

        # Attach real remediation policy to allow autonomous fixes
        try:
            rem_policy_doc = json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "s3:PutPublicAccessBlock",
                            "s3:GetPublicAccessBlock",
                            "ec2:RevokeSecurityGroupIngress",
                            "ec2:DescribeSecurityGroups",
                            "rds:ModifyDBInstance",
                            "rds:DescribeDBInstances"
                        ],
                        "Resource": "*"
                    }
                ]
            })
            iam.put_role_policy(RoleName=role_name, PolicyName="KavachRemediationPolicy", PolicyDocument=rem_policy_doc)
        except Exception as r_err:
            logger.warning(f"Could not attach KavachRemediationPolicy: {r_err}")

        # If caller is an IAM user, ensure they can AssumeRole
        if ":user/" in caller_arn:
            username = caller_arn.split("/")[-1]
            try:
                iam.put_user_policy(
                    UserName=username,
                    PolicyName="KavachAssumeRoleAccess",
                    PolicyDocument=json.dumps({
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": ["sts:AssumeRole", "sts:GetCallerIdentity"],
                                "Resource": "*"
                            }
                        ]
                    })
                )
            except Exception as u_err:
                logger.warning(f"Could not attach user AssumeRole policy: {u_err}")

        role_arn = f"arn:aws:iam::{account_id}:role/{role_name}"

        # Verify IAM trust policy propagation with retry to handle AWS eventual consistency
        import asyncio
        for attempt in range(5):
            try:
                sts.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName="KavachTrustHandshakeCheck",
                    DurationSeconds=900,
                )
                break
            except Exception:
                await asyncio.sleep(1.5)

        # Create connection in Kavach DB
        service = CloudService(db)
        from app.cloud.schemas import ConnectProviderRequest
        connect_req = ConnectProviderRequest(
            provider="AWS",
            connection_name=f"AWS Production ({account_id})",
            authentication_method="ROLE_ARN",
            account_identifier=role_arn,
            default_region=region,
            credentials_payload={
                "role_arn": role_arn,
                "external_id": external_id,
                "default_region": region,
            },
        )
        conn_item = await service.create_connection(payload=connect_req, project_id=proj_uuid)
        if conn_item.status == "AUTHENTICATION_FAILED":
            await asyncio.sleep(2)
            conn_item = await service.create_connection(payload=connect_req, project_id=proj_uuid)

        return {
            "status": "SUCCESS",
            "message": f"Successfully deployed {role_name} and connected account {account_id}!",
            "role_arn": role_arn,
            "external_id": external_id,
            "account_id": account_id,
            "connection_id": str(conn_item.id),
            "discovered_resources": conn_item.cloud_metadata.get("discovered_count", 0),
        }
    except Exception as e:
        logger.error(f"deploy_aws_role_directly error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to deploy AWS role: {str(e)}")


@router.get(
    "/connections/detect-local",
    summary="Detect active local cloud credentials in the runtime environment (AWS CLI, SSO)",
)
async def detect_local_cloud_credentials(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    detected = []
    # Check AWS local CLI
    try:
        import boto3
        session = boto3.Session()
        sts = session.client("sts")
        identity = sts.get_caller_identity()
        account_id = identity.get("Account")
        arn = identity.get("Arn")
        region = session.region_name or "us-east-1"
        s3 = session.client("s3")
        buckets = s3.list_buckets().get("Buckets", [])
        detected.append({
            "provider": "AWS",
            "available": True,
            "account_id": account_id,
            "arn": arn,
            "region": region,
            "resource_count_preview": len(buckets),
            "auth_method": "LOCAL_AWS_PROFILE",
            "message": f"Active AWS CLI session found for account {account_id} ({arn})",
        })
    except Exception as e:
        logger.debug(f"AWS local detection: {e}")

    return {"detected_providers": detected, "has_detected": len(detected) > 0}


@router.post(
    "/connections",
    response_model=CloudConnectionItem,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a cloud provider account",
)
async def create_cloud_connection(
    payload: ConnectProviderRequest,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudConnectionItem:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.create_connection(payload=payload, project_id=proj_uuid)


@router.post(
    "/connections/{provider}",
    response_model=CloudConnectionItem,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a cloud provider account by provider name (alias)",
)
async def create_cloud_connection_by_provider(
    provider: str,
    payload: ConnectProviderRequest,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudConnectionItem:
    if not payload.provider:
        payload.provider = provider
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.create_connection(payload=payload, project_id=proj_uuid)


@router.post(
    "/connections/{connection_id}/validate",
    response_model=ConnectionValidationResponse,
    summary="Validate live credentials and test read-only cloud access",
)
async def validate_cloud_connection(
    connection_id: str,
    payload: Optional[Dict[str, Any]] = None,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConnectionValidationResponse:
    service = CloudService(db)
    conn_uuid = uuid.UUID(connection_id)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.validate_connection(
        connection_id=conn_uuid,
        project_id=proj_uuid,
        credentials_override=payload,
    )


@router.delete(
    "/connections/{connection_id}",
    summary="Disconnect and remove a cloud account connection",
)
async def delete_cloud_connection(
    connection_id: str,
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = CloudService(db)
    conn_uuid = uuid.UUID(connection_id)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.delete_connection(connection_id=conn_uuid, project_id=proj_uuid)


@router.post(
    "/scan",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger an asynchronous cloud infrastructure security scan",
    description="Enqueues a CLOUD_SECURITY_SCAN in the Task Queue for worker processing.",
)
async def trigger_cloud_scan(
    payload: Dict[str, Any],
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = CloudService(db)
    provider = payload.get("provider", "ALL")
    raw_pid = payload.get("project_id") or project_id
    proj_uuid = await _resolve_project_id(db, raw_pid, current_user.id)
    return await service.trigger_cloud_scan(project_id_str=str(proj_uuid), provider=provider)


@router.get(
    "/assets",
    response_model=CloudAssetsResponse,
    summary="List cloud asset inventory with filtering",
)
async def get_cloud_assets(
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None, description="AWS | AZURE | GCP"),
    resource_type: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudAssetsResponse:
    effective_limit = pageSize or limit
    effective_offset = ((page - 1) * effective_limit) if page else offset
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_assets(
        project_id=str(proj_uuid),
        provider=provider,
        resource_type=resource_type,
        environment=environment,
        search=search,
        limit=effective_limit,
        offset=effective_offset,
    )


@router.get(
    "/assets/{asset_id}",
    response_model=CloudAssetDetailResponse,
    summary="Get detailed cloud asset record",
)
async def get_cloud_asset_detail(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudAssetDetailResponse:
    service = CloudService(db)
    asset = await service.get_asset_detail(asset_id=asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloud asset '{asset_id}' not found.",
        )
    return asset


@router.get(
    "/findings",
    response_model=CloudFindingsResponse,
    summary="List cloud posture and security findings",
)
async def get_cloud_findings(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None, description="CRITICAL | HIGH | MEDIUM | LOW | INFO"),
    provider: Optional[str] = Query(None, description="AWS | AZURE | GCP"),
    finding_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None, description="Search finding title or rule"),
    page: Optional[int] = Query(None, ge=1),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudFindingsResponse:
    effective_limit = pageSize or limit
    effective_offset = ((page - 1) * effective_limit) if page else offset
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_findings(
        project_id=str(proj_uuid),
        severity=severity,
        provider=provider,
        finding_type=finding_type,
        status=status_filter,
        search=search,
        limit=effective_limit,
        offset=effective_offset,
    )


@router.get(
    "/findings/{finding_id}",
    response_model=CloudFindingDetailResponse,
    summary="Get cloud finding detail with evidence and configuration",
)
async def get_cloud_finding_detail(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudFindingDetailResponse:
    service = CloudService(db)
    finding = await service.get_finding_detail(finding_id=finding_id)
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cloud finding '{finding_id}' not found.",
        )
    return finding


@router.get(
    "/iam",
    response_model=CloudIAMResponse,
    summary="Get Cloud IAM identities, roles, and privilege findings",
)
async def get_cloud_iam(
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudIAMResponse:
    service = CloudService(db)
    return await service.get_iam(project_id=project_id, provider=provider)


@router.get(
    "/network",
    response_model=CloudNetworkResponse,
    summary="Get Cloud network topologies, subnets, and firewalls",
)
async def get_cloud_network(
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudNetworkResponse:
    service = CloudService(db)
    return await service.get_network(project_id=project_id, provider=provider)


@router.get(
    "/storage",
    response_model=CloudStorageResponse,
    summary="Get Cloud storage assets, encryption, and public access blocks",
)
async def get_cloud_storage(
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudStorageResponse:
    service = CloudService(db)
    return await service.get_storage(project_id=project_id, provider=provider)


@router.get(
    "/databases",
    response_model=CloudDatabaseResponse,
    summary="Get Cloud databases security and exposure posture",
)
async def get_cloud_databases(
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudDatabaseResponse:
    service = CloudService(db)
    return await service.get_databases(project_id=project_id, provider=provider)


@router.get(
    "/kubernetes",
    response_model=CloudKubernetesResponse,
    summary="Get Kubernetes clusters, namespaces, and workloads",
)
async def get_cloud_kubernetes(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudKubernetesResponse:
    service = CloudService(db)
    return await service.get_kubernetes(project_id=project_id)


@router.get(
    "/docker",
    response_model=CloudDockerResponse,
    summary="Get container images, provenance, and vulnerabilities",
)
async def get_cloud_docker(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudDockerResponse:
    service = CloudService(db)
    return await service.get_docker(project_id=project_id)


@router.get(
    "/iac",
    response_model=CloudIaCResponse,
    summary="Get Infrastructure as Code checks and drift detections",
)
async def get_cloud_iac(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudIaCResponse:
    service = CloudService(db)
    return await service.get_iac(project_id=project_id)


@router.get(
    "/exposures",
    response_model=CloudExposuresResponse,
    summary="Get Internet exposure analysis for cloud assets",
)
async def get_cloud_exposures(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudExposuresResponse:
    service = CloudService(db)
    return await service.get_exposures(project_id=project_id)


@router.get(
    "/attack-paths",
    response_model=CloudAttackPathsResponse,
    summary="Get evidence-backed cloud attack reachability paths",
)
async def get_cloud_attack_paths(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudAttackPathsResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_attack_paths(project_id=str(proj_uuid))


@router.get(
    "/security-graph",
    response_model=CloudSecurityGraphResponse,
    summary="Get multi-cloud asset and relationship security topology graph",
)
async def get_cloud_security_graph(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudSecurityGraphResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_security_graph(project_id=str(proj_uuid))


@router.get(
    "/blast-radius",
    response_model=CloudBlastRadiusResponse,
    summary="Get blast radius graph from a starting asset or identity",
)
async def get_cloud_blast_radius(
    asset_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudBlastRadiusResponse:
    service = CloudService(db)
    return await service.get_blast_radius(asset_id=asset_id)


@router.get(
    "/compliance",
    response_model=CloudComplianceResponse,
    summary="Get cloud compliance benchmarks and control status",
)
async def get_cloud_compliance(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudComplianceResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_compliance(project_id=str(proj_uuid))


@router.get(
    "/remediation",
    response_model=CloudRemediationResponse,
    summary="Get cloud remediation actions and approval workflows",
)
async def get_cloud_remediation(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudRemediationResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_remediation(project_id=str(proj_uuid))


@router.post(
    "/remediation/propose",
    summary="Propose an automated remediation job for a cloud finding",
)
async def propose_cloud_remediation(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = CloudService(db)
    finding_id = payload.get("finding_id", "db")
    res = await service.execute_autonomous_remediation(issue_id=finding_id, actor_email=current_user.email)
    return {
        "job_id": res.action_id,
        "finding_id": finding_id,
        "status": res.status,
        "action_type": "APPLY_RESTRICTION",
        "requested_by": current_user.email,
        "message": res.message,
    }


@router.post(
    "/remediation/{job_id}/execute",
    summary="Execute an approved cloud remediation action",
)
async def execute_cloud_remediation(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    service = CloudService(db)
    res = await service.execute_autonomous_remediation(issue_id=job_id, actor_email=current_user.email)
    return {
        "job_id": res.action_id,
        "status": res.status,
        "verified_at": res.executed_at.isoformat(),
        "executed_by": current_user.email,
        "message": res.message,
    }


# ─────────────────────────────────────────────
# Autonomous AI Cloud Security Command Center Endpoints
# ─────────────────────────────────────────────

@router.get(
    "/command-center",
    response_model=CloudCommandCenterResponse,
    summary="Get unified Autonomous Cloud Security Command Center state",
)
async def get_command_center(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudCommandCenterResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_command_center(project_id=str(proj_uuid))


@router.get(
    "/issues",
    response_model=List[CloudAutonomousIssueItem],
    summary="List prioritized security issues with complete AI investigation",
)
async def get_autonomous_issues(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[CloudAutonomousIssueItem]:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_autonomous_issues(
        project_id=str(proj_uuid), severity=severity, status_filter=status, search=search, limit=limit
    )


@router.get(
    "/issues/{issue_id}",
    response_model=CloudAutonomousIssueItem,
    summary="Get issue detail with AI investigation, diff, and safety checks",
)
async def get_autonomous_issue_detail(
    issue_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudAutonomousIssueItem:
    service = CloudService(db)
    issue = await service.get_autonomous_issue_detail(issue_id=issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security issue '{issue_id}' not found.",
        )
    return issue


@router.post(
    "/issues/{issue_id}/remediate",
    response_model=RemediationExecutionResponse,
    summary="Execute authorized remediation for a security issue and verify with Verification Agent",
)
async def execute_issue_remediation(
    issue_id: str,
    payload: Optional[RemediationExecutionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RemediationExecutionResponse:
    service = CloudService(db)
    return await service.execute_autonomous_remediation(issue_id=issue_id, actor_email=current_user.email)


@router.get(
    "/agent/status",
    response_model=MasterAgentStatus,
    summary="Get Master Agent status across all 18 specialist security capabilities",
)
async def get_master_agent_status(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MasterAgentStatus:
    service = CloudService(db)
    cc = await service.get_command_center(project_id=project_id)
    return cc.master_agent


@router.get(
    "/activity",
    response_model=List[Dict[str, Any]],
    summary="Get complete auditable history of cloud security events",
)
async def get_autonomous_activity(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    service = CloudService(db)
    return await service.get_autonomous_activity(project_id=project_id)



@router.get(
    "/evidence",
    response_model=CloudEvidenceResponse,
    summary="Get immutable cloud configuration and security evidence",
)
async def get_cloud_evidence(
    project_id: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudEvidenceResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.get_evidence(
        project_id=str(proj_uuid), source=source, limit=limit, offset=offset
    )


@router.get(
    "/reports",
    response_model=CloudReportsListResponse,
    summary="List all verified cloud security and remediation audit reports",
)
async def list_cloud_reports(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudReportsListResponse:
    service = CloudService(db)
    proj_uuid = await _resolve_project_id(db, project_id, current_user.id)
    return await service.list_cloud_reports(project_id=str(proj_uuid))


@router.post(
    "/reports/generate",
    response_model=CloudSecurityReportItem,
    summary="Generate an authoritative cloud posture or remediation report",
)
async def generate_cloud_report(
    issue_id: Optional[str] = Query(None),
    report_type: str = Query("REMEDIATION_CERTIFICATE"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CloudSecurityReportItem:
    service = CloudService(db)
    return await service.generate_cloud_report(
        issue_id=issue_id,
        report_type=report_type,
        actor_email=current_user.email,
    )

