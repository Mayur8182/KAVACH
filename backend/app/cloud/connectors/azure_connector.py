"""
Azure Read-Only Cloud Connector for Kavach
Implements Microsoft Entra ID (Azure AD) Service Principal authentication
with Reader role scoping via Azure Resource Manager (ARM).
"""

import logging
import uuid
from typing import Any, Dict, List, Optional
import httpx

from app.cloud.connectors.base import (
    CloudConnectorBase,
    ConnectionValidationResult,
    SetupInstructions,
)

logger = logging.getLogger("kavach.cloud.azure_connector")


class AzureCloudConnector(CloudConnectorBase):
    def generate_setup_instructions(self, project_id: uuid.UUID) -> SetupInstructions:
        cli_snippet = (
            f"# 1. Sign in to your Azure subscription\n"
            f"az login\n\n"
            f"# 2. Create Service Principal with Reader role scoped to your subscription\n"
            f'az ad sp create-for-rbac --name "KavachCloudSecurityAudit" \\\n'
            f'  --role "Reader" \\\n'
            f'  --scopes "/subscriptions/<YOUR_SUBSCRIPTION_ID>"\n'
        )

        md_instructions = (
            f"### Connect Microsoft Azure via Service Principal (Reader Role)\n\n"
            f"1. Open **Microsoft Entra ID** (formerly Azure AD) in Azure Portal.\n"
            f"2. Navigate to **App registrations** > **New registration**.\n"
            f"3. Name the application `KavachCloudSecurityAudit`.\n"
            f"4. Under **Certificates & secrets**, generate a new Client Secret.\n"
            f"5. Navigate to your **Subscription** > **Access control (IAM)** > **Add role assignment**.\n"
            f"6. Assign the **`Reader`** role to `KavachCloudSecurityAudit`.\n"
            f"7. Provide the **Tenant ID**, **Client ID**, **Client Secret**, and **Subscription ID** below."
        )

        return SetupInstructions(
            provider="AZURE",
            instructions_title="Azure Service Principal + Reader Role",
            instructions_markdown=md_instructions,
            required_permissions=["Microsoft.Resources/subscriptions/read", "Microsoft.Authorization/roleAssignments/read"],
            cli_snippet=cli_snippet,
        )

    async def validate_and_discover(
        self,
        credentials_payload: Dict[str, Any],
        default_region: str = "Central India",
    ) -> ConnectionValidationResult:
        tenant_id = credentials_payload.get("tenant_id", "").strip()
        client_id = credentials_payload.get("client_id", "").strip()
        client_secret = credentials_payload.get("client_secret", "").strip()
        subscription_id = credentials_payload.get("subscription_id", "").strip()

        if not all([tenant_id, client_id, client_secret, subscription_id]):
            return ConnectionValidationResult(
                is_valid=False,
                status="AUTHENTICATION_FAILED",
                error_message="Missing required Azure parameters: Tenant ID, Client ID, Client Secret, and Subscription ID must all be provided.",
            )

        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        token_data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://management.azure.com/.default",
        }

        access_token = None
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(token_url, data=token_data)
                if resp.status_code != 200:
                    err_json = resp.json() if "application/json" in resp.headers.get("Content-Type", "") else {}
                    err_desc = err_json.get("error_description", resp.text)
                    return ConnectionValidationResult(
                        is_valid=False,
                        status="AUTHENTICATION_FAILED",
                        account_identifier=subscription_id,
                        error_message=f"Azure OAuth2 token request failed ({resp.status_code}): {err_desc[:250]}",
                    )
                access_token = resp.json().get("access_token")
            except httpx.RequestError as e:
                return ConnectionValidationResult(
                    is_valid=False,
                    status="UNAVAILABLE",
                    account_identifier=subscription_id,
                    error_message=f"Could not reach Microsoft Entra login endpoint: {str(e)}",
                )

        # Query Azure Resource Manager
        discovered_resources = []
        observations = []
        arm_headers = {"Authorization": f"Bearer {access_token}"}
        arm_url = f"https://management.azure.com/subscriptions/{subscription_id}/resources?api-version=2021-04-01"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                arm_resp = await client.get(arm_url, headers=arm_headers)
                if arm_resp.status_code == 200:
                    res_data = arm_resp.json().get("value", [])
                    for r in res_data:
                        r_name = r.get("name", "unnamed-resource")
                        r_type = r.get("type", "Microsoft.Resources/generic")
                        r_id = r.get("id", f"/subscriptions/{subscription_id}/resources/{r_name}")
                        r_loc = r.get("location", default_region)

                        discovered_resources.append({
                            "resource_name": r_name,
                            "resource_type": f"AZURE_{r_type.replace('/', '_').upper()}",
                            "provider_resource_id": r_id,
                            "region": r_loc,
                            "status": "ACTIVE",
                            "configuration": {"sku": r.get("sku"), "tags": r.get("tags")},
                        })
                else:
                    logger.warning(f"ARM resource query returned {arm_resp.status_code}: {arm_resp.text[:200]}")
            except Exception as arm_err:
                logger.warning(f"Error querying ARM resources: {arm_err}")

        return ConnectionValidationResult(
            is_valid=True,
            status="CONNECTED",
            account_identifier=subscription_id,
            identity_info={
                "tenant_id": tenant_id,
                "client_id": client_id,
                "subscription_id": subscription_id,
            },
            discovered_resources=discovered_resources,
            observations=observations,
        )

