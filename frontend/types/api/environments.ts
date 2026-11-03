/**
 * Thing Environment API Types
 * Represents deployed or configured target environments.
 */

export interface Environment {
  id: string;
  name: string;
  slug: string;
  project_id?: string;
  cluster_target?: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE' | 'PROVISIONING';
  is_production: boolean;
}
