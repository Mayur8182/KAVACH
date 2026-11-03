'use client';

/**
 * /settings/integrations — Organization-Scoped Centralized Integrations Hub
 * Backed by Kavach Central Integration Management System (CIMS).
 * 
 * Complies with AGENTS.md & Golden Rule:
 * - Real API integration, real credentials validation, zero fake connected states.
 * - Single canonical registry shared with Onboarding, /integrations, Code Security,
 *   Cloud Security, CI/CD, and Settings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Settings,
  Plus,
  Shield,
  Trash2,
  Check,
  X,
  Lock,
  Globe,
  Sliders,
  Play,
  Layers,
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
  { id: 'all', label: 'All Integrations' },
  { id: 'scm', label: 'Source Code (SCM)' },
  { id: 'cloud', label: 'Cloud Providers' },
  { id: 'cicd', label: 'CI/CD Pipelines' },
  { id: 'registry', label: 'Container Registries' },
  { id: 'alerts', label: 'Alerts & Webhooks' },
];

export default function SettingsIntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [providers, setProviders] = useState<ProviderCatalogItem[]>([]);
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
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.integrations.listProviders();
      setProviders(items);
    } catch (err: any) {
      console.error('Failed to load integrations:', err);
      showToast('Error querying central integration registry', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const handleConnectCentral = async (payload: CentralConnectPayload): Promise<ProviderCatalogItem> => {
    try {
      const updated = await api.integrations.connectCentral(payload);
      await loadIntegrations();
      showToast(`${updated.name} connected and synchronized across all Kavach workspaces.`, 'success');
      return updated;
    } catch (err: any) {
      showToast(err?.message || `Failed to connect ${payload.provider}.`, 'error');
      throw err;
    }
  };

  const handleDisconnect = async (item: ProviderCatalogItem) => {
    if (!window.confirm(`Are you sure you want to disconnect ${item.name}? This will revoke access to its synchronized resources.`)) {
      return;
    }
    try {
      await api.integrations.disconnectCentral(item.connection_id || item.provider);
      await loadIntegrations();
      showToast(`${item.name} has been disconnected.`, 'success');
    } catch (err: any) {
      showToast(err.message || `Failed to disconnect ${item.name}`, 'error');
    }
  };

  const handleCheckHealth = async (item: ProviderCatalogItem) => {
    try {
      const res = await api.integrations.checkHealth(item.connection_id || item.provider);
      showToast(`${item.name}: ${res.message} (${res.latency_ms}ms)`, res.healthy ? 'info' : 'error');
      await loadIntegrations();
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
        await loadIntegrations();
        showToast('Capabilities updated successfully.', 'success');
        return updated;
      } catch (err: any) {
        showToast(err?.message || 'Failed to update capabilities', 'error');
        throw err;
      }
    },
    [loadIntegrations]
  );

  // Filter
  const filtered = providers.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = providers.filter((p) => p.connected).length;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
        padding: '32px 40px',
      }}
    >
      {/* ── TOP BREADCRUMBS & HEADER ── */}
      <div style={{ marginBottom: '24px' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>
          <span>Settings</span>
          <span>/</span>
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Integrations</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Integrations &amp; Connectors
              </h1>
              <span
                style={{
                  fontSize: '12px',
                  color: '#166534',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={13} color="#166534" />
                {connectedCount} Active Integrations
              </span>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', margin: '6px 0 0' }}>
              Connect your repositories, cloud providers, and CI/CD tools once. Authorized security scanners and reachability models automatically use these verified credentials.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={loadIntegrations}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div
          style={{
            marginBottom: '20px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <CheckCircle2 size={16} color="#4ADE80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── SEARCH & CATEGORY FILTER BAR ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          backgroundColor: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #4F46E5' : '1px solid transparent',
                  backgroundColor: isSelected ? '#EEF2FF' : '#F1F5F9',
                  color: isSelected ? '#4338CA' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── INTEGRATIONS GRID ── */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#4F46E5' }} />
          Loading central integrations catalog...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <Layers size={36} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: 0 }}>No matching integrations</h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Try adjusting your search query or filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filtered.map((item) => (
            <IntegrationProviderCard
              key={item.provider}
              item={item}
              onConnectClick={(p) => setConnectModalProvider(p)}
              onManageResourcesClick={(p) => setManageModalProvider(p)}
              onCheckHealthClick={handleCheckHealth}
              onDisconnectClick={handleDisconnect}
            />
          ))}
        </div>
      )}

      {/* ── MODALS ── */}
      {connectModalProvider && (
        <ConnectProviderModal
          providerItem={connectModalProvider}
          isOpen={true}
          onClose={() => setConnectModalProvider(null)}
          onSuccess={() => loadIntegrations()}
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
