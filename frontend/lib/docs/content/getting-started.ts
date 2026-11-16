import { DocPage } from '../data';

export const GETTING_STARTED_DOCS: Record<string, DocPage> = {
  overview: {
    id: 'overview',
    path: '/docs',
    title: 'Platform Overview',
    category: 'GETTING STARTED',
    categoryId: 'getting-started',
    badge: 'Core Platform',
    readTime: '6 min read',
    description:
      'Understand the core engineering foundations of Kavach: deterministic security enforcement, autonomous AutoFix sandboxes, and AI agent governance.',
    subsections: [
      {
        id: 'the-architectural-rule',
        heading: 'The Architectural Golden Rule',
        content:
          'Kavach is founded upon a fundamental engineering conviction: "LLM proposes. Deterministic security systems decide. Runtime evidence proves." Language models are statistical pattern matchers; they are neither security authorities nor compliance arbiters. In Kavach, generative models propose code remediations and summarize telemetry, but deterministic scanners (Semgrep, Trivy, Gitleaks) and formal policy engines (Open Policy Agent Rego) make all authoritative decisions to allow, block, or gate merges.',
        alert: {
          type: 'security',
          text: 'Never delegate permission grants, secret exposure decisions, or deployment gates solely to probabilistic LLM inference.',
        },
      },
      {
        id: 'platform-capabilities',
        heading: 'Core Platform Capabilities',
        content:
          'Kavach consolidates five critical security disciplines into a single deterministic control plane:',
        codeBlocks: [
          {
            title: 'Kavach Security Stack',
            lang: 'text',
            code: `1. Security Scanners: Semgrep AST, Gitleaks entropy, Trivy containers, Checkov IaC, and eBPF kernel telemetry.
2. AI & MCP Security Gateway: Wrap Model Context Protocol tool requests with OPA Rego invariants and cryptographic audit logs.
3. Autonomous AutoFix: Validate code modifications in isolated Linux micro-sandboxes before opening pull requests.
4. Universal API Security: Dynamic discovery and OWASP API Top 10 fuzzing across REST, GraphQL, and gRPC endpoints.
5. SLSA Level 3 Provenance: CycloneDX 1.5 SBOM generation and cryptographic verification across software supply chains.`,
          },
        ],
      },
      {
        id: 'zero-fake-success',
        heading: 'Zero Simulated Metrics Policy',
        content:
          'Unlike traditional security dashboards that display static placeholders or fabricated health scores, every metric in Kavach is backed by real execution evidence stored in PostgreSQL. If Semgrep finds 0 vulnerabilities, 0 is displayed. If a scanner runner fails, the exact failure reason and remediation steps are surfaced in telemetry.',
      },
      {
        id: 'next-steps',
        heading: 'Where to Go Next',
        content:
          'To start securing your engineering pipeline, follow the 5-Minute Quickstart to connect your first GitHub repository, or explore the Security Scanners section to understand how each analysis engine operates.',
      },
    ],
  },

  quickstart: {
    id: 'quickstart',
    path: '/docs/quickstart',
    title: '5-Minute Quickstart',
    category: 'GETTING STARTED',
    categoryId: 'getting-started',
    badge: 'Fast Track',
    readTime: '5 min read',
    description:
      'Connect your repository, execute your first multi-engine scan, and inspect verified vulnerability findings in under five minutes.',
    subsections: [
      {
        id: 'step-1-create-account',
        heading: 'Step 1: Sign Up or Log In with Google / GitHub',
        content:
          'Navigate to http://localhost:3002/login and authenticate using your enterprise Google account or GitHub SSO. Your workspace is provisioned immediately with default OPA Rego security policies.',
      },
      {
        id: 'step-2-connect-repo',
        heading: 'Step 2: Connect a Source Code Repository',
        content:
          'From the Kavach dashboard, click "Connect Repository" and authorize the Kavach GitHub App or paste a public repository URL. The control plane clones the target repository into an ephemeral worker enclave.',
        codeBlocks: [
          {
            title: 'CLI Alternative: Connect via agy CLI',
            lang: 'bash',
            code: `# Install the Antigravity / Kavach CLI
npm install -g @kavach/cli

# Authenticate with your workspace token
kavach auth login

# Connect and initialize repository tracking
kavach repo connect https://github.com/your-org/payments-service --branch main`,
          },
        ],
      },
      {
        id: 'step-3-trigger-scan',
        heading: 'Step 3: Trigger Multi-Engine Security Scan',
        content:
          'Click "Run Multi-Engine Scan" on the repository page. Kavach orchestrates Semgrep for SAST, Gitleaks for high-entropy secrets, and Trivy for third-party package CVEs in parallel.',
        alert: {
          type: 'tip',
          text: 'Scans run in isolated worker enclaves with real CLI executions. Progress is streamed over Server-Sent Events (SSE).',
        },
      },
      {
        id: 'step-4-review-autofix',
        heading: 'Step 4: Inspect Findings & Review AutoFix Diff',
        content:
          'When vulnerabilities are discovered, Kavach analyzes AST reachability. For verified reachable issues, our Autonomous AutoFix engine generates a minimal code patch, verifies it in a sandbox, and presents a ready-to-merge pull request.',
      },
    ],
  },

  architecture: {
    id: 'architecture',
    path: '/docs/architecture',
    title: 'Architecture Overview',
    category: 'GETTING STARTED',
    categoryId: 'getting-started',
    readTime: '8 min read',
    description:
      'Deep architectural breakdown of the Kavach Control Plane, Data Plane runners, OPA Policy Engine, and MCP Security Gateway.',
    subsections: [
      {
        id: 'high-level-topology',
        heading: 'Control Plane vs. Data Plane Topology',
        content:
          'Kavach follows a strictly decoupled control-plane and data-plane architecture. The Control Plane (FastAPI + PostgreSQL + Next.js) coordinates policy, projects, and cryptographic audit ledgers. The Data Plane consists of ephemeral worker nodes that execute security scanners, compile Abstract Syntax Trees, and sandbox patch executions.',
        codeBlocks: [
          {
            title: 'System Topology Diagram',
            lang: 'text',
            code: `[ Developer / AI Client ]
         │
         ▼
[ Kavach MCP Gateway / REST API ] ──► [ OPA Policy Engine (Rego) ]
         │                                       │
         ▼                                       ▼
[ Control Plane (FastAPI/Postgres) ] ◄─── [ Immutable Audit Ledger ]
         │
         ▼ (Job Queue / Redis)
[ Ephemeral Worker Enclave ]
  ├── Semgrep (SAST AST)
  ├── Gitleaks (Secret Entropy)
  ├── Trivy (SCA & Container OCI)
  ├── Checkov (IaC HCL / K8s)
  └── Micro-Sandbox (Patch Verification)`,
          },
        ],
      },
      {
        id: 'policy-enforcement',
        heading: 'Deterministic OPA Policy Engine',
        content:
          'All access decisions and CI/CD merge gating are evaluated against Open Policy Agent (OPA) WebAssembly modules. Rego rules define non-negotiable thresholds: e.g. "Deny merge if any CRITICAL vulnerability with reachable call-graph path exists in production branch".',
      },
      {
        id: 'persistence-layer',
        heading: 'Persistence & Cryptographic Ledgers',
        content:
          'All project configurations, findings, scan manifests, and agent tool execution events are persisted in PostgreSQL with SHA-256 integrity hashes. This ensures full traceability required for SOC 2 Type II, ISO 27001, and HIPAA compliance.',
      },
    ],
  },

  installation: {
    id: 'installation',
    path: '/docs/installation',
    title: 'Installation & Setup',
    category: 'GETTING STARTED',
    categoryId: 'getting-started',
    readTime: '7 min read',
    description:
      'Setup guides for local development, Docker Compose runner clusters, and Kubernetes Helm chart deployments.',
    subsections: [
      {
        id: 'prerequisites',
        heading: 'System Prerequisites',
        content:
          'Before installing the Kavach security scanner runners or local control plane, ensure your environment meets the following baseline requirements:',
        codeBlocks: [
          {
            title: 'Required Runtime Dependencies',
            lang: 'text',
            code: `- Docker Engine 24.0+ or Podman 4.5+
- Node.js 18.18+ (Node 20 LTS recommended)
- Python 3.11 or 3.12
- PostgreSQL 15+ (with uuid-ossp extension enabled)
- Git 2.38+`,
          },
        ],
      },
      {
        id: 'docker-compose-setup',
        heading: 'Deploying with Docker Compose',
        content:
          'To run the complete Kavach control plane, PostgreSQL database, and scanner runner services locally:',
        codeBlocks: [
          {
            title: 'Local Environment Startup',
            lang: 'bash',
            code: `# Clone the repository
git clone https://github.com/your-org/kavach-security.git
cd kavach-security

# Copy and configure environment variables
cp .env.example .env

# Start database and control plane services
docker compose -f docker-compose.prod.yml up -d

# Verify services are healthy
curl -f http://localhost:8000/api/v1/health`,
          },
        ],
      },
      {
        id: 'kubernetes-helm',
        heading: 'Production Kubernetes Deployment (Helm)',
        content:
          'For enterprise Kubernetes clusters (EKS, GKE, AKS), deploy the Kavach Helm chart into an isolated namespace with RBAC controls:',
        codeBlocks: [
          {
            title: 'Helm Installation',
            lang: 'bash',
            code: `helm repo add kavach https://charts.kavachsecurity.me
helm repo update

helm install kavach-control-plane kavach/kavach \\
  --namespace kavach-system \\
  --create-namespace \\
  --set postgresql.enabled=false \\
  --set externalDatabase.url="postgresql://user:pass@db.internal:5432/kavach" \\
  --set mcpGateway.enabled=true`,
          },
        ],
      },
    ],
  },

  authentication: {
    id: 'authentication',
    path: '/docs/authentication',
    title: 'Authentication & API Keys',
    category: 'GETTING STARTED',
    categoryId: 'getting-started',
    readTime: '6 min read',
    description:
      'Configure JWT Bearer tokens, personal access tokens (PATs), Google One Tap SSO, and programmatic service account keys.',
    subsections: [
      {
        id: 'auth-methods',
        heading: 'Supported Authentication Methods',
        content:
          'Kavach supports three primary authentication mechanisms:\n1. User Session JWTs (Issued via Google OAuth / GitHub SSO / Password login).\n2. Programmatic Service Account API Keys (Prefix: kvch_sec_...).\n3. Ephemeral MCP Session Tokens (Used by AI coding assistants).',
      },
      {
        id: 'generating-api-keys',
        heading: 'Generating Programmatic API Keys',
        content:
          'In Organization Settings > API Keys, generate a scoped token for CI/CD pipelines. Keys carry granular permissions (e.g. SCANS_TRIGGER, REPOSITORIES_READ, FINDINGS_WRITE).',
        codeBlocks: [
          {
            title: 'Authenticating cURL Requests',
            lang: 'bash',
            code: `# Make authenticated API requests using the Bearer header
curl -X GET "http://localhost:8000/api/v1/projects" \\
  -H "Authorization: Bearer kvch_sec_998124ab87cd90ef" \\
  -H "Content-Type: application/json"`,
          },
        ],
      },
      {
        id: 'google-one-tap',
        heading: 'Google One Tap & Enterprise SSO',
        content:
          'Public landing pages initialize Google Identity Services (FedCM compliant). When a user confirms authentication, the Google ID token is verified server-side against Google public certificates, and an authoritative Kavach JWT session is returned.',
      },
    ],
  },
};

