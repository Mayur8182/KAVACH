'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

interface RepositoryOption {
  id: string;
  name: string;
  full_name: string;
  default_branch: string;
}

interface OverviewContextType {
  repository: string;
  setRepository: (repo: string) => void;
  branch: string;
  setBranch: (b: string) => void;
  dateRange: string;
  setDateRange: (dr: string) => void;
  repositories: RepositoryOption[];
  branches: string[];
  refreshKey: number;
  triggerRefresh: () => void;
  isStartScanOpen: boolean;
  setIsStartScanOpen: (open: boolean) => void;
  isScanPrOpen: boolean;
  setIsScanPrOpen: (open: boolean) => void;
  isScheduleScanOpen: boolean;
  setIsScheduleScanOpen: (open: boolean) => void;
}

const OverviewContext = createContext<OverviewContextType | null>(null);

export const OverviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repository, setRepository] = useState<string>('all');
  const [branch, setBranch] = useState<string>('main');
  const [dateRange, setDateRange] = useState<string>('Last 30 days');
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [branches, setBranches] = useState<string[]>(['main']);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Modals
  const [isStartScanOpen, setIsStartScanOpen] = useState(false);
  const [isScanPrOpen, setIsScanPrOpen] = useState(false);
  const [isScheduleScanOpen, setIsScheduleScanOpen] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch repositories
  useEffect(() => {
    let isMounted = true;
    api.sast.repositories()
      .then((repos) => {
        if (isMounted && Array.isArray(repos)) {
          setRepositories(repos);
        }
      })
      .catch(() => {
        if (isMounted) setRepositories([]);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Fetch branches when repository changes
  useEffect(() => {
    let isMounted = true;
    if (repository && repository !== 'all') {
      api.sast.branches(repository)
        .then((bList) => {
          if (isMounted && Array.isArray(bList) && bList.length > 0) {
            setBranches(bList);
            if (!bList.includes(branch)) {
              setBranch(bList[0]);
            }
          }
        })
        .catch(() => {
          if (isMounted) setBranches(['main']);
        });
    } else {
      setBranches(['main', 'develop', 'release']);
    }
    return () => {
      isMounted = false;
    };
  }, [repository, branch]);

  // Dynamic poller when background scans are running or queued
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const pollScans = async () => {
      try {
        const res = await api.sast.scans();
        const hasActive = res?.items?.some((s: any) => s.status === 'Running' || s.status === 'Queued');
        if (hasActive && isMounted) {
          timer = setTimeout(() => {
            if (isMounted) {
              triggerRefresh();
              pollScans();
            }
          }, 3500);
        }
      } catch (err) {
        // quiet catch
      }
    };

    pollScans();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [refreshKey, triggerRefresh]);

  return (
    <OverviewContext.Provider
      value={{
        repository,
        setRepository,
        branch,
        setBranch,
        dateRange,
        setDateRange,
        repositories,
        branches,
        refreshKey,
        triggerRefresh,
        isStartScanOpen,
        setIsStartScanOpen,
        isScanPrOpen,
        setIsScanPrOpen,
        isScheduleScanOpen,
        setIsScheduleScanOpen,
      }}
    >
      {children}
    </OverviewContext.Provider>
  );
};

export function useOverview() {
  const ctx = useContext(OverviewContext);
  if (!ctx) {
    throw new Error('useOverview must be used within an OverviewProvider');
  }
  return ctx;
}
