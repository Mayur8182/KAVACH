// ================================================================
// Navigation Types — shared across shell and routing
// ================================================================

export type AppRoute =
  // Global
  | 'dashboard'
  // Thing Code
  | 'code/overview'
  | 'code/repositories'
  | 'code/findings'
  | 'code/prs'
  | 'code/dependencies'
  | 'code/secrets'
  | 'code/sbom'
  | 'code/policies'
  | 'code/autofix'
  // Thing Container Security (19 modules)
  | 'container-security'
  | 'container-security/inventory'
  | 'container-security/images'
  | 'container-security/dockerfiles'
  | 'container-security/secrets'
  | 'container-security/sbom'
  | 'container-security/registries'
  | 'container-security/workloads'
  | 'container-security/runtime'
  | 'container-security/scans'
  | 'container-security/findings'
  | 'container-security/ai'
  | 'container-security/remediation'
  | 'container-security/policies'
  | 'container-security/ci-cd'
  | 'container-security/compliance'
  | 'container-security/integrations'
  | 'container-security/reports'
  | 'container-security/settings'
  // Thing Cloud
  | 'cloud/overview'
  | 'cloud/aws'
  | 'cloud/azure'
  | 'cloud/gcp'
  | 'cloud/kubernetes'
  | 'cloud/docker'
  | 'cloud/cspm'
  | 'cloud/iac'
  | 'cloud/network'
  // Thing Attack
  | 'attack/overview'
  | 'attack/surface'
  | 'attack/api'
  | 'attack/dast'
  | 'attack/testing'
  | 'attack/paths'
  // Thing Protect
  | 'protect/overview'
  | 'protect/runtime'
  | 'protect/mcp'
  | 'protect/policies'
  | 'protect/tools'
  | 'protect/dataflow'
  | 'protect/dns'
  | 'protect/dns-events'
  | 'protect/dns-policies'
  | 'protect/dns-signals'
  | 'protect/abuse'
  | 'protect/rate-limits'
  | 'protect/abuse-signals'
  // Thing Agent (Step 28 — AI Coding Agent Governance)
  | 'agent/overview'
  | 'agent/providers'
  | 'agent/agents'
  | 'agent/sessions'
  | 'agent/activity'
  | 'agent/approvals'
  | 'agent/delegations'
  | 'agent/anomalies'
  | 'agent/identity'
  | 'agent/authorization'
  | 'agent/delegation'
  | 'agent/graph'
  | 'agent/mcp'
  // Thing Graph
  | 'graph/security'
  | 'graph/authority'
  | 'graph/attack-paths'
  | 'graph/blast-radius'
  | 'graph/data-flows'
  | 'graph/change-impact'
  // Thing Intelligence
  | 'intelligence/overview'
  | 'intelligence/behavioral'
  | 'intelligence/drift'
  | 'intelligence/verification'
  | 'intelligence/effectiveness'
  | 'intelligence/threat-intel'
  | 'intelligence/threat-sources'
  | 'intelligence/threat-indicators'
  | 'intelligence/threat-matches'
  // Thing Incident
  | 'incident/center'
  | 'incident/investigation'
  | 'incident/forensics'
  | 'incident/containment'
  | 'incident/timeline'
  | 'incident/recovery'
  // Thing SOC (Step 23)
  | 'soc/overview'
  | 'soc/alerts'
  | 'soc/events'
  | 'soc/cases'
  | 'soc/watchlists'
  | 'soc/rules'
  // Control Plane
  | 'control/projects'
  | 'control/intent'
  | 'control/blueprints'
  | 'control/contracts'
  | 'control/policies'
  | 'control/decisions'
  | 'control/approvals'
  | 'control/audit'
  // System
  | 'integrations'
  | 'settings';

export interface NavItem {
  id: AppRoute;
  label: string;
  icon: string; // SVG path d attribute
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
