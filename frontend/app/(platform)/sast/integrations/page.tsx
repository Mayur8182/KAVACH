'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  Link2,
  GitBranch,
  FolderGit2,
  Webhook,
  Key,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Terminal,
  Clock,
  MoreVertical,
} from 'lucide-react';

// Brand SVG Icons
const GithubBrandIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0F172A">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const GitlabBrandIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FC6D26">
    <path d="M22.65 14.39L20.6 8.08c-.1-.31-.54-.31-.64 0l-1.9 5.86H5.94l-1.9-5.86c-.1-.31-.54-.31-.64 0L1.35 14.39c-.1.3.01.63.26.82l10.02 7.42c.22.16.52.16.74 0l10.02-7.42c.25-.19.36-.52.26-.82z" />
  </svg>
);

const BitbucketBrandIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0052CC">
    <path d="M2.66 3h18.68c.37 0 .67.3.67.67 0 .09-.02.18-.06.26l-3.32 17.07c-.06.33-.35.58-.69.58H5.95c-.34 0-.63-.25-.69-.58L1.99 3.93c-.07-.36.17-.71.53-.78.05-.01.1-.01.14-.01zm11.39 12.35l1.37-7.02H8.48l1.37 7.02h4.2z" />
  </svg>
);

const JenkinsBrandIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#D33833">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

interface IntegrationItem {
  id: string;
  provider: string;
  name: string;
  type: string;
  status: string;
  connected_at?: string;
  last_sync?: string;
  external_account_name?: string;
  organization_name?: string;
}

interface OverviewData {
  connected_integrations: number;
  cicd_pipelines: number;
  repositories_synced: number;
  active_webhooks: number;
  items: IntegrationItem[];
}

export default function IntegrationsOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('All Integrations');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.integrations.overview({
        type: typeFilter !== 'All' ? typeFilter : undefined,
        search: searchTerm || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load integrations overview:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchTerm]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'github':
        return <GithubBrandIcon size={20} />;
      case 'gitlab':
        return <GitlabBrandIcon size={20} />;
      case 'bitbucket':
        return <BitbucketBrandIcon size={20} />;
      case 'jenkins':
        return <JenkinsBrandIcon size={20} />;
      case 'github_actions':
        return <GithubBrandIcon size={20} />;
      case 'gitlab_ci':
        return <GitlabBrandIcon size={20} />;
      case 'webhook':
        return <Webhook size={20} className="text-emerald-600" />;
      case 'api':
        return <Key size={20} className="text-blue-600" />;
      default:
        return <Link2 size={20} className="text-slate-600" />;
    }
  };

  const getProviderRoute = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'github':
        return '/sast/integrations/github';
      case 'gitlab':
        return '/sast/integrations/gitlab';
      case 'bitbucket':
        return '/sast/integrations/bitbucket';
      case 'jenkins':
      case 'github_actions':
      case 'gitlab_ci':
        return '/sast/integrations/ci-cd';
      case 'webhook':
        return '/sast/integrations/webhooks';
      case 'api':
        return '/sast/integrations/api';
      default:
        return '/sast/integrations';
    }
  };

  // Filter items by tab if activeTab is not All
  const filteredItems = (data?.items || []).filter((item) => {
    if (activeTab === 'Source Code') return item.type === 'Source Code';
    if (activeTab === 'CI/CD') return item.type === 'CI/CD';
    if (activeTab === 'Webhooks') return item.type === 'Webhooks';
    if (activeTab === 'API') return item.type === 'API';
    return true;
  });

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
        <span>THING CODE</span>
        <ChevronRight size={12} />
        <span>SAST</span>
        <ChevronRight size={12} />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Integrations</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Integrations
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Connect your tools and configure automated security scanning.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <Plus size={16} />
          Add Integration
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Link2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {loading ? '—' : data?.connected_integrations ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Connected Integrations
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <GitBranch size={20} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {loading ? '—' : data?.cicd_pipelines ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                CI/CD Pipelines
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <FolderGit2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {loading ? '—' : data?.repositories_synced ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Repositories Synced
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Webhook size={20} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>
                {loading ? '—' : data?.active_webhooks ?? 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Active Webhooks
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        {/* Navigation Tabs Bar */}
        <div style={{ borderBottom: '1px solid #EAECF0', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['All Integrations', 'Source Code', 'CI/CD', 'Webhooks', 'API'].map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '16px 0',
                    border: 'none',
                    borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: active ? '#2563EB' : '#64748B',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={fetchOverview}
              title="Refresh integrations"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '6px',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', backgroundColor: '#FAFAFA' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 34px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
                fontWeight: 500,
              }}
            >
              <option value="All">All</option>
              <option value="Source Code">Source Code</option>
              <option value="CI/CD">CI/CD</option>
              <option value="Webhooks">Webhooks</option>
              <option value="API">API</option>
            </select>
          </div>
        </div>

        {/* Integrations Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0' }}>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected At</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Sync</th>
                <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                      <Link2 size={32} style={{ margin: '0 auto 12px auto', color: '#94A3B8' }} />
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                        No integrations found
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
                        Connect an integration to start scanning your repositories.
                      </div>
                      <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Add Integration
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isConnected = item.status === 'connected';
                  const route = getProviderRoute(item.provider);

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #EAECF0', transition: 'background-color 150ms ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <Link href={route} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getProviderIcon(item.provider)}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {item.name}
                            </div>
                            {item.external_account_name && (
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                {item.external_account_name} {item.organization_name ? `(${item.organization_name})` : ''}
                              </div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>
                        {item.type}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {isConnected ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                            Connected
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                            Not Connected
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748B' }}>
                        {item.connected_at || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748B' }}>
                        {item.last_sync || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <Link
                          href={route}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#2563EB',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '4px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          Configure
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Integration Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '560px',
              maxWidth: '90vw',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Add Integration
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Select a provider to connect your source code, CI/CD, or alerting systems.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {[
                { name: 'GitHub', desc: 'Sync repositories & pull requests', icon: <GithubBrandIcon size={24} />, href: '/sast/integrations/github' },
                { name: 'GitLab', desc: 'Sync projects and CI/CD pipelines', icon: <GitlabBrandIcon size={24} />, href: '/sast/integrations/gitlab' },
                { name: 'Bitbucket', desc: 'Sync Bitbucket workspaces & repos', icon: <BitbucketBrandIcon size={24} />, href: '/sast/integrations/bitbucket' },
                { name: 'Jenkins', desc: 'Automate build & quality gates', icon: <JenkinsBrandIcon size={24} />, href: '/sast/integrations/ci-cd' },
                { name: 'Webhooks', desc: 'Real-time alert delivery', icon: <Webhook size={24} className="text-emerald-600" />, href: '/sast/integrations/webhooks' },
                { name: 'API Access', desc: 'Create programmatic API keys', icon: <Key size={24} className="text-blue-600" />, href: '/sast/integrations/api' },
              ].map((opt) => (
                <Link
                  key={opt.name}
                  href={opt.href}
                  onClick={() => setShowAddModal(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>{opt.icon}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{opt.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
