"""
IaC Rule Detail Suite API Router — Section 7: Screens 7.1 through 7.8
Prefix: /api/v1/iac/rule-detail-suite
Authoritative REST endpoints for Rule Detail, Definition, AST Logic,
Severity & Risk, Framework Mappings, Affected Resources, Exceptions, and Rule History.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, Path, status

from app.schemas.iac_rule_detail_suite import (
    RuleDetailOverviewResponse,
    RuleDefinitionResponse,
    RuleLogicResponse,
    RuleRiskDetailsResponse,
    RuleFrameworkMappingsResponse,
    AffectedResourcesPageResponse,
    RuleExceptionsPageResponse,
    RuleExceptionItem,
    CreateRuleExceptionRequest,
    RuleHistoryResponse,
    TriggerRuleScanRequest,
    TriggerRuleScanResponse,
)
from app.services.iac_rule_detail_suite_service import IaCRuleDetailSuiteService

router = APIRouter(prefix="/iac/rule-detail-suite", tags=["IaC Rule Detail Suite"])


@router.get(
    "/{rule_id}/overview",
    response_model=RuleDetailOverviewResponse,
    summary="7.1 Rule Detail Overview (Header, 4 KPIs, Rule Info Card)",
)
async def get_rule_overview(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
) -> RuleDetailOverviewResponse:
    return IaCRuleDetailSuiteService.get_overview(rule_id=rule_id)


@router.get(
    "/{rule_id}/definition",
    response_model=RuleDefinitionResponse,
    summary="7.2 Rule Definition (Title, Description, Rationale, Impact, Recommendation, References, Labels)",
)
async def get_rule_definition(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
) -> RuleDefinitionResponse:
    return IaCRuleDetailSuiteService.get_definition(rule_id=rule_id)


@router.get(
    "/{rule_id}/logic",
    response_model=RuleLogicResponse,
    summary="7.3 Detection Logic & Test Resource (Checkov, CloudFormation, Crossplane, Others)",
)
async def get_rule_logic(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
) -> RuleLogicResponse:
    return IaCRuleDetailSuiteService.get_logic(rule_id=rule_id)


@router.get(
    "/{rule_id}/risk",
    response_model=RuleRiskDetailsResponse,
    summary="7.4 Severity & Risk (Risk details, CVSS, Risk factors checklist, Risk trend 6 months)",
)
async def get_rule_risk(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
) -> RuleRiskDetailsResponse:
    return IaCRuleDetailSuiteService.get_risk(rule_id=rule_id)


@router.get(
    "/{rule_id}/mappings",
    response_model=RuleFrameworkMappingsResponse,
    summary="7.5 Compliance Framework Mappings (CIS AWS, NIST 800-53, PCI DSS, ISO 27001, SOC 2)",
)
async def get_rule_mappings(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
) -> RuleFrameworkMappingsResponse:
    return IaCRuleDetailSuiteService.get_mappings(rule_id=rule_id)


@router.get(
    "/{rule_id}/resources",
    response_model=AffectedResourcesPageResponse,
    summary="7.6 Affected Resources (4 KPIs, multi-filters, paginated resources)",
)
async def get_affected_resources(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
    status_filter: Optional[str] = Query(None, alias="status"),
    environment: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
) -> AffectedResourcesPageResponse:
    return IaCRuleDetailSuiteService.get_resources(
        rule_id=rule_id,
        status=status_filter,
        environment=environment,
        region=region,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{rule_id}/exceptions",
    response_model=RuleExceptionsPageResponse,
    summary="7.7 Exceptions (Active, Expired, Pending counts, searchable exceptions table)",
)
async def get_rule_exceptions(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
) -> RuleExceptionsPageResponse:
    return IaCRuleDetailSuiteService.get_exceptions(
        rule_id=rule_id,
        search=search,
        status=status_filter,
    )


@router.post(
    "/{rule_id}/exceptions",
    response_model=RuleExceptionItem,
    status_code=status.HTTP_201_CREATED,
    summary="7.7 Add Exception (Resource, Reason, Expiration)",
)
async def create_rule_exception(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
    payload: CreateRuleExceptionRequest = ...,
) -> RuleExceptionItem:
    return IaCRuleDetailSuiteService.create_exception(
        rule_id=rule_id,
        payload=payload,
    )


@router.delete(
    "/{rule_id}/exceptions/{exception_id}",
    response_model=Dict[str, Any],
    summary="7.7 Revoke / Delete Exception",
)
async def delete_rule_exception(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
    exception_id: str = Path(..., description="Exception ID to revoke"),
) -> Dict[str, Any]:
    return IaCRuleDetailSuiteService.delete_exception(
        rule_id=rule_id,
        exception_id=exception_id,
    )


@router.get(
    "/{rule_id}/history",
    response_model=RuleHistoryResponse,
    summary="7.8 Rule History (Version timeline v2.3.0 through v1.0.0)",
)
async def get_rule_history(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
) -> RuleHistoryResponse:
    return IaCRuleDetailSuiteService.get_history(rule_id=rule_id)


@router.post(
    "/{rule_id}/run-scan",
    response_model=TriggerRuleScanResponse,
    summary="Trigger live security scan for this rule across environments",
)
async def trigger_rule_scan(
    rule_id: str = Path(..., description="Target rule ID, e.g. IAC-AWS-001"),
    payload: Optional[TriggerRuleScanRequest] = None,
) -> TriggerRuleScanResponse:
    env = payload.environment if payload and payload.environment else "production"
    return IaCRuleDetailSuiteService.trigger_scan(rule_id=rule_id, environment=env)
