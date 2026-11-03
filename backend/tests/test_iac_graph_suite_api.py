"""
Unit & Integration Tests for IaC Infrastructure Graph Suite API — Section 12 (Screens 12.1 through 12.8)
Endpoints under /api/v1/iac/graph-suite
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_12_1_infrastructure_overview():
    """Screen 12.1: Infrastructure Graph Overview with 4 KPIs and logical graph nodes/edges."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/graph-suite/overview?repository=frontend-app&environment=production")
        assert resp.status_code == 200
        data = resp.json()
        assert data["repository"] == "frontend-app"
        assert data["environment"] == "production"
        assert "Sep 30, 2026" in data["latest_scan_date"]
        
        # Verify 4 KPIs
        kpis = data["kpis"]
        assert kpis["total_resources"] == 268
        assert kpis["high_risk"] == 42
        assert kpis["medium_risk"] == 86
        assert kpis["low_risk"] == 140

        # Verify nodes and edges
        node_ids = [n["id"] for n in data["nodes"]]
        assert "users" in node_ids
        assert "route53" in node_ids
        assert "cloudfront" in node_ids
        assert "alb" in node_ids
        assert "eks" in node_ids
        assert "ec2" in node_ids
        assert "rds" in node_ids
        assert "s3" in node_ids
        assert len(data["edges"]) >= 7


@pytest.mark.asyncio
async def test_12_2_resource_graph():
    """Screen 12.2: Resource Graph Topology (VPC, Subnets, Gateways, Clusters, S3)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/graph-suite/resource-graph")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["root_nodes"]) == 1
        root = data["root_nodes"][0]
        assert root["id"] == "prod-vpc"
        assert root["name"] == "VPC (prod-vpc)"
        
        # Check subnets
        subnet_ids = [c["id"] for c in root["children"]]
        assert "pub-sub-a" in subnet_ids
        assert "priv-sub-a" in subnet_ids
        
        # Check nested resources under private subnet a
        priv_sub_a = next(c for c in root["children"] if c["id"] == "priv-sub-a")
        nested_ids = [n["id"] for n in priv_sub_a["children"]]
        assert "prod-eks" in nested_ids
        assert "prod-db" in nested_ids


@pytest.mark.asyncio
async def test_12_3_resource_detail():
    """Screen 12.3: Resource Detail for EKS Cluster."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/graph-suite/resource/eks-prod-cluster")
        assert resp.status_code == 200
        data = resp.json()
        assert data["resource_id"] == "eks-prod-cluster"
        assert data["display_title"] == "EKS Cluster"
        assert data["resource_type"] == "AWS EKS Cluster"
        assert data["risk_level"] == "High"
        assert data["open_findings_count"] == 8
        
        # Risk breakdown
        breakdown = data["risk_breakdown"]
        assert breakdown["critical"] == 2
        assert breakdown["high"] == 4
        assert breakdown["medium"] == 2
        assert breakdown["low"] == 0

        # Configuration Status checklist
        assert len(data["config_status"]) >= 5
        assert any(c["label"] == "Encrypted at rest" and c["value"] == "Yes" for c in data["config_status"])
        assert any(c["label"] == "Version" and c["value"] == "1.28" for c in data["config_status"])


@pytest.mark.asyncio
async def test_12_4_risk_view():
    """Screen 12.4: Infrastructure Risk View with severity-weighted nodes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/graph-suite/risk-view")
        assert resp.status_code == 200
        data = resp.json()
        nodes = {n["id"]: n for n in data["nodes"]}
        
        assert nodes["eks"]["risk_level"] == "High"
        assert nodes["eks"]["findings_count"] == 8
        assert nodes["rds"]["risk_level"] == "High"
        assert nodes["rds"]["findings_count"] == 6
        assert nodes["alb"]["risk_level"] == "Medium"
        assert nodes["alb"]["findings_count"] == 3
        assert nodes["route53"]["risk_level"] == "Low"
        assert nodes["route53"]["findings_count"] == 1


@pytest.mark.asyncio
async def test_12_5_relationships():
    """Screen 12.5: Resource Relationships dependency table, search & filters."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Default listing
        resp = await client.get("/api/v1/iac/graph-suite/relationships")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 10
        assert len(data["items"]) == 10
        assert "All Relationship Types" in data["relationship_types"]

        # Search filter
        search_resp = await client.get("/api/v1/iac/graph-suite/relationships?search=RDS")
        assert search_resp.status_code == 200
        search_data = search_resp.json()
        assert search_data["total"] >= 1
        assert any("RDS" in item["target_resource"] for item in search_data["items"])

        # Relationship type filter
        type_resp = await client.get("/api/v1/iac/graph-suite/relationships?relationship_type=Encrypts")
        assert type_resp.status_code == 200
        type_data = type_resp.json()
        assert type_data["total"] == 1
        assert type_data["items"][0]["source_resource"].startswith("KMS Key")


@pytest.mark.asyncio
async def test_12_6_blast_radius():
    """Screen 12.6: Blast Radius Analysis for compromised resource."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/iac/graph-suite/blast-radius/eks-prod-cluster")
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_resource_id"] == "eks-prod-cluster"
        
        # Summary
        summary = data["summary"]
        assert summary["total_affected"] == 12
        assert summary["critical"] == 2
        assert summary["high"] == 6
        assert summary["medium"] == 3
        assert summary["low"] == 1

        # Nodes
        node_ids = [n["id"] for n in data["nodes"]]
        assert "alb-app" in node_ids
        assert "rds-prod" in node_ids
        assert "s3-app" in node_ids
        assert "cf-cdn" in node_ids
        assert "ec2-workers" in node_ids


@pytest.mark.asyncio
async def test_12_7_change_history():
    """Screen 12.7: Infrastructure Changes timeline and resource filter."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # All changes
        resp = await client.get("/api/v1/iac/graph-suite/change-history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 9
        assert len(data["items"]) == 9
        assert "All Resources" in data["available_resources"]

        # Filter by resource "EKS Cluster"
        filter_resp = await client.get("/api/v1/iac/graph-suite/change-history?resource=EKS+Cluster")
        assert filter_resp.status_code == 200
        filter_data = filter_resp.json()
        assert filter_data["total"] == 2
        assert all(item["resource"] == "EKS Cluster" for item in filter_data["items"])


@pytest.mark.asyncio
async def test_12_8_graph_settings_and_export():
    """Screen 12.8: Infrastructure Graph Settings and Export."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET settings
        resp = await client.get("/api/v1/iac/graph-suite/settings")
        assert resp.status_code == 200
        settings = resp.json()
        assert settings["visualization"]["default_view"] == "Logical View"
        assert settings["visualization"]["show_resource_labels"] is True
        assert settings["analysis"]["maximum_depth"] == 3
        assert settings["export"]["export_format"] == "PNG"

        # PUT update settings
        update_resp = await client.put(
            "/api/v1/iac/graph-suite/settings",
            json={
                "visualization": {"group_by_environment": True},
                "analysis": {"maximum_depth": 5},
                "export": {"export_format": "SVG"},
            },
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["visualization"]["group_by_environment"] is True
        assert updated["analysis"]["maximum_depth"] == 5
        assert updated["export"]["export_format"] == "SVG"

        # POST reset settings
        reset_resp = await client.post("/api/v1/iac/graph-suite/settings/reset")
        assert reset_resp.status_code == 200
        reset = reset_resp.json()
        assert reset["visualization"]["group_by_environment"] is False
        assert reset["analysis"]["maximum_depth"] == 3
        assert reset["export"]["export_format"] == "PNG"

        # POST export
        export_resp = await client.post(
            "/api/v1/iac/graph-suite/export",
            json={"view": "Logical View", "format": "PNG"},
        )
        assert export_resp.status_code == 200
        export_data = export_resp.json()
        assert export_data["format"] == "PNG"
        assert "download_url" in export_data
        assert "successfully" in export_data["message"]
