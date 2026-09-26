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
