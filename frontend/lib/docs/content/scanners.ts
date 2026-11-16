import { DocPage } from '../data';

export const SCANNER_DOCS: Record<string, DocPage> = {
  scanners: {
    id: 'scanners',
    path: '/docs/scanners',
    title: 'Security Scanners & Engines Overview',
    category: 'SECURITY SCANNERS & ENGINES',
    categoryId: 'security-scanners',
    badge: 'Multi-Engine Architecture',
    readTime: '7 min read',
    description:
      'An overview of Kavach six deterministic scanner engines across source code, APIs, dependencies, infrastructure, containers, and Linux kernel runtimes.',
    subsections: [
      {
        id: 'multi-engine-philosophy',
        heading: 'Why Multi-Engine Determinism?',
        content:
          'No single security engine can comprehensively secure modern distributed applications. Kavach coordinates specialized, industry-proven scanners — each operating within its native domain. SAST parses Abstract Syntax Trees, API Security tests live endpoints against business logic flaws, CycloneDX models the dependency supply chain, Checkov validates infrastructure templates, Trivy inspects container layers, and eBPF monitors kernel syscalls in production.',
      },
      {
        id: 'scanner-matrix',
        heading: 'Engine Specialization Matrix',
        content:
          'The following table outlines the analytical scope and underlying technology of each Kavach engine:',
        codeBlocks: [
          {
            title: 'Kavach Scanner Roster',
            lang: 'text',
            code: `┌──────────────────────────┬────────────────────────────┬───────────────────────────────────────┐
│ Scanner Engine           │ Underlying Technology      │ Target Surface & Scope                │
├──────────────────────────┼────────────────────────────┼───────────────────────────────────────┤
│ 01. SAST & Secrets       │ Semgrep AST + Gitleaks     │ Source code syntax trees & credentials │
│ 02. API Security         │ OWASP Top 10 Dynamic Fuzz  │ REST, GraphQL, gRPC endpoints & BOLA  │
│ 03. Dependency & SBOM    │ CycloneDX 1.5 + OSV/NVD    │ Lockfiles, transitive CVEs & licenses │
│ 04. IaC Security         │ Checkov + OPA Rego         │ Terraform, CloudFormation, K8s YAML   │
│ 05. Container Security   │ Trivy Core Engine          │ OCI container images & layer diffs    │
│ 06. eBPF Runtime         │ Linux Kernel Probes        │ Syscall events, sockets & escapes     │
└──────────────────────────┴────────────────────────────┴───────────────────────────────────────┘`,
          },
        ],
      },
      {
        id: 'reachability-analysis',
        heading: 'Inter-Procedural Reachability Filtering',
        content:
          'To eliminate developer alert fatigue, Kavach applies control-flow graph (CFG) analysis. If a third-party library has a high-severity CVE but none of the vulnerable methods are imported or reachable from the application entrypoints, the issue is downgraded and flagged as unreachable.',
      },
    ],
  },

  'scanners-sast': {
    id: 'scanners-sast',
    path: '/docs/scanners/sast',
    title: 'SAST & Secret Detection (Semgrep + Gitleaks)',
    category: 'SECURITY SCANNERS & ENGINES',
    categoryId: 'security-scanners',
    badge: 'Semgrep + Gitleaks',
    readTime: '10 min read',
    description:
      'Deep static analysis of Abstract Syntax Trees (ASTs) for code vulnerabilities and Shannon-entropy scanning for exposed credentials.',
    subsections: [
      {
        id: 'sast-overview',
        heading: '1. Source Code AST Analysis Architecture',
        content:
          'Kavach SAST engine uses Semgrep for pattern matching directly against language parse trees (ASTs) rather than brittle regex matching. This enables semantic taint tracking — following untrusted user inputs from HTTP request parameters (sources) to database queries or shell executions (sinks).',
      },
      {
        id: 'secret-detection',
        heading: '2. High-Entropy Secret Detection (Gitleaks)',
        content:
          'Secret scanning integrates Gitleaks Shannon-entropy algorithms alongside verified regex signatures. It scans commit history, staging areas, and configuration files for AWS access keys, Stripe secret keys, GitHub personal access tokens, and private RSA keys.',
        codeBlocks: [
          {
            title: 'Sample Gitleaks Rule Definition',
            lang: 'yaml',
            code: `rules:
  - id: aws-secret-access-key
    description: Identified an AWS Secret Access Key
    regex: '(?i)aws_(?:secret_)?access_key(?:["\\']?\\s*[:=]\\s*["\\']?)([A-Za-z0-9/+=]{40})'
    entropy: 4.5
    keywords:
      - aws_secret_access_key
      - aws_access_key`,
          },
        ],
      },
      {
        id: 'rules-and-severity',
        heading: '3. Rulesets, Severity Scoring & False Positives',
        content:
          'Every detected finding is classified under CVSS v3.1 into CRITICAL, HIGH, MEDIUM, or LOW severity. To eliminate false positives, Kavach checks whether test directories, mocks, or dead code paths generated the finding, automatically pruning them from production merge blockers.',
      },
      {
        id: 'cli-workflow',
        heading: '4. CLI Scan Execution & Pre-Commit Hook',
        content:
          'Developers can execute SAST and secret checks locally before pushing code to remote branches:',
        codeBlocks: [
          {
            title: 'Running Local SAST & Secret Scan',
            lang: 'bash',
            code: `# Run local Semgrep AST analysis
kavach scan sast --path ./src --rules owasp-top-10

# Scan for committed or staged secrets
kavach scan secrets --path . --history 50

# Install pre-commit blocking hook
kavach hooks install --block-on critical`,
          },
        ],
      },
      {
        id: 'remediation',
        heading: '5. Automated Remediation Diff',
        content:
          'When an unsafe pattern is verified (e.g. string concatenation in SQL queries), Kavach proposes an idiomatic parameterized query patch. The patch is tested in an ephemeral sandbox before submitting a pull request.',
      },
    ],
  },

  'scanners-api': {
    id: 'scanners-api',
    path: '/docs/scanners/api-security',
    title: 'API Security & OWASP API Top 10',
    category: 'SECURITY SCANNERS & ENGINES',
    categoryId: 'security-scanners',
    badge: 'OWASP 2023',
    readTime: '9 min read',
    description:
      'Automated API endpoint discovery, authentication fuzzing, and BOLA/BFLA authorization boundary verification.',
    subsections: [
      {
        id: 'api-discovery',
        heading: '1. Automated Endpoint Discovery',
        content:
          'Kavach automatically discovers API routes by parsing OpenAPI 3.0 / Swagger JSON specifications, FastAPI route decorators, Express router bindings, and GraphQL schema definition files. Discovered routes are cataloged with their HTTP verbs, parameter schemas, and authentication requirements.',
      },
      {
        id: 'owasp-api-coverage',
        heading: '2. OWASP API Security Top 10 (2023) Test Suite',
        content:
          'The API security testing engine dynamically generates fuzzing test suites targeting the most critical API failure modes:',
        codeBlocks: [
          {
            title: 'OWASP API Top 10 Test Matrix',
            lang: 'text',
            code: `- API1:2023 Broken Object Level Authorization (BOLA / IDOR)
- API2:2023 Broken Authentication & Token Invalidation
- API3:2023 Broken Object Property Level Authorization (Mass Assignment)
- API4:2023 Unrestricted Resource Consumption (Rate Limiting)
- API5:2023 Broken Function Level Authorization (Admin Role Bypass)
- API6:2023 Server-Side Request Forgery (SSRF in Webhooks)
- API7:2023 Security Misconfiguration (CORS, Missing Headers)
- API8:2023 Lack of Protection from Automated Threats
- API9:2023 Improper Inventory Management (Zombie APIs)
- API10:2023 Unsafe Consumption of Third-Party APIs`,
          },
        ],
      },
      {
        id: 'bola-testing-workflow',
        heading: '3. Testing Broken Object Level Authorization (BOLA)',
        content:
          'To test BOLA, Kavach spins up dual test identities (User A and User B). The engine captures a valid resource ID created by User A and attempts to access, mutate, or delete it using User B credentials. If the endpoint returns HTTP 200 instead of HTTP 403 Forbidden, a critical BOLA finding is flagged with reproducible cURL evidence.',
      },
      {
        id: 'scan-execution-api',
        heading: '4. Triggering API Security Analysis via CLI & API',
        content:
          'API security testing can be initiated against staging environments or staging mocks:',
        codeBlocks: [
          {
            title: 'CLI API Security Scan',
            lang: 'bash',
            code: `# Run OWASP API Top 10 automated test suite against target API
kavach scan api \\
  --spec ./openapi.json \\
  --target-url https://staging-api.example.com \\
  --auth-token "Bearer test-user-token" \\
  --test-coverage bola,bfla,injection,auth`,
          },
        ],
      },
    ],
  },

  'scanners-dependencies': {
    id: 'scanners-dependencies',
    path: '/docs/scanners/dependencies',
    title: 'Dependency Security & CycloneDX 1.5 SBOM',
    category: 'SECURITY SCANNERS & ENGINES',
    categoryId: 'security-scanners',
    badge: 'CycloneDX 1.5',
    readTime: '8 min read',
    description:
      'Software Composition Analysis (SCA), automated CycloneDX 1.5 SBOM generation, and transitive vulnerability reachability analysis.',
    subsections: [
      {
        id: 'sca-architecture',
        heading: '1. Lockfile Parsing & Ecosystem Coverage',
        content:
          'The dependency engine analyzes package lockfiles directly — including package-lock.json (npm), yarn.lock, pnpm-lock.yaml, requirements.txt, poetry.lock, go.sum, Cargo.lock, and pom.xml. It constructs a full directed acyclic graph (DAG) of direct and transitive dependencies.',
      },
      {
        id: 'cyclonedx-sbom',
        heading: '2. Automated CycloneDX 1.5 SBOM Generation',
        content:
          'For every repository scan and build step, Kavach exports an authoritative Software Bill of Materials in standard CycloneDX 1.5 JSON or SPDX format. The SBOM includes cryptographic hashes (SHA-256), package URLs (PURLs), licenses, and author provenance.',
        codeBlocks: [
          {
            title: 'Sample CycloneDX 1.5 Component Block',
            lang: 'json',
            code: `{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79",
  "version": 1,
  "components": [
    {
      "type": "library",
      "name": "axios",
      "version": "1.6.0",
      "purl": "pkg:npm/axios@1.6.0",
      "hashes": [
        { "alg": "SHA-256", "content": "9b12a86ef78c01d4..." }
      ],
      "licenses": [{ "license": { "id": "MIT" } }]
    }
  ]
}`,
          },
        ],
      },
      {
        id: 'vulnerability-db-matching',
        heading: '3. CVE Detection & Upstream Advisories',
        content:
          'Component hashes and PURLs are checked continuously against OSV (Open Source Vulnerabilities), the National Vulnerability Database (NVD), and GitHub Advisory Database. When a vulnerability is identified, Kavach provides the minimal safe version upgrade that avoids breaking API changes.',
      },
    ],
  },

  'scanners-iac': {
    id: 'scanners-iac',
    path: '/docs/scanners/iac',
    title: 'Infrastructure as Code Security (Checkov + OPA)',
    category: 'SECURITY SCANNERS & ENGINES',
    categoryId: 'security-scanners',
    badge: 'Checkov + OPA',
    readTime: '8 min read',
    description:
      'Static configuration analysis for Terraform, AWS CloudFormation, Helm charts, and Kubernetes manifests with CIS benchmark validation.',
    subsections: [
      {
        id: 'iac-overview',
        heading: '1. Shift-Left Infrastructure Validation',
        content:
          'Kavach IaC scanner executes Checkov and Open Policy Agent (OPA) rules against cloud infrastructure manifests prior to provisioning. It detects misconfigurations, excessive IAM privileges, unencrypted data stores, and open ingress ports before cloud spending or deployment begins.',
      },
      {
        id: 'frameworks-supported',
        heading: '2. Supported IaC Frameworks',
        content:
          'The IaC engine supports all major declarative cloud configuration formats:\n- HashiCorp Terraform (.tf and plan JSON files)\n- AWS CloudFormation & SAM (YAML / JSON)\n- Kubernetes Manifests & Helm Charts\n- Dockerfiles & Compose Files\n- Azure Resource Manager (ARM) & Bicep',
      },
      {
        id: 'cis-benchmarks',
        heading: '3. CIS Benchmarks & Compliance Mappings',
        content:
          'Every IaC check is linked to standard industry compliance frameworks — including CIS AWS Foundations Benchmark, CIS Kubernetes Benchmark, SOC 2 Type II, and PCI-DSS 4.0.',
        codeBlocks: [
          {
            title: 'Sample Terraform Misconfiguration Finding',
            lang: 'terraform',
            code: `# Rule: CKV_AWS_20 - S3 Bucket must have server-side encryption enabled
resource "aws_s3_bucket" "financial_records" {
  bucket = "company-financial-records"
  # VIOLATION: Missing server_side_encryption_configuration block
}

# AutoFix Remediation Patch:
resource "aws_s3_bucket_server_side_encryption_configuration" "financial_records" {
  bucket = aws_s3_bucket.financial_records.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}`,
          },
        ],
      },
    ],
  },

  'scanners-container': {
    id: 'scanners-container',
    path: '/docs/scanners/container',
    title: 'Container Image Security (Trivy Core)',
    category: 'SECURITY SCANNERS & ENGINES',
    categoryId: 'security-scanners',
    badge: 'Trivy Core',
    readTime: '8 min read',
    description:
      'Layer-by-layer inspection of OCI container images, base image vulnerability inheritance, and OS package CVE scanning.',
    subsections: [
      {
        id: 'container-scanning-engine',
        heading: '1. OCI Container Image Layer Analysis',
        content:
          'The Container Security engine utilizes Trivy Core to unpack and analyze OCI and Docker images. It inspects OS packages (Alpine apk, Debian dpkg, RedHat RPM) and application dependencies across each individual image filesystem layer.',
      },
      {
        id: 'base-image-remediation',
        heading: '2. Base Image Vulnerability Inheritance',
        content:
          'Over 80% of container vulnerabilities originate from outdated base images. Kavach pinpoints the exact Dockerfile instruction (e.g. `FROM node:18-alpine`) that introduced each CVE and recommends verified distroless or patched base images.',
        codeBlocks: [
          {
            title: 'Running Container Scan via CLI',
            lang: 'bash',
            code: `# Scan a local or registry container image
kavach scan container --image kavach/api-gateway:latest

# Scan with merge-blocking gate threshold
kavach scan container \\
  --image myregistry.azurecr.io/billing:v2.1.0 \\
  --severity CRITICAL,HIGH \\
  --exit-code 1`,
          },
        ],
      },
      {
        id: 'registry-integrations',
        heading: '3. Container Registry Continuous Monitoring',
        content:
          'Connect Amazon ECR, Google Artifact Registry, Docker Hub, or GitHub Packages. Kavach scans images upon push and alerts teams when new zero-day vulnerabilities are disclosed against running containers.',
      },
    ],
  },

  'scanners-ebpf': {
    id: 'scanners-ebpf',
    path: '/docs/scanners/ebpf',
    title: 'eBPF Runtime Security (Behavioral Kernel Telemetry)',
    category: 'SECURITY SCANNERS & ENGINES',
    categoryId: 'security-scanners',
    badge: 'Kernel Telemetry',
    readTime: '9 min read',
    description:
      'High-performance Linux kernel observability, syscall monitoring, container escape detection, and behavioral threat mitigation.',
    subsections: [
      {
        id: 'ebpf-architecture',
        heading: '1. Kernel-Level Observability via eBPF',
        content:
          'Kavach Runtime Defense loads lightweight, verified Extended Berkeley Packet Filter (eBPF) programs directly into the Linux kernel. This allows continuous monitoring of process lifecycles, network sockets, and file operations with sub-1% CPU overhead and zero code instrumentation.',
      },
      {
        id: 'monitored-syscalls',
        heading: '2. Critical Intercepted Syscalls',
        content:
          'The eBPF probe attaches to critical kernel tracepoints to detect anomalous process behavior:',
        codeBlocks: [
          {
            title: 'Intercepted Kernel Syscalls',
            lang: 'text',
            code: `- sys_enter_execve: Detect unauthorized shell spawning inside production containers.
- sys_enter_connect: Monitor outbound network sockets to command-and-control (C2) IPs.
- sys_enter_ptrace: Identify process injection and debugger tampering attempts.
- sys_enter_openat: Detect access to sensitive files (/etc/shadow, container rootfs escape).`,
          },
        ],
      },
      {
        id: 'threat-detection-workflow',
        heading: '3. Behavioral Threat Detection & Container Containment',
        content:
          'When an anomaly occurs — such as a web server executing `bash` or downloading an ELF binary into `/tmp` — the eBPF engine generates a real-time runtime alert and can immediately execute an automated quarantine policy, isolating the container network namespace.',
      },
    ],
  },
};

