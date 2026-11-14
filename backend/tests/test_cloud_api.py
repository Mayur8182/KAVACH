import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_cloud_overview_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/cloud/overview")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_cloud_endpoints_authorized(client, token_user_a, user_a, db_session):
    user_a.is_superuser = True
    await db_session.commit()

    from datetime import datetime, timezone
    from app.models.cloud_models import CloudConnection, CloudResource, CloudSecurityObservation
    from app.models.project import Project

    test_project = Project(
        id=uuid.uuid4(),
        name="Test Cloud Project",
        owner_id=user_a.id,
        environment="production",
        application_type="cloud_workload",
    )
    db_session.add(test_project)
    await db_session.flush()

    test_conn = CloudConnection(
        id=uuid.uuid4(),
        project_id=test_project.id,
        provider="AWS",
        connection_name="Test AWS",
        status="CONNECTED",
        authentication_method="IAM_ROLE",
        account_identifier="123456789012",
        default_region="us-east-1",
        permissions_mode="READ_ONLY",
        last_verified_at=datetime.now(timezone.utc),
    )
    db_session.add(test_conn)
    await db_session.flush()

    test_res = CloudResource(
        id=uuid.uuid4(),
        project_id=test_project.id,
        cloud_connection_id=test_conn.id,
        provider="AWS",
        resource_type="AWS_RDS_INSTANCE",
        provider_resource_id="arn:aws:rds:us-east-1:123456789012:db:test-db",
        resource_name="test-db",
        region="us-east-1",
        status="ACTIVE",
        configuration={"PubliclyAccessible": True},
    )
    db_session.add(test_res)
    await db_session.flush()

    test_obs = CloudSecurityObservation(
        id=uuid.uuid4(),
        project_id=test_project.id,
        cloud_resource_id=test_res.id,
        provider="AWS",
        observation_type="DATABASE_EXPOSURE",
        severity="CRITICAL",
        status="OPEN",
        source="CSPM_SCANNER",
        rule_id="KAVACH-AWS-RDS-0001",
        observation_metadata={
            "short_id": "test-obs-1",
            "title": "Public test database",
            "what_is_wrong": "The database is public.",
            "why_dangerous": "Data leak risk.",
            "what_kavach_will_do": "Restrict access.",
            "expected_result": "Database is isolated.",
        },
    )
    db_session.add(test_obs)
    await db_session.commit()

    headers = {
        "Authorization": f"Bearer {token_user_a}",
        "X-Organization-ID": "test-org",
        "X-Environment-ID": "production",
    }

    # 1. Overview
    resp = await client.get("/api/v1/cloud/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "cloud_accounts_count" in data
    assert "assets_total_count" in data
    assert "providers" in data
    assert "AWS" in data["providers"]
    assert "AZURE" in data["providers"]
    assert "GCP" in data["providers"]

    # 2. Connections / Providers
    resp_conn = await client.get("/api/v1/cloud/connections", headers=headers)
    assert resp_conn.status_code == 200
    assert "items" in resp_conn.json()

    # 3. Assets
    resp_assets = await client.get("/api/v1/cloud/assets?limit=10", headers=headers)
    assert resp_assets.status_code == 200
    assert "items" in resp_assets.json()

    # 4. Findings
    resp_findings = await client.get("/api/v1/cloud/findings?limit=10", headers=headers)
    assert resp_findings.status_code == 200
    assert "items" in resp_findings.json()

    # 5. IAM
    resp_iam = await client.get("/api/v1/cloud/iam", headers=headers)
    assert resp_iam.status_code == 200
    assert "principals" in resp_iam.json()

    # 6. Network
    resp_net = await client.get("/api/v1/cloud/network", headers=headers)
    assert resp_net.status_code == 200
    assert "networks" in resp_net.json()

    # 7. Storage
    resp_stor = await client.get("/api/v1/cloud/storage", headers=headers)
    assert resp_stor.status_code == 200
    assert "items" in resp_stor.json()

    # 8. Databases
    resp_db = await client.get("/api/v1/cloud/databases", headers=headers)
    assert resp_db.status_code == 200
    assert "items" in resp_db.json()

    # 9. Kubernetes
    resp_k8s = await client.get("/api/v1/cloud/kubernetes", headers=headers)
    assert resp_k8s.status_code == 200
    assert "clusters" in resp_k8s.json()

    # 10. Docker
    resp_docker = await client.get("/api/v1/cloud/docker", headers=headers)
    assert resp_docker.status_code == 200
    assert "images" in resp_docker.json()

    # 11. IaC
    resp_iac = await client.get("/api/v1/cloud/iac", headers=headers)
    assert resp_iac.status_code == 200
    assert "items" in resp_iac.json()

    # 12. Exposures
    resp_exp = await client.get("/api/v1/cloud/exposures", headers=headers)
    assert resp_exp.status_code == 200
    assert "items" in resp_exp.json()

    # 13. Attack Paths
    resp_ap = await client.get("/api/v1/cloud/attack-paths", headers=headers)
    assert resp_ap.status_code == 200
    assert "items" in resp_ap.json()

    # 14. Blast Radius
    resp_br = await client.get("/api/v1/cloud/blast-radius", headers=headers)
    assert resp_br.status_code == 200
    assert "nodes" in resp_br.json()

    # 15. Compliance
    resp_comp = await client.get("/api/v1/cloud/compliance", headers=headers)
    assert resp_comp.status_code == 200
    assert "frameworks" in resp_comp.json()

    # 16. Remediation
    resp_rem = await client.get("/api/v1/cloud/remediation", headers=headers)
    assert resp_rem.status_code == 200
    assert "jobs" in resp_rem.json()

    # 17. Evidence
    resp_ev = await client.get("/api/v1/cloud/evidence?limit=10", headers=headers)
    assert resp_ev.status_code == 200
    assert "items" in resp_ev.json()

    # 18. Asset Detail (404 on non-existent)
    fake_asset_id = str(uuid.uuid4())
    resp_adetail = await client.get(f"/api/v1/cloud/assets/{fake_asset_id}", headers=headers)
    assert resp_adetail.status_code == 404

    # 19. Finding Detail (404 on non-existent)
    fake_finding_id = str(uuid.uuid4())
    resp_fdetail = await client.get(f"/api/v1/cloud/findings/{fake_finding_id}", headers=headers)
    assert resp_fdetail.status_code == 404

    # 20. Command Center (Autonomous Cloud Engineer)
    resp_cc = await client.get("/api/v1/cloud/command-center", headers=headers)
    assert resp_cc.status_code == 200
    cc_data = resp_cc.json()
    assert "total_resources" in cc_data
    assert "master_agent" in cc_data
    assert "is_active" in cc_data["master_agent"]
    assert "specialist_agents" in cc_data["master_agent"]
    assert len(cc_data["master_agent"]["specialist_agents"]) == 18

    # 21. Autonomous Issues
    resp_issues = await client.get("/api/v1/cloud/issues", headers=headers)
    assert resp_issues.status_code == 200
    issues = resp_issues.json()
    assert len(issues) >= 1
    assert "what_is_wrong" in issues[0]
    assert "why_dangerous" in issues[0]
    assert "what_kavach_will_do" in issues[0]
    assert "expected_result" in issues[0]

    # 22. Issue Detail
    resp_idetail = await client.get("/api/v1/cloud/issues/test-obs-1", headers=headers)
    assert resp_idetail.status_code == 200
    assert resp_idetail.json()["id"] == "test-obs-1"

    # 23. Autonomous Remediation Execution & Verification
    resp_rem_exec = await client.post("/api/v1/cloud/issues/test-obs-1/remediate", headers=headers)
    assert resp_rem_exec.status_code == 200
    rem_data = resp_rem_exec.json()
    assert rem_data["status"] == "RESOLVED"
    assert "verification_records" in rem_data
    assert len(rem_data["verification_records"]) >= 5
    assert "report_id" in rem_data
    assert "report_markdown" in rem_data

    # 23b. Cloud Reports List & Generate
    resp_reports = await client.get("/api/v1/cloud/reports", headers=headers)
    assert resp_reports.status_code == 200
    reports_data = resp_reports.json()
    assert "reports" in reports_data
    assert reports_data["total"] >= 1

    resp_gen_report = await client.post("/api/v1/cloud/reports/generate?report_type=POSTURE_AUDIT", headers=headers)
    assert resp_gen_report.status_code == 200
    assert "id" in resp_gen_report.json()

    # 24. Agent Status
    resp_agent = await client.get("/api/v1/cloud/agent/status", headers=headers)
    assert resp_agent.status_code == 200
    assert "is_active" in resp_agent.json()

    # 25. Activity
    resp_act = await client.get("/api/v1/cloud/activity", headers=headers)
    assert resp_act.status_code == 200
    assert len(resp_act.json()) >= 1

    # 26. Trigger Cloud Scan (Task Queue Background Worker)
    resp_scan = await client.post("/api/v1/cloud/scan", json={"provider": "AWS"}, headers=headers)
    assert resp_scan.status_code == 202
    scan_json = resp_scan.json()
    assert scan_json["status"] == "QUEUED"
    assert "task_id" in scan_json

    # 27. Setup Instructions Generation for all 4 Cloud Providers
    for prov in ["AWS", "AZURE", "GCP", "KUBERNETES"]:
        resp_instr = await client.get(f"/api/v1/cloud/connections/setup-instructions?provider={prov}", headers=headers)
        assert resp_instr.status_code == 200
        instr_data = resp_instr.json()
        assert instr_data["provider"] == prov
        assert "instructions_markdown" in instr_data
        if prov == "AWS":
            assert "external_id" in instr_data
            assert instr_data["external_id"].startswith("kavach-ext-")
            assert "trust_policy" in instr_data
            assert "kavach_account_id" in instr_data
        elif prov == "KUBERNETES":
            assert "cli_snippet" in instr_data

    # 28. Create Connection with STS AssumeRole validation
    resp_create_conn = await client.post(
        "/api/v1/cloud/connections",
        json={
            "provider": "AWS",
            "connection_name": "Test AWS Prod",
            "authentication_method": "ASSUME_ROLE",
            "account_identifier": "arn:aws:iam::123456789012:role/KavachSecurityAuditRole",
            "default_region": "us-east-1",
            "credentials_payload": {
                "role_arn": "arn:aws:iam::123456789012:role/KavachSecurityAuditRole",
            },
        },
        headers=headers,
    )
    assert resp_create_conn.status_code == 201
    created_conn = resp_create_conn.json()
    assert created_conn["provider"] == "AWS"
    # Status is CONFIGURATION_REQUIRED or AUTHENTICATION_FAILED in test environment without AWS credentials
    assert created_conn["status"] in ("CONFIGURATION_REQUIRED", "AUTHENTICATION_FAILED", "CONNECTED")
    conn_id = created_conn["id"]

    # 29. Revalidate Connection
    resp_reval = await client.post(f"/api/v1/cloud/connections/{conn_id}/validate", headers=headers)
    assert resp_reval.status_code == 200
    reval_data = resp_reval.json()
    assert "status" in reval_data
    assert "message" in reval_data

    # 30. Delete Connection
    resp_del = await client.delete(f"/api/v1/cloud/connections/{conn_id}", headers=headers)
    assert resp_del.status_code == 200
    assert resp_del.json()["status"] == "DISCONNECTED"

    # 31. Security Graph Verification
    resp_graph = await client.get("/api/v1/cloud/security-graph", headers=headers)
    assert resp_graph.status_code == 200
    graph_data = resp_graph.json()
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert "boundaries" in graph_data
    assert "assets_mapped" in graph_data
    assert "relationships_count" in graph_data

    # 32. Attack Paths Verification
    resp_ap = await client.get("/api/v1/cloud/attack-paths", headers=headers)
    assert resp_ap.status_code == 200
    ap_data = resp_ap.json()
    assert "items" in ap_data
    assert "total" in ap_data

    # 33. Command Center Telemetry Verification
    resp_cc = await client.get("/api/v1/cloud/command-center", headers=headers)
    assert resp_cc.status_code == 200
    cc_data = resp_cc.json()
    assert "master_agent" in cc_data
    assert "specialist_agents" in cc_data["master_agent"]
    assert len(cc_data["master_agent"]["specialist_agents"]) == 18


