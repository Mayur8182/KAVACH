export interface DependencyHealth {
  status: 'healthy' | 'unhealthy' | 'not_configured';
  latency_ms?: number;
  details?: string;
}

export interface LivenessResponse {
  status: string;
  timestamp: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  dependencies: {
    postgresql: DependencyHealth;
    [key: string]: DependencyHealth;
  };
}

export interface HealthResponse {
  app_name: string;
  environment: string;
  version: string;
  status: 'operational' | 'degraded';
  timestamp: string;
  dependencies: {
    postgresql: DependencyHealth;
    [key: string]: DependencyHealth;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  timestamp: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorDetail;
  isError: boolean;
  status: number;
}

// Intent Understanding Engine Types
export interface Actor {
  id: string;
  name: string;
  type: string;
  description: string;
  source: string;
  confidence: number;
}

export interface Workflow {
  name: string;
  description: string;
  actors: string[];
  inputs: string[];
  outputs: string[];
  state_changes: string[];
  source: string;
  confidence: number;
}

export interface InterfaceEntity {
  type: string;
  description: string;
  source: string;
  confidence: number;
}

export interface Technology {
  name: string;
  category: string;
  version: string | null;
  source: string;
  confidence: number;
}

export interface DataDomain {
  domain: string;
  description: string;
  confidence: number;
  source: string;
}

export interface ExternalService {
  name: string;
  type: string;
  purpose: string;
  direction: string;
  status: string;
  source: string;
  confidence: number;
}

export interface Ambiguity {
  question: string;
  field: string;
  rationale: string;
  severity: string;
}

export interface NormalizedIntent {
  raw_input: string;
  purpose: string;
  application_type: string;
  actors: Actor[];
  workflows: Workflow[];
  interfaces: InterfaceEntity[];
  technologies: Technology[];
  data_domains: DataDomain[];
  external_services: ExternalService[];
  deployment_context: {
    cloud_provider: string | null;
    environment: string;
    source: string;
    confidence: number;
  };
  state_changes: Array<{
    name: string;
    target_entity: string;
    description: string;
  }>;
  trust_boundaries: Array<{
    source: string;
    destination: string;
    boundary_type: string;
    description: string;
  }>;
  ambiguities: Ambiguity[];
  missing_information: string[];
  overall_confidence: number;
}

export interface IntentSubmitRequest {
  project_id: string;
  description: string;
  environment?: string;
  preferred_provider?: string;
}

export interface IntentResponse {
  id: string;
  project_id: string;
  raw_input: string;
  environment: string;
  application_type: string;
  purpose: string;
  normalized_intent: NormalizedIntent;
  status: string;
  provider: string;
  model_name?: string | null;
  overall_confidence: number;
  created_at: string;
  updated_at: string;
}

// Security Blueprint Engine Types
export interface RequirementEvidenceItem {
  id: string;
  source_type: string;
  source_field: string;
  evidence_text: string;
  created_at: string;
}

export interface RequirementDependencyItem {
  id: string;
  depends_on_key: string;
  dependency_type: string;
  description?: string | null;
}

export interface SecurityRequirement {
  id: string;
  blueprint_id: string;
  requirement_key: string;
  title: string;
  description: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  priority: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  mandatory: boolean;
  rationale: string;
  verification_strategy: string[];
  status: 'ACTIVE' | 'WAIVED' | 'SATISFIED' | 'VIOLATED' | 'UNKNOWN';
  security_invariant?: string | null;
  created_at: string;
  evidence_items: RequirementEvidenceItem[];
  dependencies: RequirementDependencyItem[];
}

export interface SecurityBlueprint {
  id: string;
  project_id: string;
  intent_id: string;
  version: number;
  status: 'DRAFT' | 'GENERATING' | 'GENERATED' | 'FAILED' | 'SUPERSEDED';
  methodology_version: string;
  generated_by: string;
  risk_factors: string[];
  created_at: string;
  updated_at: string;
  requirement_count: number;
  requirements?: SecurityRequirement[];
}

export interface BlueprintCreateRequest {
  intent_id?: string;
}

export interface RequirementDiff {
  requirement_key: string;
  title: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

export interface BlueprintComparisonResponse {
  blueprint_v1_id: string;
  blueprint_v1_version: number;
  blueprint_v2_id: string;
  blueprint_v2_version: number;
  added_requirements: SecurityRequirement[];
  removed_requirements: SecurityRequirement[];
  modified_requirements: RequirementDiff[];
  unchanged_count: number;
}

// Security Verification & Scanner Engine Types
export interface ScannerExecution {
  id: string;
  scan_id: string;
  scanner_name: string;
  scanner_type: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NOT_CONFIGURED' | 'NOT_AVAILABLE';
  scanner_version?: string | null;
  command?: string | null;
  exit_code?: number | null;
  stdout_summary?: string | null;
  stderr_output?: string | null;
  finding_count: number;
  duration_ms?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface SecurityFinding {
  id: string;
  scan_id: string;
  scanner_execution_id: string;
  scanner_name: string;
  rule_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  file_path?: string | null;
  line_number?: number | null;
  column_number?: number | null;
  snippet?: string | null;
  fingerprint: string;
  raw_metadata: Record<string, unknown>;
  created_at: string;
}

export interface RequirementVerification {
  id: string;
  scan_id: string;
  requirement_id: string;
  requirement_key: string;
  status: 'SATISFIED' | 'VIOLATED' | 'UNKNOWN' | 'NOT_EVALUATED';
  rationale: string;
  evidence_summary: string;
  contributing_findings_count: number;
  created_at: string;
}

export interface SecurityScan {
  id: string;
  project_id: string;
  blueprint_id?: string | null;
  intent_id?: string | null;
  target_type: string;
  target_path: string;
  target_reference?: string | null;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'CANCELLED';
  requested_by: string;
  started_at?: string | null;
  completed_at?: string | null;
  scanner_count: number;
  finding_count: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  executions?: ScannerExecution[];
  findings?: SecurityFinding[];
  verifications?: RequirementVerification[];
}

export interface ScanTriggerRequest {
  target_type?: string;
  target_path?: string;
  blueprint_id?: string;
  selected_scanners?: string[];
}

export interface ScannerHealthResponse {
  scanner_name: string;
  scanner_type: string;
  tool_name: string;
  status: 'healthy' | 'not_configured';
  version?: string | null;
  message: string;
}
