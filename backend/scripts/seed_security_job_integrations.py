import sqlite3
import uuid
from datetime import datetime
import json

import os

def seed_integrations():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dev.db"))
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create security_job_integrations table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_job_integrations (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36),
        repository_id VARCHAR(36),
        name VARCHAR(100) NOT NULL,
        provider_key VARCHAR(100) NOT NULL,
        description VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Connected',
        is_available BOOLEAN DEFAULT 0,
        icon_key VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'Source Control',
        last_sync_at DATETIME,
        repository_name VARCHAR(100) DEFAULT 'frontend-app',
        branch_filter VARCHAR(255) DEFAULT 'main, develop, feature/*',
        events JSON,
        webhook_events JSON,
        logs JSON,
        config JSON,
        created_at DATETIME,
        updated_at DATETIME
    )
    """)

    cursor.execute("DELETE FROM security_job_integrations")

    # 2. Configured Integrations (all initialize disconnected until real user connects them)
    configured = [
        ("GitHub", "github", "github", "Source Control", "Trigger jobs on push, PR, release", "Disconnected", None, "workspace", "main", ["push", "pull_request", "release"], [], []),
        ("GitLab", "gitlab", "gitlab", "Source Control", "Trigger jobs on merge request", "Disconnected", None, "workspace", "main", ["merge_request"], [], []),
        ("Jenkins", "jenkins", "jenkins", "CI/CD", "Run security jobs in CI/CD", "Disconnected", None, "workspace", "main", ["build_complete", "pipeline_start"], [], []),
        ("Slack", "slack", "slack", "Notification", "Send job notifications", "Disconnected", None, "workspace", "main", ["job_failed", "critical_alert"], [], []),
        ("Microsoft Teams", "teams", "teams", "Notification", "Send job notifications", "Disconnected", None, "workspace", "main", ["job_failed"], [], []),
        ("Jira", "jira", "jira", "Issue Tracking", "Create issues from findings", "Disconnected", None, "workspace", "main", ["issue_created", "ticket_update"], [], []),
        ("Email", "email", "email", "Notification", "Send scan reports", "Disconnected", None, "workspace", "main", ["daily_report", "weekly_summary"], [], []),
        ("Webhooks", "webhooks", "webhooks", "Automation", "Custom integrations", "Disconnected", None, "workspace", "main", ["job_completed", "scan_finished"], [], []),
        ("Custom API", "custom-api", "custom-api", "Automation", "Integrate with external tools", "Disconnected", None, "workspace", "main", ["rest_dispatch"], [], []),
        ("Azure DevOps", "azure-devops", "azure-devops", "Source Control", "Azure Repos and Pipelines integration", "Disconnected", None, "workspace", "main", ["push", "pull_request"], [], []),
        ("Datadog", "datadog", "datadog", "Observability", "Security monitoring & telemetry export", "Disconnected", None, "workspace", "main", ["alert", "metric"], [], []),
        ("PagerDuty", "pagerduty", "pagerduty", "Alerting", "On-call alerts for critical security jobs", "Disconnected", None, "workspace", "main", ["critical_alert"], [], []),
        ("Docker Hub", "docker", "docker", "Registry", "Container registry vulnerability feeds", "Disconnected", None, "workspace", "main", ["image_push"], [], [])
    ]

    for name, p_key, i_key, cat, desc, status, last_sync, repo_name, branch, events, wh_events, logs in configured:
        int_id = uuid.uuid4().hex
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO security_job_integrations
            (id, name, provider_key, icon_key, category, description, status, is_available, last_sync_at, repository_name, branch_filter, events, webhook_events, logs, config, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
        """, (
            int_id, name, p_key, i_key, cat, desc, status,
            None if last_sync is None else last_sync.isoformat(), repo_name, branch,
            json.dumps(events), json.dumps(wh_events), json.dumps(logs),
            now, now
        ))

    # 3. Available Integrations (10 items)
    available = [
        ("Azure DevOps", "azure-devops", "azure-devops", "Source Control", "Azure Repos and Pipelines integration"),
        ("Bitbucket", "bitbucket", "bitbucket", "Source Control", "Bitbucket Cloud and Server repos"),
        ("Datadog", "datadog", "datadog", "Observability", "Security monitoring & telemetry export"),
        ("PagerDuty", "pagerduty", "pagerduty", "Alerting", "On-call alerts for critical security jobs"),
        ("Splunk", "splunk", "splunk", "SIEM", "Enterprise SIEM log streaming"),
        ("Terraform", "terraform", "terraform", "IaC", "Infrastructure-as-code automation"),
        ("SonarQube", "sonarqube", "sonarqube", "Code Quality", "Quality and security gates sync"),
        ("Snyk", "snyk", "snyk", "Vulnerability Scanner", "Open-source vulnerability sync"),
        ("AWS Security Hub", "aws", "aws", "Cloud", "Cloud posture and CSPM sync"),
        ("Docker Hub", "docker", "docker", "Registry", "Container registry vulnerability feeds")
    ]

    for name, p_key, i_key, cat, desc in available:
        int_id = uuid.uuid4().hex
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO security_job_integrations
            (id, name, provider_key, icon_key, category, description, status, is_available, repository_name, branch_filter, events, webhook_events, logs, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Available', 1, 'frontend-app', 'main', '[]', '[]', '[]', ?, ?)
        """, (int_id, name, p_key, i_key, cat, desc, now, now))

    conn.commit()
    conn.close()
    print("Database successfully seeded with 9 configured and 10 available integrations!")

if __name__ == "__main__":
    seed_integrations()
