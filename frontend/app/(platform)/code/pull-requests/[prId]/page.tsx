'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { api } from '@/lib/api/client';
import {
  ArrowLeft,
  ChevronRight,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitCommit,
  Play,
  Copy,
  ShieldAlert,
  ShieldCheck,
  Shield,
  FileText,
  Share,
  MoreVertical,
  Search,
  Filter,
  RotateCw,
  Folder,
  FileCode,
  ExternalLink,
  Clock,
  UserCheck,
  Check,
  X,
  Code,
  Terminal,
  Settings,
  Plus,
} from 'lucide-react';
import './pull-request-detail.css';

export default function PullRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prId = (params?.prId as string) || '237';

  // Sub-screen switcher: 9.1 through 9.8
  const initialSubScreen = searchParams.get('screen') || '9.1';
  const [activeScreen, setActiveScreen] = useState<string>(initialSubScreen);

  useEffect(() => {
    const q = searchParams.get('screen');
    if (q && q !== activeScreen) {
      setActiveScreen(q);
    }
  }, [searchParams]);

  const handleScreenChange = (scr: string) => {
    setActiveScreen(scr);
    router.replace(`/code/pull-requests/${prId}?screen=${scr}`, { scroll: false });
  };

  // Data State
  const [prData, setPrData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State inside specific screens
  const [depTab, setDepTab] = useState<'deps' | 'secrets' | 'license'>('secrets');
  const [reviewTab, setReviewTab] = useState<'details' | 'snippet'>('snippet');
  const [resolvedSecrets, setResolvedSecrets] = useState<Record<string, boolean>>({});

  // Search & Filter Inputs
  const [fileSearch, setFileSearch] = useState('');
  const [findingSeverityFilter, setFindingSeverityFilter] = useState('All Severities');
  const [checkStatusFilter, setCheckStatusFilter] = useState('All Status');

  const loadData = useCallback(async () => {
    if (!prId) return;
    setLoading(true);
    try {
      const res = await api.request<any>(`/api/v1/pull-requests/${prId}`);
      const payload = res?.data || res;
      setPrData(payload);
    } catch (err: any) {
      setError(err?.message || `PR '${prId}' not found.`);
    } finally {
      setLoading(false);
    }
  }, [prId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '32px' }}>
        <div style={{ color: '#64748b', fontSize: '14px' }}>Loading Pull Request Details...</div>
      </div>
    );
  }

  const pr_info = prData?.pr_info || {
    number: Number(prId) || 237,
    title: 'Add authentication middleware',
    author_login: 'mayur.bharvad',
    base_ref: 'main',
    head_ref: 'feature/auth-middleware',
  };

  const scan_summary = prData?.scan_summary || {
    total: 12,
    critical: 2,
    high: 5,
    medium: 3,
    low: 2,
    categories: { SAST: 4, Secrets: 2, Dependencies: 3, 'Code Quality': 2, Other: 1 },
  };

  const security_checks = prData?.security_checks || [];
  const changed_files_tree = prData?.changed_files_tree || [];
  const code_review_findings = prData?.code_review_findings || [];
  const secret_findings_data = prData?.secret_findings_data || [];
  const cicd_check_details = prData?.cicd_check_details || { steps: [] };
  const review_approval_status = prData?.review_approval_status || { reviewers: [], latest_reviews: [] };
  const pr_timeline_history = prData?.pr_timeline_history || [];

  return (
    <div className="pr-dt-wrapper">
      {/* ── Breadcrumb Bar ── */}
      <div className="pr-dt-breadcrumb-bar">
        <span>THING CODE</span>
        <ChevronRight size={13} color="#94a3b8" />
        <span>frontend-app</span>
        <ChevronRight size={13} color="#94a3b8" />
        <Link href="/code/pull-requests" className="pr-dt-crumb-link">
          Pull Requests
        </Link>
        <ChevronRight size={13} color="#94a3b8" />
        <span>#{pr_info.number}</span>
        <ChevronRight size={13} color="#94a3b8" />
        <span className="pr-dt-crumb-active">
          {activeScreen === '9.1' && 'Security'}
          {activeScreen === '9.2' && 'Security Checks'}
          {activeScreen === '9.3' && 'Files'}
          {activeScreen === '9.4' && 'Code Review'}
          {activeScreen === '9.5' && 'Dependencies'}
          {activeScreen === '9.6' && 'CI/CD Checks'}
          {activeScreen === '9.7' && 'Reviews'}
          {activeScreen === '9.8' && 'Activity'}
        </span>
      </div>

      {/* ── Header Banner ── */}
      <div className="pr-dt-header">
        <div className="pr-dt-header-left">
          <button onClick={() => router.push('/code/pull-requests')} className="pr-dt-back-btn">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="pr-dt-title-row">
              <h1 className="pr-dt-title">
                #{pr_info.number} {pr_info.title}
              </h1>
              <span className="pr-dt-badge-open">Open</span>
            </div>
            <p className="pr-dt-subtitle">
              <strong>{pr_info.author_login}</strong> wants to merge 12 commits into{' '}
              <span className="pr-dt-branch-mono">{pr_info.base_ref}</span> from{' '}
              <span className="pr-dt-branch-mono">{pr_info.head_ref}</span>
            </p>
          </div>
        </div>

        <div className="pr-dt-header-right">
          <button
            onClick={() => router.push(`/code/pull-requests/${prId}/security`)}
            className="pr-dt-btn-secondary"
            style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldAlert size={13} color="#dc2626" /> Security Hub (7.1-7.8)
          </button>
          <button
            onClick={() => router.push(`/code/pull-requests/settings`)}
            className="pr-dt-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Settings size={13} /> Settings (14.1-14.8)
          </button>
          <button
            onClick={() => router.push(`/code/pull-requests/${prId}/activity`)}
            className="pr-dt-btn-secondary"
          >
            Activity View
          </button>
          <button onClick={() => alert('Security scan triggered for PR.')} className="pr-dt-btn-primary">
            <Play size={13} fill="currentColor" /> Run Scan
          </button>
        </div>
      </div>

      {/* ── PR Level Standard Tabs ── */}
      <div className="pr-dt-main-tabs">
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.1' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.1')}
        >
          Overview
        </button>
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.2' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.2')}
        >
          Security Checks
        </button>
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.3' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.3')}
        >
          Files
        </button>
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.4' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.4')}
        >
          Code Review
        </button>
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.5' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.5')}
        >
          Dependencies
        </button>
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.6' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.6')}
        >
          CI/CD Checks
        </button>
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.7' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.7')}
        >
          Reviewers
        </button>
        <button
          className={`pr-dt-tab-link ${activeScreen === '9.8' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.8')}
        >
          Timeline
        </button>
      </div>

      {/* ── Screen 9.1 - 9.8 Switcher Pills ── */}
      <div className="pr-dt-sub-screen-switcher">
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.1' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.1')}
        >
          9.1 PR Security Overview
        </button>
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.2' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.2')}
        >
          9.2 Security Checks
        </button>
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.3' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.3')}
        >
          9.3 Changed Files
        </button>
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.4' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.4')}
        >
          9.4 Code Review Findings
        </button>
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.5' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.5')}
        >
          9.5 Dependency / Secret Findings
        </button>
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.6' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.6')}
        >
          9.6 CI/CD Check Details
        </button>
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.7' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.7')}
        >
          9.7 Review & Approval Status
        </button>
        <button
          className={`pr-dt-switcher-pill ${activeScreen === '9.8' ? 'active' : ''}`}
          onClick={() => handleScreenChange('9.8')}
        >
          9.8 PR Activity & Timeline
        </button>
      </div>

      {/* ── Container for Active Screen Content ── */}
      <div className="pr-dt-body">
        {/* ═══════════════════════════════════════════════════════════════════════
            9.1 PR SECURITY OVERVIEW
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.1' && (
          <div className="pr-dt-pane">
            <h2 className="pr-dt-section-title">Security Summary</h2>

            {/* 5 KPI Stat Cards */}
            <div className="pr-dt-stats-row-5">
              <div className="pr-dt-stat-box green">
                <span className="pr-dt-stat-val">{scan_summary.total}</span>
                <span className="pr-dt-stat-lbl">Total Findings</span>
              </div>
              <div className="pr-dt-stat-box red">
                <span className="pr-dt-stat-val">{scan_summary.critical}</span>
                <span className="pr-dt-stat-lbl">Critical</span>
              </div>
              <div className="pr-dt-stat-box orange">
                <span className="pr-dt-stat-val">{scan_summary.high}</span>
                <span className="pr-dt-stat-lbl">High</span>
              </div>
              <div className="pr-dt-stat-box yellow">
                <span className="pr-dt-stat-val">{scan_summary.medium}</span>
                <span className="pr-dt-stat-lbl">Medium</span>
              </div>
              <div className="pr-dt-stat-box gray">
                <span className="pr-dt-stat-val">{scan_summary.low}</span>
                <span className="pr-dt-stat-lbl">Low</span>
              </div>
            </div>

            {/* Findings by Category Donut Chart Card */}
            <div className="pr-dt-card" style={{ marginTop: '20px' }}>
              <div className="pr-dt-card-header">
                <span className="pr-dt-card-title">Findings by Category</span>
              </div>
              <div className="pr-dt-card-body" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg width="130" height="130" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="3.6"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3.6"
                      strokeDasharray="33, 100"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="3.6"
                      strokeDasharray="17, 100"
                      strokeDashoffset="-33"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3.6"
                      strokeDasharray="25, 100"
                      strokeDashoffset="-50"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="3.6"
                      strokeDasharray="17, 100"
                      strokeDashoffset="-75"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <strong style={{ fontSize: '18px', color: '#0f172a' }}>12</strong>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>Findings</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                  <div className="pr-dt-legend-row">
                    <span><span className="pr-dt-dot" style={{ backgroundColor: '#ef4444' }} /> SAST</span>
                    <strong>4</strong>
                  </div>
                  <div className="pr-dt-legend-row">
                    <span><span className="pr-dt-dot" style={{ backgroundColor: '#f97316' }} /> Secrets</span>
                    <strong>2</strong>
                  </div>
                  <div className="pr-dt-legend-row">
                    <span><span className="pr-dt-dot" style={{ backgroundColor: '#3b82f6' }} /> Dependencies</span>
                    <strong>3</strong>
                  </div>
                  <div className="pr-dt-legend-row">
                    <span><span className="pr-dt-dot" style={{ backgroundColor: '#eab308' }} /> Code Quality</span>
                    <strong>2</strong>
                  </div>
                  <div className="pr-dt-legend-row">
                    <span><span className="pr-dt-dot" style={{ backgroundColor: '#94a3b8' }} /> Other</span>
                    <strong>1</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Scan Status List Card */}
            <div className="pr-dt-card" style={{ marginTop: '20px' }}>
              <div className="pr-dt-card-header">
                <span className="pr-dt-card-title">Scan Status</span>
              </div>
              <div className="pr-dt-card-body" style={{ padding: '4px 18px' }}>
                <div className="pr-dt-scan-status-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={16} color="#ef4444" />
                    <strong>SAST Scan</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="pr-dt-badge-pill danger">2 High</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Completed 5m ago</span>
                  </div>
                </div>

                <div className="pr-dt-scan-status-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={16} color="#f97316" />
                    <strong>Secrets Scan</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="pr-dt-badge-pill danger">1 High</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Completed 6m ago</span>
                  </div>
                </div>

                <div className="pr-dt-scan-status-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={16} color="#3b82f6" />
                    <strong>Dependency Scan</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="pr-dt-badge-pill warning">2 Medium</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Completed 6m ago</span>
                  </div>
                </div>

                <div className="pr-dt-scan-status-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={16} color="#10b981" />
                    <strong>Code Quality</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="pr-dt-badge-pill success">2 Low</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Completed 6m ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            9.2 SECURITY CHECKS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.2' && (
          <div className="pr-dt-pane">
            <div className="pr-dt-title-block">
              <h2 className="pr-dt-heading">Security Checks</h2>
              <p className="pr-dt-desc">Automated security scans and policy checks for this pull request.</p>
            </div>

            <div className="pr-dt-card">
              <div className="pr-dt-card-filters">
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select className="pr-dt-select">
                    <option>All Checks</option>
                    <option>SAST</option>
                    <option>Secrets</option>
                  </select>
                  <select
                    value={checkStatusFilter}
                    onChange={(e) => setCheckStatusFilter(e.target.value)}
                    className="pr-dt-select"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Skipped">Skipped</option>
                  </select>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                    <input type="text" placeholder="Search..." className="pr-dt-input-search" />
                  </div>
                </div>

                <button onClick={() => alert('Checks triggered.')} className="pr-dt-btn-primary">
                  <RotateCw size={13} /> Re-run Checks
                </button>
              </div>

              <table className="pr-dt-table">
                <thead>
                  <tr>
                    <th>Check Name</th>
                    <th>Tool</th>
                    <th>Status</th>
                    <th>Findings</th>
                    <th>Duration</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {security_checks
                    .filter((c: any) => checkStatusFilter === 'All Status' || c.status === checkStatusFilter)
                    .map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ color: '#64748b' }}>{c.tool}</td>
                        <td>
                          <span
                            className={`pr-dt-badge-pill ${
                              c.status === 'Passed'
                                ? 'success'
                                : c.status === 'Failed'
                                ? 'danger'
                                : 'gray'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: c.findings > 0 ? '#dc2626' : '#16a34a' }}>
                          {c.findings}
                        </td>
                        <td style={{ color: '#64748b' }}>{c.duration}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="pr-dt-dots-btn">
                            <MoreVertical size={14} color="#64748b" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            9.3 CHANGED FILES
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.3' && (
          <div className="pr-dt-pane">
            <div className="pr-dt-title-block">
              <h2 className="pr-dt-heading">Changed Files (12)</h2>
              <p className="pr-dt-desc">Files changed in this pull request.</p>
            </div>

            <div className="pr-dt-card">
              <div className="pr-dt-card-filters">
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="pr-dt-input-search"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="pr-dt-select">
                    <option>All Files</option>
                    <option>Only Files with Findings</option>
                  </select>
                  <button className="pr-dt-btn-secondary">
                    <Filter size={13} /> Filter
                  </button>
                </div>
              </div>

              <table className="pr-dt-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Change</th>
                    <th>Lines +/-</th>
                    <th>Security Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {changed_files_tree
                    .filter((f: any) => !fileSearch || f.file.toLowerCase().includes(fileSearch.toLowerCase()))
                    .map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Folder size={14} color="#f59e0b" />
                            <span style={{ color: '#64748b' }}>{item.folder}/</span>
                            <span style={{ fontWeight: 600 }}>{item.file}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.change}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                          {item.lines}
                        </td>
                        <td>
                          {item.findings === '-' ? (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          ) : (
                            <span
                              className={`pr-dt-badge-pill ${
                                item.findings.includes('High')
                                  ? 'danger'
                                  : item.findings.includes('Medium')
                                  ? 'warning'
                                  : 'blue'
                              }`}
                            >
                              {item.findings}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            9.4 CODE REVIEW FINDINGS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.4' && (
          <div className="pr-dt-pane">
            <div className="pr-dt-title-block">
              <h2 className="pr-dt-heading">Code Review Findings</h2>
              <p className="pr-dt-desc">Security and quality findings in the changed code.</p>
            </div>

            <div className="pr-dt-card">
              <div className="pr-dt-card-filters">
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={findingSeverityFilter}
                    onChange={(e) => setFindingSeverityFilter(e.target.value)}
                    className="pr-dt-select"
                  >
                    <option value="All Severities">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <select className="pr-dt-select">
                    <option>All Categories</option>
                    <option>Credentials</option>
                    <option>Injection</option>
                  </select>
                  <select className="pr-dt-select">
                    <option>All Files</option>
                    <option>middleware.js</option>
                    <option>routes.js</option>
                  </select>
                </div>
              </div>

              <table className="pr-dt-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Rule</th>
                    <th>Severity</th>
                    <th>File</th>
                    <th>Line</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {code_review_findings
                    .filter((f: any) => findingSeverityFilter === 'All Severities' || f.severity === findingSeverityFilter)
                    .map((item: any) => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {item.id}
                        </td>
                        <td style={{ fontWeight: 500 }}>{item.rule}</td>
                        <td>
                          <span
                            className={`pr-dt-badge-pill ${
                              item.severity === 'Critical' || item.severity === 'High'
                                ? 'danger'
                                : item.severity === 'Medium'
                                ? 'warning'
                                : 'blue'
                            }`}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                          {item.file}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.line}</td>
                        <td>
                          <span className="pr-dt-badge-pill danger">{item.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Code Snippet Box Matching Screen 9.4 Bottom */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    className={`pr-dt-sub-tab-btn ${reviewTab === 'details' ? 'active' : ''}`}
                    onClick={() => setReviewTab('details')}
                  >
                    Finding Details
                  </button>
                  <button
                    className={`pr-dt-sub-tab-btn ${reviewTab === 'snippet' ? 'active' : ''}`}
                    onClick={() => setReviewTab('snippet')}
                  >
                    Code Snippet
                  </button>
                </div>

                <div className="pr-dt-snippet-container">
                  <div className="pr-dt-snippet-header">
                    <span>/src/auth/middleware.js</span>
                    <button
                      onClick={() => alert('Code copied to clipboard')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <div className="pr-dt-snippet-content">
                    <div className="pr-dt-snippet-line"><span className="num">16</span><span>  // Get token from header</span></div>
                    <div className="pr-dt-snippet-line"><span className="num">17</span><span>  const token = req.headers.authorization;</span></div>
                    <div className="pr-dt-snippet-line"><span className="num">18</span><span>  </span></div>
                    <div className="pr-dt-snippet-line diff-red"><span className="num">19 -</span><span>  const jwtSecret = &quot;mysecret123&quot;; // hardcoded secret</span></div>
                    <div className="pr-dt-snippet-line diff-green"><span className="num">20 +</span><span>  </span></div>
                    <div className="pr-dt-snippet-line"><span className="num">21</span><span>  const decoded = jwt.verify(token, jwtSecret);</span></div>
                    <div className="pr-dt-snippet-line"><span className="num">22</span><span>  req.user = decoded;</span></div>
                    <div className="pr-dt-snippet-line"><span className="num">23</span><span>  next();</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            9.5 DEPENDENCY / SECRET FINDINGS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.5' && (
          <div className="pr-dt-pane">
            <div className="pr-dt-card">
              <div className="pr-dt-sub-header-tabs">
                <button
                  className={`pr-dt-sub-tab-btn ${depTab === 'deps' ? 'active' : ''}`}
                  onClick={() => setDepTab('deps')}
                >
                  Dependencies (3)
                </button>
                <button
                  className={`pr-dt-sub-tab-btn ${depTab === 'secrets' ? 'active' : ''}`}
                  onClick={() => setDepTab('secrets')}
                >
                  Secrets (2)
                </button>
                <button
                  className={`pr-dt-sub-tab-btn ${depTab === 'license' ? 'active' : ''}`}
                  onClick={() => setDepTab('license')}
                >
                  License (0)
                </button>
              </div>

              <div className="pr-dt-card-body" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Secret Findings</strong>
                </div>

                <table className="pr-dt-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>File</th>
                      <th>Line</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secret_findings_data.map((item: any) => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {item.id}
                        </td>
                        <td style={{ fontWeight: 500 }}>{item.type}</td>
                        <td>
                          <span className={`pr-dt-badge-pill ${item.severity === 'High' ? 'danger' : 'warning'}`}>
                            {item.severity}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                          {item.file}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.line}</td>
                        <td>
                          <span className={`pr-dt-badge-pill ${resolvedSecrets[item.id] ? 'success' : 'danger'}`}>
                            {resolvedSecrets[item.id] ? 'Resolved' : item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Secret Details Card Matching Screen 9.5 Bottom */}
            <div className="pr-dt-card" style={{ marginTop: '20px' }}>
              <div className="pr-dt-card-header">
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    SEC-001 — Hardcoded API Key
                  </strong>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    An API key is hardcoded in the source code.
                  </div>
                </div>
                <span className="pr-dt-badge-pill danger">High</span>
              </div>

              <div className="pr-dt-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>File</span>
                    <strong style={{ fontSize: '12px', fontFamily: 'monospace' }}>src/config.js</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Line</span>
                    <strong style={{ fontSize: '12px' }}>12</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Secret Type</span>
                    <strong style={{ fontSize: '12px' }}>Generic API Key</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Confidence</span>
                    <strong style={{ fontSize: '12px' }}>98%</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Status</span>
                    <span className={`pr-dt-badge-pill ${resolvedSecrets['SEC-001'] ? 'success' : 'danger'}`}>
                      {resolvedSecrets['SEC-001'] ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Detected Value
                  </span>
                  <div className="pr-dt-detected-value-box">
                    <code>const apiKey = &quot;sk_live_51M8x3...&quot;;</code>
                    <button
                      onClick={() => alert('Secret token copied')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Recommendation
                  </span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                    Use environment variables or a secrets manager to store API keys instead of hardcoding them in the code.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setResolvedSecrets((prev) => ({ ...prev, 'SEC-001': true }));
                      alert('SEC-001 marked as resolved.');
                    }}
                    className="pr-dt-btn-primary"
                  >
                    Mark as Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            9.6 CI/CD CHECK DETAILS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.6' && (
          <div className="pr-dt-pane">
            <div className="pr-dt-title-block">
              <h2 className="pr-dt-heading">CI/CD Check Details</h2>
              <p className="pr-dt-desc">Detailed view of CI/CD checks for this pull request.</p>
            </div>

            <div className="pr-dt-card">
              <div className="pr-dt-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      {cicd_check_details.name}
                    </strong>
                    <span className="pr-dt-badge-pill danger">{cicd_check_details.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Started {cicd_check_details.started} • Duration {cicd_check_details.duration}
                  </div>
                </div>

                <button
                  onClick={() => alert('Opening full runner logs...')}
                  className="pr-dt-btn-secondary"
                >
                  View Logs
                </button>
              </div>

              <div className="pr-dt-card-body" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cicd_check_details.steps.map((st: any, idx: number) => (
                    <div key={idx} className="pr-dt-step-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {st.status === 'Passed' ? (
                          <div className="pr-dt-circle-node green"><Check size={12} strokeWidth={3} /></div>
                        ) : st.status === 'Failed' ? (
                          <div className="pr-dt-circle-node red"><X size={12} strokeWidth={3} /></div>
                        ) : (
                          <div className="pr-dt-circle-node gray" />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>{st.name}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{st.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scan Output Terminal Box Matching Screen 9.6 Bottom */}
            <div className="pr-dt-card" style={{ marginTop: '20px' }}>
              <div className="pr-dt-card-header">
                <span className="pr-dt-card-title">Scan Output</span>
              </div>
              <div className="pr-dt-terminal-output">
                {cicd_check_details.output}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            9.7 REVIEW & APPROVAL STATUS
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.7' && (
          <div className="pr-dt-pane">
            <div className="pr-dt-title-block">
              <h2 className="pr-dt-heading">Review & Approval Status</h2>
              <p className="pr-dt-desc">Track reviews, approvals and required checks.</p>
            </div>

            {/* 4 Stats Cards */}
            <div className="pr-dt-stats-row-4">
              <div className="pr-dt-stat-box green">
                <span className="pr-dt-stat-val">{review_approval_status.approvals}</span>
                <span className="pr-dt-stat-lbl">Approvals</span>
              </div>
              <div className="pr-dt-stat-box red">
                <span className="pr-dt-stat-val">{review_approval_status.changes_requested}</span>
                <span className="pr-dt-stat-lbl">Changes Requested</span>
              </div>
              <div className="pr-dt-stat-box blue">
                <span className="pr-dt-stat-val">{review_approval_status.comments}</span>
                <span className="pr-dt-stat-lbl">Comments</span>
              </div>
              <div className="pr-dt-stat-box gray">
                <span className="pr-dt-stat-val">{review_approval_status.merge_status}</span>
                <span className="pr-dt-stat-lbl">Merge</span>
              </div>
            </div>

            {/* Reviewers Table Card */}
            <div className="pr-dt-card" style={{ marginTop: '20px' }}>
              <div className="pr-dt-card-header">
                <span className="pr-dt-card-title">Reviewers</span>
                <button
                  onClick={() => alert('Add reviewer modal opened.')}
                  className="pr-dt-btn-primary"
                >
                  <Plus size={13} /> Add Reviewers
                </button>
              </div>

              <table className="pr-dt-table">
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th>Status</th>
                    <th>Reviewed At</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {review_approval_status.reviewers.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{r.reviewer}</td>
                      <td>
                        <span
                          className={`pr-dt-badge-pill ${
                            r.status === 'Approved'
                              ? 'success'
                              : r.status === 'Changes Requested'
                              ? 'danger'
                              : 'blue'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>{r.reviewed_at}</td>
                      <td style={{ color: '#334155' }}>{r.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Latest Reviews Feed Matching Screen 9.7 Bottom */}
            <div className="pr-dt-card" style={{ marginTop: '20px' }}>
              <div className="pr-dt-card-header">
                <span className="pr-dt-card-title">Latest Reviews</span>
              </div>
              <div className="pr-dt-card-body" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="pr-dt-review-feed-item">
                  <div className="pr-dt-circle-node dark">MK</div>
                  <div style={{ flexGrow: 1 }}>
                    <div>
                      <strong>mayur.bharvad</strong> approved this pull request
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Oct 04, 2026, 10:24 AM</span>
                  </div>
                </div>

                <div className="pr-dt-review-feed-item">
                  <div className="pr-dt-circle-node red"><X size={12} strokeWidth={3} /></div>
                  <div style={{ flexGrow: 1 }}>
                    <div>
                      <strong>dev-team</strong> requested changes
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Oct 04, 2026, 09:12 AM</span>
                    <div className="pr-dt-review-note">
                      Please address the security findings and add input validation for user data.
                    </div>
                  </div>
                </div>

                <div className="pr-dt-review-feed-item">
                  <div className="pr-dt-circle-node slate"><UserCheck size={12} /></div>
                  <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>security-team</strong> reviewed
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Oct 04, 2026, 08:45 AM</div>
                    </div>
                    <span className="pr-dt-badge-pill blue">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            9.8 PR ACTIVITY & TIMELINE
            ═══════════════════════════════════════════════════════════════════════ */}
        {activeScreen === '9.8' && (
          <div className="pr-dt-pane">
            <div className="pr-dt-title-block">
              <h2 className="pr-dt-heading">Activity & Timeline</h2>
              <p className="pr-dt-desc">Complete activity history for this pull request.</p>
            </div>

            <div className="pr-dt-card">
              <div className="pr-dt-card-body">
                <div className="pr-dt-timeline-flow">
                  {pr_timeline_history.map((ev: any, idx: number) => (
                    <div key={idx} className="pr-dt-timeline-row">
                      {/* Node icon */}
                      <div
                        className={`pr-dt-node ${
                          ev.node === 'pr'
                            ? 'purple'
                            : ev.node === 'commit'
                            ? 'blue'
                            : ev.node === 'security'
                            ? 'green'
                            : ev.node === 'x'
                            ? 'red'
                            : ev.node === 'check'
                            ? 'green'
                            : 'slate'
                        }`}
                      >
                        {ev.node === 'pr' && <GitPullRequest size={13} />}
                        {ev.node === 'commit' && <GitCommit size={13} />}
                        {ev.node === 'security' && <Shield size={13} />}
                        {ev.node === 'x' && <X size={13} strokeWidth={2.5} />}
                        {ev.node === 'check' && <Check size={13} strokeWidth={2.5} />}
                        {ev.node === 'clock' && <Clock size={13} />}
                      </div>

                      <div className="pr-dt-timeline-content">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{ev.title}</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ev.time}</span>
                        </div>

                        {ev.badge && (
                          <div style={{ marginTop: '4px' }}>
                            <span className="pr-dt-branch-mono">{ev.badge}</span>
                          </div>
                        )}

                        {ev.status && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span className={`pr-dt-badge-pill ${ev.status === 'Failed' ? 'danger' : 'blue'}`}>
                              {ev.status}
                            </span>
                            {ev.details && <span style={{ fontSize: '12px', color: '#64748b' }}>{ev.details}</span>}
                          </div>
                        )}

                        {ev.note && (
                          <div className="pr-dt-review-note" style={{ marginTop: '6px' }}>
                            {ev.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
