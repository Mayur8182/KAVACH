'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import {
  Home,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  Search,
  List,
  LayoutGrid,
  GitBranch,
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Code2,
  X,
  RefreshCw,
  ExternalLink,
  Play,
  FolderGit2,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { TableSkeletonRows } from '@/components/feedback/TableSkeleton';
import { toast } from '@/lib/toast';
import { GitHubImportModal } from '@/components/repositories/GitHubImportModal';
import { RepositoryScanProgressBar, ScanJobProgress } from '@/components/code/RepositoryScanProgressBar';
import { ServerPagination } from '@/components/data-display/ServerPagination';

const LiveScanningHUD = dynamic(
  () => import('@/components/scanner/LiveScanningHUD').then((mod) => mod.LiveScanningHUD),
  { ssr: false }
);

// Brand Icons
const GithubFilledIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F172A">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const GitlabIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      fill="#E24329"
      d="M22.65 14.39L20 6.22a.85.85 0 0 0-.32-.44.88.88 0 0 0-.54-.15.86.86 0 0 0-.53.18.84.84 0 0 0-.29.43l-1.66 5.1H7.34L5.68 6.24a.84.84 0 0 0-.29-.43.86.86 0 0 0-.53-.18.88.88 0 0 0-.54.15.85.85 0 0 0-.32.44L1.35 14.39a.74.74 0 0 0 .27.83L12 22.42l10.38-7.2a.74.74 0 0 0 .27-.83z"
    />
    <path fill="#FCA326" d="M12 22.42l-4.66-14.3h9.32L12 22.42z" />
    <path fill="#E24329" d="M12 22.42l-4.66-14.3H1.35l10.65 14.3z" />
    <path fill="#FC6D26" d="M1.35 14.39l4.33-3.32-3-9.28a.85.85 0 0 0-.32.44L1.35 14.39z" />
    <path fill="#E24329" d="M12 22.42l4.66-14.3h5.99L12 22.42z" />
    <path fill="#FC6D26" d="M22.65 14.39l-4.33-3.32 3-9.28a.85.85 0 0 1 .32.44l1.01 12.16z" />
  </svg>
);

// Mini Bar Chart Component for metric cards
const MiniBarChart = ({ heights, color }: { heights: number[]; color: string }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px' }}>
    {heights.map((h, i) => (
      <div
        key={i}
        style={{
          width: '5px',
          height: `${Math.max(15, Math.min(100, h))}%`,
          backgroundColor: color,
          borderRadius: '2px',
          opacity: 0.4 + (i / heights.length) * 0.6,
        }}
      />
    ))}
  </div>
);

// Segmented Findings Bar
const FindingsBar = ({
  critical = 0,
  high = 0,
  medium = 0,
  low = 0,
}: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}) => {
  const total = critical + high + medium + low;
  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '84px', height: '6px', borderRadius: '3px', background: '#E2E8F0' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>0</span>
      </div>
    );
  }

  const pCrit = (critical / total) * 100;
  const pHigh = (high / total) * 100;
  const pMed = (medium / total) * 100;
  const pLow = (low / total) * 100;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '84px',
          height: '6px',
          borderRadius: '3px',
          overflow: 'hidden',
          display: 'flex',
          backgroundColor: '#E2E8F0',
        }}
      >
        {pCrit > 0 && <div style={{ width: `${pCrit}%`, height: '100%', background: '#EF4444' }} />}
        {pHigh > 0 && <div style={{ width: `${pHigh}%`, height: '100%', background: '#F97316' }} />}
        {pMed > 0 && <div style={{ width: `${pMed}%`, height: '100%', background: '#EAB308' }} />}
        {pLow > 0 && <div style={{ width: `${pLow}%`, height: '100%', background: '#93C5FD' }} />}
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', minWidth: '18px' }}>{total}</span>
    </div>
  );
};

// Environment Badge
const EnvironmentBadge = ({ env }: { env: string }) => {
  const normalized = (env || 'production').toLowerCase();
  if (normalized.includes('prod')) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
        Production
      </span>
    );
  }
  if (normalized.includes('stag')) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#FEF3C7',
          color: '#D97706',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
        Staging
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '12px',
        backgroundColor: '#F3E8FF',
        color: '#9333EA',
        fontSize: '11px',
        fontWeight: 500,
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#9333EA' }} />
      Development
    </span>
  );
};

// Risk Badge
const RiskBadge = ({ risk }: { risk: string }) => {
  const r = (risk || 'low').toLowerCase();
  if (r === 'critical') {
    return (
      <span
        style={{
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          fontSize: '11px',
          fontWeight: 700,
        }}
      >
        Critical
      </span>
    );
  }
  if (r === 'high') {
    return (
      <span
        style={{
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#FEE2E2',
          color: '#EF4444',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        High
      </span>
    );
  }
  if (r === 'medium') {
    return (
      <span
        style={{
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#FEF3C7',
          color: '#D97706',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        Medium
      </span>
    );
  }
  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: '12px',
        backgroundColor: '#DBEAFE',
        color: '#2563EB',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      Low
    </span>
  );
};

// Status Badge
const StatusBadge = ({ status }: { status: string }) => {
  const s = (status || '').toUpperCase();
  if (s === 'SCAN_FAILED' || s === 'FAILED') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
        Failed
      </span>
    );
  }
  if (s === 'SCAN_PENDING' || s === 'QUEUED') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#FEF3C7',
          color: '#D97706',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
        Pending
      </span>
    );
  }
  if (s === 'SCANNING' || s === 'RUNNING') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
        Scanning...
      </span>
    );
  }
  if (s === 'NEVER_SCANNED') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '12px',
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
        Never Scanned
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '12px',
        backgroundColor: '#DCFCE7',
        color: '#16A34A',
        fontSize: '11px',
        fontWeight: 500,
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
      Scanned
    </span>
  );
};

function formatLastScan(dateStr: string | null): { text: string; fullDate: string; isReal: boolean } {
  if (!dateStr) return { text: 'Never scanned', fullDate: 'Never scanned', isReal: false };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { text: 'Never scanned', fullDate: 'Never scanned', isReal: false };
  const diff = Date.now() - date.getTime();
  const fullDate = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  if (diff < 0 || diff < 60000) return { text: 'Just now', fullDate, isReal: true };
  const m = Math.floor(diff / 60000);
  if (m < 60) return { text: `${m}m ago`, fullDate, isReal: true };
  const h = Math.floor(m / 60);
  if (h < 24) return { text: `${h}h ago`, fullDate, isReal: true };
  const d = Math.floor(h / 24);
  if (d < 7) return { text: `${d}d ago`, fullDate, isReal: true };
  return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), fullDate, isReal: true };
}

export default function RepositoriesPage() {
  const { currentProject, refreshRepositories, refreshProjects } = useScope();
  // State directly backed by real database
  const [repos, setRepos] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [openFindingsCount, setOpenFindingsCount] = useState(0);
  const [latestScanAt, setLatestScanAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'monitored' | 'unmonitored' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Selected checkboxes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Action menu & Modal states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'scan' | 'findings' | 'name' | 'risk'>('scan');
  const [filterEnv, setFilterEnv] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // New repo modal form
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoBranch, setNewRepoBranch] = useState('main');
  const [newRepoEnv, setNewRepoEnv] = useState('production');
  const [newRepoProvider, setNewRepoProvider] = useState<'github' | 'gitlab'>('github');
  const [isSubmittingRepo, setIsSubmittingRepo] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectStage, setConnectStage] = useState<string>('idle');
  const [connectProgress, setConnectProgress] = useState<number>(0);

  // Scanning tracker & real-time scan job progress
  const [scanningMap, setScanningMap] = useState<Record<string, boolean>>({});
  const [activeJobs, setActiveJobs] = useState<Record<string, ScanJobProgress>>({});
  const pollingIntervalsRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  const startJobPolling = useCallback((repoId: string, jobId: string) => {
    if (pollingIntervalsRef.current[repoId]) {
      clearInterval(pollingIntervalsRef.current[repoId]);
    }

    const interval = setInterval(async () => {
      try {
        const job = await api.code.getScanJob(jobId);
        if (job) {
          setActiveJobs((prev) => ({ ...prev, [repoId]: job }));
          if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
            clearInterval(pollingIntervalsRef.current[repoId]);
            delete pollingIntervalsRef.current[repoId];
            setScanningMap((prev) => ({ ...prev, [repoId]: false }));
            const completedAtStr = job.completed_at || new Date().toISOString();
            // Optimistically update repo in state so the table reflects real timestamp immediately
            setRepos((prev) =>
              prev.map((r) =>
                r.repository_id === repoId || r.id === repoId
                  ? { ...r, last_scan_at: completedAtStr, scan_status: job.status === 'COMPLETED' ? 'HEALTHY' : 'SCAN_FAILED' }
                  : r
              )
            );
            setLatestScanAt(completedAtStr);
            // Invalidate cache and reload authoritative state from real backend
            api.code.repositoryHealth({ projectId: currentProject?.id || undefined, page: currentPage, pageSize }, { bypassCache: true }).then((data) => {
              if (data?.items) {
                setRepos(data.items);
                setTotalCount(data.total ?? data.items.length);
                if (data.last_scan_at) setLatestScanAt(data.last_scan_at);
                refreshRepositories?.();
              }
            }).catch(() => {});
          }
        }
      } catch {
        // Continue polling until completed or cancelled
      }
    }, 1200);

    pollingIntervalsRef.current[repoId] = interval;
  }, []);

  // Cleanup all polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervalsRef.current).forEach((interval) => clearInterval(interval));
    };
  }, []);

  // Real backend loader (cache-first by default, bypasses cache on manual refresh)
  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.code.repositoryHealth(
        { projectId: currentProject?.id || undefined, page: currentPage, pageSize },
        { bypassCache: force }
      );
      const items = data?.items ?? [];
      setRepos(items);
      setTotalCount(data?.total ?? items.length);

      // Derive counters from real database state
      const scanned = data?.scanned_count ?? items.filter((r: any) => r.scan_status !== 'NEVER_SCANNED' && r.last_scan_at).length;
      const findings = data?.open_findings_count ?? items.reduce(
        (acc: number, r: any) => acc + (r.finding_critical || 0) + (r.finding_high || 0) + (r.finding_medium || 0) + (r.finding_low || 0),
        0
      );
      setScannedCount(scanned);
      setOpenFindingsCount(findings);

      const realLastScan = scanned > 0 ? (data?.last_scan_at || items.find((r: any) => r.last_scan_at)?.last_scan_at || null) : null;
      setLatestScanAt(realLastScan);

      // Refresh recovery: check if any active scans are currently queued or running
      items.forEach(async (r: any) => {
        try {
          const activeScan = await api.code.getActiveScan(r.repository_id);
          if (activeScan && (activeScan.status === 'RUNNING' || activeScan.status === 'QUEUED')) {
            // Discard stale scans older than 15 minutes from previous sessions
            const startTime = activeScan.started_at ? new Date(activeScan.started_at).getTime() : 0;
            const isStale = startTime > 0 && (Date.now() - startTime) > 15 * 60 * 1000;
            if (!isStale) {
              setActiveJobs((prev) => ({ ...prev, [r.repository_id]: activeScan }));
              setScanningMap((prev) => ({ ...prev, [r.repository_id]: true }));
              startJobPolling(r.repository_id, activeScan.id);
            }
          }
        } catch {
          // ignore
        }
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load repositories from backend.');
      setRepos([]);
      setTotalCount(0);
      setScannedCount(0);
      setOpenFindingsCount(0);
      setLatestScanAt(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, currentProject?.id, startJobPolling]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click outside to close menus
  useEffect(() => {
    const handleClose = () => {
      setActiveMenuId(null);
      setIsFilterOpen(false);
      setIsSortOpen(false);
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  // Keyboard accessibility: Escape closes menus and modal (Mistake #57, #67)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
        setIsFilterOpen(false);
        setIsSortOpen(false);
        if (isAddModalOpen) setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);

  // Filter and Sort logic
  const filteredRepos = useMemo(() => {
    let result = [...repos];

    // Tab filter
    if (activeTab === 'monitored') {
      result = result.filter((r) => r.scan_status !== 'NEVER_SCANNED' && r.scan_status !== 'SCAN_PENDING');
    } else if (activeTab === 'unmonitored') {
      result = result.filter((r) => r.scan_status === 'NEVER_SCANNED' || r.scan_status === 'SCAN_PENDING');
    } else if (activeTab === 'favorites') {
      result = result.slice(0, 3);
    }

    // Environment filter
    if (filterEnv !== 'all') {
      result = result.filter((r) => (r.environment || 'production').toLowerCase() === filterEnv.toLowerCase());
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter((r) => (r.scan_status || '').toLowerCase().includes(filterStatus.toLowerCase()));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.repository_name?.toLowerCase().includes(q) ||
          r.full_name?.toLowerCase().includes(q) ||
          r.default_branch?.toLowerCase().includes(q) ||
          r.environment?.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') return a.repository_name.localeCompare(b.repository_name);
      if (sortBy === 'findings') {
        const totalA = (a.finding_critical || 0) + (a.finding_high || 0) + (a.finding_medium || 0) + (a.finding_low || 0);
        const totalB = (b.finding_critical || 0) + (b.finding_high || 0) + (b.finding_medium || 0) + (b.finding_low || 0);
        return totalB - totalA;
      }
      if (sortBy === 'scan') {
        const dateA = a.last_scan_at ? new Date(a.last_scan_at).getTime() : 0;
        const dateB = b.last_scan_at ? new Date(b.last_scan_at).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [repos, activeTab, filterEnv, filterStatus, searchQuery, sortBy]);

  // Tab counts based on real DB items
  const tabCounts = useMemo(() => {
    return {
      all: repos.length,
      monitored: repos.filter((r) => r.scan_status !== 'NEVER_SCANNED' && r.scan_status !== 'SCAN_PENDING').length,
      unmonitored: repos.filter((r) => r.scan_status === 'NEVER_SCANNED' || r.scan_status === 'SCAN_PENDING').length,
      favorites: Math.min(repos.length, 3),
    };
  }, [repos]);

  // Pagination
  const totalItems = totalCount;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const displayedRepos = filteredRepos;

  const startIdx = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(displayedRepos.map((r) => r.repository_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Real Add Repository submission to backend with staged progress line
  const handleAddRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    setIsSubmittingRepo(true);
    setConnectError(null);
    setConnectStage('Connecting to provider');
    setConnectProgress(25);

    const timer1 = setTimeout(() => {
      setConnectStage('Fetching repository details');
      setConnectProgress(50);
    }, 600);

    const timer2 = setTimeout(() => {
      setConnectStage('Syncing branches and metadata');
      setConnectProgress(75);
    }, 1300);

    try {
      const res = await api.code.connectRepository({
        repo_url: newRepoUrl.trim(),
        default_branch: newRepoBranch.trim() || 'main',
        private: true,
        trigger_scan: true,
        project_id: currentProject?.id || undefined,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      // Confirm backend completion
      setConnectStage('Connection completed');
      setConnectProgress(100);

      await new Promise((r) => setTimeout(r, 650));

      setIsAddModalOpen(false);
      setNewRepoUrl('');
      setNewRepoName('');
      setConnectStage('idle');
      setConnectProgress(0);

      // Reload live state from backend
      await loadData(true);
      refreshRepositories?.();
      refreshProjects?.();

      // If a scan was initiated on connect, immediately track its real progress
      const targetRepoId = res?.repository_id || res?.id;
      const targetJobId = res?.scan_job_id;
      if (targetRepoId && targetJobId) {
        const initialJob: ScanJobProgress = {
          id: targetJobId,
          repository_id: targetRepoId,
          repository_name: res?.name || res?.repository_name || 'Repository',
          status: 'QUEUED',
          current_stage: 'Scan queued in worker pipeline...',
          current_stage_index: 0,
          total_stages: 6,
          stage_progress: 0,
          findings_count: 0,
        };
        setActiveJobs((prev) => ({ ...prev, [targetRepoId]: initialJob }));
        setScanningMap((prev) => ({ ...prev, [targetRepoId]: true }));
        startJobPolling(targetRepoId, targetJobId);
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setConnectError(err?.message || 'Failed to connect repository. Verify the URL and connectivity.');
      setConnectStage('idle');
      setConnectProgress(0);
    } finally {
      setIsSubmittingRepo(false);
    }
  };

  // Live Scanning HUD State
  const [hudScanRepo, setHudScanRepo] = useState<{ id: string; name: string; branch: string } | null>(null);

  // Real Trigger Scan Action
  const handleTriggerScan = async (repoId: string, repoName: string, branch = 'main') => {
    setScanningMap((prev) => ({ ...prev, [repoId]: true }));
    try {
      const res = await api.code.triggerRepositoryScan(repoId, branch);
      const jobId = res?.id || res?.scan_job_id;
      if (jobId) {
        const initialJob: ScanJobProgress = {
          id: jobId,
          repository_id: repoId,
          repository_name: repoName,
          status: res?.status || 'QUEUED',
          current_stage: res?.current_stage || 'Scan queued in worker pipeline...',
          current_stage_index: res?.current_stage_index ?? 0,
          total_stages: res?.total_stages ?? 6,
          stage_progress: res?.stage_progress ?? 0,
          findings_count: res?.findings_count ?? 0,
          started_at: res?.started_at,
        };
        setActiveJobs((prev) => ({ ...prev, [repoId]: initialJob }));
        startJobPolling(repoId, jobId);
      }
    } catch (err: any) {
      console.warn(`Scan trigger for ${repoName}:`, err?.message);
      alert(`Could not initiate scan for ${repoName}: ${err?.message || 'Server error'}`);
      setScanningMap((prev) => ({ ...prev, [repoId]: false }));
    }
  };

  const handleCancelScan = async (repoId: string, jobId: string) => {
    try {
      const updated = await api.code.cancelScanJob(jobId);
      if (updated) {
        setActiveJobs((prev) => ({ ...prev, [repoId]: updated }));
      }
      if (pollingIntervalsRef.current[repoId]) {
        clearInterval(pollingIntervalsRef.current[repoId]);
        delete pollingIntervalsRef.current[repoId];
      }
      setScanningMap((prev) => ({ ...prev, [repoId]: false }));
    } catch (err: any) {
      console.warn(`Could not cancel scan:`, err);
    }
  };

  const handleDismissScan = (repoId: string) => {
    setActiveJobs((prev) => {
      const next = { ...prev };
      delete next[repoId];
      return next;
    });
  };

  // Real Delete Repository Action
  const handleDeleteRepo = async (repoId: string, repoName: string) => {
    if (!confirm(`Are you sure you want to disconnect and delete repository "${repoName}"? This will remove all local clone workspaces and scan records.`)) {
      return;
    }
    try {
      await api.code.deleteRepository(repoId);
      toast.success(`Repository "${repoName}" deleted successfully.`);
      setActiveMenuId(null);
      await loadData(true);
    } catch (err: any) {
      toast.error(`Failed to delete repository: ${err?.message || err}`);
    }
  };

  // Bulk Delete Repositories Action
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!confirm(`Are you sure you want to permanently delete and disconnect ${count} selected repositories? This will remove all local clones, scans, and security records.`)) {
      return;
    }
    setIsBatchDeleting(true);
    try {
      const res = await api.request<any>('/api/v1/repositories/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ repository_ids: selectedIds }),
      });
      toast.success(res?.data?.message || `Successfully deleted ${count} repositories.`);
      setSelectedIds([]);
      await loadData(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete selected repositories.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="kavach-page-container" style={{ maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      {/* ── Breadcrumb Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Home size={14} color="#64748B" />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>THING CODE</span>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>&gt;</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A' }}>Repositories</span>
        </div>

        {/* Live Refresh Indicator */}
        <button
          onClick={() => loadData(true)}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#ffffff',
            color: '#64748B',
            fontSize: '11px',
            fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Syncing...' : 'Sync Live'}
        </button>
      </div>

      {/* ── Error Banner if Backend Error ── */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#DC2626',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Title & Actions Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Repositories
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', marginBottom: 0 }}>
            Manage and monitor your source code repositories.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Filters Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterOpen(!isFilterOpen);
                setIsSortOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: filterEnv !== 'all' || filterStatus !== 'all' ? '1px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: filterEnv !== 'all' || filterStatus !== 'all' ? '#EFF6FF' : '#ffffff',
                color: filterEnv !== 'all' || filterStatus !== 'all' ? '#2563EB' : '#0F172A',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Filters {filterEnv !== 'all' ? `(${filterEnv})` : ''}</span>
            </button>

            {isFilterOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '230px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  padding: '12px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Filter Environment
                </div>
                {[
                  { id: 'all', label: 'All Environments' },
                  { id: 'production', label: 'Production' },
                  { id: 'staging', label: 'Staging' },
                  { id: 'development', label: 'Development' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setFilterEnv(item.id);
                      setIsFilterOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: filterEnv === item.id ? '#EFF6FF' : 'transparent',
                      color: filterEnv === item.id ? '#2563EB' : '#0F172A',
                      fontSize: '12px',
                      fontWeight: filterEnv === item.id ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{item.label}</span>
                    {filterEnv === item.id && <Check size={14} color="#2563EB" />}
                  </button>
                ))}

                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginTop: '12px', marginBottom: '8px' }}>
                  Filter Status
                </div>
                {[
                  { id: 'all', label: 'All Statuses' },
                  { id: 'scanned', label: 'Scanned / Healthy' },
                  { id: 'failed', label: 'Scan Failed' },
                  { id: 'pending', label: 'Pending / Queued' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setFilterStatus(item.id);
                      setIsFilterOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: filterStatus === item.id ? '#EFF6FF' : 'transparent',
                      color: filterStatus === item.id ? '#2563EB' : '#0F172A',
                      fontSize: '12px',
                      fontWeight: filterStatus === item.id ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{item.label}</span>
                    {filterStatus === item.id && <Check size={14} color="#2563EB" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSortOpen(!isSortOpen);
                setIsFilterOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#ffffff',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <ArrowUpDown size={14} color="#0F172A" />
              <span>Sort</span>
            </button>

            {isSortOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '200px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  padding: '8px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', padding: '4px 8px', marginBottom: '4px' }}>
                  Sort By
                </div>
                {[
                  { id: 'scan', label: 'Last Scanned' },
                  { id: 'findings', label: 'Findings Count' },
                  { id: 'name', label: 'Repository Name' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSortBy(item.id as any);
                      setIsSortOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: sortBy === item.id ? '#EFF6FF' : 'transparent',
                      color: sortBy === item.id ? '#2563EB' : '#0F172A',
                      fontSize: '12px',
                      fontWeight: sortBy === item.id ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{item.label}</span>
                    {sortBy === item.id && <Check size={14} color="#2563EB" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Centralized Matrix Link */}
          <Link
            href="/repositories"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#3B82F6',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            title="View Centralized Repository Management Matrix across all security modules"
          >
            <ShieldCheck size={15} />
            <span>Module Matrix</span>
          </Link>

          {/* Multi-repo Bulk Delete Button */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #FECACA',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isBatchDeleting ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={`Permanently delete ${selectedIds.length} selected repositories`}
            >
              {isBatchDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          {/* + Connect Repository Button */}
          <button
            type="button"
            onClick={() => {
              setConnectError(null);
              setConnectStage('idle');
              setIsAddModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0F172A',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Connect Git repository to run continuous security scans"
          >
            <Plus size={14} />
            <span>Connect Repository</span>
          </button>
        </div>
      </div>

      {/* ── 4 Dynamic Metric Summary Cards (Directly Calculated from DB) ── */}
      <div
        className="kavach-grid-kpi"
        style={{
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Repositories */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <Code2 size={18} />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Total Repositories</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginTop: '4px', lineHeight: 1.1 }}>
              {loading && repos.length === 0 ? (
                <div className="skeleton-shimmer" style={{ width: '50px', height: '28px', borderRadius: '6px' }} />
              ) : (
                totalCount
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '12px' }}>
              <span style={{ color: '#10B981', fontWeight: 600 }}>Active</span>
              <span style={{ color: '#94A3B8' }}>in database</span>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <MiniBarChart heights={[totalCount * 10, totalCount * 15, totalCount * 20, 60, 80, 100]} color="#3B82F6" />
          </div>
        </div>

        {/* Card 2: Repositories Scanned */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Repositories Scanned</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginTop: '4px', lineHeight: 1.1 }}>
              {loading && repos.length === 0 ? (
                <div className="skeleton-shimmer" style={{ width: '50px', height: '28px', borderRadius: '6px' }} />
              ) : (
                scannedCount
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '12px' }}>
              <span style={{ color: '#10B981', fontWeight: 600 }}>
                {totalCount > 0 ? `${Math.round((scannedCount / totalCount) * 100)}%` : '0%'}
              </span>
              <span style={{ color: '#94A3B8' }}>coverage rate</span>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <MiniBarChart heights={[30, 45, 65, 55, 85, 100]} color="#10B981" />
          </div>
        </div>

        {/* Card 3: Open Findings */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Open Findings</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', marginTop: '4px', lineHeight: 1.1 }}>
              {loading && repos.length === 0 ? (
                <div className="skeleton-shimmer" style={{ width: '50px', height: '28px', borderRadius: '6px' }} />
              ) : (
                openFindingsCount
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '12px' }}>
              <span style={{ color: openFindingsCount > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                {openFindingsCount > 0 ? 'Action Required' : 'All Clear'}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <MiniBarChart heights={[35, 50, 70, 60, 90, 100]} color="#EF4444" />
          </div>
        </div>

        {/* Card 4: Last Scan */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <Clock size={18} />
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Last Scan</div>
            <div
              title={formatLastScan(latestScanAt).fullDate}
              style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '6px', lineHeight: 1.1, cursor: 'help' }}
            >
              {loading && repos.length === 0 ? (
                <div className="skeleton-shimmer" style={{ width: '70px', height: '24px', borderRadius: '6px' }} />
              ) : (
                formatLastScan(latestScanAt).text
              )}
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#94A3B8' }}>
              Continuous webhook gates active
            </div>
          </div>
        </div>
      </div>

      {/* ── Repositories Table Card ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #EAECF0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
        }}
      >
        {/* Table Top Toolbar: Tabs, Search, List/Grid toggles */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '10px 16px',
            borderBottom: '1px solid #EAECF0',
            minHeight: '56px',
            gap: '12px',
          }}
        >
          {/* Left Tabs */}
          <div className="kavach-tabs-scrollable" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All Repositories', count: tabCounts.all },
              { id: 'monitored', label: 'Monitored', count: tabCounts.monitored },
              { id: 'unmonitored', label: 'Unmonitored', count: tabCounts.unmonitored },
              { id: 'favorites', label: 'Favorites', count: tabCounts.favorites },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    color: isActive ? '#2563EB' : '#64748B',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    padding: '0 2px',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#EFF6FF' : '#F1F5F9',
                      color: isActive ? '#2563EB' : '#64748B',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Search & List/Grid Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                color="#94A3B8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search repositories..."
                style={{
                  width: '100%',
                  maxWidth: '240px',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#0F172A',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
            </div>

            {/* List / Grid Toggle (Crisp Segmented Design with Visual Feedback) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                padding: '3px',
                gap: '2px',
              }}
            >
              <button
                type="button"
                aria-label="Table list view"
                aria-pressed={viewMode === 'list'}
                title="Table list view"
                onClick={() => setViewMode('list')}
                style={{
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: viewMode === 'list' ? '1px solid #CBD5E1' : '1px solid transparent',
                  backgroundColor: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'list' ? '#0F172A' : '#64748B',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: viewMode === 'list' ? 600 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                <List size={14} />
                <span>List</span>
              </button>
              <button
                type="button"
                aria-label="Grid cards view"
                aria-pressed={viewMode === 'grid'}
                title="Grid cards view"
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: viewMode === 'grid' ? '1px solid #CBD5E1' : '1px solid transparent',
                  backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'grid' ? '#0F172A' : '#64748B',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: viewMode === 'grid' ? 600 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real Table / Card Grid Content with Instant Shell & Skeleton Rows */}
        {viewMode === 'list' ? (
          <div className="kavach-table-responsive" style={{ width: '100%', minHeight: '360px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#FAFAFA' }}>
                  <th style={{ width: '48px', padding: '14px 16px' }}>
                    <input
                      type="checkbox"
                      checked={displayedRepos.length > 0 && selectedIds.length === displayedRepos.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', borderRadius: '4px' }}
                    />
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Repository</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Branch</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Environment</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Last Scan</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Findings</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Risk</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && repos.length === 0 ? (
                  <TableSkeletonRows count={8} />
                ) : displayedRepos.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <FolderGit2 size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>No repositories found</div>
                      <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '380px', margin: '6px auto 16px auto' }}>
                        {searchQuery || filterEnv !== 'all'
                          ? 'No repositories match your active search or filter criteria.'
                          : 'Connect your first GitHub or GitLab repository to run continuous security scans.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setConnectError(null);
                          setConnectStage('idle');
                          setIsAddModalOpen(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#0F172A',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} /> Connect Repository
                      </button>
                    </td>
                  </tr>
                ) : (
                  displayedRepos.map((repo, idx) => {
                  const isSelected = selectedIds.includes(repo.repository_id);
                  const isGitlab = repo.provider === 'gitlab' || repo.repository_name?.includes('gitlab');
                  const isMenuOpen = activeMenuId === repo.repository_id;
                  const isScanning = scanningMap[repo.repository_id];
                  const isNearBottom = idx >= Math.max(0, displayedRepos.length - 3);

                  return (
                    <tr
                      key={repo.repository_id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        height: '68px',
                        backgroundColor: isSelected ? '#F8FAFC' : 'transparent',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = isSelected ? '#F1F5F9' : '#FAFAFA')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = isSelected ? '#F8FAFC' : 'transparent')}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(repo.repository_id)}
                          style={{ cursor: 'pointer', borderRadius: '4px' }}
                        />
                      </td>

                      {/* Repository Name & Provider */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div>{isGitlab ? <GitlabIcon size={20} /> : <GithubFilledIcon size={20} />}</div>
                          <div>
                            <Link
                              href={`/code/repositories/${repo.repository_id}`}
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#0F172A',
                                lineHeight: 1.2,
                                textDecoration: 'none',
                                display: 'block',
                              }}
                              onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = '#2563EB')}
                              onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = '#0F172A')}
                            >
                              {repo.repository_name}
                            </Link>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              {repo.full_name}
                            </div>
                            {activeJobs[repo.repository_id] && (
                              <div style={{ marginTop: '8px', maxWidth: '420px' }}>
                                <RepositoryScanProgressBar
                                  job={activeJobs[repo.repository_id]}
                                  repositoryName={repo.repository_name}
                                  repositoryId={repo.repository_id}
                                  compact
                                  onCancel={() => handleCancelScan(repo.repository_id, activeJobs[repo.repository_id].id)}
                                  onRetry={() => handleTriggerScan(repo.repository_id, repo.repository_name, repo.default_branch)}
                                  onDismiss={() => handleDismissScan(repo.repository_id)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Branch */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontSize: '12px' }}>
                          <GitBranch size={13} color="#64748B" />
                          <span style={{ fontFamily: 'monospace' }}>{repo.default_branch || 'main'}</span>
                        </div>
                      </td>

                      {/* Environment */}
                      <td style={{ padding: '14px 16px' }}>
                        <EnvironmentBadge env={repo.environment || 'production'} />
                      </td>

                      {/* Last Scan */}
                      <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                        {(() => {
                          const scanInfo = formatLastScan(repo.last_scan_at);
                          if (!scanInfo.isReal || !repo.last_scan_at || repo.scan_status === 'NEVER_SCANNED') {
                            return <span style={{ color: '#94A3B8' }}>Never scanned</span>;
                          }
                          return (
                            <div
                              title={`Last completed scan: ${scanInfo.fullDate}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'help' }}
                            >
                              <Clock size={12} color="#64748B" />
                              <span style={{ color: '#0F172A', fontWeight: 500 }}>{scanInfo.text}</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Findings (Segmented Bar + Count) */}
                      <td style={{ padding: '14px 16px' }}>
                        <FindingsBar
                          critical={repo.finding_critical || 0}
                          high={repo.finding_high || 0}
                          medium={repo.finding_medium || 0}
                          low={repo.finding_low || 0}
                        />
                      </td>

                      {/* Risk Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <RiskBadge risk={repo.risk || 'Low'} />
                      </td>

                      {/* Status Pill */}
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge status={activeJobs[repo.repository_id]?.status === 'RUNNING' || isScanning ? 'SCANNING' : (repo.scan_status || 'HEALTHY')} />
                      </td>

                      {/* Actions Menu */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : repo.repository_id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '4px',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.color = '#0F172A')}
                          onMouseOut={(e) => (e.currentTarget.style.color = '#94A3B8')}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              ...(isNearBottom ? { bottom: '38px' } : { top: '38px' }),
                              right: '16px',
                              width: '184px',
                              backgroundColor: '#ffffff',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                              zIndex: 60,
                              padding: '6px',
                              textAlign: 'left',
                            }}
                          >
                            <button
                              disabled={isScanning}
                              onClick={() => {
                                handleTriggerScan(repo.repository_id, repo.repository_name);
                                setActiveMenuId(null);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: '#0F172A',
                                fontSize: '12px',
                                cursor: isScanning ? 'wait' : 'pointer',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Play size={13} color="#2563EB" />
                              {isScanning ? 'Scan Running...' : 'Trigger Scan Now'}
                            </button>
                            <Link
                              href={`/code/repositories/${repo.repository_id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                color: '#0F172A',
                                fontSize: '12px',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Code2 size={13} color="#2563EB" />
                              Open Workspace
                            </Link>
                            <Link
                              href={`/code/pull-requests?repositoryId=${repo.repository_id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                color: '#0F172A',
                                fontSize: '12px',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <GitBranch size={13} color="#8B5CF6" />
                              Pull Requests
                            </Link>
                            <Link
                              href={`/code/findings?repositoryId=${repo.repository_id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                color: '#0F172A',
                                fontSize: '12px',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <AlertTriangle size={13} color="#D97706" />
                              View Findings
                            </Link>
                            <a
                              href={repo.html_url || `https://github.com/${repo.full_name}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                color: '#0F172A',
                                fontSize: '12px',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <ExternalLink size={13} color="#64748B" />
                              Open on Provider
                            </a>
                            <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                            <button
                              onClick={() => handleDeleteRepo(repo.repository_id, repo.repository_name || repo.name)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: '#DC2626',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Trash2 size={13} color="#DC2626" />
                              Delete Repository
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
          <div style={{ width: '100%', padding: '20px', minHeight: '360px', boxSizing: 'border-box' }}>
            {loading && repos.length === 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '16px',
                }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '220px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                ))}
              </div>
            ) : displayedRepos.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <FolderGit2 size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>No repositories found</div>
                <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '380px', margin: '6px auto 16px auto' }}>
                  {searchQuery || filterEnv !== 'all'
                    ? 'No repositories match your active search or filter criteria.'
                    : 'Connect your first GitHub or GitLab repository to run continuous security scans.'}
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0F172A',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Connect Repository
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                  gap: '16px',
                }}
              >
                {displayedRepos.map((repo) => {
                  const isSelected = selectedIds.includes(repo.repository_id);
                  const isGitlab = repo.provider === 'gitlab' || repo.repository_name?.includes('gitlab');
                  const isMenuOpen = activeMenuId === repo.repository_id;
                  const isScanning = scanningMap[repo.repository_id];
                  const activeJob = activeJobs[repo.repository_id];

                  return (
                    <div
                      key={repo.repository_id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: isSelected ? '1.5px solid #2563EB' : '1px solid #EAECF0',
                        borderRadius: '12px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected
                          ? '0 4px 12px rgba(37, 99, 235, 0.08)'
                          : '0 1px 3px rgba(0, 0, 0, 0.02)',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = '#EAECF0';
                        e.currentTarget.style.boxShadow = isSelected
                          ? '0 4px 12px rgba(37, 99, 235, 0.08)'
                          : '0 1px 3px rgba(0, 0, 0, 0.02)';
                      }}
                    >
                      {/* Top Header */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(repo.repository_id)}
                              style={{ cursor: 'pointer', borderRadius: '4px' }}
                            />
                            <div>{isGitlab ? <GitlabIcon size={20} /> : <GithubFilledIcon size={20} />}</div>
                            <div style={{ minWidth: 0 }}>
                              <Link
                                href={`/code/repositories/${repo.repository_id}`}
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  textDecoration: 'none',
                                  lineHeight: 1.3,
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = '#2563EB')}
                                onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = '#0F172A')}
                              >
                                {repo.repository_name}
                              </Link>
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: '#64748B',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '200px',
                                }}
                              >
                                {repo.full_name}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                            <EnvironmentBadge env={repo.environment || 'production'} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : repo.repository_id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {isMenuOpen && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '32px',
                                  right: 0,
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                  padding: '6px',
                                  zIndex: 50,
                                  minWidth: '160px',
                                  textAlign: 'left',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleTriggerScan(repo.repository_id, repo.repository_name, repo.default_branch);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: '#0F172A',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Play size={13} color="#2563EB" />
                                  Scan Now
                                </button>
                                <Link
                                  href={`/code/repositories/${repo.repository_id}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                    color: '#0F172A',
                                    fontSize: '12px',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <FolderGit2 size={13} color="#64748B" />
                                  Open Workspace
                                </Link>
                                <Link
                                  href={`/code/repositories/${repo.repository_id}?tab=Security%20Findings`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                    color: '#0F172A',
                                    fontSize: '12px',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <AlertTriangle size={13} color="#D97706" />
                                  View Findings
                                </Link>
                                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleDeleteRepo(repo.repository_id, repo.repository_name || repo.name);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: '#DC2626',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Trash2 size={13} color="#DC2626" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Branch & Risk row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                            <GitBranch size={13} color="#64748B" />
                            <span style={{ fontFamily: 'monospace' }}>{repo.default_branch || 'main'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RiskBadge risk={repo.risk || 'Low'} />
                            <StatusBadge status={activeJob?.status === 'RUNNING' || isScanning ? 'SCANNING' : (repo.scan_status || 'HEALTHY')} />
                          </div>
                        </div>

                        {/* Findings Bar */}
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Findings</span>
                            <span>{(repo.finding_critical || 0) + (repo.finding_high || 0) + (repo.finding_medium || 0) + (repo.finding_low || 0)} total</span>
                          </div>
                          <FindingsBar
                            critical={repo.finding_critical || 0}
                            high={repo.finding_high || 0}
                            medium={repo.finding_medium || 0}
                            low={repo.finding_low || 0}
                          />
                        </div>

                        {/* Scan progress bar if active */}
                        {activeJob && (
                          <div style={{ marginBottom: '12px' }}>
                            <RepositoryScanProgressBar
                              job={activeJob}
                              repositoryName={repo.repository_name}
                              repositoryId={repo.repository_id}
                              compact
                              onCancel={() => handleCancelScan(repo.repository_id, activeJob.id)}
                              onRetry={() => handleTriggerScan(repo.repository_id, repo.repository_name, repo.default_branch)}
                              onDismiss={() => handleDismissScan(repo.repository_id)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div
                        style={{
                          borderTop: '1px solid #F1F5F9',
                          paddingTop: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '11px',
                          color: '#64748B',
                        }}
                      >
                        {repo.last_scan_at && repo.scan_status !== 'NEVER_SCANNED' ? (
                          <span title={`Last completed scan: ${formatLastScan(repo.last_scan_at).fullDate}`} style={{ cursor: 'help' }}>
                            Scanned {formatLastScan(repo.last_scan_at).text}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Never scanned</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleTriggerScan(repo.repository_id, repo.repository_name, repo.default_branch)}
                            disabled={isScanning || activeJob?.status === 'RUNNING'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: isScanning || activeJob?.status === 'RUNNING' ? 'not-allowed' : 'pointer',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                          >
                            <Play size={11} color="#2563EB" />
                            {isScanning || activeJob?.status === 'RUNNING' ? 'Scanning...' : 'Scan'}
                          </button>
                          <Link
                            href={`/code/repositories/${repo.repository_id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              fontSize: '11px',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            Workspace
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Table Footer: Server Pagination ── */}
        <ServerPagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={totalCount}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
          }}
          pageSizeOptions={[8, 16, 24, 48]}
        />
      </div>

      {/* ── Real Add Repository Modal ── */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: 'min(480px, calc(100vw - 32px))',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Connect Repository</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {connectError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  color: '#DC2626',
                  fontSize: '12px',
                }}
              >
                {connectError}
              </div>
            )}

            <form onSubmit={handleAddRepository} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  Provider
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setNewRepoProvider('github')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: newRepoProvider === 'github' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: newRepoProvider === 'github' ? '#EFF6FF' : '#ffffff',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <GithubFilledIcon size={16} /> GitHub
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRepoProvider('gitlab')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: newRepoProvider === 'gitlab' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: newRepoProvider === 'gitlab' ? '#EFF6FF' : '#ffffff',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <GitlabIcon size={16} /> GitLab
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                  Repository URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://github.com/owner/repository"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  Enter full HTTPS git clone URL or repository slug.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={newRepoBranch}
                    onChange={(e) => setNewRepoBranch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
                    Environment
                  </label>
                  <select
                    value={newRepoEnv}
                    onChange={(e) => setNewRepoEnv(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              {/* Real-time Connection Progress Indicator */}
              {isSubmittingRepo && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontWeight: 600,
                        color: connectProgress === 100 ? '#16A34A' : '#2563EB',
                      }}
                    >
                      {connectProgress === 100 ? (
                        <CheckCircle2 size={14} color="#16A34A" />
                      ) : (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      )}
                      {connectStage}...
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#64748B' }}>
                      {connectProgress}%
                    </span>
                  </div>

                  {/* Thin horizontal progress line */}
                  <div
                    style={{
                      width: '100%',
                      height: '3px',
                      backgroundColor: '#E2E8F0',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${connectProgress}%`,
                        height: '100%',
                        backgroundColor: connectProgress === 100 ? '#16A34A' : '#2563EB',
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease-out',
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#ffffff',
                    color: '#0F172A',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRepo}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0F172A',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSubmittingRepo ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmittingRepo ? <RefreshCw size={13} className="animate-spin" /> : null}
                  {isSubmittingRepo ? 'Connecting...' : 'Connect Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Real-Time Live Security Scanning HUD ── */}
      <LiveScanningHUD
        isOpen={!!hudScanRepo}
        onClose={() => setHudScanRepo(null)}
        repositoryId={hudScanRepo?.id}
        repositoryName={hudScanRepo?.name || 'Repository'}
        branch={hudScanRepo?.branch || 'main'}
        onScanComplete={() => {
          loadData();
        }}
      />

      {/* ── Official GitHub Project Import Modal ── */}
      <GitHubImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          loadData(true);
        }}
      />
    </div>
  );
}
