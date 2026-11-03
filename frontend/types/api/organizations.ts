/**
 * Thing Organization API Types
 */

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  created_at?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  role?: string;
  industry?: string;
  region?: string;
  website?: string;
  org_type?: string;
  team_size?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface OrganizationListResponse {
  items: Organization[];
  total?: number;
}
