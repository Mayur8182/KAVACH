'use client';

/**
 * Thing Code — Centralized Real Integrations Command Center (/code/integrations)
 * 
 * Unified with /integrations:
 * - 100% Real PostgreSQL persistence via `/api/v1/integrations/*`
 * - Shares the exact authoritative IntegrationProviderCard, ConnectProviderModal, and ResourceCapabilityModal
 * - Single authoritative provider connection and capability propagation
 * - High-fidelity brand SVG icons (GitHub, GitLab, Bitbucket, Azure DevOps, Jenkins, AWS, GCP, Slack, Jira)
 * - Working disconnect with immediate reactive UI refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Search,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  FolderGit2,
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
  { id: 'cicd', label: 'CI/CD Pipelines' },
  { id: 'registry', label: 'Container Registries' },
  { id: 'cloud', label: 'Cloud & Infrastructure' },
  { id: 'alerts', label: 'Alerts & Issues' },
];

export default function CodeIntegrationsPage() {
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
                  Code Security Integrations
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Unified System Registry
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">
                Manage all SCM repositories, CI/CD build gates, container registries, and notification endpoints. Unified connection across all platform modules.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={loadCatalog}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                <span>{totalResources}</span>
                <span className="text-xs font-normal text-slate-500">repositories & services</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Health Status
              </div>
              <div className="text-xl font-bold text-emerald-600 mt-1 flex items-baseline gap-2">
                <span>{healthyCount}</span>
                <span className="text-xs font-normal text-slate-500">healthy / passing</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Policy Enforcement
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-2">
                <span>Deterministic</span>
                <span className="text-xs font-normal text-emerald-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        {/* Controls: Category Filter + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter providers or capabilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Providers Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Querying authoritative integration state...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
            <SlidersHorizontal size={28} className="text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No matching integration providers</h3>
            <p className="text-xs text-slate-500 mt-1">Try refining your search terms or selecting another category.</p>
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

      {/* Connect Modal */}
      {connectModalProvider && (
        <ConnectProviderModal
          provider={connectModalProvider}
          onClose={() => setConnectModalProvider(null)}
          onConnect={handleConnectCentral}
        />
      )}

      {/* Resource & Capability Governance Modal */}
      {manageModalProvider && (
        <ResourceCapabilityModal
          provider={manageModalProvider}
          onClose={() => setManageModalProvider(null)}
          onFetchResources={handleFetchResources}
          onUpdateCapabilities={handleUpdateCapabilities}
        />
      )}
    </div>
  );
}
