/**
 * Thing Home / Security HQ Types
 * Truthful contracts aligned directly with FastAPI backend schemas.
 */

export interface ScopeContext {
  organization_id?: string | null;
  project_id?: string | null;
  environment_id?: string | null;
}

export interface AttentionCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface IncidentCounts {
  open: number;
  investigating: number;
  contained: number;
  closed: number;
}

export interface CoverageDomain {
  covered: number;
  total: number;
  unit: string;
}

export interface HomeOverviewResponse {
  generated_at: string;
  scope: ScopeContext;
  attention: AttentionCounts;
  incidents: IncidentCounts;
  coverage: Record<string, CoverageDomain>;
}

export interface SecurityStateFactor {
  code: string;
  value: number;
  description: string;
}

export interface SecurityStateMethodology {
  version: string;
  description: string;
}

export type SecurityStateValue = 'HEALTHY' | 'ATTENTION' | 'CRITICAL' | 'UNKNOWN';

export interface SecurityStateResponse {
  state: SecurityStateValue;
  reason_codes: string[];
  factors: SecurityStateFactor[];
  evidence_count: number;
  calculated_at: string;
  methodology: SecurityStateMethodology;
}

export interface AttentionItem {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  product: string;
  resource: string;
  timestamp: string;
  status: string;
  evidence_ref?: string | null;
  description?: string | null;
  rule_id?: string | null;
}

export interface AttentionListResponse {
  items: AttentionItem[];
  total: number;
  has_more: boolean;
  next_cursor?: string | null;
}

export interface HomeCoverageResponse {
  code: CoverageDomain;
  cloud: CoverageDomain;
  protect: CoverageDomain;
  agent: CoverageDomain;
  data: CoverageDomain;
}

export type HealthStatusValue =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'NOT_CONFIGURED'
  | 'FAILED'
  | 'UNKNOWN';

export interface ProductHealthItem {
  product: string;
  name: string;
  status: HealthStatusValue;
  message: string;
  details?: Record<string, any> | null;
}

export interface HomeProductHealthResponse {
  items: ProductHealthItem[];
  overall_health: HealthStatusValue;
}

export interface HomeActivityItem {
  id: string;
  timestamp: string;
  title: string;
  description?: string | null;
  actor: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  status: string;
  severity: string;
  metadata?: Record<string, any> | null;
}

export interface HomeActivityResponse {
  items: HomeActivityItem[];
  total: number;
  next_cursor?: string | null;
}

export interface IncidentSummaryItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  summary?: string | null;
}

export interface HomeIncidentsResponse {
  open: number;
  investigating: number;
  contained: number;
  closed: number;
  latest?: IncidentSummaryItem | null;
}

export interface TrendPoint {
  timestamp: string;
  value: number;
}

export interface HomeTrendsResponse {
  metric: string;
  window: string;
  points: TrendPoint[];
  has_sufficient_data: boolean;
  explanation: string;
}
