'use client';

import React, { useState, useMemo } from 'react';
import { RecentCICDRunRow } from '@/types/api/dependencies';
import {
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  GitBranch,
  GitPullRequest,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Shield,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface RecentCICDRunsTableProps {
  runs: RecentCICDRunRow[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const RecentCICDRunsTable: React.FC<RecentCICDRunsTableProps> = ({
  runs,
  loading = false,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Unique filter choices
  const repositories = useMemo(() => {
    const set = new Set(runs.map((r) => r.repository));
    return Array.from(set).filter(Boolean);
  }, [runs]);

  const branches = useMemo(() => {
    const set = new Set(runs.map((r) => r.branch));
    return Array.from(set).filter(Boolean);
  }, [runs]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (
        searchTerm &&
        !run.run_id.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !run.repository.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !run.branch.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !run.commit_sha.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !run.triggered_by.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      if (selectedRepo !== 'ALL' && run.repository !== selectedRepo) {
        return false;
      }
      if (selectedBranch !== 'ALL' && run.branch !== selectedBranch) {
        return false;
      }
      if (selectedStatus !== 'ALL' && run.status.toUpperCase() !== selectedStatus) {
        return false;
      }
      if (selectedEventType !== 'ALL' && !run.event.toLowerCase().includes(selectedEventType.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [runs, searchTerm, selectedRepo, selectedBranch, selectedStatus, selectedEventType]);

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredRuns.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredRuns.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((r) => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PASSED' || s === 'SUCCESS') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0',
          }}
        >
          <CheckCircle2 size={12} />
          Passed
        </span>
      );
    }
    if (s === 'FAILED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FECACA',
          }}
        >
          <XCircle size={12} />
          Failed
        </span>
      );
    }
    if (s === 'BLOCKED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FFFBEB',
            color: '#D97706',
            border: '1px solid #FDE68A',
          }}
        >
          <AlertTriangle size={12} />
          Blocked
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
          border: '1px solid #BFDBFE',
        }}
      >
        <PlayCircle size={12} />
        Running
      </span>
    );
  };

  const getSecurityIssuesBadge = (run: RecentCICDRunRow) => {
    if (run.critical_issues > 0) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FCA5A5',
          }}
        >
          {run.critical_issues} Crit{run.high_issues > 0 ? `, ${run.high_issues} High` : ''}
        </span>
      );
    }
    if (run.high_issues > 0) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FFF7ED',
            color: '#C2410C',
            border: '1px solid #FDBA74',
          }}
        >
          {run.high_issues} High
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 500,
          backgroundColor: '#F0FDF4',
          color: '#15803D',
        }}
      >
        0 Issues
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Title & Filter Bar matching Screenshot 12 */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Recent CI/CD Runs
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {filteredRuns.length} of {runs.length} runs
          </span>
        </div>

        {/* Filter controls matching Screenshot 12 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div
            style={{
              flex: '1 1 240px',
              minWidth: '220px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search size={15} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search builds, workflows, or commits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '13px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#F8FAFC',
                color: '#0F172A',
              }}
            />
          </div>

          {/* Repository Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              style={{
                padding: '8px 28px 8px 12px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Repository: All</option>
              {repositories.map((repo) => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', color: '#64748B', pointerEvents: 'none' }} />
          </div>

          {/* Branch Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                padding: '8px 28px 8px 12px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Branch: All</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', color: '#64748B', pointerEvents: 'none' }} />
          </div>

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '8px 28px 8px 12px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Status: All</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="BLOCKED">Blocked</option>
              <option value="RUNNING">Running</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', color: '#64748B', pointerEvents: 'none' }} />
          </div>

          {/* Event Type Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              style={{
                padding: '8px 28px 8px 12px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Event Type: All</option>
              <option value="Pull Request">Pull Request</option>
              <option value="Push">Push</option>
              <option value="Schedule">Schedule</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '11px', color: '#64748B', pointerEvents: 'none' }} />
          </div>

          {/* Customize filter options button */}
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              cursor: 'pointer',
            }}
            title="Filter Settings"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ width: '40px', padding: '12px 16px' }}>
                <input
                  type="checkbox"
                  checked={selectedRows.length > 0 && selectedRows.length === filteredRuns.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', accentColor: '#1E40AF' }}
                />
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Run ID
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Repository
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Branch
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Event
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Triggered By
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dependency Checks
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Security Issues
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Started At
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Duration
              </th>
              <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={12} style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ height: '20px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
                  </td>
                </tr>
              ))
            ) : filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B' }}>
                  No CI/CD pipeline runs match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRuns.map((run) => {
                const isSelected = selectedRows.includes(run.id);
                return (
                  <tr
                    key={run.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(run.id)}
                        style={{ cursor: 'pointer', accentColor: '#1E40AF' }}
                      />
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>
                          {run.run_id}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>
                          {run.commit_sha}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px', fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                      {run.repository}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#475569',
                          backgroundColor: '#F8FAFC',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <GitBranch size={11} color="#64748B" />
                        {run.branch}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#475569' }}>
                      {run.event.includes('Pull Request') ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284C7', fontWeight: 500 }}>
                          <GitPullRequest size={12} />
                          {run.event}
                        </span>
                      ) : (
                        run.event
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#475569',
                          }}
                        >
                          {run.triggered_by.slice(0, 2).toUpperCase()}
                        </span>
                        <span style={{ fontSize: '12px', color: '#334155' }}>
                          {run.triggered_by}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      {getStatusBadge(run.status)}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#475569' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={12} color="#64748B" />
                        {run.dependency_checks}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      {getSecurityIssuesBadge(run)}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#64748B' }}>
                      {run.started_at}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} color="#94A3B8" />
                        {run.duration}
                      </span>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
