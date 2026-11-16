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

const matchRepoAndApi = (repo: any, apiTarget: any) => {
  if (!repo || !apiTarget) return false;
  const rName = (repo.name || '').trim().toLowerCase();
  const rFull = (repo.full_name || '').trim().toLowerCase();
  const aRepo = (apiTarget.repository || '').trim().toLowerCase();
  const aName = (apiTarget.name || '').trim().toLowerCase();
  const aCleanName = aName.replace(' code inventory', '').trim();

  return (
    (aRepo && (aRepo === rFull || aRepo === rName || aRepo.endsWith('/' + rName))) ||
    aCleanName === rName ||
    aName === rName ||
    aName.startsWith(rName + ' ') ||
    (rName && aName.includes(rName))
  );
};

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
      const res = await api.apiSecurity.apis({ limit: 100 });
      const items = res?.items || [];
      setApis(items);

      if (items.length > 0) {
        setSelectedApi((prevSelected: any) => {
          // If currentRepository matches an API target, prefer that one
          if (currentRepository) {
            const matched = items.find((a: any) => matchRepoAndApi(currentRepository, a));
            if (matched) return matched;
          }
          // If savedApiId in localStorage matches, restore it
          const savedApiId = typeof window !== 'undefined' ? localStorage.getItem('secu_active_api_id') : null;
          if (savedApiId) {
            const saved = items.find((a: any) => a.id === savedApiId);
            if (saved) return saved;
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
  }, [currentRepository]);

  const refreshOverview = useCallback(async (overrideProjectId?: string) => {
    try {
      const res = await api.apiSecurity.overview();
      if (res) {
        setOverviewMetrics(res);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  }, []);

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
      let currentItems = apis;

      // 1. Check if an API target already exists with matching id or name in current state
      if (repo.api_target_id) {
        targetToSelect = currentItems.find((a: any) => a.id === repo.api_target_id);
      }
      if (!targetToSelect) {
        targetToSelect = currentItems.find((a: any) => matchRepoAndApi(repo, a));
      }

      // If not found in local state, fetch fresh APIs from backend before attempting connect
      if (!targetToSelect) {
        try {
          const freshRes = await api.apiSecurity.apis({ limit: 100 });
          currentItems = freshRes?.items || [];
          setApis(currentItems);
          if (repo.api_target_id) {
            targetToSelect = currentItems.find((a: any) => a.id === repo.api_target_id);
          }
          if (!targetToSelect) {
            targetToSelect = currentItems.find((a: any) => matchRepoAndApi(repo, a));
          }
        } catch (fetchErr) {
          console.warn('Could not fetch fresh API list:', fetchErr);
        }
      }

      // 2. Only if target does not exist yet in API Security, connect & discover routes
      if (!targetToSelect) {
        try {
          const connectRes = await api.apiSecurity.connectRepository({
            repository_id: String(repo.id || repo.name),
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
        } catch (connErr) {
          console.warn('connectRepository attempt note:', connErr);
        }
      }

      // 3. Refresh APIs list to keep in sync
      const res = await api.apiSecurity.apis({ limit: 100 }).catch(() => ({ items: currentItems }));
      const items = res?.items || currentItems;
      setApis(items);

      if (targetToSelect) {
        const fresh = items.find((a: any) => a.id === targetToSelect.id) || targetToSelect;
        setSelectedApi(fresh);
        if (typeof window !== 'undefined') {
          localStorage.setItem('secu_active_api_id', fresh.id);
          const cleanName = (fresh.name || repo.name || '').replace(' Code Inventory', '').trim();
          localStorage.setItem('secu_active_repo', cleanName);
        }
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
      } else if (repo.name) {
        setCurrentRepository({ id: repo.id || repo.name, name: repo.name, full_name: repo.full_name });
      }

      // 5. Notify Topbar to update active scope
      if (typeof window !== 'undefined') {
        const repoDisplayName = repo.name || (targetToSelect?.name ? targetToSelect.name.replace(' Code Inventory', '') : 'Active Target');
        window.dispatchEvent(new CustomEvent('kavach:api-target-changed', { detail: { repoName: repoDisplayName } }));
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
  }, [apis, repositories, setCurrentRepository, refreshOverview, refreshRepositories]);

  // Synchronize API Target selection with global repository scope
  const handleSetSelectedApi = useCallback((targetApi: any) => {
    setSelectedApi(targetApi);
    if (targetApi) {
      const cleanName = (targetApi.name || '').replace(' Code Inventory', '').trim();
      if (repositories && repositories.length > 0) {
        const matchingRepo = repositories.find((r: any) => matchRepoAndApi(r, targetApi));
        if (matchingRepo && (!currentRepository || currentRepository.id !== matchingRepo.id)) {
          setCurrentRepository(matchingRepo);
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kavach:api-target-changed', { detail: { repoName: cleanName } }));
      }
    }
  }, [repositories, currentRepository, setCurrentRepository]);

  // Synchronize when repository is chosen in page
  const syncWithRepository = useCallback((repo: any) => {
    if (!repo) return;
    setApis((currentApis: any[]) => {
      const matched = currentApis.find((a: any) => matchRepoAndApi(repo, a));
      if (matched) {
        setSelectedApi(matched);
        if (typeof window !== 'undefined') {
          const cleanName = (matched.name || repo.name || '').replace(' Code Inventory', '').trim();
          window.dispatchEvent(new CustomEvent('kavach:api-target-changed', { detail: { repoName: cleanName } }));
        }
      }
      return currentApis;
    });
  }, []);

  // Listen to external repository switches
  useEffect(() => {
    const handleSwitch = (e: any) => {
      const repoName = e.detail?.name;
      if (!repoName) return;
      const targetRepo = apiRepositories.find((r: any) => r.name === repoName || r.full_name === repoName) || { name: repoName };
      selectRepository(targetRepo).catch(() => {});
    };
    window.addEventListener('kavach:switch-repository', handleSwitch);
    return () => window.removeEventListener('kavach:switch-repository', handleSwitch);
  }, [apiRepositories, selectRepository]);

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
