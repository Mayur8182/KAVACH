# 09. Integrations and External Dependencies Map

This section documents all external third-party services, security scanner binaries, cloud provider APIs, AI model gateways, and container tooling integrated into SecuLayer / Thing.

## Integration Topology & Verification Status

```
+----------------------------------------------------------------------------------------------------+
|                                    SECULAYER INTEGRATION FABRIC                                    |
+--------------------+---------------------+--------------------+--------------------+---------------+
| SOURCE & VCS       | CLOUD & K8S         | SECURITY SCANNERS  | AI PROVIDERS       | ALERTS & CI/CD|
+--------------------+---------------------+--------------------+--------------------+---------------+
| GitHub App         | AWS (STS/IAM)       | Semgrep CLI        | Anthropic (Claude) | Jenkins       |
| [VERIFIED]         | [VERIFIED]          | [VERIFIED]         | [VERIFIED]         | [VERIFIED]    |
|                    |                     |                    |                    |               |
| GitHub OAuth       | Azure (MS Graph)    | Gitleaks CLI       | OpenAI (GPT-4o)    | GitHub Actions|
| [VERIFIED]         | [VERIFIED]          | [VERIFIED]         | [VERIFIED]         | [VERIFIED]    |
|                    |                     |                    |                    |               |
| GitLab / Bitbucket | GCP (Workload Id)   | Trivy CLI          | OpenRouter / Local | Slack & Teams |
| [PLANNED]          | [VERIFIED]          | [VERIFIED]         | [VERIFIED]         | [VERIFIED]    |
|                    |                     |                    |                    |               |
| Self-hosted Git    | Kubernetes Cluster  | Checkov CLI        | DeepSeek           | PagerDuty     |
| [PARTIAL]          | [VERIFIED]          | [VERIFIED]         | [PARTIAL]          | [PLANNED]     |
|                    |                     |                    |                    |               |
|                    | Docker Engine       | OPA Engine         |                    | SMTP Email    |
|                    | [VERIFIED]          | [VERIFIED]         |                    | [VERIFIED]    |
+--------------------+---------------------+--------------------+--------------------+---------------+
```

## Detailed Integration Inventory

| Category | Provider / Tool | Integration Mechanism | Source Reference | Auth & Secret Handling | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VCS** | GitHub App | App Installation Tokens / Webhooks | `backend/app/models/github.py` | Private Key + App ID (`RS256`) | **VERIFIED** |
| **VCS** | GitHub User OAuth | OAuth 2.0 Web Flow | `backend/app/api/v1/endpoints/auth.py` | OAuth Client Secret | **VERIFIED** |
| **Cloud** | AWS | AWS STS AssumeRole & IAM Credentials | `backend/app/models/cloud_models.py` | ARN reference (No stored raw keys) | **VERIFIED** |
| **Cloud** | Microsoft Azure | Azure AD Service Principal / MS Graph | `backend/app/models/cloud_models.py` | Tenant ID + Client ID + Secret Ref | **VERIFIED** |
| **Cloud** | Google Cloud Platform | GCP Workload Identity & Service Account | `backend/app/models/cloud_models.py` | GCP Project ID + SA JSON Ref | **VERIFIED** |
| **Cloud** | Kubernetes | In-cluster Config / Kubeconfig Ref | `backend/app/models/kubernetes_models.py` | ServiceAccount Bearer Token | **VERIFIED** |
| **Scanner** | Semgrep | Executed CLI via subprocess sandbox | `backend/app/engines/scanner/semgrep.py`| Local host executable execution | **VERIFIED** |
| **Scanner** | Gitleaks | Executed CLI via subprocess sandbox | `backend/app/engines/scanner/gitleaks.py`| Local host executable execution | **VERIFIED** |
| **Scanner** | Trivy | Executed CLI for container images | `backend/app/engines/scanner/trivy.py` | Local host executable execution | **VERIFIED** |
| **Scanner** | Checkov | Executed CLI for Terraform / IaC | `backend/app/engines/scanner/checkov.py`| Local host executable execution | **VERIFIED** |
| **Scanner** | OPA | Open Policy Agent Rego runtime | `backend/app/engines/policy/opa.py` | Local Rego policy evaluator | **VERIFIED** |
| **AI** | Anthropic / OpenAI | HTTPS REST / SDK client | `backend/app/services/llm_service.py` | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | **VERIFIED** |
| **CI/CD** | Jenkins | Webhook endpoints + Build status | `backend/app/models/jenkins_models.py` | Webhook HMAC token | **VERIFIED** |
| **CI/CD** | GitHub Actions | Status check API & Workflow dispatch | `backend/app/models/cicd.py` | GitHub Installation Token | **VERIFIED** |
| **Alerts** | Slack / Webhooks | Outbound HTTPS POST payloads | `backend/app/models/incident_models.py` | Signing secret / Webhook URL | **VERIFIED** |

## Standalone Visual Diagram

Open [integrations-map.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/09-integrations-and-dependencies/integrations-map.html) in any browser to view the interactive SVG diagram.
