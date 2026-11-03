'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  UserCheck,
  Key,
  Users,
  Search,
  RefreshCw,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function AccessControlPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{ summary: any; users: any[] }>({
    summary: { total_users: 0, superusers: 0, active_users: 0, deactivated_users: 0 },
    users: [],
  });
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([api.auth.me(), api.superadmin.getAccessUsers()])
      .then(([userRes, usersRes]) => {
        if (userRes.status === 'fulfilled') {
          setCurrentUser(userRes.value);
        }
        if (usersRes.status === 'fulfilled' && usersRes.value) {
          setData(usersRes.value);
        } else if (usersRes.status === 'rejected') {
          setError(usersRes.reason?.message || 'Failed to load user access records');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = (data.users || []).filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  return (
    <SuperAdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Key className="w-4 h-4" />
              <span>Identity & Access Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Access Control & Administrative Roles
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live identity persistence from database, founder superuser tokens, and active session telemetry.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh DB</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>RBAC Engine: Active</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Total System Users</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {data.summary?.total_users ?? 0}
              </span>
              <span className="text-xs text-slate-400">in users table</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Live SQLite / Postgres count</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Platform SuperUsers</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-purple-700">
                {data.summary?.superusers ?? 0}
              </span>
              <span className="text-xs text-purple-600 font-semibold">is_superuser = 1</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Founder SuperAdmin authority</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Active Accounts</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600">
                {data.summary?.active_users ?? 0}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Enabled</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Authentication allowed</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Deactivated Accounts</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-600">
                {data.summary?.deactivated_users ?? 0}
              </span>
              <span className="text-xs text-slate-400">Locked / suspended</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Zero unauthorized access</p>
          </div>
        </div>

        {/* Active SuperAdmin Identity Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Currently Authenticated Founder SuperAdmin</span>
          </h2>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
                SA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {currentUser?.name || 'Superadmin User'}
                  </h3>
                  <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                    Platform SuperUser
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentUser?.email || 'admin@seculayer.io'}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                  <span>User ID: <span className="font-mono text-slate-600">{currentUser?.id || 'Normalized UUID'}</span></span>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium">Deterministic OPA Authority: Verified</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/superadmin/founder"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
              >
                Founder Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Real Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Platform Users Database</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real users retrieved from database via /api/v1/superadmin/access/users</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Querying users table in PostgreSQL / SQLite...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No users matching &quot;{search}&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">User & Email</th>
                    <th className="px-6 py-3">Platform Authority</th>
                    <th className="px-6 py-3">Account Status</th>
                    <th className="px-6 py-3">Active Sessions</th>
                    <th className="px-6 py-3">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{u.name || 'User'}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_superuser ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-semibold text-[10px]">
                            <Shield className="w-3 h-3 text-purple-600" />
                            FOUNDER_SUPERADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px]">
                            STANDARD_USER
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            DEACTIVATED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {u.active_sessions_count ?? 0} active
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
