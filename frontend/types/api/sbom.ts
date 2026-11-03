/**
 * SBOM TypeScript Definitions
 */

export interface SBOMComponent {
  id: string;
  document_id: string;
  name: string;
  version: string | null;
  component_type: string;
  purl: string | null;
  license_name: string | null;
  is_high_risk_license: boolean;
  vuln_count: number;
  vuln_critical: number;
  vuln_high: number;
  vuln_medium: number;
  vuln_low: number;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  component_status: 'Vulnerable' | 'Needs Review' | 'Safe' | string;
  direct_or_transitive?: 'Direct' | 'Transitive' | string;
  dependency_path?: string[];
  vulnerabilities?: Array<{
    id: string;
    vulnerability_id?: string;
    severity: string;
    cvss: number;
    package: string;
    installed_version?: string;
    fixed_version?: string;
    title?: string;
    description?: string;
    references?: string[];
  }>;
  created_at: string;
}

export interface SBOMSummaryResponse {
  total_components: number;
  vulnerable_components: number;
  open_source_licenses: number;
  high_risk_licenses: number;
  total_delta?: string;
  vuln_delta?: string;
  license_delta?: string;
  high_risk_delta?: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  by_severity?: Array<{
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  type_breakdown?: Record<string, number>;
  by_type?: Array<{
    type: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  top_vulnerable?: Array<{
    id: string;
    name: string;
    version: string | null;
    vuln_count: number;
    risk_level: string;
    component_type: string;
  }>;
  last_scan_at?: string | null;
  duration_ms?: number | null;
  duration_formatted?: string;
  sbom_format?: string;
  job_status?: string;
}

export interface SBOMComponentPageResponse {
  items: SBOMComponent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  available_types?: string[];
  available_licenses?: string[];
  available_risk_levels?: string[];
}

export interface SBOMJobResponse {
  id: string;
  project_id: string;
  requested_by: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string;
  sbom_format: string;
  syft_version?: string;
  syft_command?: string;
  exit_code?: number;
  error_message?: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SBOMGenerateRequest {
  project_id?: string;
  repository_id?: string;
  target_path?: string;
  sbom_format?: string;
}
