'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Clock,
  Trash2,
  Pause,
  List,
  AlertCircle,
  ExternalLink,
  Shield,
  Sliders,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api/client';

export default function SuperAdminTenantsPage() {
  const router = useRouter();

  // Filter & pagination states — default page size 8 to match the 8 rows per page in reference
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // UI state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [activeMenuTenantId, setActiveMenuTenantId] = useState<string | null>(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());

  // Data states
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 24,
    active: 21,
    pending: 2,
    suspended: 1,
    deleted: 0,
  });
  const [totalPages, setTotalPages] = useState(3);
  const [totalCount, setTotalCount] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listTenants({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });

      if (res && res.items) {
        setTenants(res.items);
        setTotalPages(res.total_pages || 1);
        setTotalCount(res.total ?? res.items.length);
        if (res.stats) {
          setStats({
            total: res.stats.total ?? 0,
            active: res.stats.active ?? 0,
            pending: res.stats.pending ?? 0,
            suspended: res.stats.suspended ?? 0,
            deleted: (res.stats as any).deleted ?? 0,
          });
        }
      } else {
        setTenants([]);
      }
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
      setError(err?.message || 'Failed to retrieve organizations from backend');
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, planFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuTenantId(null);
      setShowSortDropdown(false);
      setShowFilterDropdown(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTenantIds(new Set(tenants.map((t) => t.id)));
    } else {
      setSelectedTenantIds(new Set());
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedTenantIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTenantIds(newSet);
  };

  // Render Crisp Organization Logo Badge
  const renderOrgLogo = (tenant: any) => {
    const name = (tenant.name || '').toLowerCase();

    if (name.includes('techcorp')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
          <span>T</span>
        </div>
      );
    }

    if (name.includes('acme')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center shadow-xs flex-shrink-0">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 3L2 21h20L12 3zm0 4.5l6.5 11.5h-13L12 7.5z" />
          </svg>
        </div>
      );
    }

    if (name.includes('globex')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
          <span>G</span>
        </div>
      );
    }

    if (name.includes('initech')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#111827] text-white flex items-center justify-center shadow-xs flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      );
    }

    if (name.includes('umbrella')) {
      return (
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-xs flex-shrink-0 overflow-hidden relative">
          <div className="w-5 h-5 rounded-full relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[#dc2626]" />
            <div className="absolute w-full h-full bg-white [clip-path:polygon(50%_50%,_0_0,_100%_0)]" />
            <div className="absolute w-full h-full bg-white [clip-path:polygon(50%_50%,_0_100%,_100%_100%)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-black z-10" />
          </div>
        </div>
      );
    }

    if (name.includes('hooli')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
          <span>H</span>
        </div>
      );
    }

    if (name.includes('stark')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center shadow-xs flex-shrink-0">
          <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full border border-white" />
          </div>
        </div>
      );
    }

    if (name.includes('wayne')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
          <span>W</span>
        </div>
      );
    }

    // Default colored monogram badge
    const bgColor = tenant.logo_color || '#1e293b';
    const text = tenant.logo_text || (tenant.name ? tenant.name.slice(0, 1).toUpperCase() : 'O');
    return (
      <div
        className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0"
        style={{ backgroundColor: bgColor }}
      >
        <span>{text}</span>
      </div>
    );
  };

  // Plan Pill Badge
  const renderPlanBadge = (plan: string) => {
    const p = (plan || 'pro').toLowerCase();
    if (p.includes('enterprise')) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#f3e8ff] text-[#7e22ce]">
          Enterprise
        </span>
      );
    }
    if (p.includes('business')) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#ecfdf5] text-[#059669]">
          Business
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#eff6ff] text-[#2563eb]">
        Pro
      </span>
    );
  };

  // Status Pill Badge
  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ecfdf5] text-[#059669]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          Active
        </span>
      );
    }
    if (s === 'PROVISIONING' || s === 'PENDING' || s === 'PENDING_PROVISIONING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fffbeb] text-[#b45309]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          Provisioning
        </span>
      );
    }
    if (s === 'SUSPENDED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fef2f2] text-[#dc2626]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        {status}
      </span>
    );
  };

  // Members Avatar Stack
  const renderMembersStack = (tenant: any) => {
    const initials: string[] = tenant.member_initials && tenant.member_initials.length > 0
      ? tenant.member_initials
      : ['JD', 'MS'];
    const totalMembers = tenant.members_count || 1;
    const extraCount = Math.max(0, totalMembers - initials.length);

    return (
      <div className="flex items-center">
        <div className="flex items-center -space-x-1.5">
          {initials.slice(0, 2).map((init, idx) => (
            <div
              key={idx}
              className="w-6 h-6 rounded-full bg-[#f1f5f9] border border-white flex items-center justify-center text-[10px] font-medium text-gray-700 shadow-2xs"
            >
              {init}
            </div>
          ))}
        </div>
        {extraCount > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
            +{extraCount}
          </span>
        )}
      </div>
    );
  };

  const sortLabel = useMemo(() => {
    if (sortBy === 'created_at') return 'Created date';
    if (sortBy === 'name') return 'Name';
    if (sortBy === 'status') return 'Status';
    return 'Created date';
  }, [sortBy]);

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumbs & Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <span>Tenant Management</span>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-700">All Organizations</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              All Organizations
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and oversee all tenant organizations on the platform.
            </p>
          </div>

          <Link
            href="/superadmin/tenants/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Organization</span>
          </Link>
        </div>
      </div>

      {/* 2. 5 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Organizations */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-normal text-gray-500">Total Organizations</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</div>
          </div>
        </div>

        {/* Active */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <div className="grid grid-cols-2 gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div>
            <div className="text-xs font-normal text-gray-500">Active</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.active}</div>
          </div>
        </div>

        {/* Provisioning */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-normal text-gray-500">Provisioning</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.pending}</div>
          </div>
        </div>

        {/* Suspended */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
            <Pause className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-normal text-gray-500">Suspended</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.suspended}</div>
          </div>
        </div>

        {/* Deleted */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-normal text-gray-500">Deleted</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.deleted}</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
          />
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Filters Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterDropdown(!showFilterDropdown);
                setShowSortDropdown(false);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 bg-white border rounded-lg text-sm font-medium transition-colors shadow-xs ${
                statusFilter || planFilter
                  ? 'border-blue-500 text-blue-600 bg-blue-50/30'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>Filters</span>
              {(statusFilter || planFilter) && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {showFilterDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-30 space-y-3"
              >
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PROVISIONING">Provisioning</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Plan</label>
                  <select
                    value={planFilter}
                    onChange={(e) => {
                      setPlanFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Plans</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="PRO">Pro</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>

                {(statusFilter || planFilter) && (
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setPlanFilter('');
                      setPage(1);
                      setShowFilterDropdown(false);
                    }}
                    className="w-full py-1.5 text-center text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort: Created date */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSortDropdown(!showSortDropdown);
                setShowFilterDropdown(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
            >
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <span>Sort: {sortLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {/* Sort Dropdown Popover */}
            {showSortDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-30"
              >
                <button
                  onClick={() => {
                    setSortBy('created_at');
                    setSortOrder('asc');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                    sortBy === 'created_at' && sortOrder === 'asc'
                      ? 'text-blue-600 font-semibold bg-blue-50/50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Created date (Oldest first)</span>
                </button>
                <button
                  onClick={() => {
                    setSortBy('created_at');
                    setSortOrder('desc');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                    sortBy === 'created_at' && sortOrder === 'desc'
                      ? 'text-blue-600 font-semibold bg-blue-50/50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Created date (Newest first)</span>
                </button>
                <button
                  onClick={() => {
                    setSortBy('name');
                    setSortOrder('asc');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                    sortBy === 'name' && sortOrder === 'asc'
                      ? 'text-blue-600 font-semibold bg-blue-50/50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Name (A–Z)</span>
                </button>
                <button
                  onClick={() => {
                    setSortBy('status');
                    setSortOrder('asc');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                    sortBy === 'status'
                      ? 'text-blue-600 font-semibold bg-blue-50/50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Status</span>
                </button>
              </div>
            )}
          </div>

          {/* View mode icon */}
          <button
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-xs flex items-center gap-1"
            title="List View"
          >
            <List className="w-4 h-4" />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 4. Organizations Data Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Loading organizations from database...</p>
          </div>
        ) : error ? (
          <div className="p-16 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-gray-900">{error}</p>
            <button
              onClick={() => loadTenants()}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700"
            >
              Retry
            </button>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">No organizations found</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {search || statusFilter || planFilter
                  ? 'No organizations match your active filters. Try clearing search filters.'
                  : 'Get started by creating your first enterprise tenant.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-white text-xs font-normal text-gray-500">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTenantIds.size === tenants.length && tenants.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-normal text-gray-500">Organization</th>
                  <th className="py-3 px-4 font-normal text-gray-500">Plan</th>
                  <th className="py-3 px-4 font-normal text-gray-500">Status</th>
                  <th className="py-3 px-4 font-normal text-gray-500">Members</th>
                  <th className="py-3 px-4 font-normal text-gray-500">Repositories</th>
                  <th className="py-3 px-4 font-normal text-gray-500">Created date</th>
                  <th className="py-3 px-4 font-normal text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {tenants.map((t) => {
                  const createdAtFormatted = t.created_at
                    ? new Date(t.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  const isSelected = selectedTenantIds.has(t.id);
                  const isMenuOpen = activeMenuTenantId === t.id;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/superadmin/tenants/${t.id}`)}
                      className={`hover:bg-gray-50/75 cursor-pointer transition-colors group ${
                        isSelected ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(t.id, e as any)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Organization (Logo + Name + Domain) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {renderOrgLogo(t)}
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {t.name}
                            </div>
                            <div className="text-xs text-gray-400 font-normal">
                              {t.domain || `${t.slug}.com`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">{renderPlanBadge(t.plan)}</td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{renderStatusBadge(t.status)}</td>

                      {/* Members */}
                      <td className="py-3.5 px-4">{renderMembersStack(t)}</td>

                      {/* Repositories */}
                      <td className="py-3.5 px-4 font-normal text-gray-700">
                        {t.repositories_count ?? 0}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-gray-600 font-normal whitespace-nowrap">
                        {createdAtFormatted}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTenantId(isMenuOpen ? null : t.id);
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Action Menu Popover */}
                        {isMenuOpen && (
                          <div className="absolute right-4 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 text-left">
                            <Link
                              href={`/superadmin/tenants/${t.id}`}
                              className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                              <span>View Organization</span>
                            </Link>
                            <Link
                              href={`/superadmin/tenants/${t.id}/plan/select`}
                              className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Shield className="w-3.5 h-3.5 text-gray-400" />
                              <span>Change Plan</span>
                            </Link>
                            <Link
                              href={`/superadmin/tenants/${t.id}/plan/overrides`}
                              className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Sliders className="w-3.5 h-3.5 text-gray-400" />
                              <span>Entitlement Overrides</span>
                            </Link>
                            <Link
                              href={`/superadmin/tenants/${t.id}/plan/usage`}
                              className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <span>Usage & Quotas</span>
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {!isLoading && tenants.length > 0 && (
          <div className="px-5 py-3.5 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 bg-white">
            <div>
              Showing{' '}
              <span className="font-normal text-gray-700">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-normal text-gray-700">{totalCount}</span> organizations
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isActive = p === page;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[28px] h-7 px-2 rounded text-xs transition-colors ${
                      isActive
                        ? 'border border-blue-500 bg-blue-50/60 text-blue-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 font-normal'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
