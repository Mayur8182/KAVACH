import { DocPage } from '../data';

export const MCP_DOCS: Record<string, DocPage> = {
  'mcp-overview': {
    id: 'mcp-overview',
    path: '/docs/mcp',
    title: 'Model Context Protocol (MCP) Security Gateway',
    category: 'AI & MCP SECURITY',
    categoryId: 'ai-mcp-security',
    badge: 'Core Standard',
    readTime: '8 min read',
    description:
      'The open security gateway for AI coding agents. Enforces identity, deterministic OPA policies, and audit ledgers on every tool invocation.',
    subsections: [
      {
        id: 'what-is-mcp',
        heading: '1. What is the Model Context Protocol (MCP)?',
        content:
          'The Model Context Protocol (MCP) is an open standard introduced by Anthropic that enables language models to securely interact with local files, development tools, databases, and enterprise APIs. However, raw MCP execution grants AI assistants unrestricted tool access. Without governance, an agent can perform unauthorized cloud modifications, delete repositories, or leak proprietary secrets.',
      },
      {
        id: 'gateway-architecture',
        heading: '2. The Kavach Security Gateway Layer',
        content:
          'Kavach acts as a secure reverse-proxy and authorization firewall in front of your MCP servers. Every tool call must pass through eight distinct deterministic gates before execution:',
        codeBlocks: [
          {
            title: 'MCP Gateway Request Lifecycle',
            lang: 'text',
            code: `[ AI Client (Claude / VS Code / Cursor) ]
                     │
                     ▼ (JSON-RPC 2.0 / SSE)
         [ 1. TLS & Transport Layer ]
                     │
         [ 2. Client Identity Verification ]
                     │
         [ 3. RBAC & Tool Authorization ]
                     │
         [ 4. OPA Rego Deterministic Policy Engine ]
                     │
         [ 5. Dynamic Risk Assessment (Low/Med/High/Critical) ]
                     │
         [ 6. Human Approval Gate (If High/Critical) ]
                     │
         [ 7. Ephemeral Sandbox Execution ]
                     │
         [ 8. PostgreSQL Immutable Audit Ledger ]
                     │
                     ▼
             [ JSON-RPC Response ]`,
          },
        ],
      },
      {
        id: 'protocol-compatibility',
        heading: '3. Transport Protocols & Compatibility',
        content:
          'The gateway natively supports both Server-Sent Events (SSE) streaming transport for remote cloud assistants and Standard I/O (stdio) transport for local developer IDEs like Cursor and VS Code.',
      },
    ],
  },

  'mcp-clients': {
    id: 'mcp-clients',
    path: '/docs/mcp/clients',
    title: 'Connecting AI Clients (Claude, Cursor, VS Code, ChatGPT)',
    category: 'AI & MCP SECURITY',
    categoryId: 'ai-mcp-security',
    badge: 'Integration Guides',
    readTime: '7 min read',
    description:
      'Step-by-step configuration guides for connecting Claude Desktop, Cursor, Visual Studio Code, ChatGPT, and Gemini CLI to the Kavach MCP Gateway.',
    subsections: [
      {
        id: 'claude-desktop',
        heading: '1. Claude Desktop Setup',
        content:
          'To connect Claude Desktop to your Kavach MCP Security Gateway, edit your `claude_desktop_config.json` configuration file:',
        codeBlocks: [
          {
            title: 'claude_desktop_config.json',
            lang: 'json',
            code: `{
  "mcpServers": {
    "kavach-security": {
      "command": "npx",
      "args": [
        "-y",
        "@kavach/mcp-proxy",
        "--gateway-url",
        "https://mcp.kavachsecurity.me/mcp",
        "--token",
        "YOUR_KAVACH_API_KEY"
      ]
    }
  }
}`,
          },
        ],
      },
      {
        id: 'cursor-setup',
        heading: '2. Cursor IDE Configuration',
        content:
          'In Cursor, navigate to **Settings > Features > MCP Servers** and click **Add New MCP Server**:\n- Name: `kavach-mcp`\n- Type: `command`\n- Command: `npx -y @kavach/mcp-proxy --gateway-url https://mcp.kavachsecurity.me/mcp --token YOUR_KAVACH_API_KEY`',
      },
      {
        id: 'vscode-setup',
        heading: '3. Visual Studio Code Setup',
        content:
          'Install the official Kavach VS Code extension from the marketplace or configure the settings.json file to enable tool invocation with zero configuration drift.',
      },
    ],
  },

  'mcp-workflow': {
    id: 'mcp-workflow',
    path: '/docs/mcp/workflow',
    title: 'End-to-End User & Agent Workflow',
    category: 'AI & MCP SECURITY',
    categoryId: 'ai-mcp-security',
    readTime: '8 min read',
    description:
      'The comprehensive execution path from developer prompt to audited tool output and deterministic evidence persistence.',
    subsections: [
      {
        id: 'user-interaction',
        heading: '1. Developer Prompts the AI Agent',
        content:
          'A developer asks their AI assistant: "Run a security scan on repository backend and propose a fix for any SQL injections found." The agent formulates a plan and determines it needs to call `run_security_scan`.',
      },
      {
        id: 'gateway-interception',
        heading: '2. Gateway Interception & Policy Check',
        content:
          'The MCP client sends the tool request payload to the Kavach Gateway. The gateway inspects the agent token, checks that the agent has `SCANS_EXECUTE` permission in PostgreSQL, and submits the payload to the OPA Rego engine.',
      },
      {
        id: 'human-approval-gate',
        heading: '3. Human-in-the-Loop Approval',
        content:
          'If a tool is classified as HIGH or CRITICAL risk (e.g. `quarantine_compromised_target` or `propose_remediation_diff`), the gateway suspends execution and pushes an approval notification to the developer dashboard. Once approved by a human, execution resumes.',
      },
    ],
  },

  'mcp-tools': {
    id: 'mcp-tools',
    path: '/docs/mcp/tools',
    title: 'Complete Registered 22 MCP Tools Reference',
    category: 'AI & MCP SECURITY',
    categoryId: 'ai-mcp-security',
    badge: '22 Real Tools',
    readTime: '12 min read',
    description:
      'Authoritative reference for all 22 real tools registered in the Kavach MCP Gateway, including categories, permissions, risk tiers, and input schemas.',
    subsections: [
      {
        id: 'tools-registry-overview',
        heading: 'Kavach Tool Registry Standard',
        content:
          'Every tool exposed by the Kavach MCP Gateway is registered with strict JSON Schema definitions, RBAC permissions, and risk tiers. Agents can discover tools using the standard `tools/list` JSON-RPC method.',
      },
    ],
    mcpTools: [
      {
        name: 'get_project',
        category: 'PROJECT',
        description: 'Retrieve verified project details, configuration, and security posture from the control plane.',
        requiredPermission: 'PROJECT_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"project_id": {"type": "string"}}, "required": ["project_id"]}',
      },
      {
        name: 'get_security_blueprint',
        category: 'SECURITY',
        description: 'Retrieve dynamic security requirements and declared compliance architecture for a project.',
        requiredPermission: 'BLUEPRINT_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"project_id": {"type": "string"}}, "required": ["project_id"]}',
      },
      {
        name: 'get_security_requirements',
        category: 'SECURITY',
        description: 'Query specific security requirements, controls, and mandatory gates for a workload.',
        requiredPermission: 'REQUIREMENTS_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"project_id": {"type": "string"}}}',
      },
      {
        name: 'check_security_policy',
        category: 'POLICY',
        description: 'Evaluate an action, code change, or tool invocation against deterministic OPA Rego rules.',
        requiredPermission: 'POLICY_EVALUATE',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"policy_id": {"type": "string"}, "input_data": {"type": "object"}}, "required": ["policy_id", "input_data"]}',
      },
      {
        name: 'run_security_scan',
        category: 'SCANS',
        description: 'Trigger a real multi-engine security scan (Semgrep, Gitleaks, Trivy) on a target repository.',
        requiredPermission: 'SCAN_TRIGGER',
        riskTier: 'MEDIUM',
        inputSchema: '{"type": "object", "properties": {"project_id": {"type": "string"}, "target_path": {"type": "string"}}, "required": ["project_id"]}',
      },
      {
        name: 'get_scan',
        category: 'SCANS',
        description: 'Fetch scan progress, status, and verified vulnerability findings from an existing scan run.',
        requiredPermission: 'SCAN_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"scan_id": {"type": "string"}}, "required": ["scan_id"]}',
      },
      {
        name: 'execute_security_check',
        category: 'SCANS',
        description: 'Execute a single discrete security check or rule against a code snippet or configuration.',
        requiredPermission: 'CHECK_EXECUTE',
        riskTier: 'MEDIUM',
        inputSchema: '{"type": "object", "properties": {"check_type": {"type": "string"}, "payload": {"type": "string"}}, "required": ["check_type", "payload"]}',
      },
      {
        name: 'get_github_repository',
        category: 'GITHUB',
        description: 'Retrieve GitHub repository metadata, active branches, and commit status.',
        requiredPermission: 'GITHUB_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"repo_full_name": {"type": "string"}}, "required": ["repo_full_name"]}',
      },
      {
        name: 'get_pull_request',
        category: 'GITHUB',
        description: 'Fetch pull request details, changed files, and associated security scan checks.',
        requiredPermission: 'GITHUB_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"repo_full_name": {"type": "string"}, "pr_number": {"type": "integer"}}, "required": ["repo_full_name", "pr_number"]}',
      },
      {
        name: 'propose_remediation_diff',
        category: 'REMEDIATION',
        description: 'Synthesize an automated code remediation diff for a verified vulnerability finding.',
        requiredPermission: 'REMEDIATION_WRITE',
        riskTier: 'HIGH',
        inputSchema: '{"type": "object", "properties": {"finding_id": {"type": "string"}, "target_file": {"type": "string"}}, "required": ["finding_id", "target_file"]}',
      },
      {
        name: 'verify_remediation_patch',
        category: 'REMEDIATION',
        description: 'Execute unit tests and re-scan a proposed patch in an isolated ephemeral micro-sandbox.',
        requiredPermission: 'REMEDIATION_EXECUTE',
        riskTier: 'HIGH',
        inputSchema: '{"type": "object", "properties": {"patch_diff": {"type": "string"}, "project_id": {"type": "string"}}, "required": ["patch_diff", "project_id"]}',
      },
      {
        name: 'get_cloud_inventory',
        category: 'CLOUD',
        description: 'Query discovered multi-cloud assets, IAM roles, and storage buckets across AWS/GCP/Azure.',
        requiredPermission: 'CLOUD_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"provider": {"type": "string"}}}',
      },
      {
        name: 'audit_cloud_posture',
        category: 'CLOUD',
        description: 'Evaluate cloud assets against CIS Cloud Benchmarks and identify drift from security blueprints.',
        requiredPermission: 'CLOUD_AUDIT',
        riskTier: 'MEDIUM',
        inputSchema: '{"type": "object", "properties": {"project_id": {"type": "string"}}, "required": ["project_id"]}',
      },
      {
        name: 'scan_container_image_security',
        category: 'CONTAINER',
        description: 'Inspect an OCI container image for OS package vulnerabilities, layer leaks, and configuration flaws.',
        requiredPermission: 'CONTAINER_SCAN',
        riskTier: 'MEDIUM',
        inputSchema: '{"type": "object", "properties": {"image_tag": {"type": "string"}}, "required": ["image_tag"]}',
      },
      {
        name: 'query_threat_intelligence',
        category: 'THREAT_INTEL',
        description: 'Check CVE identifiers, IP addresses, or file hashes against live global threat feeds.',
        requiredPermission: 'INTEL_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"cve_id": {"type": "string"}}}',
      },
      {
        name: 'get_active_incidents',
        category: 'INCIDENTS',
        description: 'Fetch open security alerts, runtime violations, and active incident response tickets.',
        requiredPermission: 'INCIDENTS_READ',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"severity": {"type": "string"}}}',
      },
      {
        name: 'quarantine_compromised_target',
        category: 'INCIDENTS',
        description: 'Immediately isolate a compromised workload, revoke active credentials, or block network egress.',
        requiredPermission: 'SECURITY_ADMIN',
        riskTier: 'CRITICAL',
        inputSchema: '{"type": "object", "properties": {"target_id": {"type": "string"}, "reason": {"type": "string"}}, "required": ["target_id", "reason"]}',
      },
      {
        name: 'audit_attack_surface',
        category: 'ATTACK_SURFACE',
        description: 'Analyze external attack surface exposure, open ports, expired certificates, and DNS records.',
        requiredPermission: 'SURFACE_AUDIT',
        riskTier: 'MEDIUM',
        inputSchema: '{"type": "object", "properties": {"domain": {"type": "string"}}, "required": ["domain"]}',
      },
      {
        name: 'simulate_attack_path',
        category: 'ATTACK_SURFACE',
        description: 'Trace lateral movement and privilege escalation paths from an external entrypoint to sensitive data.',
        requiredPermission: 'ATTACK_SIMULATE',
        riskTier: 'HIGH',
        inputSchema: '{"type": "object", "properties": {"entrypoint_id": {"type": "string"}, "target_resource": {"type": "string"}}, "required": ["entrypoint_id", "target_resource"]}',
      },
      {
        name: 'audit_compliance_framework',
        category: 'COMPLIANCE',
        description: 'Evaluate technical controls against SOC 2 Type II, ISO 27001, HIPAA, and PCI-DSS requirements.',
        requiredPermission: 'COMPLIANCE_AUDIT',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"framework": {"type": "string"}}, "required": ["framework"]}',
      },
      {
        name: 'scan_sensitive_data_posture',
        category: 'DATA_SECURITY',
        description: 'Detect PII, financial data, and health records in database schemas and storage buckets.',
        requiredPermission: 'DATA_POSTURE_READ',
        riskTier: 'MEDIUM',
        inputSchema: '{"type": "object", "properties": {"datasource_id": {"type": "string"}}, "required": ["datasource_id"]}',
      },
      {
        name: 'audit_agent_permissions_posture',
        category: 'AGENT_GOVERNANCE',
        description: 'Inspect permissions, active sessions, and anomalous behavior across all registered AI agents.',
        requiredPermission: 'AGENT_AUDIT',
        riskTier: 'LOW',
        inputSchema: '{"type": "object", "properties": {"agent_id": {"type": "string"}}}',
      },
    ],
  },

  'mcp-policy': {
    id: 'mcp-policy',
    path: '/docs/mcp/policy',
    title: 'Deterministic OPA Policy & Guardrails',
    category: 'AI & MCP SECURITY',
    categoryId: 'ai-mcp-security',
    badge: 'Rego Invariants',
    readTime: '8 min read',
    description:
      'Authoring declarative Open Policy Agent (OPA) rules in Rego to govern AI tool invocations, rate limits, and merge gates.',
    subsections: [
      {
        id: 'rego-overview',
        heading: '1. Why Declarative OPA Invariants?',
        content:
          'Security rules in Kavach are written in Rego, the declarative query language designed for Open Policy Agent. Rego allows security teams to mathematically codify boundaries that cannot be hallucinated, coerced, or bypassed by adversarial prompt injection.',
      },
      {
        id: 'sample-rego-policy',
        heading: '2. Production OPA Policy Example',
        content:
          'The following policy enforces that AI agents cannot execute quarantine or remediation tools against production environments without an explicit human approval token:',
        codeBlocks: [
          {
            title: 'policy/mcp_guardrails.rego',
            lang: 'rego',
            code: `package kavach.mcp

default allow = false

# Allow read-only tools unconditionally
allow {
    input.tool.risk_tier == "LOW"
}

# Require human approval for critical tools
allow {
    input.tool.risk_tier == "CRITICAL"
    input.human_approval.approved == true
    input.human_approval.signer_role == "SECURITY_ADMIN"
}

# Deny any tool if agent error rate exceeds threshold
deny[msg] {
    input.agent.error_count_last_hour > 10
    msg := "Agent temporarily suspended due to abnormal error frequency"
}`,
          },
        ],
      },
    ],
  },

  'mcp-audit': {
    id: 'mcp-audit',
    path: '/docs/mcp/audit',
    title: 'Cryptographic Audit & Evidence Ledger',
    category: 'AI & MCP SECURITY',
    categoryId: 'ai-mcp-security',
    badge: 'SLSA L3 Evidence',
    readTime: '7 min read',
    description:
      'Immutable, tamper-evident audit logs of every AI agent tool call, policy evaluation, and code modification persisted in PostgreSQL.',
    subsections: [
      {
        id: 'immutable-ledger',
        heading: '1. Tamper-Evident Storage Model',
        content:
          'Every invocation handled by the Kavach MCP Gateway writes an immutable record to the `mcp_tool_invocations` table in PostgreSQL. The record contains input arguments, policy decisions, execution output, actor IDs, timestamps, and a cryptographic SHA-256 hash chaining to the previous log entry.',
      },
      {
        id: 'compliance-export',
        heading: '2. SOC 2 & ISO 27001 Auditor Export',
        content:
          'Security teams can export digitally signed compliance evidence packages. When external auditors ask for proof of change management and AI governance, Kavach provides complete, unalterable proof of who authorized each modification.',
      },
    ],
  },
};

