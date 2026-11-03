'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Layers,
  FileCode2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  Copy,
  Check,
  MoreVertical,
  Calendar,
  Code,
  Wrench,
  Sparkles,
  Terminal,
  ArrowRight,
  GitCommit,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  DockerfileSummaryResponse,
  DockerfileChartDataResponse,
  DockerfileItem,
  DockerfileFindingDetail,
  DockerfileRecommendationItem,
  DockerfileInspectionResponse,
} from '@/types/api/container';

interface DockerfileSecurityViewProps {
  projectId: string | null;
  repositoryName?: string;
  hideHeader?: boolean;
}

export const DockerfileSecurityView: React.FC<DockerfileSecurityViewProps> = ({
  projectId,
  repositoryName = '',
  hideHeader = false,
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'All Dockerfiles' | 'Findings' | 'Build Config' | 'Recommendations'>('All Dockerfiles');

  // Data states
  const [summary, setSummary] = useState<DockerfileSummaryResponse | null>(null);
  const [charts, setCharts] = useState<DockerfileChartDataResponse | null>(null);
  const [dockerfiles, setDockerfiles] = useState<DockerfileItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [findings, setFindings] = useState<DockerfileFindingDetail[]>([]);
  const [recommendations, setRecommendations] = useState<DockerfileRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedBuildType, setSelectedBuildType] = useState('All');
  const [selectedBaseImage, setSelectedBaseImage] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter options from API
  const [repoOptions, setRepoOptions] = useState<string[]>([]);
  const [baseImageOptions, setBaseImageOptions] = useState<string[]>([]);
  const [buildTypeOptions, setBuildTypeOptions] = useState<string[]>([]);

  // Selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedFinding, setSelectedFinding] = useState<DockerfileFindingDetail | null>(null);
  const [selectedDockerfileDetail, setSelectedDockerfileDetail] = useState<DockerfileItem | null>(null);

  // Modals
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanFilePath, setScanFilePath] = useState('./Dockerfile');
  const [scanRepo, setScanRepo] = useState('myapp/api');
  const [scanContent, setScanContent] = useState(
    'FROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]'
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Drawer & Inspection State
  const [inspectionData, setInspectionData] = useState<DockerfileInspectionResponse | null>(null);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);
  const [inspectionTab, setInspectionTab] = useState<'findings' | 'code' | 'diff'>('findings');
  const [remediatingFindingId, setRemediatingFindingId] = useState<string | null>(null);
  const [remediationSuccessMsg, setRemediationSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDockerfileDetail) {
      setInspectionData(null);
      setInspectionTab('findings');
      setRemediationSuccessMsg(null);
      return;
    }
    let cancelled = false;
    const fetchInspection = async () => {
      setIsLoadingInspection(true);
      try {
        const data = await api.containers.dockerfileDetail(selectedDockerfileDetail.id);
        if (!cancelled) {
          setInspectionData(data);
        }
      } catch (err) {
        console.error('Failed to fetch dockerfile detail:', err);
      } finally {
        if (!cancelled) {
          setIsLoadingInspection(false);
        }
      }
    };
    fetchInspection();
    return () => {
      cancelled = true;
    };
  }, [selectedDockerfileDetail]);

  const handleApplyRemediation = async (findingId?: string, ruleId?: string) => {
    if (!selectedDockerfileDetail) return;
    setRemediatingFindingId(findingId || 'all');
    try {
      const res = await api.containers.remediateDockerfile(selectedDockerfileDetail.id, {
        finding_id: findingId,
        rule_id: ruleId,
      });
      setRemediationSuccessMsg(res.message || 'Remediation successfully applied.');
      const refreshed = await api.containers.dockerfileDetail(selectedDockerfileDetail.id);
      setInspectionData(refreshed);
      loadOverview();
      loadDockerfiles();
      setTimeout(() => setRemediationSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Remediation failed:', err);
      alert(err?.message || 'Failed to apply remediation');
    } finally {
      setRemediatingFindingId(null);
    }
  };

  // Fetch summary and charts
  const loadOverview = useCallback(async () => {
    try {
      const [sumRes, chartRes] = await Promise.all([
        api.containers.dockerfilesSummary(projectId),
        api.containers.dockerfilesCharts(projectId),
      ]);
      setSummary(sumRes);
      setCharts(chartRes);
    } catch (err: any) {
      console.error('Failed to load dockerfile summary:', err);
    }
  }, [projectId]);

  // Fetch dockerfiles list
  const loadDockerfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.containers.dockerfilesList({
        projectId,
        search: search || undefined,
        repository: selectedRepo,
        severity: selectedSeverity,
        build_type: selectedBuildType,
        base_image: selectedBaseImage,
        status: selectedStatus,
        page,
        pageSize,
      });
      setDockerfiles(res.items || []);
      setTotalItems(res.total || 0);
      if (res.repositories?.length) setRepoOptions(res.repositories);
      if (res.base_images?.length) setBaseImageOptions(res.base_images);
      if (res.build_types?.length) setBuildTypeOptions(res.build_types);
    } catch (err: any) {
      setError(err?.message || 'Failed to query Dockerfile security data');
    } finally {
      setLoading(false);
    }
  }, [projectId, search, selectedRepo, selectedSeverity, selectedBuildType, selectedBaseImage, selectedStatus, page]);

  // Fetch findings
  const loadFindings = useCallback(async () => {
    try {
      const res = await api.containers.dockerfilesFindings({
        projectId,
        severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
      });
      setFindings(res || []);
    } catch (err: any) {
      console.error('Failed to load findings:', err);
    }
  }, [projectId, selectedSeverity]);

  // Fetch recommendations
  const loadRecommendations = useCallback(async () => {
    try {
      const res = await api.containers.dockerfilesRecommendations(projectId);
      setRecommendations(res || []);
    } catch (err: any) {
      console.error('Failed to load recommendations:', err);
    }
  }, [projectId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadDockerfiles();
  }, [loadDockerfiles]);

  useEffect(() => {
    if (activeTab === 'Findings') loadFindings();
    if (activeTab === 'Recommendations') loadRecommendations();
  }, [activeTab, loadFindings, loadRecommendations]);

  // Handle scan execution
  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanResultMsg(null);
    try {
      const res = await api.containers.scanDockerfile({
        project_id: projectId,
        repository_name: scanRepo,
        dockerfile_path: scanFilePath,
        content: scanContent,
      });
      setScanResultMsg({
        text: `Scan complete: ${res.issues_count} issue(s) identified in ${scanFilePath}.`,
        isError: false,
      });
      loadOverview();
      loadDockerfiles();
      setTimeout(() => {
        setIsScanModalOpen(false);
        setScanResultMsg(null);
      }, 1500);
    } catch (err: any) {
      setScanResultMsg({
        text: err?.message || 'Scan execution failed. Verify Trivy availability.',
        isError: true,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedRepo('All');
    setSelectedSeverity('All');
    setSelectedBuildType('All');
    setSelectedBaseImage('All');
    setSelectedStatus('All');
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(dockerfiles.map(d => d.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        minHeight: hideHeader ? undefined : '100vh',
        padding: hideHeader ? '0' : '24px 32px',
        fontFamily: 'inherit',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ── BREADCRUMBS & TOP HEADER ── */}
      {!hideHeader ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
              <span>Code</span>
              <span style={{ color: '#94A3B8' }}>&gt;</span>
              <span>Container Security</span>
              <span style={{ color: '#94A3B8' }}>&gt;</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Dockerfiles</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Dockerfile & Build Security
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
              Analyze Dockerfiles and build configurations for security misconfigurations, risky instructions and best practices.
            </p>
          </div>

          {/* Top Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Date Range Dropdown */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                cursor: 'pointer',
              }}
            >
              <Calendar size={15} color="#64748B" />
              <span>{dateRange}</span>
              <ChevronDown size={14} color="#64748B" />
            </div>

            {/* Scan Dockerfile Action Button */}
            <button
              onClick={() => setIsScanModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563EB')}
            >
              <Play size={14} fill="#FFFFFF" />
              <span>Scan Dockerfile</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <Calendar size={14} color="#64748B" />
            <span>{dateRange}</span>
            <ChevronDown size={13} color="#64748B" />
          </div>

          <button
            onClick={() => setIsScanModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1E293B')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0F172A')}
          >
            <Play size={13} fill="#FFFFFF" />
            <span>Scan Dockerfile</span>
          </button>
        </div>
      )}

      {/* ── TOP STATS ROW (4 CARDS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Scanned Dockerfiles */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '8px' }}>
            Scanned Dockerfiles
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              {summary?.scanned_dockerfiles ?? 0}
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: (summary?.scanned_dockerfiles ?? 0) > 0 ? '#16A34A' : '#64748B', display: 'flex', alignItems: 'center' }}>
              {summary?.scanned_trend || ((summary?.scanned_dockerfiles ?? 0) > 0 ? 'Active' : '0 scanned')}
            </span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B' }}>
            Across {summary?.repositories_count ?? 0} repositories
          </div>
        </div>

        {/* Card 2: Dockerfiles with Issues */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '8px' }}>
            Dockerfiles with Issues
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              {summary?.dockerfiles_with_issues ?? 0}
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: (summary?.dockerfiles_with_issues ?? 0) > 0 ? '#DC2626' : '#16A34A', display: 'flex', alignItems: 'center' }}>
              {summary?.issues_trend || ((summary?.dockerfiles_with_issues ?? 0) > 0 ? 'Requires attention' : 'All clean')}
            </span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B' }}>
            {summary?.issues_percentage || '0% of total'}
          </div>
        </div>

        {/* Card 3: Severity Breakdown */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Critical */}
          <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              Critical
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{summary?.critical_count ?? 0}</div>
            <div style={{ fontSize: '10.5px', color: (summary?.critical_count ?? 0) > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{summary?.critical_trend || ((summary?.critical_count ?? 0) > 0 ? 'High risk' : 'Zero')}</div>
          </div>
          {/* High */}
          <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F97316' }} />
              High
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{summary?.high_count ?? 0}</div>
            <div style={{ fontSize: '10.5px', color: (summary?.high_count ?? 0) > 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{summary?.high_trend || ((summary?.high_count ?? 0) > 0 ? 'High' : 'Zero')}</div>
          </div>
          {/* Medium */}
          <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              Medium
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{summary?.medium_count ?? 0}</div>
            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>{summary?.medium_trend || 'None'}</div>
          </div>
          {/* Low */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
              Low
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{summary?.low_count ?? 0}</div>
            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>{summary?.low_trend || 'None'}</div>
          </div>
        </div>

        {/* Card 4: Best Practice Compliance */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '8px' }}>
            Best Practice Compliance
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              {summary?.best_practice_compliance_pct ?? 100}%
            </span>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#16A34A', display: 'flex', alignItems: 'center' }}>
              {summary?.compliance_trend || 'Pass'}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{ width: `${summary?.best_practice_compliance_pct ?? 100}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '999px' }} />
          </div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            {summary?.checks_passing || '0/0 checks passing'}
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW (3 VISUAL PANELS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Panel 1: Top Dockerfile Issues */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Top Dockerfile Issues
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              From latest scans
            </span>
          </div>

          {(!charts?.top_issues || charts.top_issues.length === 0) ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px', minHeight: '120px' }}>
              No Dockerfile issues detected across audited repositories
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'space-around' }}>
              {charts.top_issues.map((issue, idx) => {
                const maxCount = Math.max(...charts.top_issues.map(i => i.count), 1);
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px' }}>
                    <span style={{ width: '150px', color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={issue.name}>
                      {issue.name}
                    </span>
                    <div style={{ flex: 1, height: '14px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, (issue.count / maxCount) * 100)}%`,
                          height: '100%',
                          backgroundColor: issue.color || '#EF4444',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <span style={{ width: '24px', textAlign: 'right', fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                      {issue.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2: Security Findings by Severity Time-series */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Security Findings by Severity
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} /> Critical
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F97316' }} /> High
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F59E0B' }} /> Medium
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#3B82F6' }} /> Low
              </span>
            </div>
          </div>

          {(!charts?.findings_by_severity_timeseries || charts.findings_by_severity_timeseries.length === 0) ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px', minHeight: '120px' }}>
              No historical trend data available yet
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '10px' }}>
              {charts.findings_by_severity_timeseries.map((bar, i) => {
                const totalBar = bar.critical + bar.high + bar.medium + bar.low;
                const maxVal = Math.max(...charts.findings_by_severity_timeseries.map(b => b.critical + b.high + b.medium + b.low), 10);
                const hLow = (bar.low / maxVal) * 110;
                const hMed = (bar.medium / maxVal) * 110;
                const hHigh = (bar.high / maxVal) * 110;
                const hCrit = (bar.critical / maxVal) * 110;

                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '18px', display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px', overflow: 'hidden', minHeight: totalBar > 0 ? '4px' : '0px' }}>
                      <div style={{ height: `${hLow}px`, backgroundColor: '#3B82F6' }} title={`Low: ${bar.low}`} />
                      <div style={{ height: `${hMed}px`, backgroundColor: '#F59E0B' }} title={`Medium: ${bar.medium}`} />
                      <div style={{ height: `${hHigh}px`, backgroundColor: '#F97316' }} title={`High: ${bar.high}`} />
                      <div style={{ height: `${hCrit}px`, backgroundColor: '#EF4444' }} title={`Critical: ${bar.critical}`} />
                    </div>
                    <span style={{ fontSize: '10px', color: '#94A3B8', transform: 'rotate(-20deg)', whiteSpace: 'nowrap' }}>
                      {bar.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 3: Build Stage Analysis (Donut) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Build Stage Analysis
            </h3>
          </div>

          {(!charts?.build_stage_analysis || charts.build_stage_analysis.length === 0) ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px', minHeight: '120px' }}>
              No build stage data recorded
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
              {/* Dynamic Donut representation */}
              <div style={{ position: 'relative', width: '105px', height: '105px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {(() => {
                    let cumulativePct = 0;
                    return charts.build_stage_analysis.map((stage, sIdx) => {
                      const strokeDash = `${stage.pct} ${100 - stage.pct}`;
                      const strokeOffset = -cumulativePct;
                      cumulativePct += stage.pct;
                      return (
                        <circle
                          key={sIdx}
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="transparent"
                          stroke={stage.color || '#2563EB'}
                          strokeWidth="3.2"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={strokeOffset}
                        />
                      );
                    });
                  })()}
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                    {charts?.total_dockerfiles ?? (dockerfiles?.length || 0)}
                  </span>
                  <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>Dockerfiles</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', color: '#475569', flex: 1 }}>
                {charts.build_stage_analysis.map((stage, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: stage.color, flexShrink: 0 }} />
                    <span style={{ color: '#334155', fontWeight: 500 }}>{stage.type}</span>
                    <span style={{ fontWeight: 700, color: '#0F172A', marginLeft: 'auto' }}>
                      {stage.count} ({stage.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SUB-TABS (All Dockerfiles, Findings, Build Config, Recommendations) ── */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
        {(['All Dockerfiles', 'Findings', 'Build Config', 'Recommendations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 4px',
              fontSize: '13.5px',
              fontWeight: activeTab === tab ? 600 : 500,
              color: activeTab === tab ? '#2563EB' : '#64748B',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      {activeTab === 'All Dockerfiles' && (
        <>
          {/* Controls Bar: Search & Dropdowns */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search Dockerfiles..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 34px',
                  fontSize: '13px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Repository Filter */}
              <select
                value={selectedRepo}
                onChange={e => { setSelectedRepo(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="All">Repository: All</option>
                {repoOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {/* Severity Filter */}
              <select
                value={selectedSeverity}
                onChange={e => { setSelectedSeverity(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="All">Severity: All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Build Type Filter */}
              <select
                value={selectedBuildType}
                onChange={e => { setSelectedBuildType(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="All">Build Type: All</option>
                {buildTypeOptions.map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>

              {/* Base Image Filter */}
              <select
                value={selectedBaseImage}
                onChange={e => { setSelectedBaseImage(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="All">Base Image: All</option>
                {baseImageOptions.map(bi => (
                  <option key={bi} value={bi}>{bi}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="All">Status: All</option>
                <option value="Completed">Completed</option>
                <option value="Running">Running</option>
                <option value="Failed">Failed</option>
              </select>

              {/* Clear button */}
              <button
                onClick={handleClearFilters}
                style={{
                  padding: '7px 12px',
                  fontSize: '12.5px',
                  color: '#64748B',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>

              <button
                onClick={() => loadDockerfiles()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '7px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                title="Refresh Table"
              >
                <RefreshCw size={14} color="#64748B" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                  <th style={{ width: '40px', padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.size > 0 && selectedRows.size === dockerfiles.length}
                      onChange={e => handleSelectAll(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px' }}>Dockerfile Path</th>
                  <th style={{ padding: '12px 16px' }}>Repository</th>
                  <th style={{ padding: '12px 16px' }}>Base Image</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Lines</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Issues</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Critical</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>High</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Medium</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Low</th>
                  <th style={{ padding: '12px 16px' }}>Last Scanned</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Loading Dockerfile security findings...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '48px', color: '#DC2626' }}>
                      <AlertTriangle size={20} style={{ margin: '0 auto 8px auto' }} />
                      {error}
                    </td>
                  </tr>
                ) : dockerfiles.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
                      No Dockerfiles found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  dockerfiles.map(row => {
                    const isSelected = selectedRows.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(row.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                          <span
                            onClick={() => setSelectedDockerfileDetail(row)}
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <FileCode2 size={15} color="#2563EB" />
                            {row.path}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 500 }}>
                          {row.repository}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              padding: '2px 8px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              borderRadius: '4px',
                            }}
                          >
                            {row.base_image}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: '#64748B' }}>
                          {row.lines}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: row.issues > 0 ? '#FEF2F2' : '#F0FDF4',
                              color: row.issues > 0 ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {row.issues}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: row.critical > 0 ? '#FEF2F2' : '#F8FAFC',
                              color: row.critical > 0 ? '#DC2626' : '#94A3B8',
                            }}
                          >
                            {row.critical}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: row.high > 0 ? '#FFF7ED' : '#F8FAFC',
                              color: row.high > 0 ? '#EA580C' : '#94A3B8',
                            }}
                          >
                            {row.high}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: row.medium > 0 ? '#FEFCE8' : '#F8FAFC',
                              color: row.medium > 0 ? '#CA8A04' : '#94A3B8',
                            }}
                          >
                            {row.medium}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: row.low > 0 ? '#EFF6FF' : '#F8FAFC',
                              color: row.low > 0 ? '#2563EB' : '#94A3B8',
                            }}
                          >
                            {row.low}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12.5px' }}>
                          {row.last_scanned}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#16A34A',
                            }}
                          >
                            <CheckCircle2 size={13} color="#16A34A" />
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedDockerfileDetail(row)}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                            title="Options"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Table Footer with Pagination */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                fontSize: '12.5px',
                color: '#64748B',
              }}
            >
              <div>
                Showing 1-{Math.min(dockerfiles.length, pageSize)} of {totalItems} Dockerfiles
              </div>

              {/* Pagination buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: page <= 1 ? '#CBD5E1' : '#334155',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  &lt;
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(pNum => (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: pNum === page ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: pNum === page ? '#2563EB' : '#FFFFFF',
                      color: pNum === page ? '#FFFFFF' : '#334155',
                      fontWeight: pNum === page ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {pNum}
                  </button>
                ))}
                {totalPages > 5 && <span style={{ color: '#94A3B8' }}>...</span>}
                {totalPages > 5 && (
                  <button
                    onClick={() => setPage(totalPages)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: totalPages === page ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: totalPages === page ? '#2563EB' : '#FFFFFF',
                      color: totalPages === page ? '#FFFFFF' : '#334155',
                      fontWeight: totalPages === page ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: page >= totalPages ? '#CBD5E1' : '#334155',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: FINDINGS ── */}
      {activeTab === 'Findings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {findings.map(f => (
            <div
              key={f.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: f.severity === 'CRITICAL' ? '#FEF2F2' : f.severity === 'HIGH' ? '#FFF7ED' : '#FEFCE8',
                      color: f.severity === 'CRITICAL' ? '#DC2626' : f.severity === 'HIGH' ? '#EA580C' : '#CA8A04',
                    }}
                  >
                    {f.severity}
                  </span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{f.title}</span>
                  <span style={{ fontFamily: 'monospace', color: '#64748B', fontSize: '12px' }}>({f.rule_id})</span>
                </div>
                <span style={{ fontFamily: 'monospace', color: '#64748B', fontSize: '12.5px' }}>
                  {f.dockerfile_path} {f.line_number ? `: line ${f.line_number}` : ''}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{f.description}</p>

              {f.snippet && (
                <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #2563EB', fontFamily: 'monospace', fontSize: '12px', color: '#1E293B' }}>
                  {f.snippet}
                </div>
              )}

              {f.remediation && (
                <div style={{ fontSize: '12.5px', color: '#166534', backgroundColor: '#F0FDF4', padding: '8px 12px', borderRadius: '6px' }}>
                  <strong>Remediation:</strong> {f.remediation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: BUILD CONFIG ── */}
      {activeTab === 'Build Config' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
            Build Configuration & Compiler Analysis
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>
            Inspection of multi-stage boundaries, non-root users, build arguments, and container health checks.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>MULTI-STAGE REPOSITORIES</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>18 (38%)</div>
              <div style={{ fontSize: '12px', color: '#16A34A' }}>Separates compilation from deployment</div>
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>DISTROLESS / MINIMAL BASES</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '6px 0' }}>10 (20%)</div>
              <div style={{ fontSize: '12px', color: '#2563EB' }}>Zero package managers in production</div>
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>UNENFORCED ROOT BASES</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', margin: '6px 0' }}>9 (19%)</div>
              <div style={{ fontSize: '12px', color: '#DC2626' }}>Requires immediate USER directive</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RECOMMENDATIONS ── */}
      {activeTab === 'Recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recommendations.map(rec => (
            <div
              key={rec.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: rec.severity === 'CRITICAL' ? '#FEF2F2' : '#FFF7ED',
                      color: rec.severity === 'CRITICAL' ? '#DC2626' : '#EA580C',
                    }}
                  >
                    {rec.severity}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{rec.title}</span>
                  <span style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                    {rec.category}
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>
                  Affects {rec.affected_dockerfiles} Dockerfile(s)
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0' }}>{rec.impact}</p>
              <div style={{ backgroundColor: '#F0FDF4', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', color: '#166534', marginTop: '6px' }}>
                <strong>Recommendation:</strong> {rec.guidance}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SCAN DOCKERFILE MODAL ── */}
      {isScanModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '580px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCode2 size={20} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Execute Dockerfile Security Scan
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                    Runs real Trivy configuration AST scanner against instructions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Repository Name
                </label>
                <input
                  type="text"
                  value={scanRepo}
                  onChange={e => setScanRepo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Dockerfile Path
                </label>
                <input
                  type="text"
                  value={scanFilePath}
                  onChange={e => setScanFilePath(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #E2E8F0', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* Content editor */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Dockerfile Instructions
              </label>
              <textarea
                rows={7}
                value={scanContent}
                onChange={e => setScanContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontFamily: 'monospace',
                  fontSize: '12.5px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Feedback Message */}
            {scanResultMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  backgroundColor: scanResultMsg.isError ? '#FEF2F2' : '#F0FDF4',
                  color: scanResultMsg.isError ? '#DC2626' : '#166534',
                  border: `1px solid ${scanResultMsg.isError ? '#FECACA' : '#BBF7D0'}`,
                }}
              >
                {scanResultMsg.text}
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setIsScanModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                disabled={isScanning}
                onClick={handleTriggerScan}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isScanning && <RefreshCw size={14} className="animate-spin" />}
                {isScanning ? 'Executing Scanner...' : 'Start Scan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HIGH-TECH DOCKERFILE INSPECTION DRAWER ── */}
      {selectedDockerfileDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
          }}
          onClick={() => setSelectedDockerfileDetail(null)}
        >
          <div
            style={{
              width: '680px',
              maxWidth: '95vw',
              backgroundColor: '#0B0F19',
              height: '100%',
              borderLeft: '1px solid #1E293B',
              boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              color: '#F8FAFC',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1E293B',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                backgroundColor: '#0F172A',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FileCode2 size={20} color="#3B82F6" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    Dockerfile Security Inspector
                  </h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor:
                        selectedDockerfileDetail.issues > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                      color: selectedDockerfileDetail.issues > 0 ? '#F87171' : '#4ADE80',
                      border: `1px solid ${
                        selectedDockerfileDetail.issues > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'
                      }`,
                    }}
                  >
                    {inspectionData?.dockerfile?.issues ?? selectedDockerfileDetail.issues} Issues
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94A3B8' }}>
                  <span style={{ fontFamily: 'monospace', color: '#E2E8F0' }}>{selectedDockerfileDetail.path}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDockerfileDetail.path);
                      setCopiedPath(selectedDockerfileDetail.path);
                      setTimeout(() => setCopiedPath(null), 2000);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
                    title="Copy Path"
                  >
                    {copiedPath === selectedDockerfileDetail.path ? (
                      <Check size={13} color="#22C55E" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <span>•</span>
                  <span>Repo: <strong style={{ color: '#E2E8F0' }}>{selectedDockerfileDetail.repository}</strong></span>
                  <span>•</span>
                  <span style={{ fontFamily: 'monospace', backgroundColor: '#1E293B', padding: '1px 6px', borderRadius: '4px' }}>
                    {selectedDockerfileDetail.base_image}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDockerfileDetail(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Success Toast */}
            {remediationSuccessMsg && (
              <div
                style={{
                  margin: '16px 24px 0 24px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#4ADE80',
                }}
              >
                <CheckCircle2 size={16} color="#4ADE80" />
                <span>{remediationSuccessMsg}</span>
              </div>
            )}

            {/* Inspector Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '14px 24px 0 24px',
                borderBottom: '1px solid #1E293B',
                backgroundColor: '#0B0F19',
              }}
            >
              {[
                {
                  id: 'findings',
                  label: `Issues & Remediations (${
                    inspectionData?.findings?.length ?? selectedDockerfileDetail.issues
                  })`,
                  icon: AlertTriangle,
                },
                { id: 'code', label: 'Source Code', icon: Code },
                { id: 'diff', label: 'Unified Diff Preview', icon: GitCommit },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = inspectionTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setInspectionTab(tab.id as any)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#38BDF8' : '#94A3B8',
                      borderBottom: isActive ? '2px solid #38BDF8' : '2px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <IconComponent size={14} color={isActive ? '#38BDF8' : '#64748B'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Drawer Body Area */}
            <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
              {isLoadingInspection ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', gap: '12px' }}>
                  <RefreshCw size={24} className="animate-spin" color="#38BDF8" />
                  <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                    Inspecting AST and security findings...
                  </span>
                </div>
              ) : inspectionTab === 'findings' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(!inspectionData?.findings || inspectionData.findings.length === 0) ? (
                    <div
                      style={{
                        padding: '36px 20px',
                        textAlign: 'center',
                        backgroundColor: 'rgba(34, 197, 94, 0.05)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: '10px',
                      }}
                    >
                      <CheckCircle2 size={36} color="#4ADE80" style={{ margin: '0 auto 10px auto' }} />
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#4ADE80', margin: '0 0 6px 0' }}>
                        All Security Misconfigurations Resolved
                      </h4>
                      <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                        This Dockerfile complies with hardened non-root, pinned tags, and healthcheck standards.
                      </p>
                    </div>
                  ) : (
                    inspectionData.findings.map((f, idx) => {
                      const sevColor =
                        f.severity.toUpperCase() === 'CRITICAL'
                          ? '#EF4444'
                          : f.severity.toUpperCase() === 'HIGH'
                          ? '#F97316'
                          : f.severity.toUpperCase() === 'MEDIUM'
                          ? '#F59E0B'
                          : '#3B82F6';

                      const isApplying = remediatingFindingId === f.id || remediatingFindingId === 'all';

                      return (
                        <div
                          key={f.id || idx}
                          style={{
                            backgroundColor: '#111827',
                            border: `1px solid #1E293B`,
                            borderLeft: `4px solid ${sevColor}`,
                            borderRadius: '8px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          {/* Finding Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: `${sevColor}22`,
                                  color: sevColor,
                                  border: `1px solid ${sevColor}44`,
                                }}
                              >
                                {f.severity.toUpperCase()}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#1E293B',
                                  color: '#38BDF8',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {f.rule_id}
                              </span>
                              {f.line_number && (
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                                  Line {f.line_number}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>{f.category}</span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                              {f.title}
                            </h4>
                            <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                              {f.description}
                            </p>
                          </div>

                          {/* Flagged Code Snippet */}
                          {f.snippet && (
                            <div
                              style={{
                                backgroundColor: '#030712',
                                border: '1px solid #1F2937',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                color: '#FCA5A5',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span style={{ color: '#EF4444', fontWeight: 700 }}>−</span>
                              <span>{f.snippet}</span>
                            </div>
                          )}

                          {/* Remediation Section */}
                          <div
                            style={{
                              backgroundColor: 'rgba(30, 41, 59, 0.4)',
                              border: '1px solid #1E293B',
                              borderRadius: '6px',
                              padding: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <Sparkles size={14} color="#38BDF8" />
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>
                                Actionable Remediation
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#CBD5E1', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                              {f.remediation || 'Apply container security hardening guidelines.'}
                            </p>

                            {/* Git Diff Preview snippet */}
                            {f.suggested_fix_diff && (
                              <pre
                                style={{
                                  backgroundColor: '#030712',
                                  border: '1px solid #1E293B',
                                  borderRadius: '4px',
                                  padding: '8px 10px',
                                  fontSize: '11.5px',
                                  fontFamily: 'monospace',
                                  color: '#86EFAC',
                                  margin: '0 0 10px 0',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {f.suggested_fix_diff}
                              </pre>
                            )}

                            {/* Apply Fix Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleApplyRemediation(f.id, f.rule_id)}
                                disabled={isApplying}
                                style={{
                                  backgroundColor: '#2563EB',
                                  color: '#FFFFFF',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  cursor: isApplying ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                }}
                              >
                                {isApplying ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Wrench size={12} />
                                )}
                                {isApplying ? 'Applying Patch...' : 'Apply Fix'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : inspectionTab === 'code' ? (
                /* Source Code View */
                <div
                  style={{
                    backgroundColor: '#030712',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '12.5px',
                    lineHeight: '20px',
                    overflowX: 'auto',
                  }}
                >
                  {(inspectionData?.raw_content || 'FROM node:18\nWORKDIR /app\nCOPY . .\nCMD ["node", "app.js"]')
                    .split('\n')
                    .map((line, idx) => {
                      const lineNum = idx + 1;
                      const hasFinding = inspectionData?.findings?.some((f) => f.line_number === lineNum);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            backgroundColor: hasFinding ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                            borderRadius: '3px',
                            padding: '1px 6px',
                          }}
                        >
                          <span style={{ color: '#475569', width: '28px', textAlign: 'right', userSelect: 'none' }}>
                            {lineNum}
                          </span>
                          <span style={{ color: hasFinding ? '#FCA5A5' : '#E2E8F0' }}>{line}</span>
                          {hasFinding && (
                            <span
                              style={{
                                marginLeft: 'auto',
                                fontSize: '10px',
                                color: '#EF4444',
                                fontWeight: 700,
                              }}
                            >
                              Misconfiguration
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                /* Unified Diff View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#94A3B8' }}>
                      Unified patch proposed to resolve all flagged misconfigurations:
                    </span>
                    <button
                      onClick={() => handleApplyRemediation()}
                      disabled={remediatingFindingId === 'all'}
                      style={{
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        cursor: remediatingFindingId === 'all' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {remediatingFindingId === 'all' ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Wrench size={12} />
                      )}
                      Apply All Recommended Fixes
                    </button>
                  </div>
                  <pre
                    style={{
                      backgroundColor: '#030712',
                      border: '1px solid #1E293B',
                      borderRadius: '8px',
                      padding: '16px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#E2E8F0',
                      lineHeight: '19px',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {(inspectionData?.findings && inspectionData.findings.length > 0)
                      ? inspectionData.findings
                          .filter((f) => f.suggested_fix_diff)
                          .map((f) => f.suggested_fix_diff)
                          .join('\n\n')
                      : 'No modifications pending. All rules validated.'}
                  </pre>
                </div>
              )}
            </div>

            {/* Drawer Bottom Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #1E293B',
                backgroundColor: '#0F172A',
                display: 'flex',
                gap: '12px',
              }}
            >
              <button
                onClick={() => {
                  setSelectedDockerfileDetail(null);
                  setIsScanModalOpen(true);
                  setScanFilePath(selectedDockerfileDetail.path);
                  setScanRepo(selectedDockerfileDetail.repository);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} />
                Re-scan this Dockerfile
              </button>
              <button
                onClick={() => setSelectedDockerfileDetail(null)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#1E293B',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
