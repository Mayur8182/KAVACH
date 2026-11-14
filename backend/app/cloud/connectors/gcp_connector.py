"""
GCP Read-Only Cloud Connector for Kavach
Implements Google Cloud Platform Service Account / Workload Identity Federation
with roles/viewer and roles/cloudasset.viewer read-only scoping.
"""

import json
import logging
import uuid
from typing import Any, Dict, List, Optional
import httpx

from app.cloud.connectors.base import (
    CloudConnectorBase,
    ConnectionValidationResult,
    SetupInstructions,
)

logger = logging.getLogger("kavach.cloud.gcp_connector")


class GCPCloudConnector(CloudConnectorBase):
    def generate_setup_instructions(self, project_id: uuid.UUID) -> SetupInstructions:
        cli_snippet = (
            f"# 1. Create a dedicated read-only service account\n"
            f'gcloud iam service-accounts create kavach-audit \\\n'
            f'  --description="Read-only security audit service account for Kavach" \\\n'
            f'  --display-name="KavachCloudAudit"\n\n'
            f"# 2. Grant roles/viewer read-only role on the project\n"
            f'gcloud projects add-iam-policy-binding <GCP_PROJECT_ID> \\\n'
            f'  --member="serviceAccount:kavach-audit@<GCP_PROJECT_ID>.iam.gserviceaccount.com" \\\n'
            f'  --role="roles/viewer"\n'
        )

        md_instructions = (
            f"### Connect Google Cloud Platform (GCP) via Read-Only Service Account\n\n"
            f"1. Open the **Google Cloud Console** and select your target project.\n"
            f"2. Navigate to **IAM & Admin** > **Service Accounts** > **Create Service Account**.\n"
            f"3. Name the account `kavach-audit`.\n"
            f"4. Assign the role: **`Viewer`** (`roles/viewer`) or **`Cloud Asset Viewer`**.\n"
            f"5. Create a JSON key for this service account.\n"
            f"6. Provide the **GCP Project ID** and the JSON key contents below for credential validation."
        )

        return SetupInstructions(
            provider="GCP",
            instructions_title="GCP Service Account / Workload Identity (Viewer Role)",
            instructions_markdown=md_instructions,
            required_permissions=["roles/viewer", "roles/cloudasset.viewer"],
            cli_snippet=cli_snippet,
        )

    async def validate_and_discover(
        self,
        credentials_payload: Dict[str, Any],
        default_region: str = "asia-south1",
    ) -> ConnectionValidationResult:
        gcp_project_id = credentials_payload.get("gcp_project_id", "").strip()
        service_account_json_raw = credentials_payload.get("service_account_json") or credentials_payload.get("credentials_json")

        if not gcp_project_id:
            return ConnectionValidationResult(
                is_valid=False,
                status="AUTHENTICATION_FAILED",
                error_message="Missing GCP Project ID. A valid GCP Project ID is required.",
            )

        # Parse service account JSON if provided
        sa_data = {}
        if service_account_json_raw:
            if isinstance(service_account_json_raw, dict):
                sa_data = service_account_json_raw
            elif isinstance(service_account_json_raw, str):
                try:
                    sa_data = json.loads(service_account_json_raw)
                except json.JSONDecodeError:
                    return ConnectionValidationResult(
                        is_valid=False,
                        status="AUTHENTICATION_FAILED",
                        account_identifier=gcp_project_id,
                        error_message="Invalid Service Account JSON. Ensure the pasted payload is valid JSON.",
                    )

        client_email = sa_data.get("client_email")
        private_key = sa_data.get("private_key")

        # Validate token using google-auth if installed
        access_token = None
        if client_email and private_key:
            try:
                from google.oauth2 import service_account
                import google.auth.transport.requests

                credentials = service_account.Credentials.from_service_account_info(
                    sa_data,
                    scopes=["https://www.googleapis.com/auth/cloud-platform.read-only"],
                )
                request = google.auth.transport.requests.Request()
                credentials.refresh(request)
                access_token = credentials.token
            except Exception as auth_err:
                logger.error(f"GCP service account authentication failed: {auth_err}")
                return ConnectionValidationResult(
                    is_valid=False,
                    status="AUTHENTICATION_FAILED",
                    account_identifier=gcp_project_id,
                    error_message=f"Google OAuth2 authentication rejected: {str(auth_err)}",
                )
        else:
            return ConnectionValidationResult(
                is_valid=False,
                status="AUTHENTICATION_FAILED",
                account_identifier=gcp_project_id,
                error_message="Missing Google Service Account credentials (client_email or private_key).",
            )

        discovered_resources = []
        observations = []

        # Query Cloud Resource Manager or Compute Engine
        if access_token:
            headers = {"Authorization": f"Bearer {access_token}"}
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    # Test project metadata
                    p_url = f"https://cloudresourcemanager.googleapis.com/v1/projects/{gcp_project_id}"
                    p_resp = await client.get(p_url, headers=headers)
                    if p_resp.status_code == 200:
                        p_data = p_resp.json()
                        discovered_resources.append({
                            "resource_name": p_data.get("name", gcp_project_id),
                            "resource_type": "GCP_PROJECT",
                            "provider_resource_id": f"//cloudresourcemanager.googleapis.com/projects/{gcp_project_id}",
                            "region": "global",
                            "status": "ACTIVE",
                            "configuration": {"projectNumber": p_data.get("projectNumber")},
                        })
                    else:
                        logger.warning(f"GCP project query returned {p_resp.status_code}: {p_resp.text[:200]}")
                except Exception as gcp_err:
                    logger.warning(f"GCP discovery query error: {gcp_err}")

        return ConnectionValidationResult(
            is_valid=True,
            status="CONNECTED",
            account_identifier=gcp_project_id,
            identity_info={
                "project_id": gcp_project_id,
                "client_email": client_email,
            },
            discovered_resources=discovered_resources,
            observations=observations,
        )

