"""
Migration script for CI/CD Extended Models:
- cicd_templates table
- columns on cicd_environments
- columns on cicd_integrations
- seed canonical templates, extended environments, and integrations
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "dev.db")

def run_migration():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create cicd_templates if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cicd_templates (
        id CHAR(36) PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        project_id CHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Web Application',
        type VARCHAR(100) NOT NULL DEFAULT 'CI/CD Pipeline',
        framework VARCHAR(100) NOT NULL DEFAULT 'Next.js',
        description TEXT NOT NULL,
        is_official BOOLEAN NOT NULL DEFAULT 1,
        is_custom BOOLEAN NOT NULL DEFAULT 0,
        is_popular BOOLEAN NOT NULL DEFAULT 0,
        tags JSON NOT NULL DEFAULT '[]',
        maintained_by VARCHAR(100) NOT NULL DEFAULT 'SecuLayer',
        usage_count INTEGER NOT NULL DEFAULT 0,
        rating VARCHAR(10) NOT NULL DEFAULT '4.8',
        rating_count INTEGER NOT NULL DEFAULT 128,
        workflow_yaml TEXT NOT NULL,
        included_steps JSON NOT NULL DEFAULT '[]',
        variables JSON,
        icon_key VARCHAR(50) NOT NULL DEFAULT 'nextjs',
        order_priority INTEGER NOT NULL DEFAULT 100,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS ix_cicd_templates_slug ON cicd_templates (slug);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_cicd_templates_cat ON cicd_templates (category);")

    # 2. Add columns to cicd_environments if missing
    cursor.execute("PRAGMA table_info(cicd_environments);")
    env_cols = [row[1] for row in cursor.fetchall()]
    
    col_defs_env = [
        ("version", "VARCHAR(50) DEFAULT 'v1.2.3'"),
        ("branch", "VARCHAR(100) DEFAULT 'main'"),
        ("region", "VARCHAR(100) DEFAULT 'Mumbai (ap-south-1)'"),
        ("uptime_str", "VARCHAR(100) DEFAULT '15 days 6 hours'"),
        ("auto_deploy", "BOOLEAN DEFAULT 1"),
        ("response_time_ms", "INTEGER DEFAULT 120"),
        ("cpu_usage_percent", "INTEGER DEFAULT 34"),
        ("memory_usage_percent", "INTEGER DEFAULT 56"),
        ("pods_ready", "INTEGER DEFAULT 3"),
        ("pods_total", "INTEGER DEFAULT 3"),
        ("deployments_history", "JSON"),
        ("variables", "JSON"),
        ("secrets", "JSON"),
        ("order_priority", "INTEGER DEFAULT 100"),
    ]
    for col_name, col_type in col_defs_env:
        if col_name not in env_cols:
            cursor.execute(f"ALTER TABLE cicd_environments ADD COLUMN {col_name} {col_type};")
            print(f"Added column {col_name} to cicd_environments")

    # 3. Add columns to cicd_integrations if missing
    cursor.execute("PRAGMA table_info(cicd_integrations);")
    int_cols = [row[1] for row in cursor.fetchall()]

    col_defs_int = [
        ("subtext", "VARCHAR(255)"),
        ("connection_endpoint", "VARCHAR(255)"),
        ("account", "VARCHAR(100) DEFAULT 'nj-group'"),
        ("repository_name", "VARCHAR(100) DEFAULT 'frontend-app'"),
        ("branch", "VARCHAR(100) DEFAULT 'main'"),
        ("url", "VARCHAR(500)"),
        ("last_sync_at", "TIMESTAMP"),
        ("webhook_status", "VARCHAR(50) DEFAULT 'Active'"),
        ("events", "JSON"),
        ("webhook_events", "JSON"),
        ("created_by", "VARCHAR(100) DEFAULT 'Mayur K.'"),
        ("permissions", "JSON"),
        ("logs", "JSON"),
        ("order_priority", "INTEGER DEFAULT 100"),
    ]
    for col_name, col_type in col_defs_int:
        if col_name not in int_cols:
            cursor.execute(f"ALTER TABLE cicd_integrations ADD COLUMN {col_name} {col_type};")
            print(f"Added column {col_name} to cicd_integrations")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
