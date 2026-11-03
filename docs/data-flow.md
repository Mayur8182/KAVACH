# Agent Data-Flow Control Specification

## Data Classifications
The data-flow gateway classifies all inter-agent communications and data movements into 6 discrete tiers:
1. `PUBLIC`: Publicly available information, open documentation, public repository metadata.
2. `INTERNAL`: Internal operational reports, task status, sanitized logs.
3. `CONFIDENTIAL`: Project blueprints, security requirement lists, non-sensitive findings.
4. `SENSITIVE`: Vulnerability descriptions, AST scan snippets, code security defects.
5. `SECRET`: API credentials, database passwords, private encryption keys, session tokens.
6. `RESTRICTED`: High-consequence production governance keys and master signing credentials.

## Security Rules
1. **No Automatic Inter-Agent Trust**: Belonging to the same project does not grant implicit data transfer permissions.
2. **Cross-Project Quarantine**: Inter-agent data flows across project boundaries are strictly rejected (`CROSS_PROJECT_FLOW_BLOCKED`).
3. **Secret Forwarding Guard**: Secret and Restricted classifications require both the sender agent and recipient agent to hold explicit `SECRET_READ` authorization. Otherwise, the flow is blocked (`SECRET_DATA_FLOW_FORBIDDEN`).
4. **Lifecycle & Decisions**: Each flow request is deterministically audited with states `ALLOWED`, `DENIED`, `REQUIRE_APPROVAL`, `REVOKED`.
