'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

export type ApiScanMode = 'code_audit' | 'live_dast';

export interface OverviewMetrics {
  connected_apis?: number;
  endpoints_discovered?: number;
  security_analysis_count?: number;
  open_findings?: number;
  [key: string]: any;
}

export interface ApiSecurityContextType {
  apis: any[];
  selectedApi: any | null;
  setSelectedApi: (api: any) => void;
  isLoadingApis: boolean;
  refreshApis: (overrideProjectId?: string) => Promise<void>;
  overviewMetrics: OverviewMetrics;
  refreshOverview: (overrideProjectId?: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isGithubModalOpen: boolean;
  setIsGithubModalOpen: (open: boolean) => void;
  apiRepositories: any[];
  isLoadingRepos: boolean;
  githubAccount: string | null;
  isGithubConnected: boolean;
  refreshRepositories: () => Promise<void>;
  selectRepository: (repo: any) => Promise<any>;
  scanMode: ApiScanMode;
  setScanMode: (mode: ApiScanMode) => void;
  syncWithRepository: (repo: any) => void;
}

const ApiSecurityContext = createContext<ApiSecurityContextType | undefined>(undefined);

export function ApiSecurityProvider({ children }: { children: React.ReactNode }) {
  const { currentProject, currentRepository, setCurrentRepository, repositories } = useScope();
  const [apis, setApis] = useState<any[]>([]);
  const [selectedApi, setSelectedApi] = useState<any | null>(null);
  const [isLoadingApis, setIsLoadingApis] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<ApiScanMode>('code_audit');
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics>({
    connected_apis: 0,
    endpoints_discovered: 0,
    security_analysis_count: 0,
    open_findings: 0,
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);
  const [apiRepositories, setApiRepositories] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [githubAccount, setGithubAccount] = useState<string | null>(null);
  const [isGithubConnected, setIsGithubConnected] = useState<boolean>(false);

  const refreshApis = useCallback(async (overrideProjectId?: string) => {
    setIsLoadingApis(true);
    try {
      const projId = overrideProjectId !== undefined ? overrideProjectId : currentProject?.id;
      const res = await api.apiSecurity.apis({ projectId: projId || undefined });
      const items = res?.items || [];
      setApis(items);

      if (items.length > 0) {
        setSelectedApi((prevSelected: any) => {
          // If currentRepository matches an API target, prefer that one
          if (currentRepository) {
            const matched = items.find(
              (a: any) =>
                (a.repository && (a.repository === currentRepository.full_name || a.repository === currentRepository.name)) ||
                (a.name && (a.name.toLowerCase() === currentRepository.name.toLowerCase()))
            );
            if (matched) return matched;
          }
          // If previous selection is still valid in items, keep it
          if (prevSelected && items.some((i: any) => i.id === prevSelected.id)) {
            return prevSelected;
          }
          return items[0];
        });
      } else {
        setSelectedApi(null);
      }
    } catch (err) {
      console.error('Failed to load APIs:', err);
    } finally {
      setIsLoadingApis(false);
    }
  }, [currentProject?.id, currentRepository]);

  const refreshOverview = useCallback(async (overrideProjectId?: string) => {
    try {
      const projId = overrideProjectId !== undefined ? overrideProjectId : currentProject?.id;
      const res = await api.apiSecurity.overview(projId || undefined);
      if (res) {
        setOverviewMetrics(res);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  }, [currentProject?.id]);

  const refreshRepositories = useCallback(async () => {
    setIsLoadingRepos(true);
    try {
      const res = await api.apiSecurity.listRepositories();
      if (res) {
        setApiRepositories(res.repositories || []);
        setGithubAccount(res.account_name || null);
        setIsGithubConnected(Boolean(res.connected));
      }
    } catch (err) {
      console.error('Failed to load repositories for API Security:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  const selectRepository = useCallback(async (repo: any) => {
    if (!repo) return;
    setIsLoadingApis(true);
    try {
      let targetToSelect: any = null;

      // 1. Check if an API target already exists with matching id or name
      if (repo.api_target_id) {
        targetToSelect = apis.find((a: any) => a.id === repo.api_target_id);
      }
      if (!targetToSelect) {
        const cleanName = (repo.name || '').toLowerCase();
        targetToSelect = apis.find((a: any) => {
          const aRepo = (a.repository || '').toLowerCase();
          const aName = (a.name || '').toLowerCase();
          return (
            (aRepo && (aRepo === (repo.full_name || '').toLowerCase() || aRepo === cleanName)) ||
            (aName && (aName === cleanName || aName === `${cleanName} code inventory`))
          );
        });
      }

      // 2. If target does not exist yet in API Security, connect & discover routes
      if (!targetToSelect) {
        const connectRes = await api.apiSecurity.connectRepository({
          repository_id: String(repo.id),
          full_name: repo.full_name || repo.name,
          name: repo.name,
          branch: repo.default_branch || 'main',
          clone_url: repo.clone_url,
          html_url: repo.html_url,
          language: repo.language,
        });
        if (connectRes?.api_target) {
          targetToSelect = connectRes.api_target;
        }
      }

      // 3. Refresh APIs list
      const res = await api.apiSecurity.apis({ projectId: currentProject?.id || undefined });
      const items = res?.items || [];
      setApis(items);

      if (targetToSelect) {
        const fresh = items.find((a: any) => a.id === targetToSelect.id) || targetToSelect;
        setSelectedApi(fresh);
      } else if (items.length > 0) {
        setSelectedApi(items[0]);
      }

      // 4. Synchronize with global currentRepository
      if (repositories && repositories.length > 0) {
        const matched = repositories.find((r: any) =>
          r.name?.toLowerCase() === repo.name?.toLowerCase() ||
          r.full_name?.toLowerCase() === (repo.full_name || '').toLowerCase()
        );
        if (matched) setCurrentRepository(matched);
      }

      await refreshOverview();
      await refreshRepositories();
      return targetToSelect;
    } catch (err) {
      console.error('Failed to select repository:', err);
      throw err;
    } finally {
      setIsLoadingApis(false);
    }
  }, [apis, currentProject?.id, repositories, setCurrentRepository, refreshOverview, refreshRepositories]);

  // Synchronize API Target selection with global repository scope
  const handleSetSelectedApi = useCallback((targetApi: any) => {
    setSelectedApi(targetApi);
    if (targetApi && repositories && repositories.length > 0) {
      const matchingRepo = repositories.find(
        (r: any) =>
          (targetApi.repository && (r.full_name === targetApi.repository || r.name === targetApi.repository)) ||
          (targetApi.name && r.name && r.name.toLowerCase() === targetApi.name.toLowerCase())
      );
      if (matchingRepo && (!currentRepository || currentRepository.id !== matchingRepo.id)) {
        setCurrentRepository(matchingRepo);
      }
    }
  }, [repositories, currentRepository, setCurrentRepository]);

  // Synchronize when repository is chosen in page
  const syncWithRepository = useCallback((repo: any) => {
    if (!repo) return;
    setApis((currentApis: any[]) => {
      const matched = currentApis.find(
        (a: any) =>
          (a.repository && (a.repository === repo.full_name || a.repository === repo.name)) ||
          (a.name && a.name.toLowerCase() === repo.name.toLowerCase())
      );
      if (matched) {
        setSelectedApi(matched);
      }
      return currentApis;
    });
  }, []);

  useEffect(() => {
    refreshApis();
    refreshOverview();
    refreshRepositories();
  }, [refreshApis, refreshOverview, refreshRepositories]);

  return (
    <ApiSecurityContext.Provider
      value={{
        apis,
        selectedApi,
        setSelectedApi: handleSetSelectedApi,
        isLoadingApis,
        refreshApis,
        overviewMetrics,
        refreshOverview,
        isAddModalOpen,
        setIsAddModalOpen,
        isGithubModalOpen,
        setIsGithubModalOpen,
        apiRepositories,
        isLoadingRepos,
        githubAccount,
        isGithubConnected,
        refreshRepositories,
        selectRepository,
        scanMode,
        setScanMode,
        syncWithRepository,
      }}
    >
      {children}
    </ApiSecurityContext.Provider>
  );
}

export function useApiSecurity() {
  const context = useContext(ApiSecurityContext);
  if (!context) {
    throw new Error('useApiSecurity must be used within ApiSecurityProvider');
  }
  return context;
}
