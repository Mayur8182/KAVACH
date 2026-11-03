'use client';

/**
 * SecuLayer SAST — Hotspot List Page (/sast/hotspots/list)
 * Screenshot Reference 10.2
 * Columns: ID, Title, File, Category, Severity, Status, Detected, Actions
 * Full backend query integration: search, filters (Severity, Status, Category, Branch), sorting, pagination.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import {
  HotspotsBreadcrumbs,
  HotspotSeverityBadge,
  HotspotStatusBadge,
  HotspotCategoryBadge,
  type HotspotItem,
} from '@/components/hotspots/HotspotComponents';

export default function HotspotListPage() {
  const router = useRouter();

  // State
  const [items, setItems] = useState<HotspotItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Multi-select & Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchHotspots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.hotspots.list({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        branch: branchFilter !== 'ALL' ? branchFilter : undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to query hotspots list:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, severityFilter, categoryFilter, branchFilter, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  // Debounce search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Quick action: update status from list
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.hotspots.updateStatus(id, newStatus, `Status updated to ${newStatus} from list table`);
      setActionNotice(`Hotspot status updated to ${newStatus}`);
      setActiveMenuId(null);
      await fetchHotspots();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setActionNotice(`Failed to update status: ${err?.message || 'Error'}`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    window.open(`/api/hotspots/export?format=csv&severity=${severityFilter}&status=${statusFilter}`, '_blank');
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* 1. Breadcrumbs */}
      <HotspotsBreadcrumbs currentPage="Hotspot List" />

      {/* 2. Page Title & Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Hotspots
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Review and manage security hotspots detected in your codebase.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <Download size={14} color="#64748B" />
            Export CSV
          </button>

          <Link
            href="/sast/hotspots"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            <Plus size={15} color="#FFFFFF" />
            + New Review
          </Link>
        </div>
      </div>

      {actionNotice && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {actionNotice}
        </div>
      )}

      {/* 3. Filter Bar (Search + Dropdown Filters matching Reference 10.2) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Search input */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: '280px',
            flexGrow: 1,
            maxWidth: '400px',
          }}
        >
          <Search
            size={16}
            color="#94A3B8"
            style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search hotspots by title, file, rule..."
            value={search}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              outline: 'none',
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="TO_REVIEW">To Review</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="SAFE">Safe</option>
            <option value="FIXED">Fixed</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Command Injection">Command Injection</option>
            <option value="Input Validation">Input Validation</option>
            <option value="Authentication">Authentication</option>
            <option value="Authorization">Authorization</option>
            <option value="Cryptography">Cryptography</option>
            <option value="Data Exposure">Data Exposure</option>
          </select>

          {/* Branch filter */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Branches</option>
            <option value="main">main</option>
            <option value="develop">develop</option>
          </select>

          {/* Reset button */}
          {(statusFilter !== 'ALL' ||
            severityFilter !== 'ALL' ||
            categoryFilter !== 'ALL' ||
            branchFilter !== 'ALL' ||
            search !== '') && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSeverityFilter('ALL');
                setCategoryFilter('ALL');
                setBranchFilter('ALL');
                setSearch('');
                setPage(1);
              }}
              style={{
                fontSize: '12px',
                color: '#EF4444',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Hotspots Data Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 14px', width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th
                  onClick={() => {
                    setSortBy('id');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  style={{
                    padding: '12px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ID
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortBy('title');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    TITLE
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  FILE
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  CATEGORY
                </th>
                <th
                  onClick={() => {
                    setSortBy('severity');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    SEVERITY
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortBy('status');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    STATUS
                    <ArrowUpDown size={12} color="#94A3B8" />
                  </div>
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  DETECTED
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'center' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    Loading security hotspots...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    No security hotspots matched your criteria.
                  </td>
                </tr>
              ) : (
                items.map((hs) => (
                  <tr
                    key={hs.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '14px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(hs.id)}
                        onChange={() => handleToggleSelect(hs.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* ID */}
                    <td style={{ padding: '14px' }}>
                      <Link
                        href={`/sast/hotspots/${hs.id}`}
                        style={{
                          textDecoration: 'none',
                          color: '#2563EB',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        {hs.display_id}
                      </Link>
                    </td>

                    {/* Title */}
                    <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                      <Link
                        href={`/sast/hotspots/${hs.id}`}
                        style={{
                          textDecoration: 'none',
                          color: '#0F172A',
                          fontWeight: 600,
                          fontSize: '13px',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {hs.title}
                      </Link>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{hs.rule_id}</span>
                    </td>

                    {/* File & Lines */}
                    <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                      <Link
                        href={`/sast/hotspots/${hs.id}?tab=code`}
                        style={{
                          textDecoration: 'none',
                          color: '#475569',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {hs.file}
                        </span>
                        <span style={{ color: '#94A3B8', fontSize: '11px', flexShrink: 0 }}>
                          :{hs.lines}
                        </span>
                      </Link>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '14px 16px' }}>
                      <HotspotCategoryBadge category={hs.category} />
                    </td>

                    {/* Severity */}
                    <td style={{ padding: '14px 16px' }}>
                      <HotspotSeverityBadge severity={hs.severity} size="sm" />
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <HotspotStatusBadge status={hs.status} size="sm" />
                    </td>

                    {/* Detected */}
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748B' }}>
                      {hs.detected}
                    </td>

                    {/* Actions Menu */}
                    <td style={{ padding: '14px 16px', textAlign: 'center', position: 'relative' }}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === hs.id ? null : hs.id)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MoreVertical size={16} color="#64748B" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === hs.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '42px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 40,
                            minWidth: '160px',
                            padding: '6px 0',
                            textAlign: 'left',
                          }}
                        >
                          <Link
                            href={`/sast/hotspots/${hs.id}`}
                            style={{
                              display: 'block',
                              padding: '8px 14px',
                              fontSize: '13px',
                              color: '#0F172A',
                              textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/sast/hotspots/${hs.id}?tab=code`}
                            style={{
                              display: 'block',
                              padding: '8px 14px',
                              fontSize: '13px',
                              color: '#0F172A',
                              textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            Review Code
                          </Link>
                          <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />
                          <button
                            onClick={() => handleStatusChange(hs.id, 'SAFE')}
                            style={{
                              width: '100%',
                              padding: '8px 14px',
                              fontSize: '13px',
                              color: '#16A34A',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            Mark Safe
                          </button>
                          <button
                            onClick={() => handleStatusChange(hs.id, 'ACKNOWLEDGED')}
                            style={{
                              width: '100%',
                              padding: '8px 14px',
                              fontSize: '13px',
                              color: '#2563EB',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleStatusChange(hs.id, 'FALSE_POSITIVE')}
                            style={{
                              width: '100%',
                              padding: '8px 14px',
                              fontSize: '13px',
                              color: '#64748B',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            False Positive
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination matching Reference 10.2 */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            Showing{' '}
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(total, page * pageSize)}
            </span>{' '}
            of <span style={{ fontWeight: 600, color: '#0F172A' }}>{total}</span> hotspots
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Prev button */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: page === 1 ? '#F8FAFC' : '#FFFFFF',
                color: page === 1 ? '#CBD5E1' : '#334155',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    minWidth: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: p === page ? '1px solid #2563EB' : '1px solid #E2E8F0',
                    backgroundColor: p === page ? '#2563EB' : '#FFFFFF',
                    color: p === page ? '#FFFFFF' : '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {p}
                </button>
              ))}

            {/* Next button */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: page >= totalPages ? '#F8FAFC' : '#FFFFFF',
                color: page >= totalPages ? '#CBD5E1' : '#334155',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <ChevronRight size={14} />
            </button>

            {/* Page size selector */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                marginLeft: '8px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
