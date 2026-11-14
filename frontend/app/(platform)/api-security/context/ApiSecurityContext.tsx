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
  }, [refreshApis, refreshOverview]);

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
