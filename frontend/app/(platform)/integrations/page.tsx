'use client';

/**
 * Kavach Centralized Integration Management System (CIMS)
 * /integrations — Single authoritative integration registry & capability governance.
 * Connect once during onboarding or here -> automatically propagates to
 * Code Security, SAST, SCA, IaC, Cloud Security, CI/CD, Settings & Policies.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Shield,
  Layers,
  Activity,
  Filter,
  Check,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type {
  ProviderCatalogItem,
  CentralResourceCapabilityItem,
  UpdateCapabilitiesPayload,
  CentralConnectPayload,
} from '@/types/api/integrations';
import {
  IntegrationProviderCard,
  ConnectProviderModal,
  ResourceCapabilityModal,
} from '@/components/integrations';

const CATEGORIES = [
  { id: 'all', label: 'All Providers' },
  { id: 'scm', label: 'Source Code (SCM)' },
  { id: 'cloud', label: 'Cloud Providers' },
  { id: 'cicd', label: 'CI/CD Pipelines' },
  { id: 'registry', label: 'Container Registries' },
  { id: 'alerts', label: 'Alerts & Issues' },
];

export default function CentralIntegrationsPage() {
  const [providers, setProviders] = useState<ProviderCatalogItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [connectModalProvider, setConnectModalProvider] = useState<ProviderCatalogItem | null>(null);
  const [manageModalProvider, setManageModalProvider] = useState<ProviderCatalogItem | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'error') {
      toast.error(msg);
    } else if (type === 'info') {
      toast.info(msg);
    } else {
      toast.success(msg);
    }
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.integrations.listProviders();
      setProviders(items);
    } catch (err: any) {
      console.error('Failed to load integrations catalog:', err);
      showToast('Error querying central integration registry', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Actions
  const handleConnectCentral = async (payload: CentralConnectPayload): Promise<ProviderCatalogItem> => {
    try {
      const updated = await api.integrations.connectCentral(payload);
      await loadCatalog();
      showToast(`Successfully connected ${updated.name}. Resources automatically propagated across Kavach.`, 'success');
      return updated;
    } catch (err: any) {
      showToast(err?.message || `Failed to connect ${payload.provider}.`, 'error');
      throw err;
    }
  };

  const handleDisconnectCentral = async (item: ProviderCatalogItem) => {
    if (!window.confirm(`Are you sure you want to disconnect ${item.name}? Active secret synchronization, automated scans, and pipeline gates will be revoked.`)) {
      return;
    }
    try {
      await api.integrations.disconnectCentral(item.connection_id || item.provider);
      await loadCatalog();
      showToast(`${item.name} has been disconnected.`, 'success');
    } catch (err: any) {
      showToast(err.message || `Failed to disconnect ${item.name}`, 'error');
    }
  };

  const handleCheckHealth = async (item: ProviderCatalogItem) => {
    try {
      const res = await api.integrations.checkHealth(item.connection_id || item.provider);
      showToast(`${item.name}: ${res.message} (${res.latency_ms}ms latency)`, res.healthy ? 'info' : 'error');
      await loadCatalog();
    } catch (err: any) {
      showToast(`Health check failed for ${item.name}`, 'error');
    }
  };

  const handleFetchResources = useCallback(
    async (connectionIdOrProvider: string): Promise<CentralResourceCapabilityItem[]> => {
      return await api.integrations.getResources(connectionIdOrProvider);
    },
    []
  );

  const handleUpdateCapabilities = useCallback(
    async (payload: UpdateCapabilitiesPayload): Promise<CentralResourceCapabilityItem> => {
      try {
        const updated = await api.integrations.updateCapabilities(payload);
        await loadCatalog();
        showToast('Resource capabilities updated and synchronized across modules.', 'success');
        return updated;
      } catch (err: any) {
        showToast(err?.message || 'Failed to update capabilities', 'error');
        throw err;
      }
    },
    [loadCatalog]
  );

  // Filtered List
  const filtered = providers.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate live statistics
  const connectedCount = providers.filter((p) => p.connected).length;
  const totalResources = providers.reduce((acc, p) => acc + (p.resources_count || 0), 0);
  const healthyCount = providers.filter((p) => p.health === 'HEALTHY').length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-2xs">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Link2 size={18} />
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Centralized Integration Registry
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Global Single Sign-On
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
                Connect your developer and cloud ecosystem once. Authorizations, resources, and fine-grained security capabilities automatically propagate across Code Security, Cloud Security, CI/CD, and Governance modules.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadCatalog}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh State
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Connected Providers
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                <span>{connectedCount}</span>
                <span className="text-xs font-normal text-slate-500">of {providers.length}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Managed Resources
              </div>
              <div className="text-xl font-bold text-indigo-600 mt-1 flex items-baseline gap-2">
                <span>{totalResources}</span>
                <span className="text-xs font-normal text-slate-500">repos & cloud</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Health Status
              </div>
              <div className="text-xl font-bold text-emerald-600 mt-1 flex items-baseline gap-2">
                <span>{connectedCount > 0 ? `${Math.round((healthyCount / connectedCount) * 100)}%` : '100%'}</span>
                <span className="text-xs font-normal text-slate-500">healthy</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Propagation Scope
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                <span>6 Modules</span>
                <span className="text-xs font-normal text-slate-500">auto-synced</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search providers or integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Providers Grid */}
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw size={22} className="animate-spin text-indigo-600" />
            <span>Loading central integration catalog...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Layers size={32} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No matching providers found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your category filter or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => (
              <IntegrationProviderCard
                key={item.provider}
                item={item}
                onConnectClick={(p) => setConnectModalProvider(p)}
                onManageResourcesClick={(p) => setManageModalProvider(p)}
                onCheckHealthClick={handleCheckHealth}
                onDisconnectClick={handleDisconnectCentral}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {connectModalProvider && (
        <ConnectProviderModal
          providerItem={connectModalProvider}
          isOpen={true}
          onClose={() => setConnectModalProvider(null)}
          onSuccess={() => {
            loadCatalog();
          }}
          onConnectApi={handleConnectCentral}
        />
      )}

      {manageModalProvider && (
        <ResourceCapabilityModal
          providerItem={manageModalProvider}
          isOpen={true}
          onClose={() => setManageModalProvider(null)}
          onFetchResources={handleFetchResources}
          onUpdateCapabilities={handleUpdateCapabilities}
        />
      )}
    </div>
  );
}
