export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  workspace_type: 'PERSONAL' | 'ORGANIZATION';
  organization_id?: string | null;
  organization_name?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  visibility: 'Private' | 'Internal' | 'Public';
  default_branch: string;
  region: string;
  deployment_target: string;
  admins: string[];
  created_at: string;
  updated_at?: string | null;
  description?: string | null;
  project_count: number;
  repository_count: number;
  member_count: number;
}

export interface OrganizationWorkspacesGroup {
  id: string;
  name: string;
  slug: string;
  role: string;
  workspaces: WorkspaceItem[];
}

export interface WorkspaceListResponse {
  personal: WorkspaceItem[];
  organizations: OrganizationWorkspacesGroup[];
  items: WorkspaceItem[];
}

export interface WorkspaceCreatePayload {
  name: string;
  description?: string;
  workspace_type?: 'PERSONAL' | 'ORGANIZATION';
  organization_id?: string;
  visibility?: 'Private' | 'Internal' | 'Public';
  default_branch?: string;
  region?: string;
  deployment_target?: string;
}

export interface ProjectInWorkspaceItem {
  id: string;
  name: string;
  description?: string | null;
  workspace_id?: string | null;
  organization_id?: string | null;
  primary_language?: string | null;
  environment: string;
  repository_count: number;
  last_activity: string;
  status: string;
  created_at: string;
}

export interface RepositoryInWorkspaceItem {
  id: string;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  visibility: string;
  language?: string | null;
  last_synced_at?: string | null;
  connection_status: string;
  project_id?: string | null;
  project_name?: string | null;
  workspace_id?: string | null;
  html_url?: string | null;
}

export interface ActivityEventItem {
  id: string;
  actor: string;
  action: string;
  target_resource: string;
  timestamp: string;
  relative_time: string;
  workspace_name?: string | null;
}

export interface OrganizationOverviewResponse {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  owner_name: string;
  workspaces_count: number;
  projects_count: number;
  repositories_count: number;
  members_count: number;
  recent_activity: ActivityEventItem[];
  workspaces: WorkspaceItem[];
}
