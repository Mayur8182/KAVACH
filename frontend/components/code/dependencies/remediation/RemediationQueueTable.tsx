'use client';

import React from 'react';
import { RemediationQueueItem } from '@/types/api/dependencies';
import { Search, SlidersHorizontal, MoreHorizontal, ArrowRight, CheckCircle2, GitPullRequest, ExternalLink } from 'lucide-react';

interface RemediationQueueTableProps {
  items: RemediationQueueItem[];
  selectedItem: RemediationQueueItem | null;
  onSelectItem: (item: RemediationQueueItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  severityFilter: string;
  onSeverityChange: (s: string) => void;
  ecosystemFilter: string;
  onEcosystemChange: (e: string) => void;
  statusFilter: string;
  onStatusChange: (st: string) => void;
  repoFilter: string;
  onRepoChange: (r: string) => void;
  loading?: boolean;
}

export const RemediationQueueTable: React.FC<RemediationQueueTableProps> = ({
  items,
  selectedItem,
  onSelectItem,
  searchQuery,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  ecosystemFilter,
  onEcosystemChange,
  statusFilter,
  onStatusChange,
  repoFilter,
  onRepoChange,
  loading = false,
}) => {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
      case 'HIGH':
        return { bg: '#FFF7ED', color: '#EA580C', border: '#FFEDD5' };
      case 'MEDIUM':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      case 'LOW':
      default:
        return { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' };
    }
  };

  const getStatusStyle = (st: string) => {
    switch (st.toUpperCase()) {
      case 'FIXED':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
      case 'IN_PROGRESS':
        return { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
      case 'PENDING_VERIFICATION':
        return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      case 'IGNORED':
        return { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
      case 'OPEN':
      default:
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
    }
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
      {/* Table Header Controls */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, minWidth: '220px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Remediation Queue
          </h3>
          <span
            style={{
              fontSize: '12px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 500,
            }}
          >
            {items.length} items
          </span>
        </div>

        {/* Filter controls matching Screenshot 09 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              width: '220px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search dependencies..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0F172A',
                width: '100%',
              }}
            />
          </div>

          {/* Severity Select */}
          <select
            value={severityFilter}
            aria-label="Filter by severity"
            onChange={(e) => onSeverityChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Ecosystem Select */}
          <select
            value={ecosystemFilter}
            aria-label="Filter by ecosystem"
            onChange={(e) => onEcosystemChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Ecosystem</option>
            <option value="npm">npm</option>
            <option value="pypi">PyPI</option>
            <option value="maven">Maven</option>
            <option value="go">Go</option>
            <option value="cargo">Cargo</option>
          </select>

          {/* Status Select */}
          <select
            value={statusFilter}
            aria-label="Filter by status"
            onChange={(e) => onStatusChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="FIXED">Fixed</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="IGNORED">Ignored</option>
          </select>

          {/* Repository Select */}
          <select
            value={repoFilter}
            aria-label="Filter by repository"
            onChange={(e) => onRepoChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Repository</option>
            <option value="web-api">web-api</option>
            <option value="frontend-app">frontend-app</option>
            <option value="auth-service">auth-service</option>
          </select>

          <button
            type="button"
            aria-label="Filter options"
            style={{
              padding: '7px 8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
              <th style={{ padding: '12px 14px', width: '36px' }}>
                <input
                  type="checkbox"
                  aria-label="Select all dependencies"
                  checked={selectedIds.size === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                />
              </th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Package</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Current Version</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Fixed Version</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Severity</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Type</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 14px', fontWeight: 600 }}>Repository</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={9} style={{ padding: '14px' }}>
                    <div style={{ height: '20px', backgroundColor: '#F1F5F9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  No dependencies matching the current filters.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isRowSelected = selectedItem?.id === item.id;
                const sevStyle = getSeverityStyle(item.severity);
                const statusStyle = getStatusStyle(item.status);

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isRowSelected ? '#F0F9FF' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isRowSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isRowSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '12px 14px' }} onClick={(e) => handleSelectRow(item.id, e)}>
                      <input
                        type="checkbox"
                        aria-label={`Select dependency ${item.package_name}`}
                        checked={selectedIds.has(item.id)}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>
                          {item.package_name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.cve_id ? `${item.cve_id} • ` : ''}{item.title}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#64748B' }}>
                      {item.current_version}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#059669', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowRight size={12} color="#10B981" />
                        {item.fixed_version}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: sevStyle.bg,
                          color: sevStyle.color,
                          border: `1px solid ${sevStyle.border}`,
                        }}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12px' }}>
                      {item.dependency_type}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {item.status === 'FIXED' && <CheckCircle2 size={11} />}
                        {item.status === 'IN_PROGRESS' && <GitPullRequest size={11} />}
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      <span style={{ fontSize: '12px', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                        {item.repository_name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        aria-label={`Actions for ${item.package_name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#0F172A';
                          e.currentTarget.style.backgroundColor = '#F1F5F9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94A3B8';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
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
