# Agent Delegation & Authority Graph Specification

## Core Principles
1. **Delegation is NOT Identity Transfer**: Acting agent and delegating agent remain distinct throughout all execution layers and audit logs.
2. **Subset Invariant**:
   $$\text{DelegatedAuthority} \subseteq \text{DelegatorAuthority}$$
   - Actions must be an exact subset of delegator actions.
   - Resource scope can only be narrowed (e.g., project -> repository -> branch).
   - Environment clearance cannot exceed delegator level (`development` < `test` < `staging` < `production`).
   - Expiration must be $\le$ delegator authority expiration.
3. **Further Delegation Control**: Controlled explicitly via `allow_further_delegation`. If `false`, child delegation attempts raise `FurtherDelegationForbiddenError`.
4. **Depth Capped**: Enforced at `MAX_DELEGATION_DEPTH = 3`.
5. **Acyclic Graphs**: Pre-commit cycle detection prevents loops (e.g. $A \to B \to C \to A$).
6. **Subtree Revocation**: Revoking a root delegation immediately cascades down dependent child edges in PostgreSQL.
