'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { SBOMComponentRow } from '@/types/api/dependencies';

interface SBOMComponentsTableProps {
  components: SBOMComponentRow[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectComponent?: (component: SBOMComponentRow) => void;
}

export const SBOMComponentsTable: React.FC<SBOMComponentsTableProps> = ({
  components,
  loading = false,
  onRefresh,
  onSelectComponent,
}) => {
  const [search, setSearch] = useState('');
  const [ecosystemFilter, setEcosystemFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Available filter options derived from data
  const ecosystems = useMemo(() => {
    const set = new Set(components.map((c) => c.ecosystem));
    return Array.from(set).sort();
  }, [components]);

  const componentTypes = useMemo(() => {
    const set = new Set(components.map((c) => c.component_type));
    return Array.from(set).sort();
  }, [components]);

  const repositories = useMemo(() => {
    const set = new Set(components.map((c) => c.repository_name));
    return Array.from(set).sort();
  }, [components]);

  // Filtering
  const filtered = useMemo(() => {
    return components.filter((item) => {
      const matchSearch =
        !search ||
        item.component_name.toLowerCase().includes(search.toLowerCase()) ||
        item.version.toLowerCase().includes(search.toLowerCase()) ||
        item.license_name.toLowerCase().includes(search.toLowerCase());

      const matchEco = ecosystemFilter === 'all' || item.ecosystem.toLowerCase() === ecosystemFilter.toLowerCase();
      const matchType = typeFilter === 'all' || item.component_type.toLowerCase() === typeFilter.toLowerCase();
      const matchRepo = repoFilter === 'all' || item.repository_name.toLowerCase() === repoFilter.toLowerCase();

      return matchSearch && matchEco && matchType && matchRepo;
    });
  }, [components, search, ecosystemFilter, typeFilter, repoFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getIssuesBadge = (issue: string) => {
    const upper = (issue || '').toUpperCase();
    if (upper === 'CRITICAL') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FEE2E2',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={12} />
          1 Critical
        </span>
      );
    }
    if (upper === 'HIGH') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FFFBEB',
            color: '#D97706',
            border: '1px solid #FEF3C7',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={12} />
          1 High
        </span>
      );
    }
    if (upper === 'MEDIUM') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            border: '1px solid #DBEAFE',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          1 Medium
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#ECFDF5',
          color: '#059669',
          border: '1px solid #D1FAE5',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <ShieldCheck size={12} />
        None
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <span
        style={{
          backgroundColor: '#F1F5F9',
          color: '#475569',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        {type}
      </span>
    );
  };

  const getEcosystemBadge = (eco: string) => {
    return (
      <span
        style={{
          backgroundColor: '#EEF2FF',
          color: '#4338CA',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {eco}
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Table Title and Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            SBOM Components
          </h3>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0 0' }}>
            Showing {filtered.length} of {components.length} parsed software bill of materials components
          </p>
        </div>

        {/* Filter Controls Row matching Screenshot 10 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              width: '210px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search components..."
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

          {/* Ecosystem Filter Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12.5px',
            }}
          >
            <select
              value={ecosystemFilter}
              onChange={(e) => setEcosystemFilter(e.target.value)}
              aria-label="Filter by ecosystem"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <option value="all">Ecosystem (All)</option>
              {ecosystems.map((eco) => (
                <option key={eco} value={eco}>
                  {eco}
                </option>
              ))}
            </select>
          </div>

          {/* Component Type Filter Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12.5px',
            }}
          >
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by component type"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <option value="all">Component Type (All)</option>
              {componentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Repository Filter Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12.5px',
            }}
          >
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              aria-label="Filter by repository"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <option value="all">Repository (All)</option>
              {repositories.map((repo) => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
          </div>

          {/* Filter button */}
          <button
            type="button"
            title="Advanced Filters"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px 9px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #F1F5F9', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              <th style={{ width: '40px', padding: '10px 12px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '10px 14px' }}>Component Name</th>
              <th style={{ padding: '10px 12px' }}>Version</th>
              <th style={{ padding: '10px 12px' }}>Type</th>
              <th style={{ padding: '10px 12px' }}>Ecosystem</th>
              <th style={{ padding: '10px 12px' }}>License</th>
              <th style={{ padding: '10px 12px' }}>Repository</th>
              <th style={{ padding: '10px 12px' }}>Dependency Type</th>
              <th style={{ padding: '10px 12px' }}>Issues</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={10} style={{ padding: '14px', textAlign: 'center' }}>
                    <div style={{ height: '18px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                  No SBOM components matching the applied filters.
                </td>
              </tr>
            ) : (
              filtered.map((component) => {
                const isSelected = selectedIds.has(component.id);

                return (
                  <tr
                    key={component.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#F8FAFC' : 'transparent',
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${component.component_name}`}
                        checked={isSelected}
                        onChange={() => toggleSelectRow(component.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#475569',
                            flexShrink: 0,
                          }}
                        >
                          {component.component_name.charAt(0).toUpperCase()}
                        </div>
                        <Link
                          href={`/code/dependencies/sbom/${encodeURIComponent(component.id)}`}
                          style={{
                            fontWeight: 600,
                            color: '#0F172A',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#2563EB';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#0F172A';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {component.component_name}
                        </Link>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                      {component.version}
                    </td>
                    <td style={{ padding: '12px' }}>{getTypeBadge(component.component_type)}</td>
                    <td style={{ padding: '12px' }}>{getEcosystemBadge(component.ecosystem)}</td>
                    <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>{component.license_name}</td>
                    <td style={{ padding: '12px', color: '#334155' }}>{component.repository_name}</td>
                    <td style={{ padding: '12px', color: '#64748B', fontSize: '12px' }}>
                      {component.dependency_type}
                    </td>
                    <td style={{ padding: '12px' }}>{getIssuesBadge(component.issues)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', position: 'relative' }}>
                      <button
                        onClick={() => setActionMenuId(actionMenuId === component.id ? null : component.id)}
                        aria-label="Component actions"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {actionMenuId === component.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '40px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 30,
                            minWidth: '170px',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '4px 0',
                            textAlign: 'left',
                          }}
                        >
                          <Link
                            href={`/code/dependencies/sbom/${encodeURIComponent(component.id)}`}
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              color: '#334155',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <ExternalLink size={13} />
                            View Detail
                          </Link>
                          {component.purl && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(component.purl || '');
                                setActionMenuId(null);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                color: '#334155',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textAlign: 'left',
                              }}
                            >
                              <Copy size={13} />
                              Copy PURL
                            </button>
                          )}
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
    </div>
  );
};
