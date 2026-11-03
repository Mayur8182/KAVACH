# 06 — Authentication & Authorization Architecture

## Overview

SecuLayer implements an enterprise identity architecture supporting human engineers, administrators, third-party webhook integrations, and autonomous AI agents.

---

## 1. Authentication Mechanisms

### Human Users
- **Primary Auth:** Email & password with salted `bcrypt` hashing.
- **Two-Factor Authentication (TOTP):** Time-based one-time passwords via Google Authenticator / standard RFC 6238 TOTP apps, encrypted recovery codes, and trusted device fingerprints stored in `users.mfa_trusted_devices`.
- **OAuth & SSO:**
  - GitHub OAuth (`/api/v1/auth/callback/github`)
  - Google OAuth (`/api/v1/auth/callback/google`)
  - Enterprise SAML/OIDC SSO (`/api/v1/auth/callback/sso`)
- **Brute-Force & Lockout:** Tracks `failed_login_attempts`; locks accounts after 5 consecutive failures (`is_locked=True`, `locked_until` timestamp).

### Service Accounts & Developers
- **Personal Access Tokens (PATs) / API Keys:** Prefixed tokens (`sec_pat_...`) hashed with SHA-256 before persistence in PostgreSQL. Evaluated on protected endpoints via `X-API-Key` or `Authorization: Bearer` headers.

### Autonomous AI Agents
- **Agent Identity Registry:** Every AI agent must possess a registered `agent_identities` record with a defined cryptographic key, task scope, and initial trust score.

---

## 2. Multi-Tenant Scoping & Organization Isolation

```
[ CLIENT REQUEST ]
       │
       ▼ Headers: Authorization: Bearer <JWT>
                  X-Organization-Id: <UUID>
┌────────────────────────────────────────────────────────┐
│ FASTAPI AUTHENTICATION DEPENDENCY                      │
│ (get_current_user & get_current_organization)          │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│ 1. VALIDATE JWT CLAIMS      │ │ 2. VERIFY TENANT MEMBERSHIP │
│ - Token expiration & sig    │ │ - Check users.org_id        │
│ - Account lockout check     │ │ - Or active invitations     │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               └───────────────────┬───────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────┐
│ 3. ENFORCE ROLE-BASED ACCESS CONTROL (RBAC)            │
│ - OWNER: Full control over billing, plans, members     │
│ - ADMIN: Manage repos, trigger scans, edit policies    │
│ - MEMBER: View findings, review hotspots, trigger scan │
│ - VIEWER: Read-only access to reports & findings       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. ORG-FILTERED SQLALCHEMY QUERIES                     │
│ SELECT * FROM table WHERE organization_id = :org_id    │
└────────────────────────────────────────────────────────┘
```

---

## 3. Role-Based Access Control (RBAC) Matrix

| Capability | OWNER | ADMIN | MEMBER | VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| View Dashboards & Findings | YES | YES | YES | YES |
| Review & Triage Security Hotspots | YES | YES | YES | NO |
| Trigger Manual Repository Scan | YES | YES | YES | NO |
| Apply AI Remediation Patches | YES | YES | YES | NO |
| Connect SCM / Cloud Integrations | YES | YES | NO | NO |
| Modify OPA Policies & Blueprints | YES | YES | NO | NO |
| Invite Members & Update Roles | YES | YES | NO | NO |
| Billing & Subscription Upgrades | YES | NO | NO | NO |
| Delete Organization Workspace | YES | NO | NO | NO |

---

## Interactive Diagram
Open [`authentication-and-authorization.html`](./authentication-and-authorization.html) in your browser for the full interactive diagram with inline SVG and editable Mermaid code.
