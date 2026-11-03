'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

interface ApiSecurityContextType {
  apis: any[];
  selectedApi: any | null;
  setSelectedApi: (api: any) => void;
  isLoadingApis: boolean;
  refreshApis: (projectId?: string) => Promise<void>;
  overviewMetrics: any;
  refreshOverview: (projectId?: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

const ApiSecurityContext = createContext<ApiSecurityContextType | undefined>(undefined);

export function ApiSecurityProvider({ children }: { children: React.ReactNode }) {
  const { currentProject } = useScope();
  const [apis, setApis] = useState<any[]>([]);
  const [selectedApi, setSelectedApi] = useState<any | null>(null);
  const [isLoadingApis, setIsLoadingApis] = useState(false);
  const [overviewMetrics, setOverviewMetrics] = useState<any>({
    connected_apis: 0,
    endpoints_discovered: 0,
    security_analysis_count: 0,
    open_findings: 0,
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const refreshApis = useCallback(async (overrideProjectId?: string) => {
    setIsLoadingApis(true);
    try {
      const projId = overrideProjectId !== undefined ? overrideProjectId : currentProject?.id;
      const res = await api.apiSecurity.apis({ projectId: projId || undefined });
      const items = res.items || [];
      setApis(items);
      if (items.length > 0 && (!selectedApi || !items.some(i => i.id === selectedApi.id))) {
        setSelectedApi(items[0]);
      } else if (items.length === 0) {
        setSelectedApi(null);
      }
    } catch (err) {
      console.error('Failed to load APIs:', err);
    } finally {
      setIsLoadingApis(false);
    }
  }, [currentProject?.id, selectedApi]);

  const refreshOverview = useCallback(async (overrideProjectId?: string) => {
    try {
      const projId = overrideProjectId !== undefined ? overrideProjectId : currentProject?.id;
      const res = await api.apiSecurity.overview(projId || undefined);
      setOverviewMetrics(res);
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    refreshApis();
    refreshOverview();
  }, [currentProject?.id]);

  return (
    <ApiSecurityContext.Provider
      value={{
        apis,
        selectedApi,
        setSelectedApi,
        isLoadingApis,
        refreshApis,
        overviewMetrics,
        refreshOverview,
        isAddModalOpen,
        setIsAddModalOpen,
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
