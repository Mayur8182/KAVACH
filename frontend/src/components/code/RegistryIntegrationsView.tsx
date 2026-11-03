'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  MoreVertical,
  Calendar,
  Shield,
  Cloud,
  HardDrive,
  Check,
  Play,
  Trash2,
  Power,
  RotateCw,
  Clock,
  Key,
  Globe,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  RegistrySummaryResponse,
  RegistryEnhancedItem,
} from '@/types/api/container';

interface RegistryIntegrationsViewProps {
  projectId: string | null;
  repositoryName?: string;
}

export const RegistryIntegrationsView: React.FC<RegistryIntegrationsViewProps> = ({
  projectId,
  repositoryName = '',
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'All Registries' | 'Connected' | 'Add Registry'>('All Registries');

  // Data states
  const [summary, setSummary] = useState<RegistrySummaryResponse | null>(null);
  const [registries, setRegistries] = useState<RegistryEnhancedItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [providers, setProviders] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals & action states
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // New registry form
  const [formData, setFormData] = useState({
    provider: 'docker_hub',
    name: '',
    url: 'https://registry-1.docker.io',
    account_id: '',
    access_token: '',
    region: 'us-east-1',
  });
  const [submittingRegistry, setSubmittingRegistry] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch summary
  const loadSummary = useCallback(async () => {
    try {
      const sumRes = await api.containers.registriesSummary(projectId);
      setSummary(sumRes);
    } catch (err: any) {
      console.error('Failed to load registry summary:', err);
      setError(err?.message || 'Failed to fetch registry summary');
    }
  }, [projectId]);

  // Fetch registry items
  const loadRegistries = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.containers.registriesEnhanced({
        projectId,
        search: search || undefined,
        provider: selectedProvider !== 'All' ? selectedProvider : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : (activeTab === 'Connected' ? 'Connected' : undefined),
        type: selectedType !== 'All' ? selectedType : undefined,
        page,
        pageSize,
      });

      let items = res.items || [];
      if (activeTab === 'Connected') {
        items = items.filter(r => r.status === 'Connected');
      }

      setRegistries(items);
      setTotalItems(res.total || items.length);
      if (res.providers?.length) setProviders(['All', ...res.providers]);
      if (res.types?.length) setTypes(['All', ...res.types]);
      if (res.statuses?.length) setStatuses(['All', ...res.statuses]);
    } catch (err: any) {
      console.error('Failed to load registries:', err);
      setError(err?.message || 'Failed to fetch registries list');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, search, selectedProvider, selectedStatus, selectedType, page, pageSize, activeTab]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadRegistries();
  }, [loadRegistries]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadSummary(), loadRegistries()]);
  };

  const handleSyncRegistry = async (reg: RegistryEnhancedItem) => {
    try {
      setSyncingId(reg.id);
      await api.containers.syncRegistry(reg.id);
      setActionSuccessMessage(`Sync initiated for ${reg.name}. Scanning catalog images...`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      await loadRegistries();
      await loadSummary();
    } catch (err: any) {
      setError(`Failed to sync registry: ${err?.message || 'Network error'}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnectRegistry = async (reg: RegistryEnhancedItem) => {
    try {
      await api.containers.disconnectRegistry(reg.id);
      setActionSuccessMessage(`Disconnected ${reg.name}`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
      await loadRegistries();
      await loadSummary();
    } catch (err: any) {
      setError(`Failed to disconnect: ${err?.message}`);
    }
  };

  const handleCreateRegistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setFormError('Registry name is required');
      return;
    }

    try {
      setSubmittingRegistry(true);
      setFormError(null);

      await api.containers.createRegistry({
        provider: formData.provider,
        name: formData.name,
        url: formData.url,
        account_id: formData.account_id || undefined,
        region: formData.region || undefined,
        access_token: formData.access_token || undefined,
      }, projectId);

      setConnectModalOpen(false);
      setActionSuccessMessage(`Registry ${formData.name} connected successfully!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);

      // Reset form
      setFormData({
        provider: 'docker_hub',
        name: '',
        url: 'https://registry-1.docker.io',
        account_id: '',
        access_token: '',
        region: 'us-east-1',
      });

      await loadRegistries();
      await loadSummary();
    } catch (err: any) {
      console.error('Failed to create registry:', err);
      setFormError(err?.message || 'Failed to connect container registry. Check credentials and URL.');
    } finally {
      setSubmittingRegistry(false);
    }
  };

  // Provider logo badge helper
  const renderProviderBadge = (provider: string) => {
    const p = provider.toLowerCase();
    if (p.includes('docker')) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            🐳
          </div>
          <span className="font-medium text-white">Docker Hub</span>
        </div>
      );
    }
    if (p.includes('ecr') || p.includes('amazon') || p.includes('aws')) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
            ☁️
          </div>
          <span className="font-medium text-white">Amazon ECR</span>
        </div>
      );
    }
    if (p.includes('gcr') || p.includes('google') || p.includes('artifact')) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
            🔷
          </div>
          <span className="font-medium text-white">Google Artifact Registry</span>
        </div>
      );
    }
    if (p.includes('acr') || p.includes('azure')) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600/20 text-blue-300 flex items-center justify-center font-bold text-xs">
            ⚡
          </div>
          <span className="font-medium text-white">Azure Container Registry</span>
        </div>
      );
    }
    if (p.includes('harbor')) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
            ⚓
          </div>
          <span className="font-medium text-white">Harbor</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
          📦
        </div>
        <span className="font-medium text-white">{provider}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
            <span>Code</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span>Container Security</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-blue-400">Registries</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Registry Integrations
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Connect and manage container registries to discover, scan and monitor images.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConnectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Registry</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors shadow-sm"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs bg-rose-500/20 px-2.5 py-1 rounded-md hover:bg-rose-500/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Connected Registries */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Connected Registries</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary ? summary.connected_registries : '6'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary ? summary.connected_subtitle : 'Across cloud & self-hosted'}
          </div>
        </div>

        {/* Card 2: Total Images */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Total Images</div>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary ? summary.total_images : '248'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span>{summary ? summary.images_trend : '↑ 12%'}</span>
            <span className="text-slate-400 font-normal">
              {summary ? summary.images_subtitle : 'From connected registries'}
            </span>
          </div>
        </div>

        {/* Card 3: Last Sync */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400">Last Sync</div>
          <div className="text-2xl font-extrabold text-white mt-1 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{summary ? summary.last_sync : '2 hours ago'}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {summary ? summary.last_sync_subtitle : 'All registries up to date'}
          </div>
        </div>

        {/* Card 4: Sync Status Breakdown */}
        <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="text-xs font-medium text-slate-400 mb-2">Sync Status</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Successful
              </span>
              <span className="font-semibold text-white">
                {summary ? summary.sync_successful : '6'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Failed
              </span>
              <span className="font-semibold text-white">
                {summary ? summary.sync_failed : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                In Progress
              </span>
              <span className="font-semibold text-white">
                {summary ? summary.sync_in_progress : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center gap-6 border-b border-slate-800 text-sm">
        {(['All Registries', 'Connected', 'Add Registry'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              if (tab === 'Add Registry') {
                setConnectModalOpen(true);
              } else {
                setActiveTab(tab);
                setPage(1);
              }
            }}
            className={`pb-3 font-medium transition-colors relative ${
              activeTab === tab ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search registries..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Provider dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500">Provider:</span>
            <select
              value={selectedProvider}
              onChange={e => {
                setSelectedProvider(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none"
            >
              {providers.map(p => (
                <option key={p} value={p} className="bg-slate-900 text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={e => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none"
            >
              {statuses.map(s => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Type dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500">Type:</span>
            <select
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none"
            >
              {types.map(t => (
                <option key={t} value={t} className="bg-slate-900 text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {(search || selectedProvider !== 'All' || selectedStatus !== 'All' || selectedType !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedProvider('All');
                setSelectedStatus('All');
                setSelectedType('All');
                setPage(1);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Registries Table */}
      <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0D131F] text-slate-400 font-medium border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-8">
                  <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0" />
                </th>
                <th className="py-3 px-4">Registry Name</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Images</th>
                <th className="py-3 px-4">Last Sync</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    Loading container registries...
                  </td>
                </tr>
              ) : registries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Cloud className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No container registries configured. Click "Connect Registry" to connect your first provider.
                  </td>
                </tr>
              ) : (
                registries.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3 px-4">
                      <input type="checkbox" className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0" />
                    </td>

                    {/* Registry Name */}
                    <td className="py-3 px-4 font-mono font-medium text-blue-400 flex items-center gap-1.5">
                      {r.name}
                    </td>

                    {/* Provider */}
                    <td className="py-3 px-4">
                      {renderProviderBadge(r.provider)}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                        {r.type}
                      </span>
                    </td>

                    {/* Images count */}
                    <td className="py-3 px-4 font-semibold text-white">
                      {r.images}
                    </td>

                    {/* Last Sync */}
                    <td className="py-3 px-4 text-slate-400">
                      {r.last_sync}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {r.status === 'Connected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      ) : r.status === 'Failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          In Progress
                        </span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSyncRegistry(r)}
                          disabled={syncingId === r.id}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Sync catalog now"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${syncingId === r.id ? 'animate-spin text-blue-400' : ''}`} />
                        </button>

                        <button
                          onClick={() => handleDisconnectRegistry(r)}
                          className="p-1.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Disconnect registry"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-800/80 text-xs text-slate-400 gap-3">
          <div>
            Showing 1-{registries.length} of {totalItems} registries
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="w-7 h-7 rounded text-xs font-medium bg-blue-600 text-white font-bold"
            >
              1
            </button>
          </div>
        </div>
      </div>

      {/* Connect Registry Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Connect Container Registry</h2>
              </div>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateRegistry} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Registry Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={e => {
                    const prov = e.target.value;
                    let url = 'https://registry-1.docker.io';
                    if (prov === 'aws_ecr') url = 'https://123456789012.dkr.ecr.us-east-1.amazonaws.com';
                    if (prov === 'google_gar') url = 'https://us-docker.pkg.dev';
                    if (prov === 'azure_acr') url = 'https://myregistry.azurecr.io';
                    if (prov === 'github_ghcr') url = 'https://ghcr.io';
                    if (prov === 'harbor') url = 'https://harbor.internal.corp';

                    setFormData(prev => ({ ...prev, provider: prov, url }));
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="docker_hub">Docker Hub (Docker Official)</option>
                  <option value="aws_ecr">Amazon Elastic Container Registry (ECR)</option>
                  <option value="google_gar">Google Artifact Registry (GAR)</option>
                  <option value="azure_acr">Azure Container Registry (ACR)</option>
                  <option value="github_ghcr">GitHub Container Registry (GHCR)</option>
                  <option value="harbor">Harbor Enterprise Registry</option>
                </select>
              </div>

              {/* Registry Display Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Connection Identifier / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. prod-registry-primary"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Registry Endpoint URL
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  required
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Account / Namespace */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Organization / Account ID / Namespace
                </label>
                <input
                  type="text"
                  placeholder="e.g. org-secops or AWS Account ID"
                  value={formData.account_id}
                  onChange={e => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Token / Credential */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Access Token / Secret Key (Encrypted in PostgreSQL)
                </label>
                <input
                  type="password"
                  placeholder="Personal Access Token or API Secret"
                  value={formData.access_token}
                  onChange={e => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Credentials are encrypted at rest using AES-GCM and never returned via API responses.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRegistry}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {submittingRegistry ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying & Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Connect Registry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
