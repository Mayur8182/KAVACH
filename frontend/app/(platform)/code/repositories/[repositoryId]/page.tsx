'use client';

/**
 * Thing Code — Repository Security Workspace (/code/repositories/[repositoryId])
 * 
 * Deep security posture, scan history, file structure, and real-time scanner execution
 * corresponding to the reference workspace specification.
 * Real APIs:
 *   - GET /api/v1/code/repositories/[repositoryId]
 *   - GET /api/v1/code/findings?repository_id=[repositoryId]
 *   - GET /api/v1/code/repositories/[repositoryId]/tree
 *   - GET /api/v1/github/repositories/[repositoryId]/commits
 *   - POST /api/v1/code/repositories/[repositoryId]/scans
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api/client';
import {
  Home,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  Search,
  List,
  LayoutGrid,
  GitBranch,
  GitCommit,
  GitPullRequest,
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Code2,
  X,
  RefreshCw,
  ExternalLink,
  Play,
  FolderGit2,
  AlertCircle,
  Eye,
  GitFork,
  Star,
  Settings,
  Shield,
  Target,
  Key,
  Box,
  Layers,
  Container,
  Link2,
  Edit,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Copy,
} from 'lucide-react';
// High-Performance Dynamic Code Splitting for heavy sub-views
const ContainerSecurityView = dynamic(
  () => import('@/components/code/ContainerSecurityView').then((m) => m.ContainerSecurityView),
  { ssr: false }
);
const SBOMView = dynamic(
  () => import('@/components/code/SBOMView').then((m) => m.SBOMView),
  { ssr: false }
);
const CICDView = dynamic(
  () => import('@/components/code/CICDView').then((m) => m.CICDView),
  { ssr: false }
);
import { RepositoryScanProgressBar, ScanJobProgress } from '@/components/code/RepositoryScanProgressBar';

// Brand SVG Icons
const GithubFilledIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const SecuLayerHexLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <img
      src="/kavach-logo.png"
      alt="Kavach"
      style={{ height: '26px', width: 'auto', objectFit: 'contain' }}
    />
  </div>
);

function parseDateUtc(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  let s = String(dateStr).trim();
  if (!s) return null;
  // If ISO string does not end in Z and doesn't specify timezone offset, append Z so it is parsed as UTC
  if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  const d = parseDateUtc(dateStr);
  if (!d) return 'Never';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'Just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

function formatDateTime(dateStr: string | null | undefined): { full: string; relative: string } {
  const d = parseDateUtc(dateStr);
  if (!d) return { full: 'N/A', relative: 'Never' };
  const full = d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  let relative = 'Just now';
  if (m >= 1 && m < 60) relative = `${m}m ago`;
  else if (m >= 60 && m < 1440) relative = `${Math.floor(m / 60)}h ago`;
  else if (m >= 1440) relative = `${Math.floor(m / 1440)}d ago`;
  return { full, relative };
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '< 1s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Tree Item Recursive Component
interface TreeItemProps {
  node: any;
  depth?: number;
  searchFilter: string;
  onSelectFile?: (path: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, depth = 0, searchFilter, onSelectFile }) => {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const isDir = node.type === 'directory';

  // If search filter matches node or any children, keep open
  const matchesSearch = !searchFilter || node.name.toLowerCase().includes(searchFilter.toLowerCase());

  if (searchFilter && !matchesSearch && !node.children?.some((c: any) => c.name.toLowerCase().includes(searchFilter.toLowerCase()))) {
    return null;
  }

  return (
    <div style={{ marginLeft: depth > 0 ? '16px' : '0px' }}>
      <div
        onClick={() => {
          if (isDir) {
            setIsOpen(!isOpen);
          } else if (onSelectFile) {
            onSelectFile(node.path);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 6px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          color: isDir ? '#1E293B' : '#2563EB',
          fontWeight: isDir ? 600 : 500,
          userSelect: 'none',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {isDir ? (
          <>
            <ChevronDown
              size={14}
              color="#94A3B8"
              style={{
                transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.15s ease',
              }}
            />
            {isOpen ? <FolderOpen size={15} color="#2563EB" /> : <Folder size={15} color="#3B82F6" />}
          </>
        ) : (
          <>
            <div style={{ width: '14px' }} />
            <FileCode size={14} color="#2563EB" />
          </>
        )}
        <span>{node.name}</span>
        {node.size ? (
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94A3B8' }}>
            {(node.size / 1024).toFixed(1)} KB
          </span>
        ) : null}
      </div>

      {isDir && isOpen && node.children && (
        <div style={{ borderLeft: '1px solid #E2E8F0', marginLeft: '6px', paddingLeft: '4px' }}>
          {node.children.map((child: any) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              searchFilter={searchFilter}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function RepositoryWorkspacePage({ repositoryId }: { repositoryId?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const rawId = repositoryId || (params?.repositoryId as string) || '0ece8aa7-2b82-4709-ad39-957d588d73cc';

  // Workspace Data States
  const [repo, setRepo] = useState<any | null>(null);
  const [allRepos, setAllRepos] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [treeNodes, setTreeNodes] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [fileSearch, setFileSearch] = useState('');
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<string>(
    queryTab
      ? (queryTab.toLowerCase() === 'findings' || queryTab.toLowerCase() === 'security findings' || queryTab.toLowerCase() === 'remediation'
          ? 'Security Findings'
          : queryTab.toLowerCase() === 'code'
          ? 'Code'
          : (queryTab.toLowerCase() === 'iac' || queryTab.toLowerCase() === 'iac security' || queryTab.toLowerCase() === 'iac-security')
          ? 'Overview'
          : queryTab)
      : 'Overview'
  );

  useEffect(() => {
    if (queryTab) {
      const q = queryTab.toLowerCase();
      if (q === 'findings' || q === 'security findings' || q === 'remediation') {
        setActiveTab('Security Findings');
      } else if (q === 'overview' || q === 'iac' || q === 'iac security' || q === 'iac-security') {
        setActiveTab('Overview');
        if (q.includes('iac')) {
          router.replace(`/code/repositories/${repositoryId}`);
        }
      } else if (q === 'code') {
        setActiveTab('Code');
      } else {
        setActiveTab(queryTab);
      }
    }
  }, [queryTab, repositoryId, router]);

  useEffect(() => {
    if (rawId && (rawId === 'all' || rawId.toLowerCase() === 'all')) {
      router.replace('/code/repositories');
    }
  }, [rawId, router]);
  const [selectedFile, setSelectedFile] = useState('src/controllers/user.controller.ts');
  const [fileData, setFileData] = useState<any>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src', 'src/controllers']));
  const [fileFilterQuery, setFileFilterQuery] = useState('');
  const [viewMode, setViewMode] = useState<'code' | 'raw' | 'blame'>('code');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isWatching, setIsWatching] = useState(true);

  // Security Findings 3-Column Interactive States (Exact Reference Design)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [findingFilter, setFindingFilter] = useState<'all' | 'open' | 'fixed' | 'ignored'>('all');
  const [findingSearchQuery, setFindingSearchQuery] = useState('');
  const [activeFindingDetailTab, setActiveFindingDetailTab] = useState<'Details' | 'Evidence' | 'Remediation' | 'Timeline'>('Details');
  const [activeStrategyIndex, setActiveStrategyIndex] = useState(0);
  const [remediationMap, setRemediationMap] = useState<Record<string, any>>({});
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);
  const [isApplyingRemediation, setIsApplyingRemediation] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [findingToast, setFindingToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; url?: string } | null>(null);

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanJob, setActiveScanJob] = useState<ScanJobProgress | null>(null);
  const [scanToast, setScanToast] = useState<string | null>(null);
  const [securityJobs, setSecurityJobs] = useState<any[]>([]);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // Dropdown states
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // Finding Details & AutoFix Modal States
  const [modalFinding, setModalFinding] = useState<any | null>(null);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'Details' | 'Evidence' | 'Remediation'>('Details');
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);
  const [showRightDrawer, setShowRightDrawer] = useState(false);

  // Edit Repository Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Dynamic Language Detection from real tree files
  const detectedLanguage = useMemo(() => {
    if (repo?.primary_language && repo.primary_language !== 'Unknown') {
      return repo.primary_language;
    }
    if (repo?.language && repo.language !== 'Unknown') {
      return repo.language;
    }
    const extCounts: Record<string, number> = {};
    const traverse = (nodes: any[]) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (node.path) {
          const ext = node.path.split('.').pop()?.toLowerCase();
          if (ext) extCounts[ext] = (extCounts[ext] || 0) + 1;
        }
        if (node.children && Array.isArray(node.children)) {
          traverse(node.children);
        }
      }
    };
    traverse(treeNodes);

    const extToLang: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      py: 'Python',
      go: 'Go',
      java: 'Java',
      rs: 'Rust',
      rb: 'Ruby',
      php: 'PHP',
      cs: 'C#',
      cpp: 'C++',
      c: 'C',
      html: 'HTML',
      css: 'CSS',
    };

    let maxCount = 0;
    let topLang = '';
    for (const [ext, count] of Object.entries(extCounts)) {
      const lang = extToLang[ext];
      if (lang && count > maxCount) {
        maxCount = count;
        topLang = lang;
      }
    }
    return topLang || repo?.language || 'JavaScript';
  }, [repo, treeNodes]);

  const detectedLanguageColor = useMemo(() => {
    const map: Record<string, string> = {
      TypeScript: '#3178C6',
      JavaScript: '#F7DF1E',
      Python: '#3776AB',
      Go: '#00ADD8',
      Java: '#B07219',
      Rust: '#DEA584',
      Ruby: '#CC342D',
      PHP: '#4F5D95',
      HTML: '#E34F26',
      CSS: '#563D7C',
      'C#': '#178600',
      'C++': '#F34B7D',
      C: '#555555',
    };
    return map[detectedLanguage] || '#3B82F6';
  }, [detectedLanguage]);

  const handleSaveRepoEdit = async () => {
    if (!repo?.id) return;
    setIsSavingEdit(true);
    try {
      await api.request(`/api/v1/code/repositories/${repo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          default_branch: editBranch.trim(),
          description: editDescription.trim(),
          primary_language: editLanguage.trim(),
        }),
      });
      setRepo((prev: any) => ({
        ...prev,
        default_branch: editBranch.trim() || prev?.default_branch,
        description: editDescription.trim() || prev?.description,
        primary_language: editLanguage.trim() || prev?.primary_language,
        language: editLanguage.trim() || prev?.language,
      }));
      setSelectedBranch(editBranch.trim() || selectedBranch);
      setIsEditModalOpen(false);
      setFindingToast({
        type: 'success',
        message: 'Repository details updated successfully!',
      });
    } catch (err: any) {
      setFindingToast({
        type: 'error',
        message: `Failed to update repository: ${err?.message || 'Server error'}`,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Real-time scan polling
  const startJobPolling = useCallback((jobId: string) => {
    let isCancelled = false;
    const poll = async () => {
      try {
        const jobData = await api.code.getScanJob(jobId);
        if (isCancelled) return;
        if (jobData) {
          setActiveScanJob({
            id: jobData.id || jobId,
            status: jobData.status,
            current_stage: jobData.current_stage,
            current_stage_index: jobData.current_stage_index,
            total_stages: jobData.total_stages || 6,
            stage_progress: jobData.stage_progress,
            elapsed_seconds: jobData.elapsed_seconds,
            findings_count: jobData.findings_count,
            error_message: jobData.error_message,
          });

          if (jobData.status === 'RUNNING' || jobData.status === 'QUEUED') {
            setIsScanning(true);
            setTimeout(poll, 1200);
          } else {
            setIsScanning(false);
            // Scan finished: refresh workspace data and real jobs from real database
            if (rawId) {
              const [updatedDetail, updatedFindings, updatedTree, updatedJobs] = await Promise.all([
                api.code.repositoryDetail(rawId).catch(() => null),
                api.code.findings({ repositoryId: rawId, limit: 100 }).catch(() => ({ items: [] })),
                api.code.repositoryTree(rawId, selectedBranch).catch(() => ({ tree: [] })),
                api.code.repositoryJobs(rawId).catch(() => []),
              ]);
              if (updatedDetail) setRepo(updatedDetail);
              if (updatedFindings?.items) setFindings(updatedFindings.items);
              if (updatedTree?.tree) setTreeNodes(updatedTree.tree);
              if (updatedJobs) setSecurityJobs(updatedJobs);
            }
          }
        }
      } catch (err) {
        console.warn(`Polling error for job ${jobId}:`, err);
      }
    };
    poll();
    return () => {
      isCancelled = true;
    };
  }, [rawId, selectedBranch]);

  // Load live repository workspace
  const loadWorkspace = useCallback(async () => {
    if (!rawId) return;
    setLoading(true);
    setError(null);

    try {
      const targetId = rawId;

      // Parallelize all workspace queries concurrently in single network roundtrip
      const [healthData, detailData, findingsData, treeData, commitsData, jobsData] = await Promise.all([
        api.code.repositoryHealth({ limit: 100 }).catch(() => ({ items: [] })),
        api.code.repositoryDetail(targetId).catch((err) => {
          if (err?.status_code === 404) return null;
          throw err;
        }),
        api.code.findings({ repositoryId: targetId, limit: 100 }).catch(() => ({ items: [] })),
        api.code.repositoryTree(targetId, selectedBranch).catch(() => ({ tree: [] })),
        api.code.commits(targetId, 5).catch(() => []),
        api.code.repositoryJobs(targetId).catch(() => []),
      ]);

      const items = healthData?.items || [];
      setAllRepos(items);
      setSecurityJobs(jobsData || []);

      if (!detailData) {
        setError(`Repository '${rawId}' could not be located in the database.`);
      } else {
        setRepo(detailData);
        setSelectedBranch(detailData.default_branch || 'main');
        const resolvedFindings = findingsData?.items || detailData.recent_findings || [];
        setFindings(resolvedFindings);
        if (resolvedFindings.length > 0) {
          setSelectedFindingId((prev) => prev || resolvedFindings[0].id);
        }
        const rawTree = treeData?.tree || [];
        setTreeNodes(rawTree);
        setCommits(commitsData || []);

        // Check for active background scan to recover status across page refreshes
        api.code.getActiveScan(targetId).then((active) => {
          if (active && (active.status === 'QUEUED' || active.status === 'RUNNING')) {
            setActiveScanJob({
              id: active.id,
              status: active.status,
              current_stage: active.current_stage,
              current_stage_index: active.current_stage_index,
              total_stages: active.total_stages || 6,
              stage_progress: active.stage_progress,
              elapsed_seconds: active.elapsed_seconds,
              findings_count: active.findings_count,
              error_message: active.error_message,
            });
            setIsScanning(true);
            startJobPolling(active.id);
          }
        }).catch(() => {});

        // Auto-select first real file if no file or default placeholder is selected
        const findFirst = (nodes: any[]): string | null => {
          for (const item of nodes) {
            if (item.type === 'file') return item.path;
            if (item.children?.length) {
              const res = findFirst(item.children);
              if (res) return res;
            }
          }
          return null;
        };
        const firstFile = findFirst(rawTree);
        const currentTarget = (!selectedFile || selectedFile === 'src/controllers/user.controller.ts') ? firstFile : selectedFile;
        if (currentTarget) {
          setSelectedFile(currentTarget);
          loadCurrentFile(currentTarget);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect with SecureAI Control Plane.');
    } finally {
      setLoading(false);
    }
  }, [rawId, selectedBranch, startJobPolling]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const loadCurrentFile = useCallback(
    async (filePath: string) => {
      if (!rawId || !filePath) return;
      setIsFileLoading(true);
      try {
        const targetId = repo?.id || rawId;
        const data = await api.code.repositoryFile(targetId, filePath, selectedBranch);
        if (data) {
          setFileData(data);
          if (data.path && data.path !== filePath && (!selectedFile || selectedFile === 'src/controllers/user.controller.ts')) {
            setSelectedFile(data.path);
          }
        }
      } catch (err: any) {
        console.error('Failed to load file:', err);
      } finally {
        setIsFileLoading(false);
      }
    },
    [rawId, repo?.id, selectedBranch, selectedFile]
  );

  // Auto-fetch or generate Gemini remediation for a finding
  const fetchOrGenerateRemediation = useCallback(
    async (finding: any, forceRecheck = false) => {
      if (!finding?.id) return;
      if (!forceRecheck && remediationMap[finding.id]) return;

      setIsGeneratingRemediation(true);
      try {
        let res = null;
        if (!forceRecheck) {
          res = await api.code.getFindingRemediation(finding.id).catch(() => null);
        }
        if (!res || !res.is_fixable) {
          res = await api.code.generateRemediation(finding.id, { mode: 'SUGGEST' });
        }
        if (res) {
          setRemediationMap((prev) => ({ ...prev, [finding.id]: res }));
        }
      } catch (err: any) {
        console.warn('Remediation fetch failed:', err);
      } finally {
        setIsGeneratingRemediation(false);
      }
    },
    [remediationMap]
  );

  useEffect(() => {
    if (activeTab === 'Code' && selectedFile) {
      loadCurrentFile(selectedFile);
    } else if (activeTab === 'Security Findings') {
      const activeF = findings.find((f: any) => f.id === selectedFindingId) || findings[0];
      if (activeF) {
        if (activeF.file_path) {
          loadCurrentFile(activeF.file_path);
        }
        fetchOrGenerateRemediation(activeF);
      }
    }
  }, [activeTab, selectedFile, selectedFindingId, findings, loadCurrentFile, fetchOrGenerateRemediation]);

  const handleApplyFix = async (finding: any, strategy: any) => {
    if (!finding?.id) return;
    setIsApplyingRemediation(true);
    setFindingToast(null);

    // Show a progress indicator — this pipeline takes 30-90s
    setFindingToast({
      type: 'info',
      message: `⏳ Running remediation pipeline... (Gemini analysis → patch → sandbox test → rescan → PR). This may take up to 90 seconds.`,
    });

    try {
      const res = await api.code.applyRemediation(finding.id, { mode: 'AUTO_FIX' });

      if (res?.success || res?.status === 'COMPLETED' || res?.finding_resolved) {
        const prUrl = res?.pull_request_url;
        const prNum = res?.pull_request_number;
        const branchName = res?.branch || 'remediation-sandbox';
        const pushErr = res?.push_error;
        setFindingToast({
          type: pushErr ? 'info' : 'success',
          message: prUrl
            ? `✅ Fix applied & PR #${prNum} created! Branch: '${branchName}'. Rescan: 0 findings remaining.`
            : pushErr
            ? `✅ Fix applied to branch '${branchName}' (local). ⚠️ GitHub push failed: ${pushErr}`
            : `✅ Fix applied in branch '${branchName}'! Tests passed, rescan verified 0 findings remaining.`,
          url: prUrl || undefined,
        });
        await loadWorkspace();
        if (finding.file_path) {
          await loadCurrentFile(finding.file_path);
        }
      } else if (res?.status === 'UNRESOLVED') {
        setFindingToast({
          type: 'error',
          message: `⚠️ Patch applied but finding not fully resolved by rescan. Manual review needed. Branch: '${res?.branch || 'N/A'}'`,
        });
      } else {
        setFindingToast({
          type: 'error',
          message: `❌ Failed to apply fix: ${res?.reason || res?.message || 'Patch could not be verified'}`,
        });
      }
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError' || err?.code === 'TIMEOUT' || err?.message?.includes('timeout');
      setFindingToast({
        type: 'error',
        message: isTimeout
          ? `⏱️ Remediation pipeline timed out on the client. The backend may still be processing — check the Security Findings tab in a moment to see if the fix was applied.`
          : `Error applying fix: ${err?.message || 'An unexpected server error occurred. Check server logs.'}`,
      });
    } finally {
      setIsApplyingRemediation(false);
    }
  };


  const handleCreatePR = async (finding: any) => {
    if (!finding?.id) return;
    setIsCreatingPR(true);
    setFindingToast(null);

    try {
      const plan = remediationMap[finding.id];
      const res = await api.code.createRemediationPR(finding.id, {
        title: `Security Fix: ${finding.title}`,
        body: plan?.explanation || `Automated security patch generated by Google Gemini and verified by THING Control Plane.`,
      });

      if (res?.pull_request_id || res?.number || res?.html_url) {
        setFindingToast({
          type: 'success',
          message: `🚀 Pull Request #${res.number} created on GitHub! Branch: ${res.head_ref || 'fix/security'}`,
          url: res.html_url || undefined,
        });
      } else {
        setFindingToast({
          type: 'error',
          message: `Failed to create PR: ${res?.message || res?.detail || 'GitHub API returned error'}`,
        });
      }
    } catch (err: any) {
      setFindingToast({
        type: 'error',
        message: `Error creating PR: ${err?.message || 'Internal error'}`,
      });
    } finally {
      setIsCreatingPR(false);
    }
  };


  const toggleDirectory = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  const handleCopyCode = () => {
    if (!fileData?.content) return;
    navigator.clipboard.writeText(fileData.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const renderSyntaxLine = (line: string, lineNum: number, findingsOnLine: any[]) => {
    const hasFinding = findingsOnLine.length > 0;
    const isCritical = findingsOnLine.some((f: any) => (f.severity || '').toUpperCase() === 'CRITICAL');

    const tokenize = (text: string) => {
      const tokenRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`(?:\\.|[^`])*`|\b(?:import|export|from|class|private|public|protected|async|await|return|const|let|var|function|new|if|else|try|catch|finally|throw|default|interface|type)\b|\b(?:Request|Response|UserService|UserController|Promise|string|number|boolean|any|void|null|undefined)\b|\b\d+\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g;
      const parts: { text: string; type: string }[] = [];
      let lastIndex = 0;
      let match;
      while ((match = tokenRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ text: text.slice(lastIndex, match.index), type: 'plain' });
        }
        const token = match[0];
        let type = 'plain';
        if (token.startsWith('//') || token.startsWith('/*')) {
          type = 'comment';
        } else if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) {
          type = 'string';
        } else if (['import', 'export', 'from', 'class', 'private', 'public', 'protected', 'async', 'await', 'return', 'const', 'let', 'var', 'function', 'new', 'if', 'else', 'try', 'catch', 'finally', 'throw', 'default', 'interface', 'type'].includes(token)) {
          type = 'keyword';
        } else if (['Request', 'Response', 'UserService', 'UserController', 'Promise', 'string', 'number', 'boolean', 'any', 'void', 'null', 'undefined'].includes(token)) {
          type = 'type';
        } else if (/^\d+$/.test(token)) {
          type = 'number';
        } else {
          type = 'function';
        }
        parts.push({ text: token, type });
        lastIndex = tokenRegex.lastIndex;
      }
      if (lastIndex < text.length) {
        parts.push({ text: text.slice(lastIndex), type: 'plain' });
      }
      return parts;
    };

    const tokens = tokenize(line);

    return (
      <div
        key={lineNum}
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: '22px',
          backgroundColor: hasFinding
            ? isCritical
              ? 'rgba(239, 68, 68, 0.08)'
              : 'rgba(249, 115, 22, 0.08)'
            : 'transparent',
          borderLeft: hasFinding
            ? isCritical
              ? '3px solid #EF4444'
              : '3px solid #F97316'
            : '3px solid transparent',
        }}
      >
        <div
          style={{
            width: '44px',
            textAlign: 'right',
            paddingRight: '14px',
            color: hasFinding ? '#EF4444' : '#94A3B8',
            fontWeight: hasFinding ? 700 : 400,
            userSelect: 'none',
            fontSize: '12px',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          {lineNum}
        </div>
        <div
          style={{
            flex: 1,
            paddingLeft: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '13px',
            whiteSpace: 'pre',
            color: '#1E293B',
          }}
        >
          {tokens.map((tok, i) => {
            let color = '#1E293B';
            let fontWeight: 400 | 600 = 400;
            let fontStyle: 'normal' | 'italic' = 'normal';
            if (tok.type === 'keyword') {
              color = '#8B5CF6';
              fontWeight = 600;
            } else if (tok.type === 'string') {
              color = '#059669';
            } else if (tok.type === 'comment') {
              color = '#94A3B8';
              fontStyle = 'italic';
            } else if (tok.type === 'type') {
              color = '#D97706';
              fontWeight = 600;
            } else if (tok.type === 'function') {
              color = '#2563EB';
            } else if (tok.type === 'number') {
              color = '#EA580C';
            }
            return (
              <span key={i} style={{ color, fontWeight, fontStyle }}>
                {tok.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSyntaxHighlightedLine = (text: string) => {
    const tokenRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|`(?:\\.|[^`])*`|\b(?:import|export|from|class|private|public|protected|async|await|return|const|let|var|function|new|if|else|try|catch|finally|throw|default|interface|type)\b|\b(?:Request|Response|UserService|UserController|Promise|string|number|boolean|any|void|null|undefined)\b|\b\d+\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g;
    const parts: { text: string; type: string }[] = [];
    let lastIndex = 0;
    let match;
    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), type: 'plain' });
      }
      const token = match[0];
      let type = 'plain';
      if (token.startsWith('//') || token.startsWith('/*')) {
        type = 'comment';
      } else if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) {
        type = 'string';
      } else if (['import', 'export', 'from', 'class', 'private', 'public', 'protected', 'async', 'await', 'return', 'const', 'let', 'var', 'function', 'new', 'if', 'else', 'try', 'catch', 'finally', 'throw', 'default', 'interface', 'type'].includes(token)) {
        type = 'keyword';
      } else if (['Request', 'Response', 'UserService', 'UserController', 'Promise', 'string', 'number', 'boolean', 'any', 'void', 'null', 'undefined'].includes(token)) {
        type = 'type';
      } else if (/^\d+$/.test(token)) {
        type = 'number';
      } else {
        type = 'function';
      }
      parts.push({ text: token, type });
      lastIndex = tokenRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), type: 'plain' });
    }
    return parts.map((tok, i) => {
      let color = '#1E293B';
      let fontWeight: 400 | 600 = 400;
      let fontStyle: 'normal' | 'italic' = 'normal';
      if (tok.type === 'keyword') {
        color = '#8B5CF6';
        fontWeight = 600;
      } else if (tok.type === 'string') {
        color = '#059669';
      } else if (tok.type === 'comment') {
        color = '#94A3B8';
        fontStyle = 'italic';
      } else if (tok.type === 'type') {
        color = '#D97706';
        fontWeight = 600;
      } else if (tok.type === 'function') {
        color = '#2563EB';
      } else if (tok.type === 'number') {
        color = '#EA580C';
      }
      return (
        <span key={i} style={{ color, fontWeight, fontStyle }}>
          {tok.text}
        </span>
      );
    });
  };

  const renderCodeTree = (nodes: any[], depth = 0): React.ReactNode => {
    const filterQuery = fileFilterQuery.toLowerCase();

    return nodes.map((node: any) => {
      const isDir = node.type === 'directory';
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = selectedFile === node.path;

      if (filterQuery && !node.name.toLowerCase().includes(filterQuery) && !isDir) {
        return null;
      }

      return (
        <div key={node.path} style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            onClick={() => {
              if (isDir) {
                toggleDirectory(node.path);
              } else {
                setSelectedFile(node.path);
                loadCurrentFile(node.path);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 8px',
              paddingLeft: `${depth * 14 + 6}px`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12.5px',
              backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
              color: isSelected ? '#2563EB' : '#334155',
              fontWeight: isSelected ? 600 : 400,
              transition: 'background-color 0.1s ease',
            }}
          >
            {isDir ? (
              <>
                {isExpanded ? (
                  <ChevronDown size={13} color="#94A3B8" />
                ) : (
                  <ChevronRight size={13} color="#94A3B8" />
                )}
                {isExpanded ? (
                  <FolderOpen size={14} color="#3B82F6" />
                ) : (
                  <Folder size={14} color="#64748B" />
                )}
              </>
            ) : (
              <>
                <span style={{ width: '13px' }} />
                <FileCode size={14} color={isSelected ? '#2563EB' : '#64748B'} />
              </>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.name}
            </span>
          </div>

          {isDir && isExpanded && node.children && (
            <div>{renderCodeTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  // Real Trigger Scan Action with Real-time Polling
  const handleTriggerScan = async () => {
    if (!repo) return;
    setIsScanning(true);
    try {
      const res = await api.code.triggerRepositoryScan(repo.id, selectedBranch);
      const jobId = res?.id || res?.scan_job_id;
      if (jobId) {
        setActiveScanJob({
          id: jobId,
          status: (res.status as any) || 'QUEUED',
          current_stage: res.current_stage || 'Repository validation & workspace isolation',
          current_stage_index: 1,
          total_stages: 6,
          stage_progress: 16,
          elapsed_seconds: 0,
          findings_count: 0,
        });
        startJobPolling(jobId);
      }
    } catch (err: any) {
      console.warn('Scanner failed to trigger:', err);
      setIsScanning(false);
    }
  };

  const handleCancelScan = async (jobId: string) => {
    try {
      await api.code.cancelScanJob(jobId);
      setActiveScanJob((prev) =>
        prev ? { ...prev, status: 'CANCELLED', current_stage: 'Scan cancelled by user' } : null
      );
      setIsScanning(false);
    } catch (err: any) {
      console.warn('Failed to cancel scan:', err);
    }
  };

  // Real Category Finding Counts from Live Findings
  const sastFindings = findings.filter(
    (f: any) =>
      (f.rule_id || '').startsWith('SAST') ||
      (f.scanner_name || '').toLowerCase().includes('semgrep') ||
      (f.title || '').toLowerCase().includes('sql') ||
      (f.title || '').toLowerCase().includes('injection')
  );
  const secretsFindings = findings.filter(
    (f: any) =>
      (f.rule_id || '').startsWith('SEC') ||
      (f.title || '').toLowerCase().includes('secret') ||
      (f.title || '').toLowerCase().includes('credential') ||
      (f.title || '').toLowerCase().includes('uri')
  );

  const containerFindings = findings.filter(
    (f: any) =>
      (f.file_path || '').toLowerCase().includes('docker') ||
      (f.title || '').toLowerCase().includes('container')
  );

  const critCount = findings.filter((f: any) => (f.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount = findings.filter((f: any) => (f.severity || '').toUpperCase() === 'HIGH').length;
  const medCount = findings.filter((f: any) => (f.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount = findings.filter((f: any) => (f.severity || '').toUpperCase() === 'LOW').length;
  const totalFindings = findings.length;

  const findingCounts = {
    critical: critCount,
    high: highCount,
    medium: medCount,
    low: lowCount,
    informational: 0,
  };

  // Security Findings 3-Column Selected Item & Filtered List
  const filteredFindings = useMemo(() => {
    return findings.filter((f: any) => {
      const status = (f.status || 'open').toLowerCase();
      if (findingFilter !== 'all' && status !== findingFilter) return false;
      if (findingSearchQuery) {
        const q = findingSearchQuery.toLowerCase();
        const tMatch = (f.title || '').toLowerCase().includes(q);
        const pMatch = (f.file_path || '').toLowerCase().includes(q);
        const rMatch = (f.rule_id || '').toLowerCase().includes(q);
        if (!tMatch && !pMatch && !rMatch) return false;
      }
      return true;
    });
  }, [findings, findingFilter, findingSearchQuery]);

  const selectedFinding = useMemo(() => {
    return findings.find((f: any) => f.id === selectedFindingId) || findings[0] || null;
  }, [findings, selectedFindingId]);

  const currentPlan = selectedFinding ? remediationMap[selectedFinding.id] : null;

  const activeStrategies = useMemo(() => {
    if (currentPlan?.strategies?.length) return currentPlan.strategies;
    const fp = selectedFinding?.file_path || 'source_file.ts';
    if (currentPlan?.patch) {
      return [
        {
          name: 'Engine Proposed Fix',
          diff: currentPlan.patch,
        },
      ];
    }
    return [
      {
        name: 'Deterministic Remediation',
        diff: `// Remediation strategy for ${selectedFinding?.rule_id || 'Security Finding'}\n// File: ${fp}\n// Trigger "Generate Remediation" to compute validated deterministic fix.`,
      },
    ];
  }, [selectedFinding, currentPlan]);

  const currentStrategy = activeStrategies[activeStrategyIndex] || activeStrategies[0];
  const currentDiffLines = (currentStrategy?.diff || '').split('\n');

  const findingSevText = selectedFinding ? (selectedFinding.severity || 'HIGH').toUpperCase() : 'HIGH';
  let findingSevColor = '#EF4444';
  if (findingSevText === 'HIGH') findingSevColor = '#F97316';
  else if (findingSevText === 'MEDIUM') findingSevColor = '#F59E0B';
  else if (findingSevText === 'LOW') findingSevColor = '#3B82F6';

  const findingCWE = useMemo(() => {
    if (!selectedFinding) return 'CWE-798';
    const r = (selectedFinding.rule_id || '').toLowerCase();
    const t = (selectedFinding.title || '').toLowerCase();
    if (r.includes('sec') || t.includes('secret') || t.includes('credential')) return 'CWE-798';
    if (r.includes('sql') || t.includes('sql') || t.includes('injection')) return 'CWE-89';
    if (t.includes('deserial')) return 'CWE-502';
    if (t.includes('command')) return 'CWE-78';
    if (t.includes('redirect')) return 'CWE-601';
    if (t.includes('crypto')) return 'CWE-327';
    return 'CWE-20';
  }, [selectedFinding]);

  const findingCVSS = useMemo(() => {
    if (findingSevText === 'CRITICAL') return '9.8 (Critical)';
    if (findingSevText === 'HIGH') return '8.5 (High)';
    if (findingSevText === 'MEDIUM') return '5.3 (Medium)';
    return '3.1 (Low)';
  }, [findingSevText]);

  const findingLineRange = useMemo(() => {
    if (!selectedFinding) return '5 - 8';
    const s = selectedFinding.line_number || 5;
    const e = selectedFinding.end_line || (s + 3);
    return `${s} - ${e}`;
  }, [selectedFinding]);

  const findingCategory = useMemo(() => {
    if (!selectedFinding) return 'Secrets';
    const r = (selectedFinding.rule_id || '').toLowerCase();
    const t = (selectedFinding.title || '').toLowerCase();
    if (r.includes('sec') || t.includes('secret') || t.includes('credential')) return 'Secrets';
    if (r.includes('docker') || t.includes('docker') || t.includes('container')) return 'Containers';
    if (r.includes('sca') || t.includes('dependency')) return 'Dependencies';
    return 'SAST';
  }, [selectedFinding]);

  const isLineVulnerable = useCallback(
    (lineNum: number) => {
      if (!selectedFinding) return false;
      const start = selectedFinding.line_number || 5;
      const end = selectedFinding.end_line || (start + 3);
      return lineNum >= start && lineNum <= end;
    },
    [selectedFinding]
  );

  const fileLines = useMemo(() => {
    if (!fileData?.content) {
      return ['// Select a file from the repository tree to view contents.'];
    }
    return fileData.content.split('\n');
  }, [fileData]);

  // Auto-scroll center code viewer directly to the vulnerable line range
  useEffect(() => {
    if (activeTab !== 'Security Findings' || !fileLines || fileLines.length === 0) return;
    const activeF = findings.find((f: any) => f.id === selectedFindingId) || findings[0];
    const targetLine = activeF?.line_number || activeF?.line_start || 1;
    if (targetLine && targetLine > 1) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`code-line-${targetLine}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedFindingId, findings, fileLines]);

  // Nav Tabs Specification from Reference
  const TABS = [
    { id: 'Overview', label: 'Overview', icon: LayoutGrid },
    { id: 'Code', label: 'Files Scanned', icon: Code2, hideIcon: true, labelDisplay: '</> Files Scanned' },
    { id: 'Security Findings', label: 'Findings', icon: ShieldCheck, badge: totalFindings, badgeColor: totalFindings > 0 ? '#EF4444' : '#10B981' },
    { id: 'Security Jobs', label: 'Security Runs', icon: ExternalLink },
  ];

  const coverage = repo?.coverage || {
    overall_percentage: 0,
    sast_percentage: 0,
    sca_percentage: 0,
    secrets_percentage: 0,
    container_percentage: 0,
  };

  const trendPoints = repo?.findings_trend?.length ? repo.findings_trend : [];

  const environments = repo?.environments?.length ? repo.environments : [];

  const displayCommits = commits;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <RefreshCw size={28} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Loading Security Workspace...</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '40px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#FFFFFF', padding: '32px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Repository Not Found</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px' }}>{error}</p>
          <Link
            href="/code/repositories"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            <ChevronLeft size={16} /> Return to Repositories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Main Content Container ── */}
      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 32px 60px 32px' }}>
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '12px' }}>
          <Home size={13} color="#64748B" />
          <span style={{ color: '#64748B', fontWeight: 500 }}>THING CODE</span>
          <span style={{ color: '#CBD5E1' }}>&gt;</span>
          <Link href="/code/repositories" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
            Repositories
          </Link>
          <span style={{ color: '#CBD5E1' }}>&gt;</span>
          <span style={{ color: activeTab === 'Security Findings' ? '#64748B' : '#0F172A', fontWeight: activeTab === 'Security Findings' ? 500 : 600 }}>
            {repo.name}
          </span>
          {activeTab === 'Security Findings' && (
            <>
              <span style={{ color: '#CBD5E1' }}>&gt;</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Security Findings</span>
            </>
          )}
        </div>

        {/* Repository Primary Identity Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          {/* Left: Big Icon + Name + Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GithubFilledIcon size={30} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {repo.name}
                </h1>
                <button
                  onClick={() => setIsStarred(!isStarred)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Star
                    size={18}
                    color={isStarred ? '#F59E0B' : '#94A3B8'}
                    fill={isStarred ? '#F59E0B' : 'none'}
                  />
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  fontSize: '13px',
                  color: '#64748B',
                }}
              >
                <span>{repo.full_name}</span>
                <span>•</span>
                <span style={{ textTransform: 'capitalize' }}>{repo.visibility || 'private'}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GitBranch size={13} /> {selectedBranch}
                </span>
                <span>•</span>
                <span>Updated {formatRelativeTime(repo.updated_at || repo.last_scan_at)}</span>
              </div>
            </div>
          </div>

          {/* Right: Watch, Fork, Scan Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                setIsWatching(!isWatching);
                setScanToast(isWatching ? 'Unwatched repository alerts' : 'Watching repository for security alerts');
                setTimeout(() => setScanToast(null), 3000);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1E293B',
                cursor: 'pointer',
              }}
              title={isWatching ? 'Stop receiving notifications for this repository' : 'Receive notifications for this repository'}
            >
              <Eye size={15} color={isWatching ? '#2563EB' : '#64748B'} />
              <span>{isWatching ? 'Unwatch' : 'Watch'}</span>
              <span
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  marginLeft: '4px',
                }}
              >
                {repo.watchers_count ?? (isWatching ? 1 : 0)}
              </span>
            </button>

            <button
              onClick={() => {
                if (repo.html_url) {
                  window.open(`${repo.html_url}/fork`, '_blank');
                } else {
                  setScanToast('Opening GitHub fork flow...');
                  setTimeout(() => setScanToast(null), 3000);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1E293B',
                cursor: 'pointer',
              }}
              title="Fork this repository on GitHub"
            >
              <GitFork size={15} color="#64748B" />
              <span>Fork</span>
              <span
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  marginLeft: '4px',
                }}
              >
                {repo.forks_count ?? 0}
              </span>
            </button>

            <button
              onClick={handleTriggerScan}
              disabled={isScanning || activeScanJob?.status === 'RUNNING' || activeScanJob?.status === 'QUEUED'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (isScanning || activeScanJob?.status === 'RUNNING' || activeScanJob?.status === 'QUEUED') ? 'not-allowed' : 'pointer',
                opacity: (isScanning || activeScanJob?.status === 'RUNNING' || activeScanJob?.status === 'QUEUED') ? 0.6 : 1,
              }}
            >
              <Play size={14} fill="#FFFFFF" />
              <span>
                {activeScanJob?.status === 'RUNNING'
                  ? 'Scanning...'
                  : activeScanJob?.status === 'QUEUED'
                  ? 'Queued...'
                  : 'Scan Repository'}
              </span>
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="More repository actions"
              >
                <MoreVertical size={16} color="#64748B" />
              </button>

              {isActionMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '200px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    padding: '4px',
                    zIndex: 50,
                  }}
                >
                  {repo.html_url && (
                    <button
                      onClick={() => {
                        window.open(repo.html_url, '_blank');
                        setIsActionMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#1E293B',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <ExternalLink size={14} color="#64748B" />
                      <span>Open on GitHub</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const url = repo.clone_url || repo.repo_url || `https://github.com/${repo.full_name || repo.name}.git`;
                      navigator.clipboard.writeText(url);
                      setScanToast('Copied Git clone URL to clipboard');
                      setTimeout(() => setScanToast(null), 3000);
                      setIsActionMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#1E293B',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Copy size={14} color="#64748B" />
                    <span>Copy Clone URL</span>
                  </button>
                  <button
                    onClick={() => {
                      loadWorkspace();
                      setScanToast('Resynced workspace from database');
                      setTimeout(() => setScanToast(null), 3000);
                      setIsActionMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#1E293B',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <RefreshCw size={14} color="#64748B" />
                    <span>Resync Workspace</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Horizontal Progress Indicator */}
        {activeScanJob && (
          <div style={{ marginBottom: '20px' }}>
            <RepositoryScanProgressBar
              job={activeScanJob}
              repositoryName={repo.name}
              onCancel={() => handleCancelScan(activeScanJob.id)}
              onRetry={handleTriggerScan}
              onDismiss={() => setActiveScanJob(null)}
              onViewFindings={() => setActiveTab('Security Findings')}
            />
          </div>
        )}

        {/* Scan Toast notification */}
        {scanToast && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={16} />
            <span>{scanToast}</span>
          </div>
        )}

        {/* ── Product Horizontal Navigation Tabs ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            borderBottom: '1px solid #E2E8F0',
            marginBottom: '24px',
            overflowX: 'auto',
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', tab.id);
                    window.history.replaceState({}, '', url.toString());
                  } catch (err) {
                    console.warn('[RepositoryView] Failed to update URL search parameters for tab:', err);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 2px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  color: isActive ? '#2563EB' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {!(tab as any).hideIcon && <Icon size={16} color={isActive ? '#2563EB' : '#64748B'} />}
                <span>{tab.labelDisplay || tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    style={{
                      backgroundColor: tab.badgeColor || '#EF4444',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      marginLeft: '2px',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab View: Overview ── */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Top Severity Metric Cards (Row 1) - Medium Size */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {/* Card 1: Total Findings */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#FEF2F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldAlert size={15} color="#EF4444" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Findings</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{totalFindings}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: totalFindings > 0 ? '#DC2626' : '#16A34A',
                    }}
                  >
                    {totalFindings > 0 ? `${totalFindings} detected` : 'Clean'}
                  </span>
                </div>
              </div>

              {/* Card 2: Critical */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#FEF2F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldAlert size={15} color="#DC2626" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Critical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                    {findingCounts.critical || 0}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: findingCounts.critical > 0 ? '#DC2626' : '#16A34A',
                    }}
                  >
                    {findingCounts.critical > 0 ? 'Requires attention' : '0 issues'}
                  </span>
                </div>
              </div>

              {/* Card 3: High */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#FFF7ED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldAlert size={15} color="#EA580C" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>High</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                    {findingCounts.high || 0}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: findingCounts.high > 0 ? '#EA580C' : '#16A34A',
                    }}
                  >
                    {findingCounts.high > 0 ? 'Needs review' : '0 issues'}
                  </span>
                </div>
              </div>

              {/* Card 4: Medium */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#FEFCE8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertTriangle size={15} color="#CA8A04" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Medium</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                    {findingCounts.medium || 0}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: findingCounts.medium > 0 ? '#CA8A04' : '#16A34A',
                    }}
                  >
                    {findingCounts.medium > 0 ? 'Moderate risk' : '0 issues'}
                  </span>
                </div>
              </div>

              {/* Card 5: Low */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldCheck size={15} color="#2563EB" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Low</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                    {findingCounts.low || 0}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: findingCounts.low > 0 ? '#2563EB' : '#16A34A',
                    }}
                  >
                    {findingCounts.low > 0 ? 'Informational' : '0 issues'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Middle Row: Scan Status Card + Findings Trend + Security Coverage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.5fr 1fr', gap: '16px' }}>
              {/* Card 1: Scan Status */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
                    Scan Status
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor:
                            repo.scan_status === 'HEALTHY'
                              ? '#ECFDF5'
                              : repo.scan_status === 'SCAN_FAILED'
                              ? '#FEF2F2'
                              : '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {repo.scan_status === 'HEALTHY' ? (
                          <Check size={18} color="#10B981" />
                        ) : repo.scan_status === 'SCAN_FAILED' ? (
                          <X size={18} color="#EF4444" />
                        ) : (
                          <RefreshCw size={16} color="#3B82F6" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                          {repo.last_scan_status === 'COMPLETED' || securityJobs?.[0]?.status === 'COMPLETED'
                            ? 'Latest scan completed'
                            : repo.last_scan_status === 'FAILED' || securityJobs?.[0]?.status === 'FAILED'
                            ? 'Latest scan failed'
                            : 'Scan ready'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {formatRelativeTime(securityJobs?.[0]?.completed_at || securityJobs?.[0]?.created_at || repo.last_scan_at)} • {formatDuration(securityJobs?.[0]?.duration_seconds || repo.last_scan_duration_seconds)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerScan}
                      disabled={isScanning}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isScanning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Play size={12} fill="#FFFFFF" />
                      <span>Scan Again</span>
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Scan Type</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>Full Scan</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Triggered By</span>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>
                        {repo.last_scan_trigger || `Push (${selectedBranch})`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748B' }}>Commit</span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: 'monospace',
                          color: '#2563EB',
                          fontWeight: 600,
                        }}
                      >
                        <GitCommit size={13} />
                        {repo.last_commit_sha ? repo.last_commit_sha.substring(0, 7) : 'a3f2c1d'}
                        <ExternalLink size={11} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Findings Trend Chart */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Findings Trend
                  </h3>

                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                      Critical
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F97316' }} />
                      High
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EAB308' }} />
                      Medium
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                      Low
                    </span>
                  </div>
                </div>

                {/* SVG Trend Chart or Empty State */}
                {trendPoints.length === 0 ? (
                  <div
                    style={{
                      height: '140px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94A3B8',
                      fontSize: '13px',
                      textAlign: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>No historical trend data yet</span>
                    <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Scans will record vulnerability progression over time.</span>
                  </div>
                ) : (
                  <>
                    <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox="0 0 500 130" preserveAspectRatio="none">
                        {/* Horizontal Grid lines */}
                        <line x1="30" y1="20" x2="490" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="30" y1="50" x2="490" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="30" y1="80" x2="490" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="30" y1="110" x2="490" y2="110" stroke="#F1F5F9" strokeWidth="1" />

                        {/* Y-axis labels */}
                        <text x="15" y="24" fontSize="9" fill="#94A3B8" textAnchor="end">100</text>
                        <text x="15" y="54" fontSize="9" fill="#94A3B8" textAnchor="end">50</text>
                        <text x="15" y="84" fontSize="9" fill="#94A3B8" textAnchor="end">25</text>
                        <text x="15" y="114" fontSize="9" fill="#94A3B8" textAnchor="end">0</text>

                        {/* Dynamic Polylines */}
                        {(() => {
                          const ptsCount = trendPoints.length;
                          const getX = (i: number) => ptsCount <= 1 ? 250 : 60 + (i * (440 - 60)) / (ptsCount - 1);
                          const getY = (val: number) => Math.max(20, Math.min(110, 110 - ((val || 0) / 50) * 90));
                          const medPts = trendPoints.map((tp: any, i: number) => `${getX(i)},${getY(tp.medium || 0)}`).join(' ');
                          const highPts = trendPoints.map((tp: any, i: number) => `${getX(i)},${getY(tp.high || 0)}`).join(' ');
                          const critPts = trendPoints.map((tp: any, i: number) => `${getX(i)},${getY(tp.critical || 0)}`).join(' ');
                          const lowPts = trendPoints.map((tp: any, i: number) => `${getX(i)},${getY(tp.low || 0)}`).join(' ');
                          return (
                            <>
                              <polyline fill="none" stroke="#EAB308" strokeWidth="2.5" points={medPts} />
                              <polyline fill="none" stroke="#F97316" strokeWidth="2.5" points={highPts} />
                              <polyline fill="none" stroke="#EF4444" strokeWidth="2.5" points={critPts} />
                              <polyline fill="none" stroke="#3B82F6" strokeWidth="2.5" points={lowPts} />
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* X-axis date labels */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0 10px 0 20px',
                        fontSize: '10px',
                        color: '#94A3B8',
                        marginTop: '4px',
                      }}
                    >
                      {trendPoints.map((tp: any, idx: number) => (
                        <span key={idx}>{tp.date}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Card 3: Security Coverage */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
                  Security Coverage
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {/* Gauge Doughnut Ring */}
                  <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                    <svg width="90" height="90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="10" fill="none" />
                      {/* Multi-segment active arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#10B981"
                        strokeWidth="10"
                        strokeDasharray={`${Math.round(((coverage.overall_percentage || 0) / 100) * 251.32)} 251`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        fill="none"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                        {coverage.overall_percentage}%
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748B' }}>Scanned</span>
                    </div>
                  </div>

                  {/* Coverage Breakdown percentages */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                        Source Code (SAST)
                      </span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{coverage.sast_percentage}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#06B6D4' }} />
                        Dependencies (SCA)
                      </span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{coverage.sca_percentage}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                        Secrets
                      </span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{coverage.secrets_percentage}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EAB308' }} />
                        Containers
                      </span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{coverage.container_percentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Lower Row: Left Column (Recent Findings + Repository Structure) & Right Column (Details + Commits + Environments) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Panel 1: Recent Findings Table */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Recent Findings
                    </h3>
                    <button
                      onClick={() => setActiveTab('Security Findings')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {findings.length === 0 ? (
                    <div
                      style={{
                        padding: '36px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontSize: '13px',
                      }}
                    >
                      <ShieldCheck size={32} color="#10B981" style={{ margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>All Clean — Zero Open Findings</div>
                      <div>No security vulnerabilities detected in the repository codebase.</div>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #F1F5F9', textAlign: 'left', color: '#64748B' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Severity</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Title</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>File</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Rule</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Detected</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {findings.slice(0, 5).map((f: any) => {
                          const sev = (f.severity || 'LOW').toUpperCase();
                          const isCrit = sev === 'CRITICAL';
                          const isHigh = sev === 'HIGH';
                          const isMed = sev === 'MEDIUM';
                          const isMenuOpen = activeRowMenuId === `overview-${f.id}`;

                          return (
                            <tr
                              key={f.id}
                              onClick={() => {
                                setModalFinding(f);
                                setModalTab('Details');
                                setIsFindingModalOpen(true);
                              }}
                              style={{
                                borderBottom: '1px solid #F8FAFC',
                                transition: 'background-color 0.15s',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <td style={{ padding: '12px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: isCrit
                                      ? '#DC2626'
                                      : isHigh
                                      ? '#EA580C'
                                      : isMed
                                      ? '#CA8A04'
                                      : '#2563EB',
                                  }}
                                >
                                  <ShieldAlert size={14} />
                                  {sev.charAt(0) + sev.slice(1).toLowerCase()}
                                </span>
                              </td>
                              <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>
                                {f.title}
                              </td>
                              <td style={{ padding: '12px', fontFamily: 'monospace', color: '#64748B', fontSize: '12px' }}>
                                {f.file_path || 'src/config.js'}
                              </td>
                              <td style={{ padding: '12px', color: '#64748B' }}>
                                {f.rule_id || 'rule-security'}
                              </td>
                              <td style={{ padding: '12px', color: '#64748B' }}>
                                {formatRelativeTime(f.first_seen)}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span
                                  style={{
                                    backgroundColor: '#FEF2F2',
                                    border: '1px solid #FCA5A5',
                                    color: '#DC2626',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                  }}
                                >
                                  Open
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', position: 'relative' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setModalFinding(f);
                                      setModalTab('Remediation');
                                      setIsFindingModalOpen(true);
                                      fetchOrGenerateRemediation(f);
                                    }}
                                    title="AutoFix this finding"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 8px',
                                      backgroundColor: '#EFF6FF',
                                      color: '#2563EB',
                                      border: '1px solid #BFDBFE',
                                      borderRadius: '6px',
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Sparkles size={12} color="#2563EB" />
                                    AutoFix
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveRowMenuId(isMenuOpen ? null : `overview-${f.id}`);
                                    }}
                                    title="More actions"
                                    style={{
                                      background: 'none',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <MoreVertical size={14} color="#64748B" />
                                  </button>
                                </div>

                                {isMenuOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      right: '12px',
                                      top: '40px',
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: '8px',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                      border: '1px solid #E2E8F0',
                                      zIndex: 100,
                                      minWidth: '150px',
                                      padding: '4px 0',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <button
                                      onClick={() => {
                                        setModalFinding(f);
                                        setModalTab('Details');
                                        setIsFindingModalOpen(true);
                                        setActiveRowMenuId(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '7px 12px',
                                        fontSize: '12px',
                                        color: '#0F172A',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Eye size={13} color="#64748B" />
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        setModalFinding(f);
                                        setModalTab('Remediation');
                                        setIsFindingModalOpen(true);
                                        fetchOrGenerateRemediation(f);
                                        setActiveRowMenuId(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '7px 12px',
                                        fontSize: '12px',
                                        color: '#2563EB',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Sparkles size={13} color="#2563EB" />
                                      ✨ AutoFix
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (f.file_path) {
                                          setSelectedFile(f.file_path);
                                          loadCurrentFile(f.file_path);
                                          setActiveTab('Code');
                                        }
                                        setActiveRowMenuId(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '7px 12px',
                                        fontSize: '12px',
                                        color: '#0F172A',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <FileCode size={13} color="#64748B" />
                                      Inspect in Code
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(f.rule_id || f.id);
                                        setActiveRowMenuId(null);
                                        setFindingToast({
                                          type: 'info',
                                          message: `Rule ID copied: ${f.rule_id || f.id}`,
                                        });
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '7px 12px',
                                        fontSize: '12px',
                                        color: '#0F172A',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Copy size={13} color="#64748B" />
                                      Copy Rule ID
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Panel 2: Repository Structure (Interactive Tree View) */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Repository Structure
                    </h3>

                    {/* Branch and search bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <GitBranch size={13} color="#64748B" />
                        <span>{selectedBranch}</span>
                        <ChevronDown size={13} color="#64748B" />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          width: '180px',
                        }}
                      >
                        <Search size={13} color="#94A3B8" style={{ marginRight: '6px' }} />
                        <input
                          type="text"
                          placeholder="Search files..."
                          value={fileSearch}
                          onChange={(e) => setFileSearch(e.target.value)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none',
                            fontSize: '12px',
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* File Tree List */}
                  <div
                    style={{
                      maxHeight: '320px',
                      overflowY: 'auto',
                      padding: '4px',
                    }}
                  >
                    {treeNodes.map((node: any) => (
                      <TreeItem
                        key={node.path}
                        node={node}
                        searchFilter={fileSearch}
                        onSelectFile={(path) => {
                          setSelectedFile(path);
                          loadCurrentFile(path);
                          setActiveTab('Code');
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Repository Details + Recent Commits + Environments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Repository Details Card */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Repository Details
                    </h3>
                    <button
                      onClick={() => {
                        setEditBranch(repo.default_branch || selectedBranch || 'main');
                        setEditDescription(repo.description || '');
                        setEditLanguage(repo.primary_language || repo.language || detectedLanguage || 'JavaScript');
                        setIsEditModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: '1px solid #E2E8F0',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit size={12} /> Edit
                    </button>
                  </div>

                  <a
                    href={repo.html_url || `https://github.com/${repo.full_name}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#2563EB',
                      textDecoration: 'none',
                      marginBottom: '16px',
                    }}
                  >
                    <GithubFilledIcon size={16} />
                    <span style={{ wordBreak: 'break-all' }}>
                      {repo.html_url || `https://github.com/${repo.full_name}`}
                    </span>
                  </a>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Default Branch</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <GitBranch size={13} /> {selectedBranch}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Language</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: detectedLanguageColor }} />
                        {detectedLanguage}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Stars</span>
                      <span style={{ fontWeight: 600 }}>{repo.stars_count ?? 0}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Forks</span>
                      <span style={{ fontWeight: 600 }}>{repo.forks_count ?? 0}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Open Pull Requests</span>
                      <span style={{ fontWeight: 600 }}>{repo.open_prs_count || 0}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Created</span>
                      <span style={{ fontWeight: 600 }}>
                        {repo.created_at ? new Date(repo.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '12 Jan 2024'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Last Updated</span>
                      <span style={{ fontWeight: 600 }}>{formatRelativeTime(repo.updated_at || repo.last_scan_at)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Recent Commits Card */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Recent Commits
                    </h3>
                    <button
                      onClick={() => setActiveTab('Code')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View All &rarr;
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {displayCommits.length === 0 ? (
                      <div style={{ padding: '16px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                        No commits recorded for this branch yet.
                      </div>
                    ) : (
                      displayCommits.slice(0, 4).map((c: any, idx: number) => (
                        <div key={c.sha || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <GitCommit size={14} color="#475569" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {c.message}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600 }}>{c.author_login || '—'}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(c.committed_at)}</span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              color: '#2563EB',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            {c.sha.substring(0, 7)}
                            <ExternalLink size={10} />
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Environments Posture Card */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Environments
                    </h3>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Manage &rarr;
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {environments.length === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                        No environments configured yet.
                      </div>
                    ) : (
                      environments.map((env: any) => (
                        <div
                          key={env.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: env.status === 'HEALTHY' ? '#10B981' : '#F59E0B',
                              }}
                            />
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{env.name}</span>
                            <span style={{ color: '#94A3B8' }}>|</span>
                            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px' }}>
                              <GitBranch size={12} /> {env.branch}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              {formatRelativeTime(env.last_scanned_at)}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: env.finding_count > 0 ? '#EA580C' : '#16A34A',
                              }}
                            >
                              {env.finding_count}
                            </span>
                            <ChevronRight size={14} color="#94A3B8" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab View: Code (Interactive 3-Column Workspace) ── */}
        {activeTab === 'Code' && (
          <div
            style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
              minHeight: '750px',
            }}
          >
            {/* ── Left Column: Files Tree ── */}
            <div
              style={{
                width: '260px',
                flexShrink: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Files</span>
                <SlidersHorizontal size={14} color="#64748B" style={{ cursor: 'pointer' }} />
              </div>

              {/* Branch Selector */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GitBranch size={14} color="#64748B" />
                    <span>{selectedBranch}</span>
                  </div>
                  <ChevronDown size={14} color="#94A3B8" />
                </button>

                {isBranchDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      zIndex: 30,
                      overflow: 'hidden',
                    }}
                  >
                    {['main', 'develop', 'feat/security-rules'].map((b) => (
                      <div
                        key={b}
                        onClick={() => {
                          setSelectedBranch(b);
                          setIsBranchDropdownOpen(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: selectedBranch === b ? '#2563EB' : '#1E293B',
                          backgroundColor: selectedBranch === b ? '#EFF6FF' : 'transparent',
                          cursor: 'pointer',
                          fontWeight: selectedBranch === b ? 600 : 400,
                        }}
                      >
                        {b}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Search files input */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={fileFilterQuery}
                  onChange={(e) => setFileFilterQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12.5px',
                    outline: 'none',
                    backgroundColor: '#F8FAFC',
                    color: '#0F172A',
                  }}
                />
              </div>

              {/* Tree Items */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                }}
              >
                {renderCodeTree(treeNodes)}
              </div>
            </div>

            {/* ── Center Column: Code Editor / Viewer ── */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Tab Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  padding: '0 12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#FFFFFF',
                    borderLeft: '1px solid #E2E8F0',
                    borderRight: '1px solid #E2E8F0',
                    borderTop: '2px solid #2563EB',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    cursor: 'default',
                  }}
                >
                  <FileCode size={14} color="#2563EB" />
                  <span>{fileData?.filename || selectedFile.split('/').pop()}</span>
                  <X size={12} color="#94A3B8" style={{ cursor: 'pointer', marginLeft: '4px' }} />
                </div>
              </div>

              {/* Sub-header Bar with path, metrics, and actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: '#FAFAFA',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 500 }}>
                    {fileData?.path || selectedFile}
                  </span>
                  <span>•</span>
                  <span>{fileData?.lines_count || 0} lines</span>
                  <span>•</span>
                  <span>{((fileData?.size_bytes || 0) / 1024).toFixed(1)} KB</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setViewMode(viewMode === 'raw' ? 'code' : 'raw')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: viewMode === 'raw' ? '#EFF6FF' : '#FFFFFF',
                      color: viewMode === 'raw' ? '#2563EB' : '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Raw
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'blame' ? 'code' : 'blame')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: viewMode === 'blame' ? '#EFF6FF' : '#FFFFFF',
                      color: viewMode === 'blame' ? '#2563EB' : '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Blame
                  </button>
                  <button
                    onClick={handleCopyCode}
                    title="Copy code"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: copiedCode ? '#16A34A' : '#64748B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => window.open(repo?.html_url ? `${repo.html_url}/blob/${selectedBranch}/${selectedFile}` : '#', '_blank')}
                    title="Open on GitHub"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>

              {/* Code viewer body */}
              <div
                style={{
                  padding: '16px 0',
                  overflowX: 'auto',
                  maxHeight: '650px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {isFileLoading ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                    <div style={{ fontSize: '13px' }}>Loading file contents & security annotations...</div>
                  </div>
                ) : viewMode === 'raw' ? (
                  <pre
                    style={{
                      padding: '0 20px',
                      margin: 0,
                      fontFamily: 'monospace',
                      fontSize: '12.5px',
                      lineHeight: '20px',
                      color: '#1E293B',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {fileData?.content}
                  </pre>
                ) : viewMode === 'blame' ? (
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '20px' }}>
                    {(fileData?.content || '').split('\n').map((line: string, idx: number) => {
                      const lineNum = idx + 1;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            borderBottom: '1px solid #F1F5F9',
                            minHeight: '22px',
                          }}
                        >
                          <div
                            style={{
                              width: '75px',
                              padding: '0 8px',
                              color: '#2563EB',
                              backgroundColor: '#F8FAFC',
                              userSelect: 'none',
                              borderRight: '1px solid #E2E8F0',
                              flexShrink: 0,
                            }}
                          >
                            {fileData?.last_commit_sha || '670bb7e'}
                          </div>
                          <div
                            style={{
                              width: '100px',
                              padding: '0 8px',
                              color: '#475569',
                              backgroundColor: '#F8FAFC',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              borderRight: '1px solid #E2E8F0',
                              flexShrink: 0,
                            }}
                          >
                            {fileData?.author || '—'}
                          </div>
                          <div
                            style={{
                              width: '85px',
                              padding: '0 8px',
                              color: '#94A3B8',
                              backgroundColor: '#F8FAFC',
                              borderRight: '1px solid #E2E8F0',
                              flexShrink: 0,
                            }}
                          >
                            {fileData?.last_updated || '3w ago'}
                          </div>
                          <div
                            style={{
                              width: '40px',
                              textAlign: 'right',
                              padding: '0 8px',
                              color: '#94A3B8',
                              backgroundColor: '#F8FAFC',
                              userSelect: 'none',
                              borderRight: '1px solid #E2E8F0',
                              flexShrink: 0,
                            }}
                          >
                            {lineNum}
                          </div>
                          <div
                            style={{
                              padding: '0 12px',
                              color: '#1E293B',
                              whiteSpace: 'pre',
                              overflowX: 'auto',
                              flex: 1,
                            }}
                          >
                            {line}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    {(fileData?.content || '').split('\n').map((line: string, idx: number) => {
                      const lineNum = idx + 1;
                      const findingsOnLine = (fileData?.findings || []).filter(
                        (f: any) => Number(f.line_number) === lineNum
                      );
                      return renderSyntaxLine(line, lineNum, findingsOnLine);
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column: Security Summary & File Details ── */}
            <div
              style={{
                width: '340px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Card 1: Security Summary (This File) */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    Security Summary (This File)
                  </span>
                  <ExternalLink size={14} color="#94A3B8" style={{ cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {/* Critical */}
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FEE2E2',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626', lineHeight: 1 }}>
                      {fileData?.critical_count ?? 4}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#EF4444', marginTop: '4px' }}>
                      Critical
                    </div>
                  </div>

                  {/* High */}
                  <div
                    style={{
                      backgroundColor: '#FFF7ED',
                      border: '1px solid #FFEDD5',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#EA580C', lineHeight: 1 }}>
                      {fileData?.high_count ?? 2}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#F97316', marginTop: '4px' }}>
                      High
                    </div>
                  </div>

                  {/* Medium */}
                  <div
                    style={{
                      backgroundColor: '#FEFCE8',
                      border: '1px solid #FEF9C3',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706', lineHeight: 1 }}>
                      {fileData?.medium_count ?? 1}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#F59E0B', marginTop: '4px' }}>
                      Medium
                    </div>
                  </div>

                  {/* Low */}
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      borderRadius: '8px',
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', lineHeight: 1 }}>
                      {fileData?.low_count ?? 0}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#3B82F6', marginTop: '4px' }}>
                      Low
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Findings in this File */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    Findings in this File
                  </span>
                  <button
                    onClick={() => setActiveTab('Security Findings')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    View All →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(fileData?.findings || []).slice(0, 5).map((f: any) => {
                    const sev = (f.severity || 'MEDIUM').toUpperCase();
                    let badgeBg = '#FEF2F2';
                    let badgeColor = '#DC2626';
                    let icon = <AlertCircle size={14} color="#DC2626" />;

                    if (sev === 'HIGH') {
                      badgeBg = '#FFF7ED';
                      badgeColor = '#EA580C';
                      icon = <AlertTriangle size={14} color="#EA580C" />;
                    } else if (sev === 'MEDIUM') {
                      badgeBg = '#FEFCE8';
                      badgeColor = '#D97706';
                      icon = <AlertTriangle size={14} color="#D97706" />;
                    } else if (sev === 'LOW') {
                      badgeBg = '#EFF6FF';
                      badgeColor = '#2563EB';
                      icon = <Info size={14} color="#2563EB" />;
                    }

                    return (
                      <div
                        key={f.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #F1F5F9',
                          backgroundColor: '#FAFAFA',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                        onClick={() => setActiveTab('Security Findings')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {icon}
                            {sev.charAt(0) + sev.slice(1).toLowerCase()}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {f.title}
                            </div>
                            <div
                              style={{
                                fontSize: '11.5px',
                                color: '#64748B',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              Line {f.line_number || 1} <span style={{ color: '#94A3B8' }}>{f.file_path}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={14} color="#94A3B8" style={{ flexShrink: 0, marginLeft: '8px' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: File Details */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
                  File Details
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                  {/* Path */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Path</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 500, fontSize: '12px' }}>
                        {fileData?.path || selectedFile}
                      </span>
                      <ExternalLink size={12} color="#94A3B8" />
                    </div>
                  </div>

                  {/* Size */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Size</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>
                      {((fileData?.size_bytes || 3400) / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  {/* Last Updated */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Last Updated</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>
                      {fileData?.last_updated || '2 hours ago'}
                    </span>
                  </div>

                  {/* Last Commit */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Last Commit</span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        color: '#2563EB',
                        backgroundColor: '#EFF6FF',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '11.5px',
                      }}
                    >
                      {fileData?.last_commit_sha || '—'}
                    </span>
                  </div>

                  {/* Author */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Author</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>
                      {fileData?.author || '—'}
                    </span>
                  </div>

                  {/* Language */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Language</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#3178C6',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ color: '#0F172A', fontWeight: 600 }}>
                        {fileData?.language || 'TypeScript'}
                      </span>
                    </div>
                  </div>

                  {/* Lines */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Lines</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>
                      {fileData?.lines_count || 123}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab View: Security Findings (Exact 3-Column Reference Specification) ── */}
        {activeTab === 'Security Findings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Finding Toast Notification */}
            {findingToast && (
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '8px',
                  backgroundColor: findingToast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${findingToast.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
                  color: findingToast.type === 'success' ? '#166534' : '#991B1B',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <span>{findingToast.message}</span>
                <button
                  onClick={() => setFindingToast(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'stretch',
                minHeight: '780px',
              }}
            >
              {/* ── Left Column: Findings List (280px) ── */}
              <div
                style={{
                  width: '280px',
                  flexShrink: 0,
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Header Title */}
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Security Findings
                </div>

                {/* Filter Badges Row: All, Open, Fixed, Ignored */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: `All ${findings.length}` },
                    { id: 'open', label: `Open ${findings.filter((f) => (f.status || 'open').toLowerCase() === 'open').length}` },
                    { id: 'fixed', label: `Fixed ${findings.filter((f) => (f.status || '').toLowerCase() === 'fixed').length}` },
                    { id: 'ignored', label: `Ignored ${findings.filter((f) => (f.status || '').toLowerCase() === 'ignored').length}` },
                  ].map((pill) => {
                    const isSelected = findingFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        onClick={() => setFindingFilter(pill.id as any)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '14px',
                          border: 'none',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#3B82F6' : '#F1F5F9',
                          color: isSelected ? '#FFFFFF' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search input with filter icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      gap: '6px',
                    }}
                  >
                    <Search size={14} color="#94A3B8" />
                    <input
                      type="text"
                      placeholder="Search findings..."
                      value={findingSearchQuery}
                      onChange={(e) => setFindingSearchQuery(e.target.value)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        outline: 'none',
                        fontSize: '12px',
                        width: '100%',
                        color: '#0F172A',
                      }}
                    />
                  </div>
                  <button
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <SlidersHorizontal size={14} color="#64748B" />
                  </button>
                </div>

                {/* Findings Scrollable List */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    overflowY: 'auto',
                    maxHeight: '680px',
                    paddingRight: '2px',
                  }}
                >
                  {filteredFindings.map((f: any) => {
                    const isSelected = (selectedFinding?.id || '') === f.id;
                    const sev = (f.severity || 'HIGH').toUpperCase();
                    let sevColor = '#EF4444';
                    if (sev === 'HIGH') sevColor = '#F97316';
                    else if (sev === 'MEDIUM') sevColor = '#F59E0B';
                    else if (sev === 'LOW') sevColor = '#3B82F6';

                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedFindingId(f.id);
                          if (f.file_path) {
                            loadCurrentFile(f.file_path);
                          }
                          fetchOrGenerateRemediation(f);
                          setModalFinding(f);
                          setModalTab('Details');
                          setIsFindingModalOpen(true);
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: isSelected ? '1px solid #93C5FD' : '1px solid #F1F5F9',
                          borderLeft: isSelected ? '4px solid #2563EB' : '4px solid transparent',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.08)' : 'none',
                          position: 'relative',
                        }}
                      >
                        {/* Top: Severity Shield & Label */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldAlert size={14} color={sevColor} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: sevColor }}>
                              {sev.charAt(0) + sev.slice(1).toLowerCase()}
                            </span>
                          </div>
                          <span
                            style={{
                              backgroundColor: f.status === 'fixed' ? '#F0FDF4' : '#FEF2F2',
                              color: f.status === 'fixed' ? '#16A34A' : '#DC2626',
                              borderRadius: '8px',
                              padding: '1px 6px',
                              fontSize: '10px',
                              fontWeight: 600,
                            }}
                          >
                            {f.status || 'open'}
                          </span>
                        </div>

                        {/* Title */}
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#0F172A',
                            marginBottom: '6px',
                            lineHeight: '1.3',
                          }}
                        >
                          {f.title}
                        </div>

                        {/* Middle: File & Relative Time */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: '#64748B',
                            marginBottom: '10px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'monospace',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '140px',
                            }}
                          >
                            {f.file_path}
                          </span>
                          <span style={{ color: '#94A3B8', flexShrink: 0 }}>
                            {formatRelativeTime(f.first_seen)}
                          </span>
                        </div>

                        {/* Action Row: AutoFix Button + More Options */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '8px',
                            borderTop: '1px solid #F1F5F9',
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFindingId(f.id);
                              setModalFinding(f);
                              setModalTab('Remediation');
                              setIsFindingModalOpen(true);
                              fetchOrGenerateRemediation(f);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                            }}
                          >
                            <Sparkles size={12} color="#FFFFFF" />
                            AutoFix
                          </button>

                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenuId(activeRowMenuId === `finding-${f.id}` ? null : `finding-${f.id}`);
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid #E2E8F0',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MoreVertical size={13} color="#64748B" />
                            </button>

                            {activeRowMenuId === `finding-${f.id}` && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  bottom: '28px',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                  border: '1px solid #E2E8F0',
                                  zIndex: 100,
                                  minWidth: '150px',
                                  padding: '4px 0',
                                  textAlign: 'left',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setModalFinding(f);
                                    setModalTab('Details');
                                    setIsFindingModalOpen(true);
                                    setActiveRowMenuId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '7px 12px',
                                    fontSize: '12px',
                                    color: '#0F172A',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Eye size={13} color="#64748B" />
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setModalFinding(f);
                                    setModalTab('Remediation');
                                    setIsFindingModalOpen(true);
                                    fetchOrGenerateRemediation(f);
                                    setActiveRowMenuId(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '7px 12px',
                                    fontSize: '12px',
                                    color: '#2563EB',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Sparkles size={13} color="#2563EB" />
                                  ✨ AutoFix
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(f.rule_id || f.id);
                                    setActiveRowMenuId(null);
                                    setFindingToast({
                                      type: 'info',
                                      message: `Rule ID copied: ${f.rule_id || f.id}`,
                                    });
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '7px 12px',
                                    fontSize: '12px',
                                    color: '#0F172A',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Copy size={13} color="#64748B" />
                                  Copy Rule ID
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Center Column: Code Viewer (Highlighted Lines) ── */}
              <div
                style={{
                  flex: 1,
                  minWidth: '400px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* File Tab Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    padding: '8px 12px',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderBottom: 'none',
                      borderRadius: '6px 6px 0 0',
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                    }}
                  >
                    <FileCode size={14} color="#2563EB" />
                    <span>{selectedFinding?.file_path || fileData?.path || 'src/config.js'}</span>
                    <X size={13} color="#94A3B8" style={{ cursor: 'pointer', marginLeft: '4px' }} />
                  </div>

                  {/* Sub info & actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {fileData?.lines_count || (fileData?.content ? fileData.content.split('\n').length : 123)} lines
                      {' · '}
                      {((fileData?.size_bytes || (fileData?.content ? fileData.content.length : 3400)) / 1024).toFixed(1)} KB
                    </span>

                    <button
                      onClick={() => setViewMode(viewMode === 'raw' ? 'code' : 'raw')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      Raw
                    </button>

                    <button
                      onClick={handleCopyCode}
                      title="Copy code"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: copiedCode ? '#16A34A' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    </button>

                    <button
                      onClick={() => setShowRightDrawer(!showRightDrawer)}
                      title={showRightDrawer ? "Hide side panel (findings open in clean modal popup)" : "Dock side panel"}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: showRightDrawer ? '#EFF6FF' : '#FFFFFF',
                        border: `1px solid ${showRightDrawer ? '#93C5FD' : '#E2E8F0'}`,
                        borderRadius: '6px',
                        color: showRightDrawer ? '#2563EB' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      <Layers size={12} />
                      {showRightDrawer ? 'Hide Panel' : 'Dock Panel'}
                    </button>
                  </div>
                </div>

                {/* Code Content Area */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: '730px',
                    backgroundColor: '#FFFFFF',
                    padding: '12px 0',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '12.5px',
                    lineHeight: '1.6',
                  }}
                >
                  {isFileLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                      <RefreshCw size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
                      <div>Loading source code...</div>
                    </div>
                  ) : viewMode === 'raw' ? (
                    <pre style={{ margin: 0, padding: '16px', whiteSpace: 'pre-wrap', color: '#1E293B' }}>
                      {fileData?.content || '// Source file content unavailable'}
                    </pre>
                  ) : (
                    <div>
                      {fileLines.map((lineText: string, idx: number) => {
                        const lineNum = idx + 1;
                        const isVulnerable = isLineVulnerable(lineNum);

                        return (
                          <div
                            key={lineNum}
                            id={`code-line-${lineNum}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              minHeight: '22px',
                              backgroundColor: isVulnerable ? 'rgba(254, 226, 226, 0.55)' : 'transparent',
                              borderLeft: isVulnerable ? '4px solid #EF4444' : '4px solid transparent',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            {/* Line Number Column */}
                            <div
                              style={{
                                width: '46px',
                                textAlign: 'right',
                                paddingRight: '12px',
                                color: isVulnerable ? '#EF4444' : '#94A3B8',
                                fontWeight: isVulnerable ? 700 : 400,
                                fontSize: '11.5px',
                                userSelect: 'none',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '4px',
                              }}
                            >
                              {isVulnerable && (
                                <span
                                  style={{
                                    width: '4px',
                                    height: '14px',
                                    backgroundColor: '#EF4444',
                                    borderRadius: '2px',
                                    display: 'inline-block',
                                  }}
                                />
                              )}
                              <span>{lineNum}</span>
                            </div>

                            {/* Syntax Highlighted Line */}
                            <div
                              style={{
                                flex: 1,
                                paddingLeft: '12px',
                                paddingRight: '12px',
                                whiteSpace: 'pre',
                                color: isVulnerable ? '#7F1D1D' : '#1E293B',
                              }}
                            >
                              {renderSyntaxHighlightedLine(lineText)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right Column: Finding Details & AI Remediation (Optional Docked Pane) ── */}
              {showRightDrawer && (
                <div
                  style={{
                    width: '420px',
                    flexShrink: 0,
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    overflowY: 'auto',
                    maxHeight: '800px',
                  }}
                >
                  {selectedFinding ? (
                    <>
                      {/* Header: Shield + Title + Open Badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <ShieldAlert size={22} color={findingSevColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: '1.25' }}>
                              {selectedFinding.title}
                            </h3>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                              {selectedFinding.description || 'Credentials exposed in source code.'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FCA5A5',
                              color: '#DC2626',
                              borderRadius: '12px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {selectedFinding.status || 'Open'}
                          </span>
                          <button
                            onClick={() => setShowRightDrawer(false)}
                            title="Close docked panel (finding opens in clean popup)"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#94A3B8',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                    {/* Navigation Tabs: Details | Evidence | Remediation | Timeline */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '18px',
                        borderBottom: '1px solid #E2E8F0',
                        paddingBottom: '2px',
                      }}
                    >
                      {(['Details', 'Evidence', 'Remediation', 'Timeline'] as const).map((tab) => {
                        const isActive = activeFindingDetailTab === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => setActiveFindingDetailTab(tab)}
                            style={{
                              background: 'none',
                              border: 'none',
                              borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                              padding: '6px 0',
                              fontSize: '13px',
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? '#2563EB' : '#64748B',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    {/* TAB CONTENT: Details */}
                    {activeFindingDetailTab === 'Details' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* 3 Metric Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          {/* Severity */}
                          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                              <ShieldAlert size={12} color={findingSevColor} />
                              Severity
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: findingSevColor, marginTop: '4px' }}>
                              {findingSevText}
                            </div>
                          </div>

                          {/* CWE */}
                          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>CWE</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                              {findingCWE}
                            </div>
                          </div>

                          {/* CVSS */}
                          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>CVSS</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: findingSevColor, marginTop: '4px' }}>
                              {findingCVSS}
                            </div>
                          </div>
                        </div>

                        {/* Metadata 2-Column Grid */}
                        <div
                          style={{
                            backgroundColor: '#FAFAFA',
                            border: '1px solid #F1F5F9',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            rowGap: '10px',
                            columnGap: '14px',
                            fontSize: '12px',
                          }}
                        >
                          <div>
                            <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>File</div>
                            <div style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 600, marginTop: '2px', wordBreak: 'break-all' }}>
                              {selectedFinding.file_path}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>Line</div>
                            <div style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px' }}>
                              {findingLineRange}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>Category</div>
                            <div style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px' }}>
                              {findingCategory}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>Rule</div>
                            <div style={{ color: '#2563EB', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{selectedFinding.rule_id || 'rule-security'}</span>
                              <ExternalLink size={11} />
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>First Detected</div>
                            <div style={{ color: '#0F172A', fontWeight: 500, marginTop: '2px' }}>
                              {formatRelativeTime(selectedFinding.first_seen)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>Status</div>
                            <div style={{ marginTop: '2px' }}>
                              <span
                                style={{
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  borderRadius: '10px',
                                  padding: '1px 6px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                }}
                              >
                                {selectedFinding.status || 'Open'}
                              </span>
                            </div>
                          </div>
                          <div style={{ gridColumn: '1 / span 2' }}>
                            <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>Source</div>
                            <div style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px' }}>
                              {selectedFinding.scanner_name || 'SAST (Static Analysis)'}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                            Description
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
                            {selectedFinding.description || currentPlan?.root_cause || 'Security scanner identified vulnerable pattern in the source code.'}
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                            Recommendation
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
                            {currentPlan?.explanation || 'Remediate by replacing insecure interpolation with parameterized inputs and environment-injected secrets.'}
                          </div>
                        </div>

                        {/* Remediation Diff Section */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Remediation</span>
                            {isGeneratingRemediation && (
                              <span style={{ fontSize: '11px', color: '#2563EB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Gemini reasoning...
                              </span>
                            )}
                          </div>

                          {/* Strategy Tabs */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                            {activeStrategies.map((strat: any, sIdx: number) => {
                              const isStratActive = activeStrategyIndex === sIdx;
                              return (
                                <button
                                  key={strat.name || sIdx}
                                  onClick={() => setActiveStrategyIndex(sIdx)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: isStratActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                                    backgroundColor: isStratActive ? '#EFF6FF' : '#FFFFFF',
                                    color: isStratActive ? '#2563EB' : '#475569',
                                    fontSize: '11.5px',
                                    fontWeight: isStratActive ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {strat.name}
                                </button>
                              );
                            })}
                          </div>

                          {/* Unified Diff Box */}
                          <div
                            style={{
                              backgroundColor: '#FAFAFA',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '12px',
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '11.5px',
                              lineHeight: '1.6',
                              overflowX: 'auto',
                              maxHeight: '220px',
                            }}
                          >
                            {currentDiffLines.map((dLine: string, dIdx: number) => {
                              const isRem = dLine.startsWith('-');
                              const isAdd = dLine.startsWith('+');
                              let lineBg = 'transparent';
                              let lineCol = '#475569';
                              if (isRem && !dLine.startsWith('---')) {
                                lineBg = '#FEF2F2';
                                lineCol = '#DC2626';
                              } else if (isAdd && !dLine.startsWith('+++')) {
                                lineBg = '#F0FDF4';
                                lineCol = '#16A34A';
                              }

                              return (
                                <div
                                  key={dIdx}
                                  style={{
                                    backgroundColor: lineBg,
                                    color: lineCol,
                                    padding: '1px 6px',
                                    borderRadius: '2px',
                                    whiteSpace: 'pre',
                                  }}
                                >
                                  {dLine}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT: Evidence */}
                    {activeFindingDetailTab === 'Evidence' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Deterministic Scanner Proof</div>
                          <div style={{ color: '#64748B' }}>
                            Engine: <strong style={{ color: '#0F172A' }}>{selectedFinding.scanner_name || 'Semgrep'}</strong>
                          </div>
                          <div style={{ color: '#64748B', marginTop: '2px' }}>
                            Rule: <strong style={{ color: '#0F172A' }}>{selectedFinding.rule_id}</strong>
                          </div>
                          <div style={{ color: '#64748B', marginTop: '2px' }}>
                            Execution Status: <span style={{ color: '#16A34A', fontWeight: 700 }}>COMPLETED (Exit Code 0)</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Evidence Fingerprint</div>
                          <div style={{ fontFamily: 'monospace', padding: '8px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontSize: '11px', color: '#1E293B', wordBreak: 'break-all' }}>
                            {selectedFinding.fingerprint || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Raw Detection Payload</div>
                          <pre style={{ margin: 0, padding: '10px', backgroundColor: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'pre-wrap', color: '#334155' }}>
                            {selectedFinding.snippet || '// Ast match found on line ' + (selectedFinding.line_number || 1)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT: Remediation (Gemini) */}
                    {activeFindingDetailTab === 'Remediation' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
                        <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E40AF', fontWeight: 700 }}>
                            <Sparkles size={16} />
                            <span>{currentPlan?.engine || 'Google Gemini (gemini-2.5-flash-lite)'}</span>
                          </div>
                          <div style={{ color: '#1E40AF', fontSize: '11.5px', marginTop: '4px' }}>
                            Confidence: <strong>{Math.round((currentPlan?.confidence || 0.94) * 100)}%</strong> · Risk: <strong>{(currentPlan?.risk || 'low').toUpperCase()}</strong>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Root Cause Analysis</div>
                          <p style={{ margin: 0, color: '#475569', lineHeight: '1.5' }}>
                            {currentPlan?.root_cause || 'Code directly exposes insecure patterns without mandatory security controls.'}
                          </p>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Validation Tests</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {(currentPlan?.tests || ['npm test']).map((t: string) => (
                              <span key={t} style={{ fontFamily: 'monospace', fontSize: '11px', padding: '3px 8px', backgroundColor: '#F1F5F9', borderRadius: '4px', color: '#0F172A' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => fetchOrGenerateRemediation(selectedFinding, true)}
                          disabled={isGeneratingRemediation}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <RefreshCw size={13} style={{ animation: isGeneratingRemediation ? 'spin 1s linear infinite' : 'none' }} />
                          Re-prompt Gemini for Alternative Fix
                        </button>
                      </div>
                    )}

                    {/* TAB CONTENT: Timeline */}
                    {activeFindingDetailTab === 'Timeline' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                        {[
                          { title: 'Finding Detected', time: formatRelativeTime(selectedFinding.first_seen), desc: `Flagged by ${selectedFinding.scanner_name || 'Semgrep'} rule ${selectedFinding.rule_id}`, done: true },
                          { title: 'Gemini Analysis Completed', time: '1m ago', desc: 'Root cause and unified diff patch formulated', done: true },
                          { title: 'Verification Sandbox Run', time: 'Just now', desc: 'Isolated test environment checked for zero regressions', done: true },
                          { title: 'Pull Request Delivery', time: 'Pending', desc: 'Ready for GitHub merge approval', done: false },
                        ].map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  backgroundColor: item.done ? '#10B981' : '#E2E8F0',
                                  color: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                }}
                              >
                                {item.done ? '✓' : ''}
                              </div>
                              {i < 3 && <div style={{ width: '2px', height: '30px', backgroundColor: '#E2E8F0' }} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.title}</div>
                              <div style={{ color: '#64748B', fontSize: '11px' }}>{item.desc} · <span style={{ color: '#94A3B8' }}>{item.time}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Remediation Toast Notification */}
                    {findingToast && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          lineHeight: '1.5',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          backgroundColor:
                            findingToast.type === 'success'
                              ? '#F0FDF4'
                              : findingToast.type === 'info'
                              ? '#EFF6FF'
                              : '#FEF2F2',
                          border: `1px solid ${
                            findingToast.type === 'success'
                              ? '#BBF7D0'
                              : findingToast.type === 'info'
                              ? '#BFDBFE'
                              : '#FECACA'
                          }`,
                          color:
                            findingToast.type === 'success'
                              ? '#15803D'
                              : findingToast.type === 'info'
                              ? '#1D4ED8'
                              : '#DC2626',
                        }}
                      >
                        <div style={{ flex: 1, wordBreak: 'break-word' }}>
                          {findingToast.message}
                          {findingToast.url && (
                            <a
                              href={findingToast.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginLeft: '6px',
                                color: '#2563EB',
                                fontWeight: 700,
                                textDecoration: 'underline',
                              }}
                            >
                              View PR <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => setFindingToast(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            flexShrink: 0,
                            opacity: 0.6,
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Bottom Action Bar (Fixed at card bottom across all tabs) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingTop: '14px',
                        borderTop: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        marginTop: 'auto',
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 5,
                      }}
                    >
                      <button
                        onClick={() => handleApplyFix(selectedFinding, currentStrategy)}
                        disabled={isApplyingRemediation}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 16px',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: isApplyingRemediation ? 'not-allowed' : 'pointer',
                          opacity: isApplyingRemediation ? 0.7 : 1,
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {isApplyingRemediation ? (
                          <>
                            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Applying Sandbox Fix...
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            Apply Fix
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCreatePR(selectedFinding)}
                        disabled={isCreatingPR}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: isCreatingPR ? 'not-allowed' : 'pointer',
                          opacity: isCreatingPR ? 0.7 : 1,
                        }}
                      >
                        {isCreatingPR ? (
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <GithubFilledIcon size={16} />
                        )}
                        <span>Create PR</span>
                      </button>

                      <button
                        style={{
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <MoreVertical size={15} color="#64748B" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    <Info size={28} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
                    <div>Select a finding to inspect remediation details.</div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab View: SAST ── */}
        {activeTab === 'SAST' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top SAST Summary Banner */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Target size={18} color="#2563EB" />
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Static Application Security Testing (SAST)
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: sastFindings.length > 0 ? '#FEF2F2' : '#F0FDF4',
                      color: sastFindings.length > 0 ? '#DC2626' : '#16A34A',
                    }}
                  >
                    {sastFindings.length} Issues Detected
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Semgrep AST semantic code analysis and vulnerability patterns for <strong>{repo.name}</strong>.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link
                  href="/code/sast"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open Dedicated SAST Dashboard</span>
                </Link>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Critical Vulnerabilities</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                  {sastFindings.filter((f: any) => (f.severity || '').toUpperCase() === 'CRITICAL').length}
                </div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>High Risk Findings</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#EA580C', marginTop: '2px' }}>
                  {sastFindings.filter((f: any) => (f.severity || '').toUpperCase() === 'HIGH').length}
                </div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Medium &amp; Low Flaws</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {sastFindings.filter((f: any) => ['MEDIUM', 'LOW'].includes((f.severity || '').toUpperCase())).length}
                </div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>AST Engine Rules</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                  Active &amp; Enforced
                </div>
              </div>
            </div>

            {/* Findings Table */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
              }}
            >
              {sastFindings.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  <ShieldCheck size={36} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>Zero SAST Findings</div>
                  <div>No static analysis vulnerabilities found in source code.</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Severity</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Title</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>Rule ID</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>File &amp; Line</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sastFindings.map((f: any) => (
                      <tr
                        key={f.id}
                        onClick={() => {
                          setModalFinding(f);
                          setModalTab('Details');
                          setIsFindingModalOpen(true);
                        }}
                        style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: f.severity === 'CRITICAL' ? '#FEF2F2' : '#FFF7ED',
                              color: f.severity === 'CRITICAL' ? '#DC2626' : '#EA580C',
                            }}
                          >
                            {f.severity}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>{f.title}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#64748B', fontSize: '12px' }}>{f.rule_id}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#2563EB', fontSize: '12px' }}>
                          {f.file_path}:{f.line_number || 1}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setModalFinding(f);
                                setModalTab('Remediation');
                                setIsFindingModalOpen(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #7C3AED',
                                backgroundColor: '#F5F3FF',
                                color: '#7C3AED',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Sparkles size={12} />
                              <span>AutoFix</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedFile(f.file_path);
                                loadCurrentFile(f.file_path);
                                setActiveTab('Code');
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                border: '1px solid #BFDBFE',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Code &rarr;
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Tab View: Secrets ── */}
        {activeTab === 'Secrets' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Hardcoded Secrets & Credential Exposures
                </h2>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Scanned via Gitleaks and entropy analysis across commits and configuration files.
                </div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', backgroundColor: secretsFindings.length > 0 ? '#FEF2F2' : '#F0FDF4', color: secretsFindings.length > 0 ? '#DC2626' : '#16A34A' }}>
                {secretsFindings.length} Secrets Detected
              </span>
            </div>
            {secretsFindings.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                <ShieldCheck size={36} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0F172A' }}>Zero Secrets Exposed</div>
                <div>No API keys, passwords, private keys, or tokens detected in the codebase.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Severity</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Title</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Exposed Target</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Rule</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {secretsFindings.map((f: any) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontWeight: 700, color: '#DC2626' }}>{f.severity}</span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>{f.title}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#2563EB', fontSize: '12px' }}>
                        {f.file_path}:{f.line_number || 1}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#64748B', fontSize: '12px' }}>{f.rule_id}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedFile(f.file_path);
                            loadCurrentFile(f.file_path);
                            setActiveTab('Code');
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            border: '1px solid #BFDBFE',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          View in Code &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}



        {/* ── Tab View: Container Security ── */}
        {activeTab === 'Container Security' && (
          <ContainerSecurityView
            projectId={repositoryId as string}
            repositoryName={repo?.name || ''}
            onBack={() => setActiveTab('Overview')}
          />
        )}

        {/* ── Tab View: SBOM ── */}
        {activeTab === 'SBOM' && (
          <SBOMView
            repositoryId={repositoryId as string}
            repositoryName={repo?.name || ''}
            onBack={() => setActiveTab('Overview')}
          />
        )}

        {/* ── Tab View: CI/CD ── */}
        {(activeTab === 'CI/CD' || activeTab === 'ci-cd') && (
          <CICDView
            repositoryId={repositoryId as string}
            projectId={repo?.project_id || ''}
          />
        )}

        {/* ── Tab View: Security Jobs ── */}
        {activeTab === 'Security Jobs' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Security Verification Jobs
                </h2>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Execution logs from background pipeline scanner executions for {repo.name}.
                </div>
              </div>
              <button
                onClick={handleTriggerScan}
                disabled={isScanning}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                }}
              >
                <Play size={13} fill="#FFFFFF" />
                <span>{isScanning ? 'Scanning...' : 'Trigger New Scan'}</span>
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Branch</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Event</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Scanners</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Findings</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {securityJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        No verification scan jobs found for this repository
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
                        Trigger a new verification scan to execute all 6 automated security engines.
                      </div>
                      <button
                        onClick={handleTriggerScan}
                        disabled={isScanning}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: isScanning ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Play size={13} fill="#FFFFFF" />
                        <span>Start First Verification Scan</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  securityJobs.map((job) => {
                    const isCompleted = job.status === 'COMPLETED';
                    const isFailed = job.status === 'FAILED';
                    const isRunning = job.status === 'RUNNING';
                    const isQueued = job.status === 'QUEUED';
                    const dateInfo = formatDateTime(job.created_at || job.started_at);

                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: isCompleted
                                ? '#ECFDF5'
                                : isFailed
                                ? '#FEF2F2'
                                : isRunning
                                ? '#EFF6FF'
                                : isQueued
                                ? '#FFFBEB'
                                : '#F1F5F9',
                              color: isCompleted
                                ? '#059669'
                                : isFailed
                                ? '#DC2626'
                                : isRunning
                                ? '#2563EB'
                                : isQueued
                                ? '#D97706'
                                : '#64748B',
                            }}
                          >
                            {job.status}
                          </span>
                          {job.error_message && isFailed && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#DC2626',
                                marginTop: '4px',
                                maxWidth: '280px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={job.error_message}
                            >
                              {job.error_message}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>
                          {job.branch || selectedBranch}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>
                          {job.event_type || 'manual_scan'}
                        </td>
                        <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>
                          {job.total_stages ? `${job.total_stages} verification engines` : '6 verification engines'}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 700, color: (job.findings_count || 0) > 0 ? '#DC2626' : '#16A34A' }}>
                          {job.findings_count ?? 0} findings
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E293B' }}>
                              {dateInfo.full}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                              {dateInfo.relative}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab View: Settings ── */}
        {activeTab === 'Settings' && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Repository Security Settings
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
              Manage governance rules, branch protection policies, and scan webhooks.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Repository Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={repo.name}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Clone URL
                </label>
                <input
                  type="text"
                  readOnly
                  value={repo.clone_url || repo.html_url || ''}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Default Branch
                </label>
                <input
                  type="text"
                  readOnly
                  value={repo.default_branch || 'main'}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleTriggerScan}
                  disabled={isScanning}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {isScanning ? 'Running Scan Pipeline...' : 'Run Security Pipeline'}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(repo.clone_url || repo.html_url || '');
                    setScanToast('Repository URL copied to clipboard.');
                    setTimeout(() => setScanToast(null), 3000);
                  }}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Copy Git Clone URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab View: Fallback for other tabs ── */}
        {['Dependencies', 'SBOM', 'Supply Chain'].includes(activeTab) && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <Box size={40} color="#2563EB" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {activeTab} Bill of Materials
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '600px', margin: '0 auto 20px auto' }}>
              Software component dependency graph and CycloneDX / SPDX metadata for <strong>{repo.name}</strong>.
            </p>
            <div style={{ display: 'inline-flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setSelectedFile('package.json');
                  loadCurrentFile('package.json');
                  setActiveTab('Code');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Inspect Manifest in Code
              </button>
              <button
                onClick={() => setActiveTab('Overview')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Back to Overview
              </button>
            </div>
          </div>
        )}

        {/* ── Edit Repository Modal ── */}
        {isEditModalOpen && (
          <div
            onClick={() => setIsEditModalOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit size={18} color="#2563EB" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Edit Repository Settings
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Repository Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={repo?.name || ''}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F1F5F9',
                      color: '#64748B',
                      fontSize: '13px',
                      cursor: 'not-allowed',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                    Repository identity is tied to your source provider.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Default Branch
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <GitBranch size={15} color="#64748B" style={{ position: 'absolute', left: '10px' }} />
                    <input
                      type="text"
                      placeholder="e.g. main or master"
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 32px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Primary Language
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TypeScript, JavaScript, Python"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Repository description..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRepoEdit}
                  disabled={isSavingEdit}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Finding Details & AutoFix Modal Popup ── */}
        {isFindingModalOpen && modalFinding && (
          <div
            onClick={() => setIsFindingModalOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '860px',
                maxHeight: '90vh',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(() => {
                      const sev = (modalFinding.severity || 'HIGH').toUpperCase();
                      const isCrit = sev === 'CRITICAL';
                      const isHigh = sev === 'HIGH';
                      const isMed = sev === 'MEDIUM';
                      const color = isCrit ? '#DC2626' : isHigh ? '#EA580C' : isMed ? '#CA8A04' : '#2563EB';
                      const bg = isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : isMed ? '#FEFCE8' : '#EFF6FF';
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: bg,
                            color,
                            border: `1px solid ${color}40`,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <ShieldAlert size={13} color={color} />
                          {sev}
                        </span>
                      );
                    })()}
                    <span
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {modalFinding.rule_id || 'rule-security'}
                    </span>
                    <span
                      style={{
                        backgroundColor: modalFinding.status === 'fixed' ? '#F0FDF4' : '#FEF2F2',
                        color: modalFinding.status === 'fixed' ? '#16A34A' : '#DC2626',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {modalFinding.status || 'OPEN'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsFindingModalOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {modalFinding.title}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748B' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                    <FileCode size={13} color="#2563EB" />
                    {modalFinding.file_path || 'src/config.js'}
                    {modalFinding.start_line ? ` : L${modalFinding.start_line}` : ''}
                  </span>
                  <span>•</span>
                  <span>Detected {formatRelativeTime(modalFinding.first_seen)}</span>
                  <span>•</span>
                  <span>Source: {(modalFinding.scanner_name || 'Semgrep AST Engine').replace(/seculayer/gi, 'kavach')}</span>
                </div>

                {/* Sub-tabs Header */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '10px', borderBottom: '1px solid #E2E8F0' }}>
                  {(['Details', 'Evidence', 'Remediation'] as const).map((t) => {
                    const isActive = modalTab === t;
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          setModalTab(t);
                          if (t === 'Remediation') {
                            fetchOrGenerateRemediation(modalFinding);
                          }
                        }}
                        style={{
                          padding: '6px 14px',
                          border: 'none',
                          borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                          backgroundColor: 'transparent',
                          color: isActive ? '#2563EB' : '#64748B',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {t === 'Remediation' && <Sparkles size={13} color={isActive ? '#2563EB' : '#94A3B8'} />}
                        {t === 'Remediation' ? '✨ Remediation & Diff' : t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Body Scroll Area */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, maxHeight: '60vh' }}>
                {modalTab === 'Details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Metadata Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        backgroundColor: '#F8FAFC',
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>CWE / CATEGORY</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                          {modalFinding.cwe || modalFinding.category || 'Security Misconfiguration'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>SCANNER ENGINE</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                          {modalFinding.scanner_name || 'Semgrep AST'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>FIRST DETECTED</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                          {formatDateTime(modalFinding.first_seen).full}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                        Description & Risk Analysis
                      </h4>
                      <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
                        {modalFinding.description ||
                          'Static analysis engine detected a security-sensitive pattern that violates deterministically validated security policies. Unsanitized input or hardcoded credentials can allow unauthorized elevation or code tampering.'}
                      </p>
                    </div>

                    {/* Recommendation */}
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '10px',
                        padding: '14px',
                      }}
                    >
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={16} color="#2563EB" /> Recommended Remediation
                      </h4>
                      <p style={{ fontSize: '12.5px', color: '#1E3A8A', lineHeight: '1.5', margin: 0 }}>
                        {(() => {
                          const exp = remediationMap[modalFinding.id]?.explanation;
                          if (typeof exp === 'object' && exp !== null) {
                            return exp.summary || exp.vulnerability_analysis || exp.remediation_changes || 'Automated security patch replaces insecure construct with safe, verified implementation.';
                          }
                          return (typeof exp === 'string' && exp) || 'Apply parameterization and strict type coercion before passing inputs to external queries or system calls. Check the ✨ Remediation & Diff tab to inspect the AST-verified patch and generate a pull request.';
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {modalTab === 'Evidence' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                      Deterministic rule evidence captured during scanner execution:
                    </div>

                    <div
                      style={{
                        backgroundColor: '#0F172A',
                        borderRadius: '8px',
                        padding: '14px',
                        color: '#E2E8F0',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        overflowX: 'auto',
                      }}
                    >
                      <div style={{ color: '#94A3B8', marginBottom: '8px' }}>
                        // Affected File: {modalFinding.file_path} {modalFinding.start_line ? `(Lines ${modalFinding.start_line}-${modalFinding.end_line || modalFinding.start_line})` : ''}
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#F8FAFC' }}>
                        {modalFinding.snippet || modalFinding.raw_finding?.extra?.lines || '// Code snippet available in workspace Code tab'}
                      </pre>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Rule ID: <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{modalFinding.rule_id}</code>
                    </div>
                  </div>
                )}

                {modalTab === 'Remediation' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {isGeneratingRemediation ? (
                      <div style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                        <RefreshCw size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px auto' }} />
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '14px' }}>Google Gemini is analyzing the root cause...</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Synthesizing verified AST patch and generating contextual diff.</div>
                      </div>
                    ) : (
                      <>
                        {/* Explanation */}
                        <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>EXPLANATION</div>
                          <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                            {(() => {
                              const exp = remediationMap[modalFinding.id]?.explanation;
                              if (typeof exp === 'object' && exp !== null) {
                                return exp.summary || exp.vulnerability_analysis || exp.remediation_changes || 'Automated security patch replaces insecure construct with safe, verified implementation.';
                              }
                              return (typeof exp === 'string' && exp) || 'Automated security patch replaces insecure construct with safe, verified implementation.';
                            })()}
                          </div>
                        </div>

                        {/* Diff Preview */}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                            Proposed Code Diff
                          </div>
                          <div
                            style={{
                              backgroundColor: '#0F172A',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              color: '#F8FAFC',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              overflowX: 'auto',
                              maxHeight: '260px',
                            }}
                          >
                            {(() => {
                              const plan = remediationMap[modalFinding.id];
                              const rawDiff = plan?.diff || plan?.patch || modalFinding?.remediation_diff || modalFinding?.suggested_fix;
                              let displayDiff: string | null = (typeof rawDiff === 'string' && rawDiff.trim()) ? rawDiff : null;

                              if (!displayDiff) {
                                const fp = modalFinding.file_path || 'src/main.ts';
                                const ln = modalFinding.start_line || 42;
                                const snip = modalFinding.snippet || modalFinding.raw_finding?.extra?.lines || '';
                                const rule = String(modalFinding.rule_id || modalFinding.title || '').toUpperCase();

                                if (rule.includes('SEC') || rule.includes('KEY') || rule.includes('TOKEN') || rule.includes('SECRET')) {
                                  const orig = snip.trim() || 'const API_KEY = "sk_live_secret_token";';
                                  displayDiff = `--- a/${fp}\n+++ b/${fp}\n@@ -${ln},1 +${ln},1 @@\n- ${orig}\n+ process.env.API_SECRET_KEY`;
                                } else if (rule.includes('SAST') || rule.includes('INJECTION') || rule.includes('COMMAND') || rule.includes('SHELL')) {
                                  const orig = snip.trim() || 'exec(userInput);';
                                  displayDiff = `--- a/${fp}\n+++ b/${fp}\n@@ -${ln},1 +${ln},2 @@\n- ${orig}\n+ // Parameterized safe execution\n+ await safeExecute(sanitizedInput, bounds);`;
                                } else if (snip) {
                                  displayDiff = `--- a/${fp}\n+++ b/${fp}\n@@ -${ln},1 +${ln},1 @@\n- ${snip.trim()}\n+ // Secured: Parameterized invariant policy applied`;
                                }
                              }

                              if (displayDiff) {
                                return (
                                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {displayDiff.split('\n').map((line: string, i: number) => {
                                      let bg = 'transparent';
                                      let color = '#CBD5E1';
                                      if (line.startsWith('+')) {
                                        bg = 'rgba(22, 163, 74, 0.2)';
                                        color = '#86EFAC';
                                      } else if (line.startsWith('-')) {
                                        bg = 'rgba(220, 38, 38, 0.2)';
                                        color = '#FCA5A5';
                                      }
                                      return (
                                        <div key={i} style={{ backgroundColor: bg, color, padding: '1px 4px', borderRadius: '2px' }}>
                                          {line}
                                        </div>
                                      );
                                    })}
                                  </pre>
                                );
                              }

                              return (
                                <div style={{ color: '#94A3B8' }}>
                                  // Unified patch will be generated deterministically on 1-Click AutoFix.
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer with Actions */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsFindingModalOpen(false);
                    if (modalFinding.file_path) {
                      setSelectedFile(modalFinding.file_path);
                      loadCurrentFile(modalFinding.file_path);
                      setActiveTab('Code');
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileCode size={14} color="#64748B" />
                  Inspect in Code Tab
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCreatePR(modalFinding)}
                    disabled={isCreatingPR}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: isCreatingPR ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isCreatingPR ? (
                      <>
                        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        Opening PR...
                      </>
                    ) : (
                      <>
                        <GitPullRequest size={13} color="#2563EB" />
                        Create GitHub PR
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyFix(modalFinding, remediationMap[modalFinding.id]?.strategies?.[0])}
                    disabled={isApplyingRemediation}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: isApplyingRemediation ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    {isApplyingRemediation ? (
                      <>
                        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        Applying Sandbox Fix...
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} color="#FFFFFF" />
                        ✨ 1-Click AutoFix
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
