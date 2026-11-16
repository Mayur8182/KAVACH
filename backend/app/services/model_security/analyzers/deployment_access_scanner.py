"""
Kavach Model Security — Model Endpoint & Access Governance Scanner
Conducts safe, authorized, non-destructive security testing of live model inference endpoints:
- Public exposure evaluation
- Authentication enforcement verification
- TLS/HTTPS encryption enforcement
- Rate limiting and resource exhaustion defense probe
- Model weights / artifacts download exposure probe (/weights, /model.bin, /.git)
- Model Access Governance and Least-Privilege IAM / RBAC Policy Generation
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("kavach.model_security.deployment_scanner")


def now_utc():
    return datetime.now(timezone.utc)


class DeploymentAccessScanner:
    """
    Safely audits model inference endpoints and validates access boundaries.
    """

    def __init__(self, timeout: float = 5.0):
        self.timeout = timeout

    async def scan_endpoint(
        self,
        endpoint_url: str,
        auth_type: str = "BEARER",
        auth_token: Optional[str] = None,
        is_public: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes safe, non-destructive probes against a model inference endpoint.
        Returns detailed telemetry, test results, and security findings.
        """
        results: Dict[str, Any] = {
            "endpoint_url": endpoint_url,
            "scanned_at": now_utc().isoformat(),
            "is_public": is_public,
            "tls_enforced": endpoint_url.lower().startswith("https://"),
            "auth_enforced": False,
            "rate_limit_detected": False,
            "weights_download_blocked": True,
            "findings": [],
            "probe_details": {},
        }

        findings: List[Dict[str, Any]] = []

        # 1. TLS Enforcement Check
        if not results["tls_enforced"]:
            findings.append({
                "rule_id": "KAVACH-EP-CLEARTEXT-HTTP",
                "title": "Cleartext HTTP Model Inference Endpoint",
                "description": (
                    f"Model inference endpoint '{endpoint_url}' uses unencrypted HTTP. "
                    "Prompt payloads, model responses, and API keys are vulnerable to eavesdropping and MITM attacks."
                ),
                "severity": "HIGH",
                "category": "ENDPOINT_SECURITY",
                "cwe_id": "CWE-319",
                "affected_file": endpoint_url,
                "evidence": {"protocol": "http", "tls_enforced": False},
                "remediation_guidance": "Enforce HTTPS with TLS 1.3 encryption and disable cleartext HTTP.",
                "fix_available": True,
            })

        # 2. Public Exposure Risk
        if is_public:
            findings.append({
                "rule_id": "KAVACH-EP-PUBLIC-EXPOSURE",
                "title": "Public Model Inference Endpoint Exposure",
                "description": (
                    f"Model endpoint '{endpoint_url}' is marked as publicly accessible. "
                    "Publicly exposed endpoints are vulnerable to denial of wallet (resource exhaustion), "
                    "prompt injection, and unauthorized data scraping."
                ),
                "severity": "MEDIUM",
                "category": "ENDPOINT_SECURITY",
                "cwe_id": "CWE-284",
                "affected_file": endpoint_url,
                "evidence": {"is_public": True},
                "remediation_guidance": "Place model endpoints behind an authenticated API gateway or private VPC.",
                "fix_available": True,
            })

        # Probing endpoint safely (non-destructive)
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # 3. Authentication Enforcement Probe
                # Send probe without credentials
                try:
                    unauth_resp = await client.get(endpoint_url)
                    # If endpoint responds with 200 OK without authentication, auth is NOT enforced
                    if unauth_resp.status_code in (200, 201):
                        results["auth_enforced"] = False
                        findings.append({
                            "rule_id": "KAVACH-EP-UNAUTHENTICATED-ACCESS",
                            "title": "Unauthenticated Model Endpoint Access",
                            "description": (
                                f"The inference endpoint '{endpoint_url}' returned HTTP {unauth_resp.status_code} "
                                "when queried without credentials. Inference requests can be made without authentication."
                            ),
                            "severity": "CRITICAL",
                            "category": "ENDPOINT_SECURITY",
                            "cwe_id": "CWE-306",
                            "affected_file": endpoint_url,
                            "evidence": {"status_code": unauth_resp.status_code, "headers": dict(unauth_resp.headers)},
                            "remediation_guidance": "Enforce Bearer token or API key authentication for all inference routes.",
                            "fix_available": True,
                        })
                    elif unauth_resp.status_code in (401, 403):
                        results["auth_enforced"] = True
                except Exception as exc:
                    results["probe_details"]["unauth_probe_error"] = str(exc)

                # 4. Model Weights Download Exposure Probe
                # Check if raw weights or Git repositories are exposed to download
                weight_paths = ["/weights", "/model.bin", "/model.safetensors", "/.git/HEAD"]
                exposed_weight_urls = []
                for wp in weight_paths:
                    probe_url = endpoint_url.rstrip("/") + wp
                    try:
                        w_resp = await client.get(probe_url)
                        if w_resp.status_code == 200 and len(w_resp.content) > 10:
                            exposed_weight_urls.append(probe_url)
                    except Exception:
                        pass

                if exposed_weight_urls:
                    results["weights_download_blocked"] = False
                    findings.append({
                        "rule_id": "KAVACH-EP-WEIGHTS-EXPOSED",
                        "title": "Model Weights Exposed to Direct Download",
                        "description": (
                            f"Model endpoint exposes proprietary model weights or source files to unauthenticated download: "
                            f"{exposed_weight_urls}. This represents an intellectual property leakage vulnerability."
                        ),
                        "severity": "CRITICAL",
                        "category": "ENDPOINT_SECURITY",
                        "cwe_id": "CWE-200",
                        "affected_file": endpoint_url,
                        "evidence": {"exposed_urls": exposed_weight_urls},
                        "remediation_guidance": "Block static weight file paths and only expose inference APIs.",
                        "fix_available": True,
                    })

                # 5. Rate Limiting Probe (5 rapid lightweight requests)
                rate_limit_headers = False
                got_429 = False
                for _ in range(5):
                    try:
                        r = await client.get(endpoint_url)
                        if r.status_code == 429:
                            got_429 = True
                            break
                        if any(h in r.headers for h in ("x-ratelimit-limit", "ratelimit-limit", "retry-after")):
                            rate_limit_headers = True
                    except Exception:
                        pass

                if got_429 or rate_limit_headers:
                    results["rate_limit_detected"] = True
                else:
                    findings.append({
                        "rule_id": "KAVACH-EP-RATE-LIMIT-MISSING",
                        "title": "No Rate Limiting Detected on Model Inference Endpoint",
                        "description": (
                            f"Endpoint '{endpoint_url}' does not return standard rate-limiting headers (X-RateLimit-Limit) "
                            "nor throttle rapid sequential requests. Vulnerable to denial of service and compute exhaustion."
                        ),
                        "severity": "MEDIUM",
                        "category": "ENDPOINT_SECURITY",
                        "cwe_id": "CWE-770",
                        "affected_file": endpoint_url,
                        "evidence": {"rate_limiting_headers_found": False},
                        "remediation_guidance": "Implement token-bucket or sliding-window rate limiting on the inference gateway.",
                        "fix_available": True,
                    })

        except Exception as exc:
            results["probe_details"]["general_error"] = str(exc)

        results["findings"] = findings
        return results

    def generate_least_privilege_policy(
        self,
        model_name: str,
        environment: str = "production",
        cloud_provider: str = "aws",
    ) -> Dict[str, Any]:
        """
        Generates production-grade least-privilege IAM and RBAC access policies
        for model serving infrastructure.
        """
        if cloud_provider.lower() == "aws":
            policy_doc = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": f"KavachLeastPrivilegeInferenceAccess-{model_name}",
                        "Effect": "Allow",
                        "Action": [
                            "sagemaker:InvokeEndpoint",
                        ],
                        "Resource": f"arn:aws:sagemaker:*:*:endpoint/{model_name}-{environment}*",
                    },
                    {
                        "Sid": "DenyUnauthenticatedAccess",
                        "Effect": "Deny",
                        "Action": "sagemaker:InvokeEndpoint",
                        "Resource": "*",
                        "Condition": {
                            "Bool": {"aws:SecureTransport": "false"},
                        },
                    },
                    {
                        "Sid": "DenyModelArtifactDownload",
                        "Effect": "Deny",
                        "Action": [
                            "s3:GetObject",
                        ],
                        "Resource": f"arn:aws:s3:::*-model-weights/{model_name}/*",
                        "Condition": {
                            "StringNotLike": {
                                "aws:PrincipalArn": ["arn:aws:iam::*:role/ModelServingExecutionRole*"]
                            }
                        },
                    },
                ],
            }
        else:
            # Kubernetes RBAC Role
            policy_doc = {
                "apiVersion": "rbac.authorization.k8s.io/v1",
                "kind": "Role",
                "metadata": {
                    "name": f"{model_name}-inference-caller",
                    "namespace": f"{environment}-models",
                },
                "rules": [
                    {
                        "apiGroups": [""],
                        "resources": ["services/proxy"],
                        "resourceNames": [f"{model_name}-service"],
                        "verbs": ["get", "create"],
                    }
                ],
            }

        return {
            "model_name": model_name,
            "environment": environment,
            "provider": cloud_provider,
            "policy_document": policy_doc,
            "enforcement_summary": "Enforces TLS, restricts invocation to designated endpoint, and denies weight download.",
        }

