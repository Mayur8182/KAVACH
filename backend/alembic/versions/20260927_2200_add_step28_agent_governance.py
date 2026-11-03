"""Step 28 — AI Coding Agent Security Governance

Creates all agent governance tables:
  - agent_provider_adapters
  - agent_governance_profiles
  - agent_capability_records
  - agent_governance_sessions
  - agent_security_events
  - agent_tool_invocations
  - agent_command_executions
  - agent_file_accesses
  - agent_network_events
  - agent_code_changes
  - agent_git_operations
  - agent_policy_decisions
  - agent_action_approvals
  - agent_governance_delegations
  - agent_behavior_anomalies
  - agent_revocation_records
  - agent_security_contract_bindings
  - agent_mcp_events

Seeds provider adapter registry with the 5 known providers.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime, timezone

# revision identifiers
revision = "20260927_2200"
down_revision = "20260927_2100"
branch_labels = None
depends_on = None



def upgrade() -> None:
    # ── 1. Provider Adapter Registry ────────────────────────────────
    op.create_table(
        "agent_provider_adapters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("provider", sa.String(100), nullable=False, unique=True),
        sa.Column("adapter_version", sa.String(50), nullable=False, server_default="0.1.0"),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="NOT_CONFIGURED"),
        sa.Column("supported_capabilities", sa.JSON(), nullable=True),
        sa.Column("integration_method", sa.String(100), nullable=True),
        sa.Column("configuration", sa.JSON(), nullable=True),
        sa.Column("last_health_check", sa.DateTime(timezone=True), nullable=True),
        sa.Column("health_check_error", sa.Text(), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_apa_provider", "agent_provider_adapters", ["provider"])

    # ── 2. Agent Governance Profile ──────────────────────────────────
    op.create_table(
        "agent_governance_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("agent_provider", sa.String(100), nullable=False),
        sa.Column("agent_name", sa.String(255), nullable=False),
        sa.Column("agent_version", sa.String(100), nullable=True),
        sa.Column("model_provider", sa.String(100), nullable=True),
        sa.Column("model_name", sa.String(255), nullable=True),
        sa.Column("environment", sa.String(50), nullable=False, server_default="development"),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lifecycle_status", sa.String(50), nullable=False, server_default="REGISTERED"),
        sa.Column("policy_scope", sa.JSON(), nullable=True),
        sa.Column("capability_scope", sa.JSON(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("revocation_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_agp_agent_id", "agent_governance_profiles", ["agent_id"])
    op.create_index("ix_agp_provider", "agent_governance_profiles", ["agent_provider"])
    op.create_index("ix_agp_lifecycle", "agent_governance_profiles", ["lifecycle_status"])

    # ── 3. Agent Capability Records ──────────────────────────────────
    op.create_table(
        "agent_capability_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("capability", sa.String(100), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="UNKNOWN"),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("discovered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("discovery_method", sa.String(100), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("agent_id", "capability", name="uq_agent_capability"),
    )
    op.create_index("ix_acr_agent_id", "agent_capability_records", ["agent_id"])

    # ── 4. Agent Governance Sessions ─────────────────────────────────
    op.create_table(
        "agent_governance_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repository_id", sa.String(255), nullable=True),
        sa.Column("environment", sa.String(50), nullable=False, server_default="development"),
        sa.Column("session_token_hash", sa.String(128), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="STARTING"),
        sa.Column("client_metadata", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("policy_version", sa.Integer(), nullable=True),
        sa.Column("blueprint_version", sa.Integer(), nullable=True),
        sa.Column("contract_version", sa.Integer(), nullable=True),
        sa.Column("risk_context", sa.JSON(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("revocation_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ags_agent_id", "agent_governance_sessions", ["agent_id"])
    op.create_index("ix_ags_project_id", "agent_governance_sessions", ["project_id"])
    op.create_index("ix_ags_status", "agent_governance_sessions", ["status"])
    op.create_index("ix_ags_started_at", "agent_governance_sessions", ["started_at"])

    # ── 5. Agent Security Events ─────────────────────────────────────
    op.create_table(
        "agent_security_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("repository_id", sa.String(255), nullable=True),
        sa.Column("action", sa.String(255), nullable=True),
        sa.Column("resource", sa.String(1000), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="LOW"),
        sa.Column("policy_decision", sa.String(50), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("evidence_id", sa.String(36), nullable=True),
        sa.Column("provider_event_id", sa.String(255), nullable=True),
        sa.Column("provider", sa.String(100), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("provider", "provider_event_id", "project_id", name="uq_agent_event_provider_idempotency"),
    )
    op.create_index("ix_ase_event_type", "agent_security_events", ["event_type"])
    op.create_index("ix_ase_agent_id", "agent_security_events", ["agent_id"])
    op.create_index("ix_ase_session_id", "agent_security_events", ["session_id"])
    op.create_index("ix_ase_occurred_at", "agent_security_events", ["occurred_at"])
    op.create_index("ix_ase_risk_level", "agent_security_events", ["risk_level"])

    # ── 6. Agent Tool Invocations ────────────────────────────────────
    op.create_table(
        "agent_tool_invocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tool_name", sa.String(255), nullable=False),
        sa.Column("tool_type", sa.String(100), nullable=False),
        sa.Column("resource", sa.String(2000), nullable=True),
        sa.Column("arguments_hash", sa.String(64), nullable=True),
        sa.Column("argument_metadata", sa.JSON(), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("approval_id", sa.String(36), nullable=True),
        sa.Column("execution_id", sa.String(255), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("evidence_id", sa.String(36), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("policy_version", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ati_session_id", "agent_tool_invocations", ["session_id"])
    op.create_index("ix_ati_tool_name", "agent_tool_invocations", ["tool_name"])
    op.create_index("ix_ati_risk_level", "agent_tool_invocations", ["risk_level"])
    op.create_index("ix_ati_policy_decision", "agent_tool_invocations", ["policy_decision"])

    # ── 7. Agent Command Executions ──────────────────────────────────
    op.create_table(
        "agent_command_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("raw_command", sa.Text(), nullable=False),
        sa.Column("executable", sa.String(255), nullable=True),
        sa.Column("arguments", sa.JSON(), nullable=True),
        sa.Column("working_directory", sa.Text(), nullable=True),
        sa.Column("environment_keys", sa.JSON(), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("block_reason", sa.Text(), nullable=True),
        sa.Column("matched_policy_rule", sa.String(255), nullable=True),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("approval_id", sa.String(36), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ace_session_id", "agent_command_executions", ["session_id"])
    op.create_index("ix_ace_executable", "agent_command_executions", ["executable"])
    op.create_index("ix_ace_risk_level", "agent_command_executions", ["risk_level"])
    op.create_index("ix_ace_policy_decision", "agent_command_executions", ["policy_decision"])

    # ── 8. Agent File Accesses ───────────────────────────────────────
    op.create_table(
        "agent_file_accesses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operation", sa.String(50), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("is_sensitive_path", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sensitivity_category", sa.String(100), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="LOW"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("block_reason", sa.Text(), nullable=True),
        sa.Column("is_path_traversal_attempt", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("accessed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_afa_session_id", "agent_file_accesses", ["session_id"])
    op.create_index("ix_afa_sensitive", "agent_file_accesses", ["is_sensitive_path"])
    op.create_index("ix_afa_policy_decision", "agent_file_accesses", ["policy_decision"])
    op.create_index("ix_afa_accessed_at", "agent_file_accesses", ["accessed_at"])

    # ── 9. Agent Network Events ──────────────────────────────────────
    op.create_table(
        "agent_network_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("destination_host", sa.String(2000), nullable=False),
        sa.Column("destination_port", sa.Integer(), nullable=True),
        sa.Column("protocol", sa.String(20), nullable=True),
        sa.Column("destination_category", sa.String(100), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="LOW"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("threat_intel_match", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("threat_intel_source", sa.String(255), nullable=True),
        sa.Column("dns_security_decision", sa.String(50), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ane_session_id", "agent_network_events", ["session_id"])
    op.create_index("ix_ane_destination_host", "agent_network_events", ["destination_host"])
    op.create_index("ix_ane_threat_intel_match", "agent_network_events", ["threat_intel_match"])
    op.create_index("ix_ane_occurred_at", "agent_network_events", ["occurred_at"])

    # ── 10. Agent Code Changes ───────────────────────────────────────
    op.create_table(
        "agent_code_changes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("change_description", sa.Text(), nullable=True),
        sa.Column("diff_hash", sa.String(64), nullable=True),
        sa.Column("lines_added", sa.Integer(), nullable=True),
        sa.Column("lines_removed", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="PROPOSED"),
        sa.Column("scan_id", sa.String(36), nullable=True),
        sa.Column("findings_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("approval_id", sa.String(36), nullable=True),
        sa.Column("contract_impact", sa.JSON(), nullable=True),
        sa.Column("blueprint_impact", sa.JSON(), nullable=True),
        sa.Column("proposed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("policy_version", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_acc_session_id", "agent_code_changes", ["session_id"])
    op.create_index("ix_acc_status", "agent_code_changes", ["status"])
    op.create_index("ix_acc_policy_decision", "agent_code_changes", ["policy_decision"])

    # ── 11. Agent Git Operations ─────────────────────────────────────
    op.create_table(
        "agent_git_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operation", sa.String(100), nullable=False),
        sa.Column("repository", sa.String(500), nullable=True),
        sa.Column("branch", sa.String(255), nullable=True),
        sa.Column("target_branch", sa.String(255), nullable=True),
        sa.Column("commit_sha", sa.String(64), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="LOW"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("block_reason", sa.Text(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ago_session_id", "agent_git_operations", ["session_id"])
    op.create_index("ix_ago_operation", "agent_git_operations", ["operation"])
    op.create_index("ix_ago_risk_level", "agent_git_operations", ["risk_level"])

    # ── 12. Agent Policy Decisions ───────────────────────────────────
    op.create_table(
        "agent_policy_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(100), nullable=False),
        sa.Column("resource", sa.String(2000), nullable=True),
        sa.Column("environment", sa.String(50), nullable=True),
        sa.Column("decision", sa.String(50), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="LOW"),
        sa.Column("matched_rules", sa.JSON(), nullable=True),
        sa.Column("required_permissions", sa.JSON(), nullable=True),
        sa.Column("required_approvals", sa.JSON(), nullable=True),
        sa.Column("contract_impact", sa.JSON(), nullable=True),
        sa.Column("evidence_requirements", sa.JSON(), nullable=True),
        sa.Column("policy_version", sa.Integer(), nullable=True),
        sa.Column("blueprint_version", sa.Integer(), nullable=True),
        sa.Column("contract_version", sa.Integer(), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_simulation", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_apd_agent_id", "agent_policy_decisions", ["agent_id"])
    op.create_index("ix_apd_decision", "agent_policy_decisions", ["decision"])
    op.create_index("ix_apd_evaluated_at", "agent_policy_decisions", ["evaluated_at"])

    # ── 13. Agent Action Approvals ───────────────────────────────────
    op.create_table(
        "agent_action_approvals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(100), nullable=False),
        sa.Column("resource", sa.String(2000), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="HIGH"),
        sa.Column("context", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_aaa_agent_id", "agent_action_approvals", ["agent_id"])
    op.create_index("ix_aaa_status", "agent_action_approvals", ["status"])
    op.create_index("ix_aaa_project_id", "agent_action_approvals", ["project_id"])

    # ── 14. Agent Governance Delegations ────────────────────────────
    op.create_table(
        "agent_governance_delegations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("delegator_agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delegate_agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scope", sa.JSON(), nullable=True),
        sa.Column("resources", sa.JSON(), nullable=True),
        sa.Column("actions", sa.JSON(), nullable=True),
        sa.Column("conditions", sa.JSON(), nullable=True),
        sa.Column("max_depth", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("current_depth", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("further_delegation_allowed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("status", sa.String(50), nullable=False, server_default="ACTIVE"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_agd_delegator", "agent_governance_delegations", ["delegator_agent_id"])
    op.create_index("ix_agd_delegate", "agent_governance_delegations", ["delegate_agent_id"])
    op.create_index("ix_agd_status", "agent_governance_delegations", ["status"])

    # ── 15. Agent Behavior Anomalies ─────────────────────────────────
    op.create_table(
        "agent_behavior_anomalies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("anomaly_type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("severity", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("status", sa.String(50), nullable=False, server_default="OPEN"),
        sa.Column("baseline_deviation_score", sa.Float(), nullable=True),
        sa.Column("incident_id", sa.String(36), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_aba_agent_id", "agent_behavior_anomalies", ["agent_id"])
    op.create_index("ix_aba_severity", "agent_behavior_anomalies", ["severity"])
    op.create_index("ix_aba_anomaly_type", "agent_behavior_anomalies", ["anomaly_type"])
    op.create_index("ix_aba_status", "agent_behavior_anomalies", ["status"])

    # ── 16. Agent Revocation Records ────────────────────────────────
    op.create_table(
        "agent_revocation_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("revocation_target", sa.String(50), nullable=False),
        sa.Column("target_id", sa.String(255), nullable=False),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("revoked_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("trigger", sa.String(50), nullable=False, server_default="MANUAL"),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("is_emergency", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_arr_agent_id", "agent_revocation_records", ["agent_id"])
    op.create_index("ix_arr_trigger", "agent_revocation_records", ["trigger"])
    op.create_index("ix_arr_revoked_at", "agent_revocation_records", ["revoked_at"])

    # ── 17. Agent Security Contract Bindings ─────────────────────────
    op.create_table(
        "agent_security_contract_bindings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contract_name", sa.String(255), nullable=False),
        sa.Column("contract_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("constraint", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="ACTIVE"),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_violation_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("violation_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("agent_id", "contract_name", name="uq_agent_contract"),
    )
    op.create_index("ix_ascb_agent_id", "agent_security_contract_bindings", ["agent_id"])
    op.create_index("ix_ascb_status", "agent_security_contract_bindings", ["status"])

    # ── 18. Agent MCP Events ─────────────────────────────────────────
    op.create_table(
        "agent_mcp_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_governance_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("delegating_agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("delegation_id", sa.String(36), nullable=True),
        sa.Column("mcp_server", sa.String(255), nullable=False),
        sa.Column("tool_name", sa.String(255), nullable=False),
        sa.Column("resource", sa.String(2000), nullable=True),
        sa.Column("arguments_hash", sa.String(64), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("policy_decision", sa.String(50), nullable=False, server_default="ALLOW"),
        sa.Column("execution_id", sa.String(255), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("evidence_id", sa.String(36), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ame_agent_id", "agent_mcp_events", ["agent_id"])
    op.create_index("ix_ame_session_id", "agent_mcp_events", ["session_id"])
    op.create_index("ix_ame_tool_name", "agent_mcp_events", ["tool_name"])
    op.create_index("ix_ame_occurred_at", "agent_mcp_events", ["occurred_at"])

    # ── Seed: Provider Adapter Registry ─────────────────────────────
    # Status is NOT_CONFIGURED because no real connection has been verified.
    # This reflects §28.56 — never claim CONNECTED without evidence.
    now = datetime.now(timezone.utc)
    providers = [
        ("cursor", "Cursor", "webhook", {"file_read": "UNKNOWN", "file_write": "UNKNOWN", "terminal": "UNKNOWN", "network": "UNKNOWN", "git": "UNKNOWN", "mcp": "UNKNOWN"}),
        ("claude_code", "Claude Code (Anthropic)", "sdk", {"file_read": "UNKNOWN", "file_write": "UNKNOWN", "terminal": "UNKNOWN", "network": "UNKNOWN", "git": "UNKNOWN", "mcp": "UNKNOWN"}),
        ("codex", "OpenAI Codex", "api", {"file_read": "UNKNOWN", "file_write": "UNKNOWN", "terminal": "UNKNOWN", "network": "UNKNOWN", "git": "UNKNOWN", "mcp": "UNKNOWN"}),
        ("github_copilot", "GitHub Copilot", "api", {"file_read": "UNKNOWN", "file_write": "UNKNOWN", "terminal": "UNKNOWN", "network": "UNKNOWN", "git": "UNKNOWN", "mcp": "UNKNOWN"}),
        ("antigravity", "Antigravity (Google)", "sdk", {"file_read": "UNKNOWN", "file_write": "UNKNOWN", "terminal": "UNKNOWN", "network": "UNKNOWN", "git": "UNKNOWN", "mcp": "UNKNOWN"}),
        ("generic", "Generic / Custom Agent", "generic", None),
    ]

    conn = op.get_bind()
    import json as _json
    for provider, display_name, method, caps in providers:
        conn.execute(
            sa.text(
                """
                INSERT INTO agent_provider_adapters
                  (id, provider, adapter_version, display_name, status,
                   supported_capabilities, integration_method, is_enabled, created_at, updated_at)
                VALUES
                  (:id, :provider, '0.1.0', :display_name, 'NOT_CONFIGURED',
                   :caps, :method, true, :now, :now)
                ON CONFLICT (provider) DO NOTHING
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "provider": provider,
                "display_name": display_name,
                "caps": _json.dumps(caps) if caps is not None else None,
                "method": method,
                "now": now,
            }
        )



def downgrade() -> None:
    tables = [
        "agent_mcp_events",
        "agent_security_contract_bindings",
        "agent_revocation_records",
        "agent_behavior_anomalies",
        "agent_governance_delegations",
        "agent_action_approvals",
        "agent_policy_decisions",
        "agent_git_operations",
        "agent_code_changes",
        "agent_network_events",
        "agent_file_accesses",
        "agent_command_executions",
        "agent_tool_invocations",
        "agent_security_events",
        "agent_governance_sessions",
        "agent_capability_records",
        "agent_governance_profiles",
        "agent_provider_adapters",
    ]
    for t in tables:
        op.drop_table(t)
