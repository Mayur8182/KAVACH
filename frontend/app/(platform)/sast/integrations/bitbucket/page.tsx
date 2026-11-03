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
  AlertTriangle,
} from 'lucide-react';

const BitbucketBrandIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0052CC">
    <path d="M2.66 3h18.68c.37 0 .67.3.67.67 0 .09-.02.18-.06.26l-3.32 17.07c-.06.33-.35.58-.69.58H5.95c-.34 0-.63-.25-.69-.58L1.99 3.93c-.07-.36.17-.71.53-.78.05-.01.1-.01.14-.01zm11.39 12.35l1.37-7.02H8.48l1.37 7.02h4.2z" />
  </svg>
);

interface RepositoryItem {
  id: string;
  external_id: string;
  name: string;
  full_name: string;
  url: string;
  private: boolean;
  default_branch: string;
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
  connected_at?: string;
  last_sync_at?: string;
  scopes: string[];
  repositories: RepositoryItem[];
}

export default function BitbucketIntegrationPage() {
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
  const [workspaceInput, setWorkspaceInput] = useState<string>('mayur-bharvad');
  const [accountInput, setAccountInput] = useState<string>('mayur.bharvad@adit.ac.in');
  const [appPasswordInput, setAppPasswordInput] = useState<string>('');

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.integrations.getProviderStatus('bitbucket');
      setData(res);
      const selected = new Set<string>();
      (res.repositories || []).forEach((r: RepositoryItem) => {
        if (r.is_selected) selected.add(r.id);
      });
      setSelectedIds(selected);
    } catch (err) {
      console.error('Failed to load Bitbucket status:', err);
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
      const res = await api.integrations.syncProvider('bitbucket');
      setActionMessage(res.message);
      await fetchStatus();
    } catch (err) {
      console.error('Sync failed:', err);
      setActionMessage('Failed to sync Bitbucket repositories.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Bitbucket?')) return;
    try {
      setLoading(true);
      await api.integrations.disconnectProvider('bitbucket');
      await fetchStatus();
      setActionMessage('Bitbucket disconnected.');
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
      await api.integrations.connectProvider('bitbucket', {
        organization_name: workspaceInput,
        account_name: accountInput,
        token: appPasswordInput || undefined,
      });
      setShowConnectModal(false);
      await fetchStatus();
      setActionMessage('Bitbucket connected successfully!');
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
    if (selectedIds.size === filteredRepos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRepos.map((r) => r.id)));
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setActionMessage(null);
      const res = await api.integrations.updateRepoSelection('bitbucket', Array.from(selectedIds));
      setActionMessage(`Selection updated: ${res.selected_count} repositories actively monitored.`);
    } catch (err) {
      console.error('Save failed:', err);
      setActionMessage('Failed to update selection.');
    } finally {
      setSaving(false);
    }
  };

  const filteredRepos = (data?.repositories || []).filter((r) =>
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Bitbucket</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BitbucketBrandIcon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Bitbucket Integration
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
              Connect your Bitbucket workspace to scan repositories.
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
        {['Overview', 'Repositories', 'Sync Settings', 'Permissions', 'Advanced'].map((tab) => {
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
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BitbucketBrandIcon size={28} />
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Workspace: <strong style={{ color: '#0F172A' }}>{data?.organization_name || 'mayur-bharvad'}</strong>
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
                Connect Bitbucket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Repository Access Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Repository Access
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Select repositories to scan
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
            {syncing ? 'Syncing...' : 'Sync Repositories'}
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #EAECF0', backgroundColor: '#FAFAFA' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search repositories..."
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
                    checked={filteredRepos.length > 0 && selectedIds.size === filteredRepos.length}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Repository</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Privacy</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Last Scan</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    {isConnected ? 'No repositories found.' : 'Bitbucket is not connected.'}
                  </td>
                </tr>
              ) : (
                filteredRepos.map((repo) => {
                  const isChecked = selectedIds.has(repo.id);
                  const isScanned = repo.status === 'Scanned';

                  return (
                    <tr
                      key={repo.id}
                      style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isChecked ? '#FAFAFA' : '#FFFFFF' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(repo.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
                        >
                          {repo.name}
                          <ExternalLink size={12} color="#94A3B8" />
                        </a>
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
                            backgroundColor: repo.private ? '#F1F5F9' : '#ECFDF5',
                            color: repo.private ? '#475569' : '#059669',
                            fontWeight: 500,
                          }}
                        >
                          {repo.private ? <Lock size={10} /> : <Globe size={10} />}
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                        {repo.last_scan}
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
                          {repo.status}
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
            Selected: <strong style={{ color: '#0F172A' }}>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'repository' : 'repositories'}
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
              Connect Bitbucket Workspace
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
              Configure Bitbucket credentials to sync repositories and automate pull request checks.
            </p>

            <form onSubmit={handleConnect}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Workspace Slug
                </label>
                <input
                  type="text"
                  value={workspaceInput}
                  onChange={(e) => setWorkspaceInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Bitbucket Account Email / Username
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
                  Bitbucket App Password
                </label>
                <input
                  type="password"
                  placeholder="App Password with repo read/write"
                  value={appPasswordInput}
                  onChange={(e) => setAppPasswordInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
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
