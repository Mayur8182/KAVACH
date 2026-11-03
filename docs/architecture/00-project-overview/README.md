# 00 — Project Overview: SecuLayer Control Plane

## Executive Summary
**SecuLayer** (also developed under the core codebase codename **Thing**) is an enterprise-grade AI-native Security Control Plane designed to secure modern software engineering organizations, developer workflows, and autonomous AI coding agents.

### Architectural Golden Rule
> **"LLM proposes. Deterministic security systems decide. Runtime evidence proves."**
- **LLM is NEVER the security authority** for decisions (allow, block, grant permission, access secrets, or deploy).
- **Deterministic Policy Engines (Open Policy Agent / OPA)** + **Specialized Security Scanners** (Semgrep, Gitleaks, Trivy, Checkov) + **Contract Engines** make all authoritative decisions.
- **Model Context Protocol (MCP)** is wrapped with an active security gateway enforcing identity, fine-grained risk evaluation, and human-in-the-loop approvals.

---

## The 10 Deterministic Engines

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER / AI AGENT                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tool call / Action proposal
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AGENT SECURITY GUARD GATEWAY                         │
│  ┌───────────────────────┬──────────────────────┬───────────────────┐  │
│  │ 1. Intent Engine      │ 2. Security Blueprint│ 3. Security Engine│  │
│  │ (Architecture Parser) │ (Control Synthesis)  │ (Semgrep/Gitleaks)│  │
│  └───────────────────────┴──────────────────────┴───────────────────┘  │
│                                   │                                    │
│                                   ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4. Policy Engine (OPA / Deterministic Rego Rules)                 │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
             [ ALLOWED ]                        [ BLOCKED ]
                   │                                 │
                   ▼                                 ▼
         5. Actual Execution               6. AI Remediation Engine
      (GitHub / Docker / Cloud)           (Verified Patches & Rescan)
                   │
                   ▼
     7. Runtime Sensors & Evidence
     (OpenTelemetry Traces & Logs)
```

1. **Intent Engine:** Ingests application descriptors, diffs, or prompts, extracting technical requirements, auth mechanisms, and resource access patterns.
2. **Security Blueprint Engine:** Synthesizes the required security controls based on technology stack, sensitivity classification, and regulatory frameworks.
3. **Security Scanner Engine:** Orchestrates real AST/SAST scanning (Semgrep), secrets detection (Gitleaks), dependency analysis (OSV/Trivy), and IaC analysis (Checkov).
4. **Policy Engine:** Deterministic rule evaluation via Open Policy Agent (OPA) with strict zero-trust invariants.
5. **AI Remediation Engine:** Generates candidate diffs and unified patches that must pass deterministic rescanning before being applied.
6. **MCP Gateway:** Intercepts Model Context Protocol tool requests, evaluating identity, least-privilege scoping, and permission boundaries.
7. **Agent Identity & Delegation Engine:** Registers agents, tracks delegation chains, enforces task-specific token budgets, and audits agent actions.
8. **Security Contract Engine:** Verifies multi-tenant isolation and cryptographic contracts (e.g., `user.tenant_id == resource.tenant_id`).
9. **Runtime Evidence Collector:** Ingests OpenTelemetry traces, execution metrics, and audit logs to verify continued runtime integrity.
10. **Attack Surface & Recovery Engine:** Performs continuous external asset discovery, API fuzzing, and isolated automated rollbacks.

---

## Interactive Diagram
Open [`project-overview.html`](./project-overview.html) in your browser for the standalone, editorial-grade architecture diagram.
