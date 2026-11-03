'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronDown,
  Shield,
  Sparkles,
  Search,
  Edit3,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Lock,
  Cpu,
  Key,
  FileCheck,
} from 'lucide-react';
import { SuperAdminShell } from '@/components/superadmin/SuperAdminShell';
import { api } from '@/lib/api/client';

export default function FeatureEntitlementsMatrixPage() {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    feature: any;
    plan: any;
    currentTier: any;
  } | null>(null);

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [updatingCell, setUpdatingCell] = useState(false);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superadmin.getEntitlementsMatrix();
      setMatrixData(data);
    } catch (err: any) {
      console.error('Failed to load entitlements matrix:', err);
      setError(err?.message || 'Failed to retrieve entitlement matrix from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const toggleCategory = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const handleCellClick = (feature: any, plan: any) => {
    if (!isEditing) return;
    const currentTier = feature.tiers?.[plan.key] || { enabled: false, value_tier: 'disabled' };
    setSelectedCell({
      feature,
      plan,
      currentTier,
    });
  };

  const handleSaveCell = async (enabled: boolean, valueTier: string, usageLimit: number) => {
    if (!selectedCell) return;
    setUpdatingCell(true);
    try {
      await api.superadmin.updateMatrixCell({
        plan_key: selectedCell.plan.key,
        feature_key: selectedCell.feature.key,
        enabled,
        value_tier: valueTier,
        usage_limit: usageLimit,
      });
      // Refresh matrix
      await fetchMatrix();
      setSelectedCell(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update entitlement cell.');
    } finally {
      setUpdatingCell(false);
    }
  };

  const getFeatureIcon = (iconName: string) => {
    switch ((iconName || '').toLowerCase()) {
      case 'key':
        return <Key className="w-4 h-4 text-amber-600" />;
      case 'filecheck':
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case 'cpu':
        return <Cpu className="w-4 h-4 text-indigo-600" />;
      case 'lock':
        return <Lock className="w-4 h-4 text-purple-600" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'code':
      case 'shield':
      default:
        return <Shield className="w-4 h-4 text-blue-600" />;
    }
  };

  const renderTierIndicator = (tierData: any, isEditMode: boolean) => {
    if (!tierData || !tierData.enabled) {
      return (
        <div
          className={`flex items-center justify-center py-2 ${
            isEditMode ? 'hover:bg-slate-100 rounded cursor-pointer' : ''
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>
      );
    }

    const tier = (tierData.value_tier || 'standard').toLowerCase();

    if (tier === 'limited') {
      return (
        <div
          className={`flex items-center justify-center py-2 ${
            isEditMode ? 'hover:bg-slate-100 rounded cursor-pointer' : ''
          }`}
        >
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Limited
          </span>
        </div>
      );
    }

    if (tier === 'advanced') {
      return (
        <div
          className={`flex items-center justify-center py-2 ${
            isEditMode ? 'hover:bg-slate-100 rounded cursor-pointer' : ''
          }`}
        >
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Advanced
          </span>
        </div>
      );
    }

    if (tier === 'custom') {
      return (
        <div
          className={`flex items-center justify-center py-2 ${
            isEditMode ? 'hover:bg-slate-100 rounded cursor-pointer' : ''
          }`}
        >
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Custom
          </span>
        </div>
      );
    }

    // Default standard included
    return (
      <div
        className={`flex items-center justify-center py-2 ${
          isEditMode ? 'hover:bg-slate-100 rounded cursor-pointer' : ''
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </div>
    );
  };

  const filteredCategories = (matrixData?.categories || [])
    .map((cat: any) => {
      if (categoryFilter !== 'all' && cat.name.toLowerCase() !== categoryFilter.toLowerCase()) {
        return null;
      }
      const filteredFeatures = cat.features.filter((f: any) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q))
        );
      });
      return {
        ...cat,
        features: filteredFeatures,
      };
    })
    .filter((cat: any) => cat && cat.features.length > 0);

  return (
    <SuperAdminShell>
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 pb-3 text-xs font-semibold">
          <Link href="/superadmin/plans" className="text-slate-500 hover:text-slate-800 transition-colors">
            Subscription Plans
          </Link>
          <Link
            href="/superadmin/entitlements"
            className="text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3.5 font-bold"
          >
            Feature Entitlements Matrix
          </Link>
          <Link
            href="/superadmin/entitlements/features"
            className="text-slate-500 hover:text-slate-800 transition-colors"
          >
            Feature Catalog
          </Link>
        </div>

        {/* Breadcrumbs & Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>SuperAdmin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Plans</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-semibold">Entitlements</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feature Entitlements Matrix</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage feature access and entitlements across different subscription plans.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                  isEditing
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Done Editing' : 'Edit Matrix'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Controls: Search & Category Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Code Security">Code Security</option>
              <option value="Dependency Security">Dependency Security</option>
              <option value="CI/CD Security">CI/CD Security</option>
              <option value="AI & Automation">AI & Automation</option>
              <option value="Identity & Access">Identity & Access</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>

            <button
              onClick={() => fetchMatrix()}
              title="Refresh Matrix"
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Editing Banner */}
        {isEditing && (
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span className="font-semibold">Interactive Edit Mode Active:</span>
              <span>Click any plan cell in the matrix below to toggle availability or change the tier limit.</span>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-blue-700 font-bold hover:underline"
            >
              Exit Edit Mode
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => fetchMatrix()} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* Matrix Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-6 w-80">Plan/Tier</th>
                  {matrixData?.plans?.map((plan: any) => (
                    <th key={plan.key} className="py-3.5 px-4 text-center min-w-32">
                      <span className="block font-bold text-slate-900">{plan.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {plan.key === 'starter' ? 'Free' : plan.key === 'custom' ? 'Custom' : `$${plan.monthly_price}/mo`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="h-4 bg-slate-200 rounded w-48"></div>
                      </td>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="py-4 px-4 text-center">
                          <div className="h-6 w-6 bg-slate-200 rounded-full mx-auto"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      No features found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category: any) => {
                    const isCollapsed = !!collapsedCategories[category.name];
                    return (
                      <React.Fragment key={category.name}>
                        {/* Category Header Row */}
                        <tr
                          onClick={() => toggleCategory(category.name)}
                          className="bg-slate-100/70 hover:bg-slate-100 cursor-pointer font-bold text-slate-700 text-xs transition-colors border-t border-b border-slate-200"
                        >
                          <td colSpan={(matrixData?.plans?.length || 4) + 1} className="py-2.5 px-6">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              <span>{category.name}</span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                ({category.features.length} features)
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Feature Rows */}
                        {!isCollapsed &&
                          category.features.map((feature: any) => (
                            <tr
                              key={feature.key}
                              className="hover:bg-slate-50/70 transition-colors group"
                            >
                              <td className="py-3.5 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                                    {getFeatureIcon(feature.icon)}
                                  </div>
                                  <div>
                                    <Link
                                      href={`/superadmin/entitlements/features/${feature.id || feature.key}`}
                                      className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block text-xs"
                                    >
                                      {feature.name}
                                    </Link>
                                    <span className="text-[11px] text-slate-400 block line-clamp-1">
                                      {feature.tagline || feature.description}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Plan Columns */}
                              {matrixData?.plans?.map((plan: any) => {
                                const tierData = feature.tiers?.[plan.key];
                                return (
                                  <td
                                    key={plan.key}
                                    onClick={() => handleCellClick(feature, plan)}
                                    className={`py-2 px-4 text-center align-middle ${
                                      isEditing ? 'hover:bg-blue-50/50 cursor-pointer transition-colors' : ''
                                    }`}
                                  >
                                    {renderTierIndicator(tierData, isEditing)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Edit Modal */}
        {selectedCell && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Edit Entitlement: {selectedCell.feature.name}
                  </h3>
                  <span className="text-xs text-slate-500">Plan: {selectedCell.plan.name}</span>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-2">Entitlement Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveCell(true, 'standard', selectedCell.currentTier?.usage_limit || 100)}
                      className={`p-2.5 rounded-lg border text-center font-semibold transition-all ${
                        selectedCell.currentTier?.enabled
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      Included / Enabled
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCell(false, 'disabled', 0)}
                      className={`p-2.5 rounded-lg border text-center font-semibold transition-all ${
                        !selectedCell.currentTier?.enabled
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      Disabled
                    </button>
                  </div>
                </div>

                {selectedCell.currentTier?.enabled && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1.5">Tier Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['standard', 'advanced', 'limited'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            handleSaveCell(true, t, selectedCell.currentTier?.usage_limit || 100)
                          }
                          className={`p-2 rounded border text-center capitalize font-semibold ${
                            (selectedCell.currentTier?.value_tier || 'standard') === t
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
}
