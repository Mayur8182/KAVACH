'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ChevronRight,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
  Globe,
  Users,
  Folder,
  AlertTriangle,
} from 'lucide-react';

const GitlabBrandIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FC6D26">
    <path d="M22.65 14.39L20.6 8.08c-.1-.31-.54-.31-.64 0l-1.9 5.86H5.94l-1.9-5.86c-.1-.31-.54-.31-.64 0L1.35 14.39c-.1.3.01.63.26.82l10.02 7.42c.22.16.52.16.74 0l10.02-7.42c.25-.19.36-.52.26-.82z" />
  </svg>
);

interface ProjectItem {
  id: string;
  external_id: string;
  name: string;
  url: string;
  project_type: string;
  visibility: string;
  is_selected: boolean;
  last_scan: string;
  status: string;
}

interface ProviderDetail {
  id?: string;
  provider: string;
  status: string;
  connected: boolean;
  account_name?: string;
  organization_name?: string;
  instance_url?: string;
  connected_at?: string;
  last_sync_at?: string;
  scopes: string[];
  projects: ProjectItem[];
}

export default function GitLabIntegrationPage() {
  const [data, setData] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [instanceUrlInput, setInstanceUrlInput] = useState<string>('https://gitlab.com');
  const [accountInput, setAccountInput] = useState<string>('mayur.bharvad@adit.ac.in');
  const [tokenInput, setTokenInput] = useState<string>('');

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.integrations.getProviderStatus('gitlab');
      setData(res);
      const selected = new Set<string>();
      (res.projects || []).forEach((p: ProjectItem) => {
        if (p.is_selected) selected.add(p.id);
      });
      setSelectedIds(selected);
    } catch (err) {
      console.error('Failed to load GitLab status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setActionMessage(null);
      const res = await api.integrations.syncProvider('gitlab');
      setActionMessage(res.message);
      await fetchStatus();
    } catch (err) {
      console.error('Sync failed:', err);
      setActionMessage('Failed to sync GitLab projects.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect GitLab?')) return;
    try {
      setLoading(true);
      await api.integrations.disconnectProvider('gitlab');
      await fetchStatus();
      setActionMessage('GitLab disconnected.');
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.integrations.connectProvider('gitlab', {
        instance_url: instanceUrlInput,
        account_name: accountInput,
        token: tokenInput || undefined,
      });
      setShowConnectModal(false);
      await fetchStatus();
      setActionMessage('GitLab connected successfully!');
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setActionMessage(null);
      const res = await api.integrations.updateRepoSelection('gitlab', Array.from(selectedIds));
      setActionMessage(`Selection updated: ${res.selected_count} projects monitored.`);
    } catch (err) {
      console.error('Save failed:', err);
      setActionMessage('Failed to update project selection.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = (data?.projects || []).filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isConnected = data?.connected ?? false;

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
        <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>THING CODE</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>SAST</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>Integrations</Link>
        <ChevronRight size={12} />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>GitLab</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitlabBrandIcon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                GitLab Integration
              </h1>
              {isConnected ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
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
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  Disconnected
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Connect your GitLab instance to scan repositories.
            </p>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #EAECF0', marginBottom: '20px' }}>
        {['Overview', 'Projects', 'Sync Settings', 'Permissions', 'Advanced'].map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 0',
                border: 'none',
                borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: active ? '#2563EB' : '#64748B',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Connection Details Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px', border: '1px solid #EAECF0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px 0' }}>
          Connection Details
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitlabBrandIcon size={28} />
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Instance URL: <strong style={{ color: '#2563EB' }}>{data?.instance_url || 'https://gitlab.com'}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                Connected as: <strong style={{ color: '#0F172A' }}>{data?.account_name || 'Not configured'}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                Connected At: {data?.connected_at || '—'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', fontWeight: 600, padding: '4px 10px', backgroundColor: '#ECFDF5', borderRadius: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              {isConnected ? 'Active' : 'Inactive'}
            </div>

            {isConnected ? (
              <>
                <button
                  onClick={() => setShowConnectModal(true)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Reconnect
                </button>
                <button
                  onClick={handleDisconnect}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowConnectModal(true)}
                style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Connect GitLab
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Project Access Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Project Access
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Select groups/projects to scan
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing || !isConnected}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isConnected ? 'pointer' : 'not-allowed',
              opacity: isConnected ? 1 : 0.6,
            }}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Projects'}
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #EAECF0', backgroundColor: '#FAFAFA' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search groups or projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 34px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0' }}>
                <th style={{ padding: '10px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={filteredProjects.length > 0 && selectedIds.size === filteredProjects.length}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Visibility</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Last Scan</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    {isConnected ? 'No projects found.' : 'GitLab is not connected.'}
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const isChecked = selectedIds.has(p.id);
                  const isScanned = p.status === 'Scanned';

                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isChecked ? '#FAFAFA' : '#FFFFFF' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(p.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
                        >
                          {p.name}
                          <ExternalLink size={12} color="#94A3B8" />
                        </a>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {p.project_type === 'Group' ? <Users size={12} color="#64748B" /> : <Folder size={12} color="#64748B" />}
                          {p.project_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: p.visibility === 'Private' ? '#F1F5F9' : '#ECFDF5',
                            color: p.visibility === 'Private' ? '#475569' : '#059669',
                            fontWeight: 500,
                          }}
                        >
                          {p.visibility === 'Private' ? <Lock size={10} /> : <Globe size={10} />}
                          {p.visibility}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                        {p.last_scan}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: isScanned ? '#ECFDF5' : '#FEF2F2',
                            color: isScanned ? '#059669' : '#DC2626',
                          }}
                        >
                          {isScanned ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA' }}>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
            Selected: <strong style={{ color: '#0F172A' }}>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'project' : 'projects'}
          </div>

          <button
            onClick={handleSaveChanges}
            disabled={saving || !isConnected}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isConnected ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
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
              width: '480px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
              Connect GitLab
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
              Connect to GitLab SaaS or a Self-Managed instance.
            </p>

            <form onSubmit={handleConnect}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  GitLab Instance URL
                </label>
                <input
                  type="text"
                  value={instanceUrlInput}
                  onChange={(e) => setInstanceUrlInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Account Username or Email
                </label>
                <input
                  type="text"
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Personal Access Token
                </label>
                <input
                  type="password"
                  placeholder="glpat-xxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                  Requires <code style={{ color: '#2563EB' }}>api</code>, <code style={{ color: '#2563EB' }}>read_repository</code> scopes.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Connect & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
