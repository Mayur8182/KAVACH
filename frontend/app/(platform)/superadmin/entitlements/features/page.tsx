'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Shield,
  Sparkles,
  Search,
  Plus,
  AlertCircle,
  RefreshCw,
  Lock,
  Key,
  FileCheck,
  GitPullRequest,
  Server,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function FeatureCatalogPage() {
  const router = useRouter();

  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.superadmin.listEntitlementFeatures({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setFeatures(res.items || []);
    } catch (err: any) {
      console.error('Failed to load features:', err);
      setError(err?.message || 'Failed to retrieve feature catalog.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, statusFilter, searchQuery]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const categories = [
    { id: 'all', label: `All Features [${features.length}]` },
    { id: 'Code Security', label: 'Code Security' },
    { id: 'Dependency Security', label: 'Dependency Security' },
    { id: 'CI/CD Security', label: 'CI/CD Security' },
    { id: 'AI & Automation', label: 'AI & Automation' },
    { id: 'Identity & Access', label: 'Identity & Access' },
    { id: 'Infrastructure', label: 'Infrastructure' },
  ];

  const getFeatureIcon = (iconName: string, category: string) => {
    const key = (iconName || category || '').toLowerCase();
    if (key.includes('key') || key.includes('secret')) {
      return <Key className="w-4 h-4 text-amber-600" />;
    }
    if (key.includes('file') || key.includes('sbom')) {
      return <FileCheck className="w-4 h-4 text-emerald-600" />;
    }
    if (key.includes('git') || key.includes('pr') || key.includes('ci')) {
      return <GitPullRequest className="w-4 h-4 text-purple-600" />;
    }
    if (key.includes('server') || key.includes('infra') || key.includes('runner')) {
      return <Server className="w-4 h-4 text-cyan-600" />;
    }
    if (key.includes('sparkles') || key.includes('ai')) {
      return <Sparkles className="w-4 h-4 text-indigo-600" />;
    }
    if (key.includes('lock') || key.includes('auth') || key.includes('sso')) {
      return <Lock className="w-4 h-4 text-rose-600" />;
    }
    return <Shield className="w-4 h-4 text-blue-600" />;
  };

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link href="/superadmin/entitlements" className="text-slate-500 hover:text-slate-800 transition-colors">
            Feature Entitlements Matrix
          </Link>
          <Link
            href="/superadmin/entitlements/features"
            className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold"
          >
            Feature Catalog
          </Link>
        </div>

        {/* Breadcrumbs & Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plans</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Entitlements</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Features</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feature Catalog</h1>
              <p className="text-xs text-slate-500 mt-1">
                View and manage features available across platform and tenant subscription plans.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/superadmin/entitlements/features/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Feature</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search & Status Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search features by name, key, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Enabled / Active</option>
              <option value="disabled">Disabled</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <button
              onClick={() => fetchFeatures()}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Refresh features"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading feature catalog from database...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-800 space-y-3">
            <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
            <button
              onClick={() => fetchFeatures()}
              className="px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-rose-700 hover:bg-rose-100"
            >
              Try Again
            </button>
          </div>
        ) : features.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Shield className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No Features Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No features match your current filter criteria or the catalog is empty.
            </p>
            <Link
              href="/superadmin/entitlements/features/create"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Feature
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {features.map((feature) => {
                  const isEnabled = feature.status === 'active' || feature.status === 'enabled';
                  const isDraft = feature.status === 'draft';
                  const isArchived = feature.status === 'archived';

                  return (
                    <tr
                      key={feature.id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/superadmin/entitlements/features/${feature.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            {getFeatureIcon(feature.icon, feature.category)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {feature.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{feature.key}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">{feature.category || '—'}</td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {feature.module || 'Platform'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={feature.description}>
                        {feature.description || 'No description provided.'}
                      </td>

                      <td className="py-3.5 px-4">
                        {isEnabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Enabled
                          </span>
                        ) : isDraft ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        ) : isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Archived
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Disabled
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/superadmin/entitlements/features/${feature.id}`}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
