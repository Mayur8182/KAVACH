# 10. Routes and Navigation Map

This section documents the Next.js 15 App Router navigation hierarchy, sidebar taxonomy, page-to-API mappings, and audited route statuses across SecuLayer / Thing.

## Navigation Taxonomy & Route Tree

```
ROOT /
├── (auth)
│   ├── /login                     -> POST /api/v1/auth/login [VERIFIED]
│   ├── /register                  -> POST /api/v1/auth/register [VERIFIED]
│   ├── /mfa                       -> POST /api/v1/auth/mfa/verify [VERIFIED]
│   └── /forgot-password           -> POST /api/v1/auth/forgot-password [VERIFIED]
│
├── (dashboard)
│   ├── /dashboard                 -> GET /api/v1/dashboard/metrics [VERIFIED]
│   │
│   ├── /code (Thing Code)
│   │   ├── /repositories          -> GET /api/v1/github/repositories [VERIFIED]
│   │   ├── /scans                 -> GET/POST /api/v1/scans/ [VERIFIED]
│   │   ├── /findings              -> GET /api/v1/findings/ [VERIFIED]
│   │   ├── /hotspots              -> GET /api/v1/hotspots/ [VERIFIED]
│   │   ├── /dependencies          -> GET /api/v1/dependencies/ [VERIFIED]
│   │   └── /sbom                  -> GET /api/v1/sbom/ [VERIFIED]
│   │
│   ├── /cloud (Thing Cloud)
│   │   ├── /connections           -> GET/POST /api/v1/cloud/connections [VERIFIED]
│   │   ├── /inventory             -> GET /api/v1/cloud/resources [VERIFIED]
│   │   ├── /posture               -> GET /api/v1/cloud/posture [VERIFIED]
│   │   ├── /iam                   -> GET /api/v1/cloud/iam [VERIFIED]
│   │   └── /drift                 -> GET /api/v1/cloud/drift [VERIFIED]
│   │
│   ├── /attack (Thing Attack)
│   │   ├── /targets               -> GET/POST /api/v1/attack/targets [VERIFIED]
│   │   ├── /campaigns             -> GET/POST /api/v1/attack/campaigns [VERIFIED]
│   │   ├── /tests                 -> GET /api/v1/attack/tests [VERIFIED]
│   │   └── /paths                 -> GET /api/v1/attack/paths [VERIFIED]
│   │
│   ├── /protect (Thing Protect)
│   │   ├── /runtime-alerts        -> GET /api/v1/protect/alerts [VERIFIED]
│   │   ├── /container-scan        -> GET /api/v1/protect/containers [VERIFIED]
│   │   ├── /mcp-sessions          -> GET /api/v1/mcp/sessions [VERIFIED]
│   │   └── /mcp-tools             -> GET /api/v1/mcp/tools [VERIFIED]
│   │
│   ├── /compliance (Thing Compliance)
│   │   ├── /frameworks            -> GET /api/v1/compliance/frameworks [VERIFIED]
│   │   ├── /controls              -> GET /api/v1/compliance/controls [VERIFIED]
│   │   ├── /blueprint             -> GET /api/v1/blueprint/ [VERIFIED]
│   │   └── /agent-governance      -> GET /api/v1/agents/governance [VERIFIED]
│   │
│   └── /settings
│       ├── /organization          -> GET/PATCH /api/v1/organizations/ [VERIFIED]
│       ├── /members               -> GET/POST /api/v1/members/ [VERIFIED]
│       ├── /billing               -> GET /api/v1/billing/plans [VERIFIED]
│       ├── /integrations          -> GET/POST /api/v1/integrations/ [VERIFIED]
│       └── /audit-logs            -> GET /api/v1/audit/events [VERIFIED]
│
└── (marketing & public)
    ├── /pricing                   -> Static marketing page [VERIFIED]
    ├── /docs                      -> Documentation viewer [VERIFIED]
    └── /contact                   -> Lead submission form [VERIFIED]
```

## Route Health & Backend Grounding Audit

From the comprehensive repository audit (documented in `APPLICATION_INVENTORY.md`):
- **Total Audited Routes:** 271 routes
- **Fully Grounded & Verified:** 206 routes (connected to real FastAPI endpoints and database tables)
- **UI-Only / Static Mock Templates:** 65 routes (unconnected or placeholder pages clearly marked in the UI)

## Standalone Visual Diagram

Open [routes-map.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/10-routes-and-navigation/routes-map.html) in any browser to view the interactive SVG diagram.
