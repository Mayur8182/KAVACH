'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PackageHealthInventoryItem } from '@/types/api/dependencies';
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  MoreHorizontal,
  Package as PackageIcon,
  AlertTriangle,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface PackageHealthInventoryTableProps {
  items: PackageHealthInventoryItem[];
  loading?: boolean;
  selectedRepo: string;
  onRepoChange?: (repo: string) => void;
  onSelectPackage?: (item: PackageHealthInventoryItem) => void;
}

export const PackageHealthInventoryTable: React.FC<PackageHealthInventoryTableProps> = ({
  items = [],
  loading = false,
  selectedRepo,
  onRepoChange,
  onSelectPackage,
}) => {
  const [search, setSearch] = useState('');
  const [selectedEcosystem, setSelectedEcosystem] = useState('all');
  const [selectedHealthStatus, setSelectedHealthStatus] = useState('all');
  const [selectedMaintenance, setSelectedMaintenance] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter items
  const filtered = items.filter((item) => {
    if (search && !item.package_name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedEcosystem !== 'all' && item.ecosystem.toLowerCase() !== selectedEcosystem.toLowerCase()) {
      return false;
    }
    if (selectedHealthStatus !== 'all' && item.health_status.toLowerCase() !== selectedHealthStatus.toLowerCase()) {
      return false;
    }
    if (selectedMaintenance !== 'all' && item.maintenance_status.toLowerCase() !== selectedMaintenance.toLowerCase()) {
      return false;
    }
    if (selectedRepo !== 'all' && item.repository_name.toLowerCase() !== selectedRepo.toLowerCase()) {
      return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const getHealthBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
      case 'moderate':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A' };
      case 'poor':
        return { bg: '#FFEDD5', color: '#EA580C', border: '#FED7AA' };
      case 'critical':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' };
      default:
        return { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
    }
  };

  const getMaintenanceBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { bg: '#EFF6FF', color: '#2563EB' };
      case 'low activity':
        return { bg: '#FFFBEB', color: '#B45309' };
      case 'stale':
        return { bg: '#FFF7ED', color: '#C2410C' };
      case 'abandoned':
        return { bg: '#FEF2F2', color: '#B91C1C' };
      default:
        return { bg: '#F8FAFC', color: '#64748B' };
    }
  };

  const getTrustBadgeStyle = (score: number) => {
    if (score >= 90) return { bg: '#ECFDF5', color: '#059669' };
    if (score >= 70) return { bg: '#FEF3C7', color: '#D97706' };
    if (score >= 50) return { bg: '#FFEDD5', color: '#EA580C' };
    return { bg: '#FEE2E2', color: '#DC2626' };
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Table Header Controls matching Screenshot 08 */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Package Health Inventory
          </h2>
          <span
            style={{
              fontSize: '12px',
              color: '#64748B',
              backgroundColor: '#F1F5F9',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 500,
            }}
          >
            {filtered.length} packages
          </span>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              width: '220px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {/* Ecosystem Filter */}
          <select
            value={selectedEcosystem}
            onChange={(e) => setSelectedEcosystem(e.target.value)}
            aria-label="Filter by ecosystem"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12.5px',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Ecosystem (All)</option>
            <option value="npm">npm</option>
            <option value="pypi">PyPI</option>
            <option value="maven">Maven</option>
            <option value="go">Go Modules</option>
            <option value="cargo">Cargo</option>
          </select>

          {/* Health Status Filter */}
          <select
            value={selectedHealthStatus}
            onChange={(e) => setSelectedHealthStatus(e.target.value)}
            aria-label="Filter by health status"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12.5px',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Health Status (All)</option>
            <option value="healthy">Healthy</option>
            <option value="moderate">Moderate</option>
            <option value="poor">Poor</option>
            <option value="critical">Critical</option>
          </select>

          {/* Maintenance Activity Filter */}
          <select
            value={selectedMaintenance}
            onChange={(e) => setSelectedMaintenance(e.target.value)}
            aria-label="Filter by maintenance status"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12.5px',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Maintenance Activity (All)</option>
            <option value="active">Active</option>
            <option value="low activity">Low Activity</option>
            <option value="stale">Stale</option>
            <option value="abandoned">Abandoned</option>
          </select>

          {/* Repository Filter */}
          <select
            value={selectedRepo}
            onChange={(e) => onRepoChange?.(e.target.value)}
            aria-label="Filter by repository"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12.5px',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Repository (All)</option>
            <option value="web-api">web-api</option>
            <option value="frontend-app">frontend-app</option>
            <option value="auth-service">auth-service</option>
            <option value="data-pipeline">data-pipeline</option>
          </select>

          {/* Sliders icon */}
          <button
            type="button"
            aria-label="Filter options"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            onClick={() => {
              setSearch('');
              setSelectedEcosystem('all');
              setSelectedHealthStatus('all');
              setSelectedMaintenance('all');
              onRepoChange?.('all');
            }}
            title="Reset filters"
          >
            <SlidersHorizontal size={14} color="#64748B" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
              <th style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all packages"
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '12px 16px' }}>Package</th>
              <th style={{ padding: '12px 16px' }}>Version</th>
              <th style={{ padding: '12px 16px' }}>Ecosystem</th>
              <th style={{ padding: '12px 16px' }}>Health Status</th>
              <th style={{ padding: '12px 16px' }}>Last Release</th>
              <th style={{ padding: '12px 16px' }}>GitHub Activity</th>
              <th style={{ padding: '12px 16px' }}>Maintenance</th>
              <th style={{ padding: '12px 16px' }}>Trust Score</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>Loading package health records...</div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                  No packages match the selected health or maintenance filters.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const healthStyle = getHealthBadgeStyle(item.health_status);
                const maintStyle = getMaintenanceBadgeStyle(item.maintenance_status);
                const trustStyle = getTrustBadgeStyle(item.trust_score);

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#F0F9FF' : 'transparent',
                      transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.package_name}`}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Package Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B',
                            flexShrink: 0,
                          }}
                        >
                          <PackageIcon size={14} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Link
                            href={`/code/dependencies/health/${encodeURIComponent(item.package_name)}`}
                            style={{
                              fontWeight: 600,
                              color: '#0F172A',
                              textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                          >
                            {item.package_name}
                          </Link>
                          {item.is_deprecated && (
                            <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={10} /> Deprecated
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Version */}
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                      {item.version}
                    </td>

                    {/* Ecosystem */}
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.ecosystem}
                      </span>
                    </td>

                    {/* Health Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          backgroundColor: healthStyle.bg,
                          color: healthStyle.color,
                          border: `1px solid ${healthStyle.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {item.health_status}
                      </span>
                    </td>

                    {/* Last Release */}
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12.5px' }}>
                      {item.last_release_relative}
                    </td>

                    {/* GitHub Activity Sparkline */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '20px', width: '70px' }}>
                        {(item.github_activity || [3, 6, 8, 12, 10, 14, 18, 16]).map((val, idx) => {
                          const maxActivity = Math.max(...(item.github_activity || [20]), 15);
                          const barHeight = Math.max(Math.round((val / maxActivity) * 100), 15);
                          return (
                            <div
                              key={idx}
                              title={`${val} commits`}
                              style={{
                                width: '5px',
                                height: `${barHeight}%`,
                                backgroundColor: item.health_status === 'Critical' ? '#FCA5A5' : (item.health_status === 'Poor' ? '#FDBA74' : '#60A5FA'),
                                borderRadius: '1px',
                              }}
                            />
                          );
                        })}
                      </div>
                    </td>

                    {/* Maintenance */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: maintStyle.color,
                          backgroundColor: maintStyle.bg,
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.maintenance_status}
                      </span>
                    </td>

                    {/* Trust Score */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: trustStyle.color,
                          backgroundColor: trustStyle.bg,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                        }}
                      >
                        {item.trust_score}/100
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Link
                        href={`/code/dependencies/health/${encodeURIComponent(item.package_name)}`}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          color: '#2563EB',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#EFF6FF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        View
                        <ExternalLink size={12} />
                      </Link>
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
