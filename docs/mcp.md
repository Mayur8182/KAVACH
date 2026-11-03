# MCP Gateway & Delegated Execution Integration

## MCP Gateway Pipeline
When an agent calls a tool over the official Model Context Protocol (MCP):
```text
MCP Tool Request
       ↓
Session Authentication & Identity Resolution
       ↓
Delegation Resolver (checks active incoming delegations)
       ↓
Deterministic Authorization (direct roles + delegated capabilities)
       ↓
Step 7 Policy Evaluation (OPA / Boolean Rules)
       ↓
Approval Check (blocks execution if REQUIRE_APPROVAL)
       ↓
Controlled Tool Execution
       ↓
Audit Logging with Delegation Provenance
```

## Delegated Audit Metadata
Whenever an agent executes a tool using authority granted via delegation, the persistent `MCPToolInvocation` record preserves:
- `acting_agent`: The authenticated identity performing the action.
- `delegating_agent`: The upstream agent that granted the permission.
- `delegation_id`: The immutable UUID of the active delegation record.
- `provenance`: The full chain of custody from original root principal.
- `authorization_decision`: `AUTHORIZED`.
