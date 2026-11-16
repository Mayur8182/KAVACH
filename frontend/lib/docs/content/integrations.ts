import { DocPage } from '../data';

export const INTEGRATIONS_DOCS: Record<string, DocPage> = {
  'integrations-github': {
    id: 'integrations-github',
    path: '/docs/integrations/github',
    title: 'GitHub Integration & GitHub App',
    category: 'PLATFORM & INTEGRATIONS',
    categoryId: 'platform-integrations',
    badge: 'GitHub App',
    readTime: '7 min read',
    description:
      'Install the official Kavach GitHub App, configure repository webhooks, and enable automated PR security status checks.',
    subsections: [
      {
        id: 'github-app-install',
        heading: '1. Installing the Kavach GitHub App',
        content:
          'In **Organization Settings > Integrations**, click **Connect GitHub**. You will be redirected to GitHub to install the Kavach App into your organization or personal account. You can grant access to all repositories or selected repositories.',
      },
      {
        id: 'github-permissions',
        heading: '2. Required GitHub Permissions',
        content:
          'Kavach requests minimal necessary permissions to function:\n- Repository Contents (Read): To clone source code for AST scanning.\n- Pull Requests (Read & Write): To post automated AutoFix diffs and status reviews.\n- Checks (Read & Write): To report granular pass/fail status directly inside GitHub PR checks.\n- Webhooks (Read & Write): To receive push and pull_request events automatically.',
      },
      {
        id: 'github-actions-workflow',
        heading: '3. GitHub Actions Workflow Integration',
        content:
          'Add a blocking merge check in your `.github/workflows/security.yml` file:',
        codeBlocks: [
          {
            title: '.github/workflows/kavach-scan.yml',
            lang: 'yaml',
            code: `name: Kavach Deterministic Security Gate

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Run Kavach Multi-Engine Scanner
        uses: kavach-security/scan-action@v2
        with:
          api-token: \${{ secrets.KAVACH_API_TOKEN }}
          fail-on: "CRITICAL,HIGH"
          block-merge: true`,
          },
        ],
      },
    ],
  },

  'integrations-gitlab': {
    id: 'integrations-gitlab',
    path: '/docs/integrations/gitlab',
    title: 'GitLab Integration & Pipelines',
    category: 'PLATFORM & INTEGRATIONS',
    categoryId: 'platform-integrations',
    readTime: '6 min read',
    description:
      'Connect self-hosted GitLab CE/EE or GitLab.com SaaS repositories using Project Access Tokens and GitLab CI/CD pipelines.',
    subsections: [
      {
        id: 'gitlab-setup',
        heading: '1. GitLab Project Access Token Setup',
        content:
          'Generate a Project Access Token in GitLab under **Settings > Access Tokens** with `read_repository` and `api` scopes. Add the token to Kavach under **Integrations > GitLab**.',
      },
      {
        id: 'gitlab-ci-yaml',
        heading: '2. GitLab CI Configuration',
        content:
          'Add the following job definition to your `.gitlab-ci.yml` pipeline:',
        codeBlocks: [
          {
            title: '.gitlab-ci.yml',
            lang: 'yaml',
            code: `kavach_security_scan:
  stage: test
  image: kavach/cli:latest
  script:
    - kavach auth login --token $KAVACH_API_TOKEN
    - kavach scan all --block-on CRITICAL
  only:
    - merge_requests
    - main`,
          },
        ],
      },
    ],
  },

  'integrations-cicd': {
    id: 'integrations-cicd',
    path: '/docs/integrations/cicd',
    title: 'CI/CD Integration & Merge Gates',
    category: 'PLATFORM & INTEGRATIONS',
    categoryId: 'platform-integrations',
    badge: 'Merge Gates',
    readTime: '6 min read',
    description:
      'Enforce deterministic CI/CD merge blocking across Jenkins, CircleCI, Bitbucket Pipelines, and ArgoCD.',
    subsections: [
      {
        id: 'blocking-gates',
        heading: '1. How Merge Gates Work',
        content:
          'A merge gate evaluates OPA Rego rules against scan output. If any rule evaluates to `deny`, the Kavach CLI or GitHub Check returns exit code `1`, preventing developers from merging unverified vulnerabilities into production branches.',
      },
      {
        id: 'jenkins-pipeline',
        heading: '2. Jenkins Pipeline Example',
        content:
          'Integrate Kavach into declarative Jenkinsfiles:',
        codeBlocks: [
          {
            title: 'Jenkinsfile',
            lang: 'groovy',
            code: `pipeline {
    agent any
    environment {
        KAVACH_TOKEN = credentials('kavach-api-token')
    }
    stages {
        stage('Security Verification') {
            steps {
                sh 'npx @kavach/cli scan --token \${KAVACH_TOKEN} --exit-code 1'
            }
        }
    }
}`,
          },
        ],
      },
    ],
  },

  'platform-rbac': {
    id: 'platform-rbac',
    path: '/docs/platform/rbac',
    title: 'User Management & Role-Based Access Control (RBAC)',
    category: 'PLATFORM & INTEGRATIONS',
    categoryId: 'platform-integrations',
    readTime: '7 min read',
    description:
      'Manage team member permissions, least-privilege role boundaries, and multi-tenant organization security.',
    subsections: [
      {
        id: 'role-definitions',
        heading: '1. Default System Roles',
        content:
          'Kavach enforces four built-in RBAC roles in PostgreSQL:\n- **Organization Admin:** Full control over billing, SSO, users, and audit logs.\n- **Security Engineer:** Can trigger scans, configure OPA rules, approve high-risk MCP tool calls, and manage findings.\n- **Developer:** Read access to assigned projects, trigger branch scans, and approve AutoFix pull requests.\n- **Auditor (Read-Only):** Read-only view into compliance evidence, SBOMs, and immutable audit ledgers.',
      },
      {
        id: 'least-privilege',
        heading: '2. Project-Level Scoping',
        content:
          'Team members can be granted granular permissions per project. An engineer working on billing microservices cannot view or mutate repositories belonging to internal HR systems.',
      },
    ],
  },

  'platform-organization': {
    id: 'platform-organization',
    path: '/docs/platform/organization',
    title: 'Organization Settings & SSO',
    category: 'PLATFORM & INTEGRATIONS',
    categoryId: 'platform-integrations',
    readTime: '6 min read',
    description:
      'Configure enterprise SAML 2.0 / OIDC Single Sign-On (Okta, Azure AD, Google Workspace), seat allocation, and audit log retention.',
    subsections: [
      {
        id: 'sso-configuration',
        heading: '1. SAML 2.0 & OIDC Single Sign-On',
        content:
          'Enterprise plans support identity federation with Okta, Microsoft Entra ID (Azure AD), Google Workspace, and Ping Identity. JIT (Just-in-Time) user provisioning automatically assigns team members to default developer roles upon initial login.',
      },
      {
        id: 'audit-retention',
        heading: '2. Audit Log Retention Policies',
        content:
          'Configure retention windows for security scan runs and agent tool invocation records. Standard retention is 90 days; Enterprise plans include 1-year and 7-year immutable retention for regulated industries (FINRA, HIPAA).',
      },
    ],
  },

  troubleshooting: {
    id: 'troubleshooting',
    path: '/docs/troubleshooting',
    title: 'Troubleshooting & Common Issues',
    category: 'PLATFORM & INTEGRATIONS',
    categoryId: 'platform-integrations',
    readTime: '7 min read',
    description:
      'Actionable resolution steps for scanner execution failures, Docker socket permissions, OPA compilation issues, and MCP timeouts.',
    subsections: [
      {
        id: 'issue-docker-socket',
        heading: '1. Docker Socket Permission Denied',
        content:
          '**Symptom:** `docker: Got permission denied while trying to connect to the Docker daemon socket`\n**Cause:** The current user lacks membership in the `docker` system group.\n**Remediation:** Add your user to the docker group and restart your terminal session:\n`sudo usermod -aG docker $USER && newgrp docker`',
      },
      {
        id: 'issue-opa-compile',
        heading: '2. OPA Rego Rule Compilation Error',
        content:
          '**Symptom:** `error: 1 error occurred: policy.rego:12: rego_unsafe_var_error: var msg is unsafe`\n**Cause:** A variable in a Rego `deny[msg]` rule is referenced without being assigned within the same rule body.\n**Remediation:** Ensure all output variables are explicitly bound:\n`deny[msg] { input.risk > 8; msg := "Risk exceeds threshold" }`',
      },
      {
        id: 'issue-mcp-timeout',
        heading: '3. MCP Gateway Connection Timeout',
        content:
          '**Symptom:** AI client reports: `Error: MCP connection closed unexpectedly`\n**Cause:** Network proxy or firewall blocking Server-Sent Events (SSE) streaming connections.\n**Remediation:** Ensure HTTP proxy allows chunked transfer encoding and disables response buffering for `/mcp` endpoints.',
      },
    ],
  },
};

