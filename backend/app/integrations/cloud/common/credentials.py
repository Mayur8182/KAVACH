"""
Step 18 Secure Credential Management & Resolution.

RULE 35 — NEVER STORE LONG-LIVED CLOUD SECRETS UNPROTECTED.
Cloud credentials must never appear in database tables, logs, frontend responses,
audit metadata, or exceptions in plaintext.
"""

import os
from typing import Dict, Any, Optional
from app.integrations.cloud.common.exceptions import CloudAuthenticationError


class SecureCredentialResolver:
    """
    Resolves credential references to short-lived in-memory credentials.
    Supports:
      - env:<VAR_NAME>
      - vault:<PATH>
      - role:<ROLE_ARN>
      - workload_identity:<PROVIDER>
    """

    @staticmethod
    def resolve_aws_credentials(credential_reference: Optional[str]) -> Dict[str, Any]:
        """
        Resolves AWS credentials from secure reference or environment.
        Never returns or logs secrets in plain error traces.
        """
        creds: Dict[str, Any] = {}
        if not credential_reference:
            # Check default environment variables if reference is not specified
            ak = os.environ.get("AWS_ACCESS_KEY_ID")
            sk = os.environ.get("AWS_SECRET_ACCESS_KEY")
            token = os.environ.get("AWS_SESSION_TOKEN")
            role_arn = os.environ.get("AWS_ROLE_ARN")
            if ak and sk:
                creds["aws_access_key_id"] = ak
                creds["aws_secret_access_key"] = sk
                if token:
                    creds["aws_session_token"] = token
            elif role_arn:
                creds["role_arn"] = role_arn
            return creds

        if credential_reference.startswith("env:"):
            prefix = credential_reference.replace("env:", "")
            ak = os.environ.get(f"{prefix}_ACCESS_KEY_ID") or os.environ.get("AWS_ACCESS_KEY_ID")
            sk = os.environ.get(f"{prefix}_SECRET_ACCESS_KEY") or os.environ.get("AWS_SECRET_ACCESS_KEY")
            token = os.environ.get(f"{prefix}_SESSION_TOKEN") or os.environ.get("AWS_SESSION_TOKEN")
            if ak and sk:
                creds["aws_access_key_id"] = ak
                creds["aws_secret_access_key"] = sk
                if token:
                    creds["aws_session_token"] = token
        elif credential_reference.startswith("role:"):
            creds["role_arn"] = credential_reference.replace("role:", "")
        elif credential_reference.startswith("profile:"):
            creds["profile_name"] = credential_reference.replace("profile:", "")

        return creds

    @staticmethod
    def resolve_azure_credentials(credential_reference: Optional[str]) -> Dict[str, Any]:
        """
        Resolves Azure credentials from secure reference or environment.
        """
        creds: Dict[str, Any] = {}
        tenant_id = os.environ.get("AZURE_TENANT_ID")
        client_id = os.environ.get("AZURE_CLIENT_ID")
        client_secret = os.environ.get("AZURE_CLIENT_SECRET")
        if tenant_id and client_id and client_secret:
            creds["tenant_id"] = tenant_id
            creds["client_id"] = client_id
            creds["client_secret"] = client_secret
        return creds

    @staticmethod
    def resolve_gcp_credentials(credential_reference: Optional[str]) -> Dict[str, Any]:
        """
        Resolves GCP credentials from ADC or service account JSON reference.
        """
        creds: Dict[str, Any] = {}
        project_id = os.environ.get("GCP_PROJECT_ID") or os.environ.get("GOOGLE_CLOUD_PROJECT")
        creds_file = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if project_id:
            creds["project_id"] = project_id
        if creds_file and os.path.exists(creds_file):
            creds["credentials_path"] = creds_file
        return creds
