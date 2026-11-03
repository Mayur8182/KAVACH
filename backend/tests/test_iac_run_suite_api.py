"""
Comprehensive API test suite for IaC Security Run Suite (Section 7: Screens 7.1 to 7.8)
Tests all endpoints:
- 7.1 Run Overview (KPIs, Runtime activity chart, recent events)
- 7.2 Workloads (Multi-filter, pagination, pods count)
- 7.3 Containers (State, CPU, memory, pods mapping)
- 7.4 Kubernetes (Cluster posture, node metrics, control plane components)
- 7.5 Runtime Threats (Threat investigation, status mutation)
- 7.6 Runtime Vulnerabilities (Running container CVEs, resolution tracking)
- 7.7 Network Activity (Flow logs, protocols, ports, Allow/Block actions)
- 7.8 Runtime Security Policies (Policies catalog, create, status toggle, delete)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_7_1_run_overview():
    resp = client.get("/api/v1/iac/run-suite/overview?time_range=Last 24 hours")
    assert resp.status_code == 200
    data = resp.json()
    assert data["time_range"] == "Last 24 hours"
    assert data["kpis"]["workloads_count"] == 12
    assert data["kpis"]["runtime_threats_count"] >= 1
    assert data["kpis"]["vulnerabilities_count"] >= 1
    assert data["kpis"]["uptime_percentage"] == 99.9
    assert len(data["activity_chart"]) == 8
    assert len(data["recent_events"]) >= 5
    assert data["recent_events"][0]["resource"] == "web-7f8d9"


def test_7_2_workloads_filtering_and_pagination():
    resp = client.get("/api/v1/iac/run-suite/workloads")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 12
    assert len(data["items"]) == 10
    assert "production" in data["namespaces"]

    # Filter by namespace
    resp_prod = client.get("/api/v1/iac/run-suite/workloads?namespace=production")
    assert resp_prod.status_code == 200
    prod_data = resp_prod.json()
    assert all(w["namespace"] == "production" for w in prod_data["items"])

    # Search workload
    resp_search = client.get("/api/v1/iac/run-suite/workloads?search=postgres")
    assert resp_search.status_code == 200
    search_data = resp_search.json()
    assert len(search_data["items"]) == 1
    assert search_data["items"][0]["name"] == "postgres"


def test_7_3_containers_runtime():
    resp = client.get("/api/v1/iac/run-suite/containers")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 10
    assert any(c["container"] == "frontend" for c in data["items"])

    # Search container
    resp_search = client.get("/api/v1/iac/run-suite/containers?search=redis")
    assert resp_search.status_code == 200
    search_data = resp_search.json()
    assert search_data["items"][0]["container"] == "redis"
    assert search_data["items"][0]["cpu"] == "6%"


def test_7_4_kubernetes_cluster():
    resp = client.get("/api/v1/iac/run-suite/kubernetes?cluster_id=eks-prod-cluster")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cluster_id"] == "eks-prod-cluster"
    assert data["nodes_count"] == 3
    assert data["pods_count"] == 42
    assert data["namespaces_count"] == 6
    assert data["cluster_health"] == 99.9
    assert len(data["nodes"]) == 3
    assert len(data["components"]) == 5
    assert any(c["component"] == "kube-apiserver" for c in data["components"])


def test_7_5_runtime_threats_and_status_update():
    resp = client.get("/api/v1/iac/run-suite/threats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 10
    threat_id = data["items"][0]["id"]

    # Update threat status to Investigating
    update_resp = client.put(
        f"/api/v1/iac/run-suite/threats/{threat_id}/status",
        json={"status": "Investigating"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "Investigating"


def test_7_6_runtime_vulnerabilities():
    resp = client.get("/api/v1/iac/run-suite/vulnerabilities")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 10
    vuln_id = data["items"][0]["id"]

    # Update vulnerability status to In Progress
    update_resp = client.put(
        f"/api/v1/iac/run-suite/vulnerabilities/{vuln_id}/status",
        json={"status": "In Progress"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "In Progress"


def test_7_7_network_activity_flow_logs():
    resp = client.get("/api/v1/iac/run-suite/network-activity")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 10
    assert any(f["action"] == "Block" for f in data["items"])
    assert any(f["source"] == "web-7f8d9" for f in data["items"])


def test_7_8_runtime_policies_crud():
    # List policies
    resp = client.get("/api/v1/iac/run-suite/policies")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 10

    # Create new policy
    create_resp = client.post(
        "/api/v1/iac/run-suite/policies",
        json={
            "name": "Custom Runtime Probe Policy",
            "type": "Runtime",
            "scope": "Cluster",
            "status": "Enabled",
            "description": "Block unauthorized ptrace attachment",
        },
    )
    assert create_resp.status_code == 201
    created_id = create_resp.json()["id"]

    # Toggle policy status
    toggle_resp = client.put(
        f"/api/v1/iac/run-suite/policies/{created_id}/status",
        json={"status": "Disabled"},
    )
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["status"] == "Disabled"

    # Delete policy
    del_resp = client.delete(f"/api/v1/iac/run-suite/policies/{created_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True
