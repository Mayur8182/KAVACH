# Authorization Engine & Provenance Architecture

## Architectural Rule
> **"LLM proposes. Deterministic security systems decide. Runtime evidence proves."**

## Effective Authority Algorithm
To determine whether an agent may execute an action on a target resource:
1. **Authentication & Liveness**: Verify agent credential and verify `agent.status == "ACTIVE"`.
2. **Direct Authority**: Resolve active role permissions bound to the agent, checking `expires_at` and scope filters.
3. **Delegated Authority**:
   - Query incoming `ACTIVE` delegations from `delegations`.
   - Verify delegator agent liveness (`delegator.status == "ACTIVE"`). If delegator is revoked/suspended, the delegation is immediately inactive.
   - Verify expiration (`delegation.expires_at > now`).
   - Validate condition DSL (`when: { environment: ... }`).
4. **Provenance Tracking**: Every effective permission retains:
   - `source_type`: `DIRECT_ROLE` or `DELEGATION`
   - `source_agent_id` & `source_agent_name`
   - `delegation_id` & `delegation_depth`
   - `expires_at`
5. **Deterministic Decision**: Evaluates requested action against effective set, checking resource scope and environment hierarchy.
