'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  Sliders,
  ArrowLeft,
  X,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function QuotaOverridesPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('quota_type') || 'all';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [quotaType, setQuotaType] = useState(initialType);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: '',
    quota_type: 'Repositories',
    override_limit: '',
    valid_till: '31 Dec 2026',
    reason: '',
  });

  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listQuotaOverrides({
        quota_type: quotaType !== 'all' ? quotaType : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      setOverrides(res || []);
    } catch (err: any) {
      console.error('Failed to load quota overrides:', err);
      setError(err?.message || 'Failed to retrieve quota overrides.');
    } finally {
      setLoading(false);
    }
  }, [quotaType, statusFilter, search]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organization_name || !formData.override_limit) {
      setError('Please provide organization name and override limit.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.superadmin.createQuotaOverride(formData);
      setSuccess(`Override for ${formData.organization_name} created successfully!`);
      setModalOpen(false);
      setFormData({
        organization_name: '',
        quota_type: 'Repositories',
        override_limit: '',
        valid_till: '31 Dec 2026',
        reason: '',
      });
      fetchOverrides();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create quota override.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Active
        </span>
      );
    }
    if (s === 'expiring') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Expiring
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        Expired
      </span>
    );
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Sub-Navigation */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link href="/superadmin/entitlements" className="text-slate-500 hover:text-slate-800 transition-colors">
            Feature Entitlements
          </Link>
          <Link href="/superadmin/tenants/plan" className="text-slate-500 hover:text-slate-800 transition-colors">
            Tenant Plan Assignment
          </Link>
          <Link href="/superadmin/quotas" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
            Quotas & Usage
          </Link>
          <Link href="/superadmin/seat-limits" className="text-slate-500 hover:text-slate-800 transition-colors">
            Seat Limits
          </Link>
          <Link href="/superadmin/trials" className="text-slate-500 hover:text-slate-800 transition-colors">
            Trials
          </Link>
        </div>

        {/* Breadcrumbs */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/superadmin/quotas" className="hover:underline">
              Quotas
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Quota Overrides</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quota Overrides</h1>
              <p className="text-xs text-slate-500">Configure tenant-specific quota exceptions and temporary capacity boosts.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/quotas"
                className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Overview
              </Link>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Override
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <p className="font-medium">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <p className="font-medium">{success}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={quotaType}
              onChange={(e) => setQuotaType(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Quotas</option>
              <option value="Repositories">Repositories</option>
              <option value="Scan Minutes">Scan Minutes</option>
              <option value="API Calls">API Calls</option>
              <option value="Storage">Storage</option>
              <option value="Concurrent Scans">Concurrent Scans</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Expiring">Expiring</option>
              <option value="Expired">Expired</option>
            </select>

            <button
              onClick={fetchOverrides}
              className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Overrides Table (Screen 6) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading overrides...</p>
            </div>
          ) : overrides.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Sliders className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No quota overrides found</p>
              <p className="text-xs text-slate-500">Configure exceptions for organizations requiring custom limits.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Quota Type</th>
                    <th className="py-3 px-4">Default Limit</th>
                    <th className="py-3 px-4">Override Limit</th>
                    <th className="py-3 px-4">Valid Till</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overrides.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {row.organization}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {row.quota_type}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {row.default_limit}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                        {row.override_limit}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {row.valid_till}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setFormData({
                              organization_name: row.organization,
                              quota_type: row.quota_type,
                              override_limit: row.override_limit,
                              valid_till: row.valid_till,
                              reason: '',
                            });
                            setModalOpen(true);
                          }}
                          className="text-xs font-semibold text-blue-600 hover:underline mr-3"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {overrides.length} tenant quota override records</span>
            <span className="font-semibold text-slate-700">Audit-Verified Exceptions</span>
          </div>
        </div>

        {/* Create / Edit Override Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Create Quota Override</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOverride} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp, Globex Inc"
                    value={formData.organization_name}
                    onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quota Type</label>
                  <select
                    value={formData.quota_type}
                    onChange={(e) => setFormData({ ...formData, quota_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Repositories">Repositories</option>
                    <option value="Scan Minutes">Scan Minutes</option>
                    <option value="API Calls">API Calls</option>
                    <option value="Storage">Storage</option>
                    <option value="Concurrent Scans">Concurrent Scans</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Override Limit</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50, 25,000, 1,000,000, 1 TB"
                    value={formData.override_limit}
                    onChange={(e) => setFormData({ ...formData, override_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valid Till</label>
                  <input
                    type="text"
                    value={formData.valid_till}
                    onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Override</label>
                  <textarea
                    rows={2}
                    placeholder="Reason for privileged capacity increase..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Save Override
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
