from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.agents import router as agents_router
from app.api.v1.audit import router as audit_router
from app.api.v1.intents import router as intents_router
from app.api.v1.blueprints import router as blueprints_router
from app.api.v1.scans import router as scans_router
from app.api.v1.policies import router as policies_router
from app.api.v1.github import router as github_router
from app.api.v1.sbom import router as sbom_router
from app.api.v1.container_security import router as container_security_router
from app.api.v1.iac import router as iac_router
from app.api.v1.iac_drift import router as iac_drift_router
from app.api.v1.iac_findings_suite import router as iac_findings_suite_router
from app.api.v1.iac_remediation_suite import router as iac_remediation_suite_router
from app.api.v1.iac_rule_detail_suite import router as iac_rule_detail_suite_router
from app.api.v1.iac_settings_suite import router as iac_settings_suite_router
from app.api.v1.iac_graph_suite import router as iac_graph_suite_router
from app.api.v1.iac_integrations_suite import router as iac_integrations_suite_router
from app.api.v1.iac_run_suite import router as iac_run_suite_router
from app.api.v1.cicd import router as cicd_router
from app.code.router import router as code_router
from app.api.v1.findings import router as findings_router
from app.api.v1.pull_requests import router as pull_requests_router
from app.home.api.overview import router as home_router
from app.cloud.router import router as cloud_router
from app.attack.router import router as attack_router
from app.protect.router import router as protect_router
from app.agent.router import router as agent_router
from app.qa.router import router as qa_router
from app.data.router import router as data_router
from app.api.v1.graph import router as graph_router
from app.api.v1.soc import router as soc_router
from app.api.v1.threat_intel import router as threat_intel_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.contact import router as contact_router
from app.api.v1.workspaces import router as workspaces_router, org_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.invitations import router as invitations_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.code_config import router as code_config_router, settings_router as code_settings_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.governance import router as governance_router
from app.api.v1.integrations_v2 import router as integrations_v2_router
from app.api.v1.hotspots import router as hotspots_router
from app.code.sast_router import router as sast_router
from app.api.v1.findings_module import router as findings_module_router
from app.api.v1.sales_demo import router as sales_demo_router
from app.api.v1.account import router as account_router
from app.api.v1.entitlements import router as entitlements_router
from app.api.v1.runtime import router as runtime_router
from app.api.v1.superadmin_tenants import router as superadmin_tenants_router
from app.api.v1.superadmin_plans import router as superadmin_plans_router, feature_router as superadmin_features_router
from app.api.v1.superadmin_entitlements import router as superadmin_entitlements_router
from app.api.v1.superadmin_tenant_plans import router as superadmin_tenant_plans_router
from app.api.v1.superadmin_quotas_seats_trials import router as superadmin_quotas_seats_trials_router
from app.api.v1.superadmin_platform_operations import router as superadmin_platform_operations_router
from app.api.v1.repository_management import router as repository_management_router
from app.api.v1.dependency_scans import router as dependency_scans_router
from app.api.v1.dependency_reports import router as dependency_reports_router
from app.api.v1.dependency_settings import router as dependency_settings_router
from app.api.v1.tours import router as tours_router
from app.api.v1.autofix import router as autofix_router
from app.api.v1.ai_security import router as ai_security_router
from app.api.v1.api_security import router as api_security_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.local_audit import router as local_audit_router
from app.api.v1.runs import router as runs_router
from app.api.v1.security_intelligence import router as security_intelligence_router
from app.api.v1.remediation import router as remediation_router
from app.api.v1.cli import router as cli_router

v1_router = APIRouter()
v1_router.include_router(cli_router)
v1_router.include_router(remediation_router)
v1_router.include_router(runs_router)
v1_router.include_router(security_intelligence_router)
v1_router.include_router(local_audit_router)
v1_router.include_router(local_audit_router, prefix="/code/local-audit")
v1_router.include_router(assistant_router)
v1_router.include_router(api_security_router)
v1_router.include_router(ai_security_router)
v1_router.include_router(autofix_router)
v1_router.include_router(tours_router)
v1_router.include_router(dependency_settings_router)
v1_router.include_router(dependency_reports_router)
v1_router.include_router(dependency_scans_router)
v1_router.include_router(repository_management_router)
v1_router.include_router(superadmin_tenants_router)
v1_router.include_router(superadmin_plans_router)
v1_router.include_router(superadmin_features_router)
v1_router.include_router(superadmin_entitlements_router)
v1_router.include_router(superadmin_tenant_plans_router)
v1_router.include_router(superadmin_quotas_seats_trials_router)
v1_router.include_router(superadmin_platform_operations_router)
v1_router.include_router(runtime_router)
v1_router.include_router(entitlements_router)
v1_router.include_router(account_router)
v1_router.include_router(sales_demo_router)
v1_router.include_router(findings_module_router, prefix="/findings")
v1_router.include_router(sast_router)
v1_router.include_router(integrations_v2_router)
v1_router.include_router(hotspots_router)
v1_router.include_router(tasks_router)
v1_router.include_router(health_router)
v1_router.include_router(auth_router)
v1_router.include_router(projects_router)
v1_router.include_router(agents_router)
v1_router.include_router(audit_router)
v1_router.include_router(intents_router)
v1_router.include_router(blueprints_router)
v1_router.include_router(scans_router)
v1_router.include_router(policies_router)
v1_router.include_router(governance_router)
v1_router.include_router(github_router)
v1_router.include_router(sbom_router)
v1_router.include_router(container_security_router)
v1_router.include_router(iac_router)
v1_router.include_router(iac_drift_router)
v1_router.include_router(iac_findings_suite_router)
v1_router.include_router(iac_remediation_suite_router)
v1_router.include_router(iac_rule_detail_suite_router)
v1_router.include_router(iac_settings_suite_router)
v1_router.include_router(iac_graph_suite_router)
v1_router.include_router(iac_integrations_suite_router)
v1_router.include_router(iac_run_suite_router)
v1_router.include_router(cicd_router)
v1_router.include_router(code_router)
v1_router.include_router(code_config_router)
v1_router.include_router(code_settings_router)
v1_router.include_router(findings_router)
v1_router.include_router(pull_requests_router)
v1_router.include_router(home_router)
v1_router.include_router(cloud_router)
v1_router.include_router(attack_router)
v1_router.include_router(protect_router)
v1_router.include_router(agent_router)
v1_router.include_router(qa_router)
v1_router.include_router(data_router)
v1_router.include_router(graph_router)
v1_router.include_router(soc_router)
v1_router.include_router(threat_intel_router)
v1_router.include_router(intelligence_router)
v1_router.include_router(contact_router)
v1_router.include_router(workspaces_router)
v1_router.include_router(org_router)
v1_router.include_router(onboarding_router)
v1_router.include_router(invitations_router)
v1_router.include_router(integrations_router)

__all__ = ["v1_router"]
