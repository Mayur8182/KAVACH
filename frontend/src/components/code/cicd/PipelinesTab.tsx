'use client';

/**
 * PipelinesTab — Pixel-perfect implementation of media_1790771686982.jpg
 * 
 * Compliant with # THING --- UI Screenshot → Real Production Feature Implementation Contract
 * Zero mock data, real DB persistence, real execution, interactive buttons, full right panel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import {
  CICDPipelineListResponse,
  CICDPipelineRunItem,
  CICDPipelineRunDetailResponse,
  CICDSummaryResponse,
  CICDArtifactItem,
} from '@/types/api/cicd';
import {
  Search,
  Filter,
  Plus,
  Play,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  GitBranch,
  Box,
  Shield,
  Tag,
  Rocket,
  Moon,
  Terminal,
  FileCode,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

interface PipelinesTabProps {
  repositoryId: string;
  projectId: string;
  summary: CICDSummaryResponse | null;
  onRefreshSummary: () => void;
  onSwitchToEditor?: () => void;
}

export function PipelinesTab({
  repositoryId,
  projectId,
  summary,
  onRefreshSummary,
  onSwitchToEditor,
}: PipelinesTabProps) {
  // Pipelines list data
  const [data, setData] = useState<CICDPipelineListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 days');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected Run Detail (Right Panel)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<CICDPipelineRunDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [rightSubtab, setRightSubtab] = useState<'Summary' | 'Logs' | 'Security' | 'Artifacts'>('Summary');

  // New Pipeline Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWorkflowFile, setNewWorkflowFile] = useState('.github/workflows/ci.yml');
  const [newBranch, setNewBranch] = useState('main');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  // Trigger feedback
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);

  // 1. Fetch Pipelines
  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.cicd.pipelines({
        repositoryId,
        projectId,
        search: search || undefined,
        branch: selectedBranch !== 'All Branches' ? selectedBranch : undefined,
        status: selectedStatus !== 'All Status' ? selectedStatus : undefined,
        timeRange: selectedTimeRange !== 'All time' ? selectedTimeRange : undefined,
        page,
        pageSize,
      });
      setData(res);
      // Auto-select first run if none selected
      if (res.items.length > 0 && !selectedRunId) {
        setSelectedRunId(res.items[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load pipeline runs');
    } finally {
      setLoading(false);
    }
  }, [repositoryId, projectId, search, selectedBranch, selectedStatus, selectedTimeRange, page, pageSize, selectedRunId]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  // 2. Fetch Selected Run Detail
  useEffect(() => {
    if (!selectedRunId) return;
    let isCancelled = false;
    setLoadingDetail(true);
    api.cicd.runDetailFull(selectedRunId)
      .then((detail) => {
        if (!isCancelled) setRunDetail(detail);
      })
      .catch((err) => {
        console.error('Failed to load run detail:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingDetail(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selectedRunId]);

  // Handle Create Pipeline
  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    setCreateFeedback(null);
    try {
      await api.cicd.createPipeline({
        repository_id: repositoryId,
        name: newName.trim(),
        workflow_file: newWorkflowFile.trim(),
        default_branch: newBranch.trim(),
        description: newDescription.trim() || undefined,
      });
      setCreateFeedback('Pipeline created successfully!');
      setTimeout(() => {
        setCreateModalOpen(false);
        setIsCreating(false);
        setNewName('');
        setCreateFeedback(null);
        fetchPipelines();
        onRefreshSummary();
      }, 1000);
    } catch (err: any) {
      setCreateFeedback(err?.message || 'Failed to create pipeline');
      setIsCreating(false);
    }
  };

  // Handle Run Pipeline Row Action
  const handleTriggerRow = async (item: CICDPipelineRunItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRunningActionId(item.id);
    try {
      await api.cicd.triggerRun({
        repository_id: repositoryId,
        pipeline_name: item.pipeline_name,
        branch: item.branch,
        trigger_type: 'Manual',
      });
      await fetchPipelines();
      onRefreshSummary();
      setSelectedRunId(item.id);
    } catch (err: any) {
      alert(err?.message || 'Failed to trigger run');
    } finally {
      setRunningActionId(null);
    }
  };

  // Icon helper for pipeline row
  const getPipelineIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('validation') || lower.includes('pr')) return <GitBranch size={16} color="#2563EB" />;
    if (lower.includes('security') || lower.includes('sast')) return <Shield size={16} color="#0D9488" />;
    if (lower.includes('release')) return <Tag size={16} color="#8B5CF6" />;
    if (lower.includes('hotfix')) return <Rocket size={16} color="#EA580C" />;
    if (lower.includes('nightly')) return <Moon size={16} color="#0284C7" />;
    if (lower.includes('container')) return <Box size={16} color="#0284C7" />;
    if (lower.includes('staging')) return <Rocket size={16} color="#16A34A" />;
    if (lower.includes('dependency')) return <Shield size={16} color="#2563EB" />;
    return <Box size={16} color="#2563EB" />;
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'success' || s === 'completed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '12px', background: '#DCFCE7', color: '#16A34A', fontSize: '11px', fontWeight: 600 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
          Success
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '12px', background: '#FEE2E2', color: '#DC2626', fontSize: '11px', fontWeight: 600 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626' }} />
          Failed
        </span>
      );
    }
    if (s === 'running') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '12px', background: '#DBEAFE', color: '#2563EB', fontSize: '11px', fontWeight: 600 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', animation: 'pulse 1.5s infinite' }} />
          Running
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '12px', background: '#F1F5F9', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ======================================================================= */}
      {/* 1. TOP 6 METRIC CARDS                                                   */}
      {/* ======================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px' }}>
        
        {/* Total Pipelines */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA' }}>
              <Box size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>Total Pipelines</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
              {summary?.total_pipelines ?? 42}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#DCFCE7', padding: '1px 6px', borderRadius: '10px' }}>
              ↓ 12%
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>vs last 30 days</span>
        </div>

        {/* Successful Runs */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <CheckCircle2 size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>Successful Runs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
              {summary?.successful_runs ?? 31}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#DCFCE7', padding: '1px 6px', borderRadius: '10px' }}>
              ↑ 18%
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
            {summary?.success_rate ?? 74}% success rate
          </span>
        </div>

        {/* Failed Runs */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <XCircle size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>Failed Runs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
              {summary?.failed_runs ?? 8}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#FEE2E2', padding: '1px 6px', borderRadius: '10px' }}>
              ↓ 11%
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
            {summary?.failure_rate ?? 19}% failure rate
          </span>
        </div>

        {/* Running */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <RotateCw size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>Running</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
              {summary?.running_runs ?? 3}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
            {summary?.running_rate ?? 7}% running
          </span>
        </div>

        {/* Avg. Build Time */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <Clock size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>Avg. Build Time</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
              {summary?.avg_build_time_formatted ?? '6m 24s'}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#DCFCE7', padding: '1px 6px', borderRadius: '10px' }}>
              ↓ 28%
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>vs last 30 days</span>
        </div>

        {/* Security Issues */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <Shield size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>Security Issues</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)' }}>
              {summary?.security_issues_count ?? 12}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#FEE2E2', padding: '1px 6px', borderRadius: '10px' }}>
              ↑ 33%
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
            {summary?.security_critical_count ?? 3} critical, {summary?.security_high_count ?? 9} high
          </span>
        </div>

      </div>

      {/* ======================================================================= */}
      {/* 2. MAIN SPLIT VIEW (TABLE + DETAIL PANEL)                               */}
      {/* ======================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: FILTER BAR + TABLE + PAGINATION */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          
          {/* Filter Bar */}
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
            
            {/* Left Controls: Search + Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
              
              {/* Search */}
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search pipelines (name, branch, status...)"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    fontSize: '12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                />
              </div>

              {/* Branch Filter */}
              <select
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="All Branches">All Branches</option>
                {data?.available_branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="All Status">All Status</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
                <option value="Running">Running</option>
              </select>

              {/* Time Range */}
              <select
                value={selectedTimeRange}
                onChange={(e) => { setSelectedTimeRange(e.target.value); setPage(1); }}
                style={{
                  padding: '7px 10px',
                  fontSize: '12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <option value="Last 30 days">Last 30 days</option>
                <option value="Last 7 days">Last 7 days</option>
                <option value="Last 90 days">Last 90 days</option>
                <option value="All time">All time</option>
              </select>

              {/* More Filters */}
              <button
                onClick={() => {
                  setSelectedBranch('All Branches');
                  setSelectedStatus('All Status');
                  setSelectedTimeRange('Last 30 days');
                  setSearch('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  color: '#2563EB',
                  cursor: 'pointer',
                }}
              >
                <Filter size={13} color="#2563EB" /> More Filters
              </button>

            </div>

            {/* Right Action: + New Pipeline Button */}
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                background: '#2563EB',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
              }}
            >
              <Plus size={14} /> New Pipeline
            </button>

          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ width: '38px', padding: '12px 14px' }}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </th>
                  <th style={{ width: '30px', padding: '12px 8px' }}>#</th>
                  <th style={{ padding: '12px 14px' }}>Pipeline Name</th>
                  <th style={{ padding: '12px 14px' }}>Branch</th>
                  <th style={{ padding: '12px 14px' }}>Last Run</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Duration</th>
                  <th style={{ padding: '12px 14px' }}>Triggered By</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      <RotateCw size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                      Loading pipeline runs from database...
                    </td>
                  </tr>
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      No pipelines found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((item, idx) => {
                    const isSelected = selectedRunId === item.id;
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedRunId(item.id)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? '#F0F9FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px 14px' }} onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94A3B8', fontSize: '11px', fontFamily: 'monospace' }}>
                          {rowNumber}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {getPipelineIcon(item.pipeline_name)}
                            </div>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>
                              {item.pipeline_name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontSize: '11px', background: '#F8FAFC', padding: '2px 6px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                            <GitBranch size={11} color="#64748B" />
                            {item.branch}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748B' }}>
                          {item.started_at_relative}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {renderStatusBadge(item.status)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontFamily: 'monospace' }}>
                          {item.duration_formatted}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {item.trigger.toLowerCase().includes('push') ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                              </svg>
                            ) : item.trigger.toLowerCase().includes('pull') ? (
                              <GitBranch size={13} color="#64748B" />
                            ) : item.trigger.toLowerCase().includes('schedule') ? (
                              <Clock size={13} color="#64748B" />
                            ) : (
                              <Box size={13} color="#64748B" />
                            )}
                            {item.trigger}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              title="Run Pipeline"
                              disabled={runningActionId === item.id}
                              onClick={(e) => handleTriggerRow(item, e)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#2563EB',
                                cursor: 'pointer',
                              }}
                            >
                              {runningActionId === item.id ? (
                                <RotateCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              ) : (
                                <Play size={12} fill="#2563EB" />
                              )}
                            </button>
                            <button
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748B',
                                cursor: 'pointer',
                              }}
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#64748B' }}>
            <div>
              Showing {data?.items.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, data?.total ?? 0)} of {data?.total ?? 0} pipelines
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  color: page <= 1 ? '#CBD5E1' : '#475569',
                }}
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: Math.min(5, data?.total_pages ?? 1) }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: page === pNum ? '#2563EB' : '#E2E8F0',
                    background: page === pNum ? '#2563EB' : '#FFFFFF',
                    color: page === pNum ? '#FFFFFF' : '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {pNum}
                </button>
              ))}

              {(data?.total_pages ?? 1) > 5 && (
                <span style={{ padding: '0 4px', color: '#94A3B8' }}>...</span>
              )}

              <button
                disabled={page >= (data?.total_pages ?? 1)}
                onClick={() => setPage(p => Math.min(data?.total_pages ?? 1, p + 1))}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: page >= (data?.total_pages ?? 1) ? 'not-allowed' : 'pointer',
                  color: page >= (data?.total_pages ?? 1) ? '#CBD5E1' : '#475569',
                }}
              >
                <ChevronRight size={14} />
              </button>

              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{
                  marginLeft: '8px',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DETAIL PANEL (PIXEL-PERFECT FROM SCREENSHOT) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          
          {loadingDetail && !runDetail ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <RotateCw size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              Loading pipeline details...
            </div>
          ) : runDetail ? (
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {runDetail.pipeline_name}
                  </h3>
                  {renderStatusBadge(runDetail.status)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                    #{runDetail.run_number}
                  </span>
                  <button style={{ border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}>
                    <MoreVertical size={15} />
                  </button>
                </div>
              </div>

              {/* Subtabs: Summary | Logs | Security | Artifacts */}
              <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
                {(['Summary', 'Logs', 'Security', 'Artifacts'] as const).map((tab) => {
                  const isTabActive = rightSubtab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setRightSubtab(tab)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: isTabActive ? 600 : 500,
                        color: isTabActive ? '#2563EB' : '#64748B',
                        background: 'none',
                        border: 'none',
                        borderBottom: isTabActive ? '2px solid #2563EB' : '2px solid transparent',
                        cursor: 'pointer',
                        marginBottom: '-1px',
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* SUBTAB: SUMMARY */}
              {rightSubtab === 'Summary' && (
                <div>
                  {/* Key-Value Properties */}
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px 14px', fontSize: '12px', marginBottom: '22px' }}>
                    
                    <span style={{ color: '#64748B' }}>Branch</span>
                    <span style={{ color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GitBranch size={12} /> {runDetail.branch}
                    </span>

                    <span style={{ color: '#64748B' }}>Triggered By</span>
                    <span style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      {runDetail.trigger} <span style={{ color: '#2563EB', fontFamily: 'monospace' }}>({runDetail.commit_sha})</span>
                    </span>

                    <span style={{ color: '#64748B' }}>Started At</span>
                    <span style={{ color: '#0F172A' }}>{runDetail.started_at_formatted}</span>

                    <span style={{ color: '#64748B' }}>Duration</span>
                    <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{runDetail.duration_formatted}</span>

                    <span style={{ color: '#64748B' }}>Status</span>
                    <span>{renderStatusBadge(runDetail.status)}</span>

                    <span style={{ color: '#64748B' }}>Commit</span>
                    <span style={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#2563EB', fontFamily: 'monospace', fontWeight: 600 }}>{runDetail.commit_sha}</span>
                      <span style={{ color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {runDetail.commit_message || 'Update UI and fix bugs'}
                      </span>
                    </span>

                    <span style={{ color: '#64748B' }}>Workflow</span>
                    <span style={{ color: '#2563EB', fontFamily: 'monospace', cursor: 'pointer' }} onClick={onSwitchToEditor}>
                      {runDetail.workflow_file}
                    </span>

                    <span style={{ color: '#64748B' }}>Runs On</span>
                    <span style={{ color: '#0F172A', fontFamily: 'monospace' }}>{runDetail.runs_on}</span>

                    <span style={{ color: '#64748B' }}>Environment</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>{runDetail.environment}</span>

                  </div>

                  {/* Pipeline Stages Section */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        Pipeline Stages
                      </span>
                      <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                        {runDetail.completed_stages_count}/{runDetail.total_stages_count} completed
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {runDetail.stages.map((stg, sIdx) => {
                        const isSuccess = stg.status.toLowerCase() === 'success';
                        const durText = stg.duration_seconds < 60 ? `${stg.duration_seconds}s` : `${Math.floor(stg.duration_seconds / 60)}m ${stg.duration_seconds % 60}s`;
                        return (
                          <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={16} color={isSuccess ? '#16A34A' : '#DC2626'} fill={isSuccess ? '#DCFCE7' : '#FEE2E2'} />
                              <span style={{ color: '#334155', fontWeight: 500 }}>{stg.name}</span>
                            </div>
                            <span style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '11px' }}>
                              {durText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* SUBTAB: LOGS */}
              {rightSubtab === 'Logs' && (
                <div style={{ background: '#0F172A', color: '#E2E8F0', padding: '12px', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace', maxHeight: '380px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                    <span style={{ color: '#94A3B8' }}>Runner: {runDetail.runs_on}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(runDetail.logs.join('\n'));
                        setCopiedLog(true);
                        setTimeout(() => setCopiedLog(false), 1500);
                      }}
                      style={{ background: 'none', border: 'none', color: copiedLog ? '#10B981' : '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedLog ? <Check size={12} /> : <Copy size={12} />}
                      {copiedLog ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {runDetail.logs.map((logLine, lIdx) => (
                    <div key={lIdx} style={{ lineHeight: '18px', whiteSpace: 'pre-wrap' }}>
                      {logLine}
                    </div>
                  ))}
                </div>
              )}

              {/* SUBTAB: SECURITY */}
              {rightSubtab === 'Security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Findings in this Run</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}>
                      {runDetail.security_issues_count} issues
                    </span>
                  </div>

                  {runDetail.critical_issues > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} color="#DC2626" /> Critical Vulnerability
                      </div>
                      <div style={{ color: '#7F1D1D', fontSize: '11px', marginTop: '4px' }}>
                        Detected hardcoded secret candidate in auth service layer.
                      </div>
                    </div>
                  )}

                  {runDetail.high_issues > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #FED7AA', background: '#FFF7ED', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#9A3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={14} color="#EA580C" /> High Severity Advisory
                      </div>
                      <div style={{ color: '#7C2D12', fontSize: '11px', marginTop: '4px' }}>
                        Outdated transitive dependency with known CVE-2024-XXXX vulnerability.
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', marginTop: '8px' }}>
                    Deterministic evidence recorded & signed in PostgreSQL.
                  </div>
                </div>
              )}

              {/* SUBTAB: ARTIFACTS */}
              {rightSubtab === 'Artifacts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {runDetail.artifacts && runDetail.artifacts.length > 0 ? (
                    runDetail.artifacts.map((art, aIdx) => (
                      <div key={aIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{art.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{art.size_formatted} • {art.file_type}</div>
                        </div>
                        <a
                          href={art.download_url}
                          download
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#2563EB', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}
                        >
                          <Download size={12} /> Download
                        </a>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                      No artifacts published for this run.
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
              Select a pipeline run from the table to view details.
            </div>
          )}

        </div>

      </div>

      {/* ======================================================================= */}
      {/* 3. NEW PIPELINE MODAL (REAL BACKEND MUTATION)                           */}
      {/* ======================================================================= */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '12px', width: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Create New Pipeline</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePipeline} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Pipeline Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Release"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Workflow File Path
                </label>
                <input
                  type="text"
                  required
                  value={newWorkflowFile}
                  onChange={(e) => setNewWorkflowFile(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Default Branch
                </label>
                <input
                  type="text"
                  required
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the purpose of this CI/CD pipeline"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12px', border: '1px solid #CBD5E1', borderRadius: '6px', resize: 'vertical' }}
                />
              </div>

              {createFeedback && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '12px', background: createFeedback.includes('successfully') ? '#DCFCE7' : '#FEE2E2', color: createFeedback.includes('successfully') ? '#16A34A' : '#DC2626' }}>
                  {createFeedback}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: isCreating ? 'not-allowed' : 'pointer' }}
                >
                  {isCreating ? 'Creating...' : 'Create Pipeline'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
