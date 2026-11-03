'use client';

/**
 * Thing Code — Pull Request Security Reviews (/code/pull-requests)
 * 
 * Production security review dashboard for Pull Requests across connected repositories.
 * All data sourced from real database state via:
 *   - GET /api/v1/code/repository-health
 *   - GET /api/v1/github/repositories/{id}/pull-requests
 *   - POST /api/v1/github/pull-requests/{id}/rescan
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  GitPullRequest,
  RefreshCw,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Clock,
  GitMerge,
  ShieldAlert,
  Play,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  X,
  ShieldCheck,
  Shield,
  AlertTriangle,
  ChevronRight,
  GitBranch,
  Sliders,
} from 'lucide-react';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function PullRequestsContent() {
  const searchParams = useSearchParams();
  const initialRepoId = searchParams.get('repositoryId');

  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(initialRepoId || null);
  const [prs, setPrs] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [rescanMap, setRescanMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'merged'>('all');
  const [gateFilter, setGateFilter] = useState<'all' | 'blocked' | 'passed'>('all');

  // Centered Popup Modal for PR Details
  const [inspectingPr, setInspectingPr] = useState<any | null>(null);

  // Load repositories from real DB
  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    setError(null);
    try {
      const data = await api.code.repositoryHealth({ limit: 50 });
      const items = data?.items ?? [];
      setRepos(items);
      if (items.length > 0 && !selectedRepoId) {
        setSelectedRepoId(items[0].repository_id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load repositories from database.');
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, [selectedRepoId]);

  // Load PRs for the selected repo
  const loadPrs = useCallback(async (repoId: string) => {
    setLoadingPrs(true);
    setError(null);
    try {
      const data: any = await api.code.pullRequests(repoId);
      setPrs(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch pull requests for this repository.');
      setPrs([]);
    } finally {
      setLoadingPrs(false);
    }
  }, []);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  useEffect(() => {
    if (selectedRepoId) {
      loadPrs(selectedRepoId);
    }
  }, [selectedRepoId, loadPrs]);

  // Handle re-scan trigger
  const handleRescan = async (prId: string) => {
    setRescanMap((prev) => ({ ...prev, [prId]: true }));
    try {
      await api.code.rescanPullRequest(prId);
      if (selectedRepoId) {
        await loadPrs(selectedRepoId);
      }
    } catch (err: any) {
      alert(`Re-scan failed: ${err?.message || 'Unknown scanner error'}`);
    } finally {
      setRescanMap((prev) => ({ ...prev, [prId]: false }));
    }
  };

  const selectedRepo = useMemo(() => {
    return repos.find((r) => r.repository_id === selectedRepoId) || null;
  }, [repos, selectedRepoId]);

  // Filtered PRs
  const filteredPrs = useMemo(() => {
    let result = [...prs];
    if (statusFilter !== 'all') {
      result = result.filter((p) => (p.state || '').toLowerCase() === statusFilter);
    }
    if (gateFilter === 'blocked') {
      result = result.filter((p) => p.security_gate_status === 'BLOCKED' || (p.security_finding_count || 0) > 0);
    } else if (gateFilter === 'passed') {
      result = result.filter((p) => p.security_gate_status === 'PASSED' || (p.security_finding_count || 0) === 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.author?.toLowerCase().includes(q) ||
          String(p.number).includes(q) ||
          p.head_ref?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [prs, statusFilter, gateFilter, searchQuery]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link href="/code" style={{ fontSize: '13px', color: '#64748B', textDecoration: 'none' }}>
              Thing Code
            </Link>
            <span style={{ color: '#94A3B8' }}>/</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Pull Request Reviews</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Pull Request Security Gates
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Continuous security policy enforcement and AST scanner review on pull requests before merge.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => {
              if (selectedRepoId) loadPrs(selectedRepoId);
            }}
            disabled={loadingPrs}
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
              cursor: loadingPrs ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loadingPrs ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            href="/code/pull-requests/237/activity"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1D4ED8',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <GitPullRequest size={14} color="#2563EB" />
            PR #237 Activity
          </Link>
          <Link
            href="/code/pull-requests/compliance"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Shield size={14} color="#10B981" />
            Compliance Suite (11.1-11.8)
          </Link>
          <Link
            href="/code/pull-requests/policy"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ShieldCheck size={14} color="#2563EB" />
            Security Policies
          </Link>
          <Link
            href="/code/repositories"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#0F172A',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <FolderGit2 size={14} />
            Manage Repositories
          </Link>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Repository Selector + PR Table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        {/* Left: Repositories List */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EAECF0',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Select Repository ({repos.length})
          </div>

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {loadingRepos ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#2563EB' }} />
                Loading repositories...
              </div>
            ) : repos.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                No repositories connected.
              </div>
            ) : (
              repos.map((repo) => {
                const isSelected = selectedRepoId === repo.repository_id;
                return (
                  <button
                    key={repo.repository_id}
                    onClick={() => setSelectedRepoId(repo.repository_id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      border: 'none',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                      backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#2563EB' : '#0F172A',
                        }}
                      >
                        {repo.repository_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {repo.default_branch || 'main'}
                      </div>
                    </div>
                    <ChevronRight size={14} color={isSelected ? '#2563EB' : '#94A3B8'} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: PRs List & Filters */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            overflow: 'hidden',
          }}
        >
          {/* Header & Filter Controls */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #EAECF0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {selectedRepo ? selectedRepo.repository_name : 'Pull Requests'}
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {filteredPrs.length} pull requests tracked with automated security gates
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Filter PR title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 12px 6px 30px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    color: '#0F172A',
                    outline: 'none',
                    width: '200px',
                  }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#0F172A',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="all">All States</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="merged">Merged</option>
              </select>

              {/* Security Gate Filter */}
              <select
                value={gateFilter}
                onChange={(e) => setGateFilter(e.target.value as any)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#0F172A',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="all">All Gates</option>
                <option value="blocked">Blocked / With Findings</option>
                <option value="passed">Passed Clean</option>
              </select>
            </div>
          </div>

          {/* PRs Table */}
          {loadingPrs ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563EB' }} />
              Querying GitHub pull requests & security gate evaluation...
            </div>
          ) : filteredPrs.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <GitPullRequest size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>No pull requests found</div>
              <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '380px', margin: '6px auto 16px auto' }}>
                {error
                  ? `Failed to fetch PRs: ${error}`
                  : 'No pull requests matching your filter criteria, or the repository has no active PRs.'}
              </p>
              {selectedRepo && (
                <button
                  onClick={() => loadPrs(selectedRepo.repository_id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
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
                  <RefreshCw size={13} /> Try Re-fetching
                </button>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#FAFAFA' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>PR #</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Title & Author</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Branches</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>State</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Security Gate</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Findings</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Updated</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 500, color: '#64748B', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrs.map((pr: any) => {
                    const isBlocked = pr.security_gate_status === 'BLOCKED' || (pr.security_finding_count || 0) > 0;
                    const isScanning = rescanMap[pr.id];

                    return (
                      <tr
                        key={pr.id || pr.number}
                        style={{ borderBottom: '1px solid #F1F5F9', height: '64px', cursor: 'pointer' }}
                        onClick={() => setInspectingPr(pr)}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* PR Number */}
                        <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                          #{pr.number}
                        </td>

                        {/* Title & Author */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
                            {pr.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            by {pr.author || 'contributor'}
                          </div>
                        </td>

                        {/* Branches */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
                            <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                              {pr.head_ref || 'feature'}
                            </span>
                            <span>→</span>
                            <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                              {pr.base_ref || 'main'}
                            </span>
                          </div>
                        </td>

                        {/* State */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: pr.state === 'open' ? '#DCFCE7' : pr.state === 'merged' ? '#F3E8FF' : '#F1F5F9',
                              color: pr.state === 'open' ? '#15803D' : pr.state === 'merged' ? '#7E22CE' : '#475569',
                              textTransform: 'capitalize',
                            }}
                          >
                            {pr.state === 'open' && <GitPullRequest size={11} />}
                            {pr.state === 'merged' && <GitMerge size={11} />}
                            {pr.state === 'closed' && <XCircle size={11} />}
                            {pr.state || 'open'}
                          </span>
                        </td>

                        {/* Security Gate */}
                        <td style={{ padding: '12px 16px' }}>
                          {isBlocked ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              <ShieldAlert size={12} />
                              GATE BLOCKED
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              <ShieldCheck size={12} />
                              PASSED
                            </span>
                          )}
                        </td>

                        {/* Findings Count */}
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: (pr.security_finding_count || 0) > 0 ? '#DC2626' : '#16A34A',
                            }}
                          >
                            {pr.security_finding_count || 0} issues
                          </span>
                        </td>

                        {/* Updated */}
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                          {timeAgo(pr.updated_at || pr.created_at)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              disabled={isScanning}
                              onClick={() => handleRescan(pr.id)}
                              title="Re-run security scanners on this PR"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#ffffff',
                                color: '#0F172A',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: isScanning ? 'wait' : 'pointer',
                              }}
                            >
                              <Play size={11} color="#2563EB" />
                              {isScanning ? 'Scanning...' : 'Re-scan'}
                            </button>
                            <Link
                              href={`/code/pull-requests/${pr.number || pr.id || 237}`}
                              title="View PR Details & Security (Screens 9.1-9.8)"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#ffffff',
                                color: '#0F172A',
                                fontSize: '11px',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Details
                            </Link>
                            <Link
                              href={`/code/pull-requests/${pr.number || pr.id || 237}/security`}
                              title="View PR Security Suite (Screens 7.1-7.8)"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#ffffff',
                                color: '#0F172A',
                                fontSize: '11px',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Security
                            </Link>
                            <Link
                              href={`/code/pull-requests/${pr.number || pr.id || 237}/activity`}
                              title="View PR Activity (Screens 12.1-12.8)"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#ffffff',
                                color: '#0F172A',
                                fontSize: '11px',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Activity
                            </Link>
                            <Link
                              href="/code/pull-requests/settings"
                              title="View PR Settings Suite (Screens 14.1-14.8)"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#ffffff',
                                color: '#0F172A',
                                fontSize: '11px',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Settings
                            </Link>
                            {pr.html_url && (
                              <a
                                href={pr.html_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Open on GitHub"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '5px',
                                  color: '#64748B',
                                  borderRadius: '4px',
                                }}
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Centered Floating Popup Modal for PR Inspection ── */}
      {inspectingPr && (
        <div
          onClick={() => setInspectingPr(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#FAFAFA',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GitPullRequest size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    PR #{inspectingPr.number} — Security Gate Review
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {inspectingPr.head_ref} into {inspectingPr.base_ref}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectingPr(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Pull Request Title
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                  {inspectingPr.title}
                </div>
              </div>

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
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Author</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {inspectingPr.author || 'contributor'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Gate Status</div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: inspectingPr.security_gate_status === 'BLOCKED' ? '#DC2626' : '#16A34A',
                      marginTop: '2px',
                    }}
                  >
                    {inspectingPr.security_gate_status || 'PASSED'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Total Findings</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {inspectingPr.security_finding_count || 0}
                  </div>
                </div>
              </div>

              {/* Status explanation */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: inspectingPr.security_gate_status === 'BLOCKED' ? '#FEF2F2' : '#F0FDF4',
                  border: inspectingPr.security_gate_status === 'BLOCKED' ? '1px solid #FECACA' : '1px solid #BBF7D0',
                  color: inspectingPr.security_gate_status === 'BLOCKED' ? '#991B1B' : '#166534',
                  fontSize: '12px',
                  lineHeight: 1.5,
                }}
              >
                {inspectingPr.security_gate_status === 'BLOCKED'
                  ? 'This pull request contains critical or high severity security vulnerabilities. Merge is blocked until all gating policy rules pass or an approved security exception is granted.'
                  : 'All automated security checks (Semgrep SAST, Gitleaks, Trivy SCA) completed cleanly. This pull request complies with repository security policy.'}
              </div>

              {/* Quick links to findings */}
              {inspectingPr.security_finding_count > 0 && selectedRepoId && (
                <div>
                  <Link
                    href={`/code/findings?repositoryId=${selectedRepoId}`}
                    onClick={() => setInspectingPr(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#ffffff',
                      textDecoration: 'none',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} color="#DC2626" />
                      View {inspectingPr.security_finding_count} Security Findings in Code Explorer
                    </span>
                    <ChevronRight size={16} color="#64748B" />
                  </Link>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '14px 24px',
                backgroundColor: '#FAFAFA',
                borderTop: '1px solid #E2E8F0',
              }}
            >
              <button
                onClick={() => setInspectingPr(null)}
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
                Close
              </button>
              <Link
                href={`/code/pull-requests/${inspectingPr.number || inspectingPr.id || 237}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#ffffff',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ShieldCheck size={13} color="#2563EB" />
                PR Details (9.1-9.8)
              </Link>
              <Link
                href={`/code/pull-requests/${inspectingPr.number || inspectingPr.id || 237}/security`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#ffffff',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <ShieldAlert size={13} color="#EF4444" />
                Security (7.1-7.8)
              </Link>
              <Link
                href="/code/pull-requests/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#ffffff',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Sliders size={13} color="#2563EB" />
                Settings (14.1-14.8)
              </Link>
              <Link
                href={`/code/pull-requests/${inspectingPr.number || inspectingPr.id || 237}/activity`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#ffffff',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <GitBranch size={13} color="#2563EB" />
                View Activity
              </Link>
              <button
                disabled={rescanMap[inspectingPr.id]}
                onClick={() => handleRescan(inspectingPr.id)}
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
                  cursor: rescanMap[inspectingPr.id] ? 'wait' : 'pointer',
                }}
              >
                <Play size={13} fill="currentColor" />
                {rescanMap[inspectingPr.id] ? 'Running Scan...' : 'Trigger Re-scan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PullRequestsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B', fontSize: '14px' }}>Loading Pull Request Reviews...</div>}>
      <PullRequestsContent />
    </Suspense>
  );
}
