'use client';

import React, { useState } from 'react';
import { DependencyPolicyRow } from '@/types/api/dependencies';
import {
  Search,
  Filter,
  MoreHorizontal,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface DependencyPoliciesTableProps {
  policies: DependencyPolicyRow[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const DependencyPoliciesTable: React.FC<DependencyPoliciesTableProps> = ({
  policies,
  loading = false,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedScope, setSelectedScope] = useState('all');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const filtered = policies.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.policy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.policy_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || p.type.toLowerCase() === selectedType.toLowerCase();
    const matchesStatus = selectedStatus === 'all' || p.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesScope = selectedScope === 'all' || p.scope.toLowerCase() === selectedScope.toLowerCase();

    return matchesSearch && matchesType && matchesStatus && matchesScope;
  });

  const toggleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    if (checked) {
      filtered.forEach((p) => {
        updated[p.id] = true;
      });
    }
    setSelectedRows(updated);
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAllSelected = filtered.length > 0 && filtered.every((p) => selectedRows[p.id]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
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
              backgroundColor: '#DCFCE7',
              color: '#15803D',
            }}
          >
            <CheckCircle2 size={12} color="#15803D" />
            Active
          </span>
        );
      case 'warn-only':
      case 'audit-only':
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
              backgroundColor: '#FEF3C7',
              color: '#B45309',
            }}
          >
            <AlertTriangle size={12} color="#B45309" />
            Warn-Only
          </span>
        );
      default:
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
              backgroundColor: '#F1F5F9',
              color: '#64748B',
            }}
          >
            <XCircle size={12} color="#64748B" />
            Inactive
          </span>
        );
    }
  };

  const getEnforcementBadge = (mode: string) => {
    const isBlock = mode.toLowerCase().includes('block');
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: isBlock ? '#FEE2E2' : '#EFF6FF',
          color: isBlock ? '#B91C1C' : '#1D4ED8',
          border: `1px solid ${isBlock ? '#FECACA' : '#DBEAFE'}`,
        }}
      >
        {mode}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: 500,
          backgroundColor: '#F8FAFC',
          color: '#334155',
          border: '1px solid #E2E8F0',
        }}
      >
        {type}
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
      {/* Header with Title and Search/Filters matching Screenshot 11 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Dependency Policies
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Showing {filtered.length} of {policies.length} policies
          </span>
        </div>

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
              flexGrow: 1,
              minWidth: '220px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
                color: '#0F172A',
              }}
            />
          </div>

          {/* Filter Dropdowns matching Screenshot 11 */}
          <select
            value={selectedType}
            aria-label="Filter by Policy Type"
            onChange={(e) => setSelectedType(e.target.value)}
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
            <option value="all">Policy Type (All)</option>
            <option value="vulnerability">Vulnerability Severity</option>
            <option value="package rules">Package Rules</option>
            <option value="license">License Compliance</option>
            <option value="version">Version Restrictions</option>
            <option value="trust">Supply Chain Trust</option>
          </select>

          <select
            value={selectedStatus}
            aria-label="Filter by Status"
            onChange={(e) => setSelectedStatus(e.target.value)}
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
            <option value="all">Status (All)</option>
            <option value="active">Active</option>
            <option value="warn-only">Warn-Only</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={selectedScope}
            aria-label="Filter by Scope"
            onChange={(e) => setSelectedScope(e.target.value)}
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
            <option value="all">Scope (All)</option>
            <option value="global">Global</option>
            <option value="production">Production</option>
            <option value="internal">Internal Services</option>
            <option value="staging">Staging</option>
          </select>

          <select
            value={selectedRepo}
            aria-label="Filter by Repository"
            onChange={(e) => setSelectedRepo(e.target.value)}
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
            <option value="all">Repository (All)</option>
            <option value="web-api">web-api</option>
            <option value="frontend-app">frontend-app</option>
            <option value="auth-service">auth-service</option>
          </select>

          <button
            type="button"
            title="Filter options"
            aria-label="Customize filter view"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Policies Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
              <th style={{ padding: '10px 16px', width: '36px' }}>
                <input
                  type="checkbox"
                  aria-label="Select all policies"
                  checked={isAllSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                />
              </th>
              <th style={{ padding: '10px 16px' }}>Policy Name</th>
              <th style={{ padding: '10px 16px' }}>Type</th>
              <th style={{ padding: '10px 16px' }}>Description</th>
              <th style={{ padding: '10px 16px' }}>Scope</th>
              <th style={{ padding: '10px 16px' }}>Status</th>
              <th style={{ padding: '10px 16px' }}>Enforcement Mode</th>
              <th style={{ padding: '10px 16px' }}>Last Updated</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', width: '40px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td colSpan={9} style={{ padding: '14px 16px' }}>
                    <div style={{ height: '16px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  No policies found matching your current filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isSelected = Boolean(selectedRows[p.id]);

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        aria-label={`Select policy ${p.policy_name}`}
                        checked={isSelected}
                        onChange={() => toggleRow(p.id)}
                        style={{ cursor: 'pointer', accentColor: '#2563EB' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{p.policy_name}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          {p.policy_code}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {getTypeBadge(p.type)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '280px' }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.description}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#334155', fontWeight: 500 }}>
                      {p.scope}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(p.status)}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {getEnforcementBadge(p.enforcement_mode)}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#64748B', fontSize: '12px' }}>
                      {p.last_updated}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        type="button"
                        title="Actions"
                        aria-label={`Actions for ${p.policy_name}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94A3B8',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                      >
                        <MoreHorizontal size={15} />
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
