'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LicenseInventoryItem } from '@/types/api/dependencies';
import {
  Search,
  Filter,
  Package,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  MoreHorizontal,
  ExternalLink,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface LicenseInventoryTableProps {
  items: LicenseInventoryItem[];
  total: number;
  loading?: boolean;
  search: string;
  onSearchChange: (s: string) => void;
  selectedType: string;
  onTypeChange: (t: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  selectedEcosystem: string;
  onEcosystemChange: (e: string) => void;
  selectedRepo: string;
  onRepoChange: (r: string) => void;
  onViewText?: (item: LicenseInventoryItem) => void;
  onRequestException?: (item: LicenseInventoryItem) => void;
}

export const LicenseInventoryTable: React.FC<LicenseInventoryTableProps> = ({
  items,
  total,
  loading = false,
  search,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedStatus,
  onStatusChange,
  selectedEcosystem,
  onEcosystemChange,
  selectedRepo,
  onRepoChange,
  onViewText,
  onRequestException,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleToggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getLicensePillStyle = (license: string) => {
    switch (license.toUpperCase()) {
      case 'MIT':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'APACHE-2.0':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'BSD-3-Clause':
      case 'BSD-2-Clause':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'ISC':
        return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'GPL-3.0':
      case 'GPL-2.0':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
      case 'LGPL-2.1':
      case 'LGPL-3.0':
      case 'MPL-2.0':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
      case 'approved':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: ShieldCheck };
      case 'prohibited':
      case 'violates policy':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5', icon: ShieldAlert };
      case 'restricted':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74', icon: AlertTriangle };
      case 'review required':
      case 'unknown':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', icon: AlertTriangle };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', icon: ShieldCheck };
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        marginBottom: '24px',
      }}
    >
      {/* Table Toolbar matching Screenshot 07 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            License Inventory
          </h2>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            {total} packages
          </span>
        </div>

        {/* Filter Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              width: '200px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search packages..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                color: '#1E293B',
                width: '100%',
              }}
            />
          </div>

          {/* License Type Dropdown */}
          <select
            aria-label="Filter by license type"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">License Type</option>
            <option value="permissive">Permissive</option>
            <option value="copyleft">Copyleft</option>
            <option value="weak copyleft">Weak Copyleft</option>
            <option value="unknown">Unknown</option>
          </select>

          {/* Compliance Status Dropdown */}
          <select
            aria-label="Filter by compliance status"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Compliance Status</option>
            <option value="compliant">Compliant</option>
            <option value="prohibited">Prohibited</option>
            <option value="restricted">Restricted</option>
            <option value="review required">Review Required</option>
          </select>

          {/* Ecosystem Dropdown */}
          <select
            aria-label="Filter by ecosystem"
            value={selectedEcosystem}
            onChange={(e) => onEcosystemChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
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
          </select>

          {/* Repository Dropdown */}
          <select
            aria-label="Filter by repository"
            value={selectedRepo}
            onChange={(e) => onRepoChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">Repository</option>
            <option value="frontend-app">frontend-app</option>
            <option value="web-api">web-api</option>
            <option value="auth-service">auth-service</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ width: '38px', padding: '12px 14px' }}>
                <input
                  type="checkbox"
                  aria-label="Select all packages"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={handleToggleAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Package</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Version</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>License</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>License Type</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Compliance Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Usage</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Repositories</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  Loading license compliance inventory...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  No packages found matching license criteria.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const pill = getLicensePillStyle(item.license_name);
                const statusBadge = getStatusBadge(item.compliance_status);
                const StatusIcon = statusBadge.icon;

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      transition: 'background-color 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '14px 14px' }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.package_name}`}
                        checked={isSelected}
                        onChange={() => handleToggleOne(item.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            flexShrink: 0,
                          }}
                        >
                          <Package size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.package_name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.ecosystem}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>
                        v{item.package_version}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: pill.bg,
                          color: pill.text,
                          border: `1px solid ${pill.border}`,
                        }}
                      >
                        {item.license_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                        {item.license_type}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.text,
                          border: `1px solid ${statusBadge.border}`,
                        }}
                      >
                        <StatusIcon size={12} />
                        {item.compliance_status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: item.usage_type === 'Direct' ? '#EFF6FF' : '#F1F5F9',
                          color: item.usage_type === 'Direct' ? '#1D4ED8' : '#475569',
                        }}
                      >
                        {item.usage_type}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                        {item.repository_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {item.compliance_status === 'Prohibited' && (
                          <button
                            onClick={() => onRequestException?.(item)}
                            title="Request compliance exception"
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#DC2626',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FCA5A5',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Request Waiver
                          </button>
                        )}
                        <button
                          onClick={() => onViewText?.(item)}
                          title="View license details"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#64748B',
                            padding: '4px',
                          }}
                        >
                          <MoreHorizontal size={16} />
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
    </div>
  );
};
