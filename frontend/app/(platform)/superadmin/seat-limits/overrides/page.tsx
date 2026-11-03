'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  Users,
  ArrowLeft,
  X,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function SeatLimitOverridesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<any[]>([]);

  // Filter
  const [filterOrg, setFilterOrg] = useState<string>('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: '',
    role: 'Developers',
    override_limit: 25,
    valid_till_days: 90,
    reason: '',
  });

  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listSeatOverrides();
      setOverrides(res || []);
    } catch (err: any) {
      console.error('Failed to load seat overrides:', err);
      setError(err?.message || 'Failed to retrieve seat limit overrides.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      await api.superadmin.createSeatOverride(formData);
      setSuccess(`Seat override for ${formData.organization_name} created successfully!`);
      setModalOpen(false);
      setFormData({
        organization_name: '',
        role: 'Developers',
        override_limit: 25,
        valid_till_days: 90,
        reason: '',
      });
      fetchOverrides();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create seat limit override.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('Are you sure you want to delete this seat override?')) return;
    try {
      await api.superadmin.deleteSeatOverride(overrideId);
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
      setSuccess('Seat override removed.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete seat override.');
    }
  };

  const filteredOverrides = overrides.filter((o) => {
    if (filterOrg === 'all') return true;
    return o.organization_name?.toLowerCase() === filterOrg.toLowerCase();
  });

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Module Sub-Navigation */}
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
          <Link href="/superadmin/quotas" className="text-slate-500 hover:text-slate-800 transition-colors">
            Quotas & Usage
          </Link>
          <Link href="/superadmin/seat-limits" className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold">
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
            <Link href="/superadmin/seat-limits" className="hover:underline">
              Seat Limits
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Seat Limit Overrides</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Seat Limit Overrides</h1>
              <p className="text-xs text-slate-500">Configure tenant-specific seat limit exceptions and team scaling allowances.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/superadmin/seat-limits"
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

        {/* Filter Pills (Screen 12) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold border-b border-slate-200">
          <button
            onClick={() => setFilterOrg('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filterOrg === 'all'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Organisations ({overrides.length})
          </button>
          <button
            onClick={() => setFilterOrg('Acme Corp')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filterOrg === 'Acme Corp'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Acme Corp
          </button>
          <button
            onClick={() => setFilterOrg('Umbrella Corp')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              filterOrg === 'Umbrella Corp'
                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Umbrella Corp
          </button>
        </div>

        {/* Overrides Table (Screen 12) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading seat overrides...</p>
            </div>
          ) : filteredOverrides.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No seat limit overrides configured</p>
              <p className="text-xs text-slate-500">Configure role-specific overrides when teams exceed default plan limits.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Default Limit</th>
                    <th className="py-3 px-4">Override Limit</th>
                    <th className="py-3 px-4">Valid Till</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOverrides.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {row.organization_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {row.domain}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {row.role}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {row.default_limit}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                        {row.override_limit}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {row.valid_till}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteOverride(row.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="py-3 px-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {filteredOverrides.length} role-specific seat overrides</span>
            <span className="font-semibold text-slate-700">Enforced by Organization Membership Service</span>
          </div>
        </div>

        {/* Modal: Create Seat Override */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Create Seat Limit Override</h3>
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
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Developers">Developers</option>
                    <option value="Security Engineers">Security Engineers</option>
                    <option value="Auditors">Auditors</option>
                    <option value="All Roles">All Roles</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Override Limit (Seats)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.override_limit}
                    onChange={(e) => setFormData({ ...formData, override_limit: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.valid_till_days}
                    onChange={(e) => setFormData({ ...formData, valid_till_days: parseInt(e.target.value) || 90 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Override</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Temporary contractor project expansion..."
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
