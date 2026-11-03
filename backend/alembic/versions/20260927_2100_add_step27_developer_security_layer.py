"""add_step27_developer_security_layer

Revision ID: 20260927_2100
Revises: 20260927_2000
Create Date: 2026-09-27 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260927_2100"
down_revision: Union[str, None] = "20260927_2000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # developer_devices
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS developer_devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            os_type VARCHAR NOT NULL DEFAULT 'UNKNOWN',
            hostname VARCHAR,
            last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );
    """))

    # repository_bindings
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS repository_bindings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id UUID NOT NULL REFERENCES developer_devices(id) ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            local_path_hash VARCHAR NOT NULL,
            remote_url VARCHAR,
            last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # git_hook_installations
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS git_hook_installations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            binding_id UUID NOT NULL REFERENCES repository_bindings(id) ON DELETE CASCADE,
            hook_type VARCHAR NOT NULL,
            version VARCHAR NOT NULL DEFAULT '0.1.0',
            installed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_executed_at TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );
    """))

    # git_hook_executions
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS git_hook_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            installation_id UUID NOT NULL REFERENCES git_hook_installations(id) ON DELETE CASCADE,
            commit_sha VARCHAR,
            branch VARCHAR,
            status VARCHAR NOT NULL,
            duration_ms INTEGER NOT NULL DEFAULT 0,
            findings_count INTEGER NOT NULL DEFAULT 0,
            executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            metadata_json JSONB NOT NULL DEFAULT '{}'
        );
    """))

    # git_hook_bypasses - records --no-verify usage
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS git_hook_bypasses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            installation_id UUID REFERENCES git_hook_installations(id) ON DELETE SET NULL,
            commit_sha VARCHAR,
            reason VARCHAR,
            bypassed_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # local_agents
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS local_agents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id UUID NOT NULL REFERENCES developer_devices(id) ON DELETE CASCADE,
            agent_version VARCHAR NOT NULL DEFAULT '0.1.0',
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_ping_at TIMESTAMP NOT NULL DEFAULT NOW(),
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );
    """))

    # ide_sessions
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ide_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id UUID NOT NULL REFERENCES developer_devices(id) ON DELETE CASCADE,
            ide_name VARCHAR NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            last_active_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # cli_sessions
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS cli_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id UUID NOT NULL REFERENCES developer_devices(id) ON DELETE CASCADE,
            command VARCHAR NOT NULL,
            executed_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # developer_scan_requests
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS developer_scan_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            device_id UUID NOT NULL REFERENCES developer_devices(id) ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            scan_type VARCHAR NOT NULL,
            requested_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # developer_scan_results
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS developer_scan_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_id UUID NOT NULL REFERENCES developer_scan_requests(id) ON DELETE CASCADE,
            status VARCHAR NOT NULL,
            findings_count INTEGER NOT NULL DEFAULT 0,
            completed_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # security_context_versions
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS security_context_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            intent_version INTEGER NOT NULL DEFAULT 1,
            blueprint_version INTEGER NOT NULL DEFAULT 1,
            policy_version INTEGER NOT NULL DEFAULT 1,
            contract_version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # scanner_cache_entries
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS scanner_cache_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            cache_key VARCHAR NOT NULL,
            results_json JSONB NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(project_id, cache_key)
        );
    """))

    # ai_agent_adapters
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ai_agent_adapters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR NOT NULL UNIQUE,
            version VARCHAR NOT NULL
        );
    """))

    # ai_agent_sessions
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ai_agent_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            adapter_id UUID NOT NULL REFERENCES ai_agent_adapters(id) ON DELETE CASCADE,
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            started_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # ai_agent_security_events
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ai_agent_security_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,
            event_type VARCHAR NOT NULL,
            details JSONB NOT NULL DEFAULT '{}',
            event_time TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """))

    # Seed default AI agent adapters
    conn.execute(sa.text("""
        INSERT INTO ai_agent_adapters (id, name, version) VALUES
            (gen_random_uuid(), 'cursor', '0.1.0'),
            (gen_random_uuid(), 'claude_code', '0.1.0'),
            (gen_random_uuid(), 'codex', '0.1.0'),
            (gen_random_uuid(), 'github_copilot', '0.1.0'),
            (gen_random_uuid(), 'antigravity', '0.1.0')
        ON CONFLICT (name) DO NOTHING;
    """))


def downgrade() -> None:
    conn = op.get_bind()
    tables = [
        "ai_agent_security_events",
        "ai_agent_sessions",
        "ai_agent_adapters",
        "scanner_cache_entries",
        "security_context_versions",
        "developer_scan_results",
        "developer_scan_requests",
        "cli_sessions",
        "ide_sessions",
        "local_agents",
        "git_hook_bypasses",
        "git_hook_executions",
        "git_hook_installations",
        "repository_bindings",
        "developer_devices",
    ]
    for table in tables:
        conn.execute(sa.text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
