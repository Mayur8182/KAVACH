# 02 — Frontend Architecture: Next.js 15 Control Plane

## Architecture Overview

The SecuLayer frontend is a production **Next.js 15** web application built with **React 19**, **Turbopack**, and **Tailwind CSS**. It is designed around the **App Router** paradigm with strict adherence to real API connectivity (zero fake state, zero local storage persistence of truth, zero fabricated mock data).

---

## Component & Layer Hierarchy

```
[ BROWSER WINDOW ]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ app/layout.tsx (Root Layout)                           │
│ - Global CSS & Design Tokens (styles/tokens.css)       │
│ - AuthContext / Session Provider                       │
│ - OrganizationContext & Tenant Switcher                │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│ SIDEBAR NAVIGATION          │ │ APP HEADER & BREADCRUMBS    │
│ - 14 Product Modules        │ │ - Active Tenant / Project   │
│ - Role-Gated Menu Items     │ │ - User Profile & Notifications│
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               └───────────────────┬───────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────┐
│ PAGE CONTAINER (app/[module]/page.tsx)                 │
│ - Loading Skeletons & Suspense Boundaries              │
│ - Error Boundaries & Retry State                       │
│ - Feature Views (e.g., CodeSecurityView, HotspotsView) │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ UNIFIED API CLIENT (lib/api/client.ts)                 │
│ - Request Interceptor: Injects Bearer Token            │
│ - Header Interceptor: Injects X-Organization-Id        │
│ - Scoped Domain APIs: apiClient.scans, apiClient.iac   │
│ - Direct Fetch to FastAPI Gateway (:8000)              │
└────────────────────────────────────────────────────────┘
```

---

## Key Frontend Subsystems

1. **Root Layout (`frontend/app/layout.tsx`):**
   - Configures Geist & JetBrains Mono typography.
   - Initializes session authentication checks.
   - Provides global toast notification and telemetry context.

2. **Unified API Client (`frontend/lib/api/client.ts`):**
   - Centralized singleton (`apiClient`) with domain-scoped methods:
     - `auth`: Login, register, MFA verification, logout
     - `invitations`: Workspace invite creation, acceptance, role updating
     - `scans` & `findings`: Security scan triggers, finding triage, status updates
     - `hotspots`: Manual security review queue, comments, auditor assignments
     - `iac`: IaC scanning, drift detection, compliance frameworks
     - `cloud`: Cloud resource inventory, blast radius, CIS benchmarks
     - `protect`: MCP tool approvals, runtime policies, active sessions
     - `agent`: Agent identity registration, delegations, tool permissions
     - `qa`: Test suites, automated runs, quality gates

3. **Data Provenance & Reliability Contract:**
   - Adheres strictly to the Mockhunter standard: every metric and table is powered by verified backend endpoints.
   - If an integration or feature lacks backend configuration, the UI displays `NOT CONFIGURED` rather than simulated success.

---

## Interactive Diagram
Open [`frontend-architecture.html`](./frontend-architecture.html) in your browser for the full interactive diagram with inline SVG and editable Mermaid code.
