"""
FastAPI Router for IaC Security Run Suite (Section 7: Screens 7.1 to 7.8)
Endpoints for:
- 7.1 Run Overview (/overview)
- 7.2 Workloads (/workloads)
- 7.3 Containers (/containers)
- 7.4 Kubernetes Cluster (/kubernetes)
- 7.5 Runtime Threats (/threats & status update)
- 7.6 Runtime Vulnerabilities (/vulnerabilities & status update)
- 7.7 Network Activity (/network-activity)
- 7.8 Runtime Security Policies (/policies, CRUD, status toggle)
"""

from typing import Optional
from fastapi import APIRouter, Query, Path, HTTPException, status
from app.schemas.iac_run_suite import (
    RunOverviewResponse,
    WorkloadsResponse,
    ContainersResponse,
    KubernetesClusterResponse,
    RuntimeThreatsResponse,
    RuntimeThreatItem,
    UpdateThreatStatusRequest,
    RuntimeVulnerabilitiesResponse,
    RuntimeVulnerabilityItem,
    UpdateVulnerabilityStatusRequest,
    NetworkActivityResponse,
    RuntimePoliciesResponse,
    RuntimePolicyItem,
    CreateRuntimePolicyRequest,
    TogglePolicyStatusRequest,
)
from app.services.iac_run_suite_service import iac_run_suite_service

router = APIRouter(prefix="/iac/run-suite", tags=["IaC Run Suite"])


# 7.1 Run Overview
@router.get("/overview", response_model=RunOverviewResponse, summary="Get Run Overview metrics, activity chart & recent events")
def get_run_overview(
    time_range: str = Query("Last 24 hours", description="Time window for metrics"),
):
    return iac_run_suite_service.get_overview(time_range=time_range)


# 7.2 Workloads
@router.get("/workloads", response_model=WorkloadsResponse, summary="Get list of running workloads across clusters and namespaces")
def get_workloads(
    cluster: Optional[str] = Query(None, description="Cluster filter"),
    namespace: Optional[str] = Query(None, description="Namespace filter"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
):
    return iac_run_suite_service.get_workloads(
        cluster=cluster,
        namespace=namespace,
        search=search,
        page=page,
        page_size=page_size,
    )


# 7.3 Containers
@router.get("/containers", response_model=ContainersResponse, summary="Get container runtime states, CPU and memory usage")
def get_containers(
    cluster: Optional[str] = Query(None, description="Cluster filter"),
    namespace: Optional[str] = Query(None, description="Namespace filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
):
    return iac_run_suite_service.get_containers(
        cluster=cluster,
        namespace=namespace,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )


# 7.4 Kubernetes
@router.get("/kubernetes", response_model=KubernetesClusterResponse, summary="Get Kubernetes cluster security posture, nodes, and components")
def get_kubernetes_cluster(
    cluster_id: str = Query("eks-prod-cluster", description="Kubernetes cluster identifier"),
):
    return iac_run_suite_service.get_kubernetes_cluster(cluster_id=cluster_id)


# 7.5 Runtime Threats
@router.get("/threats", response_model=RuntimeThreatsResponse, summary="Get runtime threats and anomalies")
def get_threats(
    cluster: Optional[str] = Query(None, description="Cluster filter"),
    severity: Optional[str] = Query(None, description="Severity filter"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
):
    return iac_run_suite_service.get_threats(
        cluster=cluster,
        severity=severity,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.put("/threats/{threat_id}/status", response_model=RuntimeThreatItem, summary="Update runtime threat status")
def update_threat_status(
    threat_id: str = Path(..., description="Target threat ID"),
    payload: UpdateThreatStatusRequest = ...,
):
    updated = iac_run_suite_service.update_threat_status(threat_id=threat_id, new_status=payload.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Threat {threat_id} not found")
    return updated


# 7.6 Runtime Vulnerabilities
@router.get("/vulnerabilities", response_model=RuntimeVulnerabilitiesResponse, summary="Get running container CVE vulnerabilities")
def get_vulnerabilities(
    cluster: Optional[str] = Query(None, description="Cluster filter"),
    severity: Optional[str] = Query(None, description="Severity filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
):
    return iac_run_suite_service.get_vulnerabilities(
        cluster=cluster,
        severity=severity,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.put("/vulnerabilities/{vuln_id}/status", response_model=RuntimeVulnerabilityItem, summary="Update runtime vulnerability status")
def update_vulnerability_status(
    vuln_id: str = Path(..., description="Target vulnerability ID"),
    payload: UpdateVulnerabilityStatusRequest = ...,
):
    updated = iac_run_suite_service.update_vulnerability_status(vuln_id=vuln_id, new_status=payload.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vulnerability {vuln_id} not found")
    return updated


# 7.7 Network Activity
@router.get("/network-activity", response_model=NetworkActivityResponse, summary="Get workload network flow logs and byte metrics")
def get_network_activity(
    cluster: Optional[str] = Query(None, description="Cluster filter"),
    namespace: Optional[str] = Query(None, description="Namespace filter"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
):
    return iac_run_suite_service.get_network_activity(
        cluster=cluster,
        namespace=namespace,
        search=search,
        page=page,
        page_size=page_size,
    )


# 7.8 Runtime Policies
@router.get("/policies", response_model=RuntimePoliciesResponse, summary="Get runtime security policies")
def get_policies(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
):
    return iac_run_suite_service.get_policies(page=page, page_size=page_size)


@router.post("/policies", response_model=RuntimePolicyItem, status_code=status.HTTP_201_CREATED, summary="Create new runtime security policy")
def create_policy(payload: CreateRuntimePolicyRequest):
    return iac_run_suite_service.create_policy(payload)


@router.put("/policies/{policy_id}/status", response_model=RuntimePolicyItem, summary="Toggle runtime policy status (Enabled/Disabled)")
def toggle_policy_status(
    policy_id: str = Path(..., description="Target policy ID"),
    payload: TogglePolicyStatusRequest = ...,
):
    updated = iac_run_suite_service.toggle_policy_status(policy_id=policy_id, new_status=payload.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Policy {policy_id} not found")
    return updated


@router.delete("/policies/{policy_id}", summary="Delete runtime security policy")
def delete_policy(policy_id: str = Path(..., description="Target policy ID")):
    deleted = iac_run_suite_service.delete_policy(policy_id=policy_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Policy {policy_id} not found")
    return {"success": True, "deleted_id": policy_id}
