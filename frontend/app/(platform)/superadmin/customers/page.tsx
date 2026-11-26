'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  Mail,
  Shield,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  GitBranch,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface CustomerRecord {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  organizations: Array<{ id: string; name: string; role: string }>;
  repository_count: number;
  scan_count: number;
}

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listCustomers({
        page,
        page_size: 15,
        search: search.trim() || undefined,
      });
      if (res?.items) {
        setCustomers(res.items);
        setTotalCount(res.total || res.items.length);
      }
    } catch (err: any) {
      console.error('Failed to list customers:', err);
      setError(err?.message || 'Failed to query customer directory.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
              <Users className="w-4 h-4" />
              <span>Customer Intelligence & Lifecycle</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Customer Directory
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              Authoritative global view of customer users, tenant associations, and security scan utilization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCustomers}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] text-[#0F172A] border border-[#E8E6E1] rounded-lg text-xs font-semibold font-mono">
              <span>{totalCount} Total Customers</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter / Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] shadow-sm flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email, name, or organization..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-xs focus:outline-none focus:border-[#0B0F17] text-[#0F172A]"
            />
          </div>
          <span className="text-xs text-[#94A3B8] font-mono">
            Showing {customers.length} of {totalCount} records
          </span>
        </div>

        {/* Customer Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E1] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E8E6E1] text-[#475569] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Customer User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Organizations</th>
                  <th className="px-4 py-3">Repositories</th>
                  <th className="px-4 py-3">Scans Run</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[#94A3B8]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F172A]" />
                      Querying customer database...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-[#94A3B8]">
                      No customers matched the current filter.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-[11px] font-mono">
                            {(c.name || c.email || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#0F172A]">{c.name || 'Anonymous User'}</p>
                            <p className="text-[11px] text-[#64748B] font-mono">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                            c.is_active
                              ? 'bg-[#DCFCE7] text-[#166534]'
                              : 'bg-[#FEE2E2] text-[#991B1B]'
                          }`}
                        >
                          {c.is_active ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                        {c.is_superuser && (
                          <span className="ml-1 text-[9px] font-mono font-bold bg-[#0B0F17] text-white px-1.5 py-0.2 rounded">
                            SUPERUSER
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.organizations && c.organizations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.organizations.map((org) => (
                              <span
                                key={org.id}
                                className="text-[10px] font-mono bg-[#F8FAFC] border border-[#E8E6E1] px-1.5 py-0.2 rounded text-[#0F172A]"
                              >
                                {org.name} ({org.role})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#0F172A]">
                        {c.repository_count ?? 0}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#0F172A]">
                        {c.scan_count ?? 0}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#94A3B8]">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/superadmin/tenants`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F172A] hover:underline"
                        >
                          <span>Manage Tenant</span>
                          <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}

