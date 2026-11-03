'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project } from '@/types/api/projects';
import type { Organization } from '@/types/api/organizations';
import type { Environment } from '@/types/api/environments';
import type { WorkspaceItem, OrganizationWorkspacesGroup, WorkspaceListResponse, WorkspaceCreatePayload } from '@/types/api/workspaces';
import { api } from '@/lib/api/client';

export interface RepositoryScope {
  id: string;
  name: string;
  full_name?: string;
  default_branch?: string;
  provider?: string;
  project_id?: string;
}

export interface ScopeContextType {
  currentWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceListResponse;
  currentProject: Project | null;
  projects: Project[];
  currentOrg: Organization | null;
  currentEnv: Environment | null;
  currentRepository: RepositoryScope | null;
  repositories: RepositoryScope[];
  setCurrentWorkspace: (w: WorkspaceItem | null) => void;
  createWorkspace: (payload: WorkspaceCreatePayload) => Promise<WorkspaceItem>;
  refreshWorkspaces: () => Promise<void>;
  setCurrentProject: (p: Project | null) => void;
  setCurrentOrg: (o: Organization | null) => void;
  setCurrentEnv: (e: Environment | null) => void;
  setCurrentRepository: (r: RepositoryScope | null) => void;
  isLoadingScope: boolean;
  isLoadingRepositories: boolean;
  refreshRepositories: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const defaultWorkspacesState: WorkspaceListResponse = {
  personal: [],
  organizations: [],
  items: [],
};

const ScopeContext = createContext<ScopeContextType>({
  currentWorkspace: null,
  workspaces: defaultWorkspacesState,
  currentProject: null,
  projects: [],
  currentOrg: null,
  currentEnv: null,
  currentRepository: null,
  repositories: [],
  setCurrentWorkspace: () => {},
  createWorkspace: async () => ({} as WorkspaceItem),
  refreshWorkspaces: async () => {},
  setCurrentProject: () => {},
  setCurrentOrg: () => {},
  setCurrentEnv: () => {},
  setCurrentRepository: () => {},
  isLoadingScope: false,
  isLoadingRepositories: false,
  refreshRepositories: async () => {},
  refreshProjects: async () => {},
});

export const ScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspaceState] = useState<WorkspaceItem | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceListResponse>(defaultWorkspacesState);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [currentEnv, setCurrentEnvState] = useState<Environment | null>(null);
  const [currentRepository, setCurrentRepositoryState] = useState<RepositoryScope | null>(null);
  const [repositories, setRepositories] = useState<RepositoryScope[]>([]);
  const [isLoadingScope, setIsLoadingScope] = useState(true);
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);

  // Load repositories for current project or workspace
  const loadRepositories = useCallback(async (projectId?: string | null, workspaceId?: string | null) => {
    setIsLoadingRepositories(true);
    try {
      if (workspaceId) {
        const wsRepos = await api.workspaces.getRepositories(workspaceId).catch(() => []);
        if (Array.isArray(wsRepos) && wsRepos.length > 0) {
          const mapped: RepositoryScope[] = wsRepos.map((r: any) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            default_branch: r.default_branch,
            provider: 'github',
            project_id: r.project_id || undefined,
          }));
          setRepositories(mapped);
          const savedRepoName = typeof window !== 'undefined' ? localStorage.getItem('secu_active_repo') : null;
          let selected = savedRepoName ? mapped.find((r) => r.name === savedRepoName || r.id === savedRepoName) : undefined;
          if (!selected) selected = mapped[0];
          setCurrentRepositoryState(selected || null);
          return;
        }
      }

      const res = await api.code.repositories({ projectId: projectId || undefined, limit: 50 });
      const items: RepositoryScope[] = Array.isArray(res?.items) ? res.items : [];
      setRepositories(items);

      if (items.length > 0) {
        const savedRepoName = typeof window !== 'undefined' ? localStorage.getItem('secu_active_repo') : null;
        let selected = savedRepoName ? items.find((r) => r.name === savedRepoName || r.id === savedRepoName) : undefined;
        if (!selected) selected = items[0];
        setCurrentRepositoryState(selected || null);
        if (selected && typeof window !== 'undefined') {
          localStorage.setItem('secu_active_repo', selected.name);
        }
      } else {
        setCurrentRepositoryState(null);
      }
    } catch (err) {
      console.error('Failed to load repositories for scope:', err);
      setRepositories([]);
    } finally {
      setIsLoadingRepositories(false);
    }
  }, []);

  const refreshRepositories = useCallback(async () => {
    await loadRepositories(currentProject?.id, currentWorkspace?.id);
  }, [loadRepositories, currentProject?.id, currentWorkspace?.id]);

  // Load projects for active workspace
  const loadProjects = useCallback(async (workspaceId?: string | null) => {
    try {
      let mapped: Project[] = [];
      if (workspaceId) {
        const wsProjs = await api.workspaces.getProjects(workspaceId).catch(() => []);
        if (Array.isArray(wsProjs) && wsProjs.length > 0) {
          mapped = wsProjs.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            owner_id: p.owner_id || '',
            organization_id: p.organization_id || '',
            primary_language: p.primary_language || 'TypeScript',
            environment: p.environment || 'development',
            application_type: 'web_service',
            created_at: p.created_at,
            updated_at: p.created_at,
          }));
        }
      }

      const savedProjId = typeof window !== 'undefined' ? localStorage.getItem('secu_active_project_id') : null;
      if (mapped.length === 0 || (savedProjId && !mapped.some((p) => p.id === savedProjId))) {
        const projsRes = await api.projects.list({ limit: 100 }).catch(() => []);
        const list = Array.isArray(projsRes) ? projsRes : [];
        if (list.length > 0) {
          const listMapped: Project[] = list.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            owner_id: p.owner_id || '',
            organization_id: p.organization_id || '',
            primary_language: p.primary_language || 'TypeScript',
            environment: p.environment || 'development',
            application_type: 'web_service',
            created_at: p.created_at,
            updated_at: p.created_at,
          }));

          const existingIds = new Set(mapped.map((m) => m.id));
          for (const item of listMapped) {
            if (!existingIds.has(item.id)) {
              if (item.id === savedProjId) {
                mapped.unshift(item);
              } else {
                mapped.push(item);
              }
              existingIds.add(item.id);
            }
          }
        }
      }

      setProjects(mapped);
      return mapped;
    } catch (err) {
      console.error('Failed to load projects list:', err);
      return [];
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    await loadProjects(currentWorkspace?.id);
  }, [loadProjects, currentWorkspace?.id]);

  // Fetch all workspaces and select active
  const loadWorkspaces = useCallback(async () => {
    try {
      const wsData = await api.workspaces.list();
      const parsed: WorkspaceListResponse = {
        personal: wsData?.personal || [],
        organizations: wsData?.organizations || [],
        items: wsData?.items || [],
      };
      setWorkspaces(parsed);

      const savedWsId = typeof window !== 'undefined' ? localStorage.getItem('secu_active_workspace_id') : null;
      let activeWs: WorkspaceItem | undefined;

      if (savedWsId) {
        activeWs = parsed.items.find((w) => w.id === savedWsId);
      }
      if (!activeWs && parsed.personal.length > 0) {
        activeWs = parsed.personal[0];
      }
      if (!activeWs && parsed.items.length > 0) {
        activeWs = parsed.items[0];
      }

      if (activeWs) {
        setCurrentWorkspaceState(activeWs);
        if (typeof window !== 'undefined') {
          localStorage.setItem('secu_active_workspace_id', activeWs.id);
        }
      }
      return activeWs || null;
    } catch (err) {
      console.error('Failed to load workspaces list:', err);
      return null;
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    const initScope = async () => {
      try {
        const [activeWs, orgsRes] = await Promise.all([
          loadWorkspaces(),
          api.organizations.list().catch(() => ({ items: [] })),
        ]);

        if (!mounted) return;

        if (orgsRes.items && orgsRes.items.length > 0) {
          setCurrentOrgState(orgsRes.items[0]);
        }

        const projsList = await loadProjects(activeWs?.id);
        if (!mounted) return;

        if (projsList && projsList.length > 0) {
          const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const urlProjId = urlParams?.get('project_id');
          const savedProjId = typeof window !== 'undefined' ? localStorage.getItem('secu_active_project_id') : null;

          let targetProj = projsList.find(p => p.id === urlProjId);
          if (!targetProj && savedProjId) {
            targetProj = projsList.find(p => p.id === savedProjId);
          }
          if (!targetProj) {
            targetProj = projsList[0];
          }

          setCurrentProjectState(targetProj);
          if (typeof window !== 'undefined') {
            localStorage.setItem('secu_active_project_id', targetProj.id);
          }

          const envsRes = await api.environments.list(targetProj.id).catch(() => ({ items: [] }));
          if (mounted && envsRes.items && envsRes.items.length > 0) {
            setCurrentEnvState(envsRes.items[0]);
          } else if (mounted) {
            setCurrentEnvState({
              id: 'env-prod',
              name: 'Production',
              slug: 'production',
              project_id: targetProj.id,
              status: 'HEALTHY',
              is_production: true,
            });
          }

          if (mounted) {
            await loadRepositories(targetProj.id, activeWs?.id);
          }
        } else {
          if (mounted) {
            await loadRepositories(null, activeWs?.id);
          }
        }
      } catch (err) {
        console.error('Failed to initialize scope:', err);
      } finally {
        if (mounted) setIsLoadingScope(false);
      }
    };

    initScope();
    return () => {
      mounted = false;
    };
  }, [loadWorkspaces, loadProjects, loadRepositories]);

  // Set active workspace
  const setCurrentWorkspace = useCallback(async (w: WorkspaceItem | null) => {
    setCurrentWorkspaceState(w);
    if (w) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('secu_active_workspace_id', w.id);
      }

      // Update current organization context if workspace belongs to an org
      if (w.organization_id) {
        try {
          const orgData = await api.organizations.getOverview(w.organization_id).catch(() => null);
          if (orgData) {
            setCurrentOrgState({
              id: orgData.id,
              name: orgData.name,
              slug: orgData.slug,
              org_type: 'Enterprise',
              industry: 'Technology',
              team_size: '11 - 50',
              region: 'ap-south-1 (Mumbai)',
              owner_name: orgData.owner_name,
              owner_email: '',
              created_at: '',
              status: 'ACTIVE',
            });
          }
        } catch {
          // ignore
        }
      }

      // Reload projects and repositories specifically for this workspace
      const projs = await loadProjects(w.id);
      if (projs.length > 0) {
        setCurrentProjectState(projs[0]);
        if (typeof window !== 'undefined') {
          localStorage.setItem('secu_active_project_id', projs[0].id);
        }
        await loadRepositories(projs[0].id, w.id);
      } else {
        setCurrentProjectState(null);
        await loadRepositories(null, w.id);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('secu_active_workspace_id');
      }
      await loadProjects(null);
      await loadRepositories(null, null);
    }
  }, [loadProjects, loadRepositories]);

  // Create new workspace
  const createWorkspace = useCallback(async (payload: WorkspaceCreatePayload): Promise<WorkspaceItem> => {
    const created = await api.workspaces.create(payload);
    await loadWorkspaces();
    if (created && created.id) {
      await setCurrentWorkspace(created);
    }
    return created;
  }, [loadWorkspaces, setCurrentWorkspace]);

  const setCurrentProject = useCallback((p: Project | null) => {
    setCurrentProjectState(p);
    if (p) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('secu_active_project_id', p.id);
      }
      api.environments.list(p.id)
        .then((res) => {
          if (res.items && res.items.length > 0) {
            setCurrentEnvState(res.items[0]);
          } else {
            setCurrentEnvState({
              id: 'env-default',
              name: 'Production',
              slug: 'production',
              project_id: p.id,
              status: 'HEALTHY',
              is_production: true,
            });
          }
        })
        .catch(() => {
          setCurrentEnvState(null);
        });
      loadRepositories(p.id, currentWorkspace?.id);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('secu_active_project_id');
      }
      setCurrentEnvState(null);
      loadRepositories(null, currentWorkspace?.id);
    }
  }, [loadRepositories, currentWorkspace?.id]);

  const setCurrentOrg = useCallback((o: Organization | null) => {
    setCurrentOrgState(o);
  }, []);

  const setCurrentEnv = useCallback((e: Environment | null) => {
    setCurrentEnvState(e);
  }, []);

  const setCurrentRepository = useCallback((r: RepositoryScope | null) => {
    setCurrentRepositoryState(r);
    if (r && typeof window !== 'undefined') {
      localStorage.setItem('secu_active_repo', r.name);
    }
  }, []);

  return (
    <ScopeContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        currentProject,
        projects,
        currentOrg,
        currentEnv,
        currentRepository,
        repositories,
        setCurrentWorkspace,
        createWorkspace,
        refreshWorkspaces,
        setCurrentProject,
        setCurrentOrg,
        setCurrentEnv,
        setCurrentRepository,
        isLoadingScope,
        isLoadingRepositories,
        refreshRepositories,
        refreshProjects,
      }}
    >
      {children}
    </ScopeContext.Provider>
  );
};

export const useScope = () => useContext(ScopeContext);
