/**
 * Thing Project API Types
 * Matches backend app/schemas/project.py ProjectResponse
 */

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  owner_id?: string;
  repository_url?: string | null;
  primary_language?: string | null;
  framework?: string | null;
  database_type?: string | null;
  cloud_provider?: string | null;
  environment?: string | null;
  application_type?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ProjectCreatePayload {
  name: string;
  description?: string;
  repository_url?: string;
  primary_language?: string;
  framework?: string;
  database_type?: string;
  cloud_provider?: string;
  environment?: string;
  application_type?: string;
}
