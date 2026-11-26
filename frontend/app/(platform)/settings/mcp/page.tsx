'use client';

/**
 * MCP Connections & Universal OAuth 2.1 Hub (/settings/mcp)
 * Light Enterprise UI ONLY — backed 100% by real PostgreSQL & OAuth 2.1 backend APIs.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import {
  api,
  type OAuthConnectedClient,
  type OAuthConnectionsResponse,
} from '@/lib/api/client';
import { toast } from '@/lib/toast';

const PRODUCTION_MCP_ENDPOINT = 'https://mcp.kavachsecurity.me/mcp';

type SetupClientKey =
  | 'claude'
  | 'chatgpt'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'grok'
  | 'cli';

interface SetupTabSpec {
  id: SetupClientKey;
  label: string;
  transport: string;
  steps: string[];
  snippet?: string;
}

const SETUP_TABS: SetupTabSpec[] = [
  {
    id: 'claude',
    label: 'Claude',
    transport: 'Streamable HTTP + OAuth 2.1 Discovery',
    steps: [
      'Open Claude Settings → Connectors → Add custom connector.',
      'Enter Server URL: https://mcp.kavachsecurity.me/mcp (leave Client ID & Secret empty — automatic OAuth 2.1 PKCE + Dynamic Client Registration is used).',
      'Click Connect and sign in with your Kavach GitHub or Google account on the consent screen.',
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    transport: 'Connectors + OAuth 2.1 PKCE (S256)',
    steps: [
      'Open ChatGPT Settings → Connectors → Developer Mode → Create Connector.',
      'Set MCP Server URL to https://mcp.kavachsecurity.me/mcp and Authentication to OAuth.',
      'Approve project access on Kavach Consent UI — ChatGPT automatically receives scoped RS256 tokens (no manual API key required).',
    ],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    transport: 'Remote MCP + OAuth 2.1 Automatic Discovery',
    steps: [
      'Open Cursor Settings → Tools & MCP → Add Custom MCP.',
      'Paste the remote MCP configuration below into ~/.cursor/mcp.json.',
      'Click Connect when prompted in Cursor to authorize your project via OAuth 2.1 PKCE.',
    ],
    snippet: JSON.stringify(
      {
        mcpServers: {
          kavach: {
            url: PRODUCTION_MCP_ENDPOINT,
          },
        },
      },
      null,
      2
    ),
  },
  {
    id: 'vscode',
    label: 'VS Code Extension',
    transport: 'Native OAuth 2.1 + Git Remote Project Resolution',
    steps: [
      'Open VS Code Settings → MCP or run "MCP: Add Server" from the Command Palette.',
      'Select HTTP (Server-Sent Events / Streamable HTTP) and enter https://mcp.kavachsecurity.me/mcp.',
      'VS Code resolves your active local Git repository automatically via /api/v1/mcp/resolve-project after OAuth sign-in.',
    ],
    snippet: JSON.stringify(
      {
        servers: {
          kavach: {
            type: 'http',
            url: PRODUCTION_MCP_ENDPOINT,
          },
        },
      },
      null,
      2
    ),
  },
  {
    id: 'windsurf',
    label: 'Windsurf',
    transport: 'Streamable HTTP + OAuth 2.1 PKCE',
    steps: [
      'Open Windsurf MCP Configuration (~/.codeium/windsurf/mcp_config.json).',
      'Add the Kavach MCP server URL below without any static tokens or API keys.',
      'Complete browser OAuth 2.1 sign-in to bind your workspace and default project.',
    ],
    snippet: JSON.stringify(
      {
        mcpServers: {
          kavach: {
            serverUrl: PRODUCTION_MCP_ENDPOINT,
          },
        },
      },
      null,
      2
    ),
  },
  {
    id: 'grok',
    label: 'Grok',
    transport: 'Remote MCP + RFC 9728 Metadata Discovery',
    steps: [
      'Open Grok Integrations → MCP Connections → Add MCP Server.',
      'Provide https://mcp.kavachsecurity.me/mcp and select OAuth 2.1 authentication.',
      'Grok discovers /.well-known/oauth-protected-resource automatically and prompts Kavach consent.',
    ],
  },
  {
    id: 'cli',
    label: 'Claude Code / Codex',
    transport: 'CLI Streamable HTTP + OAuth 2.1 PKCE',
    steps: [
      'Register Kavach as an HTTP MCP server in Claude Code or Codex CLI using the command below.',
      'Run the MCP authentication command inside your project directory to complete OAuth 2.1 PKCE.',
    ],
    snippet: `claude mcp add --transport http kavach ${PRODUCTION_MCP_ENDPOINT}`,
  },
];

function formatDateTime(value?: string | null): string {
  if (!value) return 'Never';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatClientType(clientType: string): string {
  if (clientType === 'cimd') return 'CIMD';
  if (clientType === 'pre_registered') return 'Pre-registered';
  if (clientType === 'dynamic') return 'Dynamic DCR';
  return clientType;
}

export default function McpConnectionsSettingsPage() {
  const [data, setData] = useState<OAuthConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const [localOriginEndpoint, setLocalOriginEndpoint] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Preferences state
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState<string>('');
  const [defaultProjectId, setDefaultProjectId] = useState<string>('');
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Per-client mutations
  const [updatingClientProjectId, setUpdatingClientProjectId] = useState<string | null>(null);
  const [clientToDisconnect, setClientToDisconnect] = useState<OAuthConnectedClient | null>(null);
  const [disconnectingClientId, setDisconnectingClientId] = useState<string | null>(null);

  // Quick setup tab
  const [activeSetupTab, setActiveSetupTab] = useState<SetupClientKey>('claude');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') {
        setLocalOriginEndpoint(`${window.location.origin}/mcp`);
      }
    }
  }, []);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.oauth.getConnections();
      setData(res);
      setDefaultWorkspaceId(res.user?.default_workspace_id || res.workspaces?.[0]?.id || '');
      setDefaultProjectId(res.user?.default_project_id || res.projects?.[0]?.id || '');
    } catch (err: any) {
      setError({
        message: err?.message || 'Unable to load MCP connections from backend.',
        requestId: err?.request_id,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const workspaceFilteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    if (!defaultWorkspaceId) return data.projects;
    const matched = data.projects.filter(
      (p) => !p.workspace_id || p.workspace_id === defaultWorkspaceId
    );
    return matched.length > 0 ? matched : data.projects;
  }, [data, defaultWorkspaceId]);

  const handleCopy = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      toast.error('Unable to copy to clipboard');
    }
  };

  const handleWorkspaceSelectChange = (wsId: string) => {
    setDefaultWorkspaceId(wsId);
    if (!data?.projects) return;
    const filtered = data.projects.filter((p) => !p.workspace_id || p.workspace_id === wsId);
    if (filtered.length > 0) {
      const preferred = filtered.find((p) => p.is_default) || filtered[0];
      setDefaultProjectId(preferred.id);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      await api.oauth.updatePreferences({
        default_workspace_id: defaultWorkspaceId || undefined,
        default_project_id: defaultProjectId || undefined,
      });
      toast.success('Default MCP workspace & project preferences saved');
      await loadConnections();
    } catch (err: any) {
      toast.error('Failed to update MCP preferences', {
        description: err?.message || 'Please verify workspace and project access.',
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleClientProjectChange = async (clientId: string, projectId: string) => {
    if (!projectId) return;
    setUpdatingClientProjectId(clientId);
    try {
      await api.oauth.updatePreferences({
        client_id: clientId,
        client_project_id: projectId,
      });
      toast.success('Client active project updated');
      await loadConnections();
    } catch (err: any) {
      toast.error('Failed to update client project', {
        description: err?.message || 'Unable to assign project to this AI client.',
      });
    } finally {
      setUpdatingClientProjectId(null);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!clientToDisconnect) return;
    const target = clientToDisconnect;
    setDisconnectingClientId(target.client_id);
    try {
      const res = await api.oauth.disconnectClient(target.client_id);
      toast.success(`Disconnected ${target.client_name}`, {
        description: `Revoked ${res.revoked_tokens} active OAuth token${res.revoked_tokens === 1 ? '' : 's'}.`,
      });
      setClientToDisconnect(null);
      await loadConnections();
    } catch (err: any) {
      toast.error(`Failed to disconnect ${target.client_name}`, {
        description: err?.message || 'Unable to revoke client tokens.',
      });
    } finally {
      setDisconnectingClientId(null);
    }
  };

  const currentTabSpec = SETUP_TABS.find((t) => t.id === activeSetupTab) || SETUP_TABS[0];

  return (
    <div style={{ maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#EEF2FF',
                border: '1px solid #C7D2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
              }}
            >
              <Plug size={18} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              MCP Connections &amp; OAuth 2.1 Hub
            </h1>
          </div>
          <p style={{ fontSize: '13.5px', color: '#475569', margin: '6px 0 0 0' }}>
            Connect AI assistants with automatic OAuth 2.1 PKCE discovery, manage per-client project scopes, and audit runtime invocations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/protect/mcp"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '38px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <Server size={14} />
            <span>MCP Gateway Runtime</span>
            <ExternalLink size={12} color="#64748B" />
          </Link>

          <button
            type="button"
            onClick={loadConnections}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '38px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B' }}>
                Failed to load MCP Connections
              </div>
              <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '2px' }}>
                {error.message}
              </div>
              {error.requestId && (
                <div style={{ fontSize: '11px', color: '#991B1B', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  Request ID: {error.requestId}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={loadConnections}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ height: '180px', backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px' }} />
            <div style={{ height: '180px', backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px' }} />
          </div>
          <div style={{ height: '220px', backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px' }} />
          <div style={{ height: '240px', backgroundColor: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: '12px' }} />
        </div>
      )}

      {data && (
        <>
          {/* Top Grid: Universal MCP Endpoint + Default Preferences */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {/* Universal MCP Endpoint Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Universal MCP Endpoint
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
                    Single server URL for all OAuth 2.1 compatible AI assistants and IDEs.
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#4F46E5',
                    backgroundColor: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    borderRadius: '9999px',
                    padding: '4px 10px',
                  }}
                >
                  <KeyRound size={12} />
                  OAuth 2.1 PKCE (S256)
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                }}
              >
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: '#0F172A',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {PRODUCTION_MCP_ENDPOINT}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy('prod-endpoint', PRODUCTION_MCP_ENDPOINT, 'MCP endpoint')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  {copiedKey === 'prod-endpoint' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedKey === 'prod-endpoint' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {localOriginEndpoint && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Local Dev Endpoint</div>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: '#0F172A' }}>
                      {localOriginEndpoint}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('local-endpoint', localOriginEndpoint, 'Local MCP endpoint')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 600,
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedKey === 'local-endpoint' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span>{copiedKey === 'local-endpoint' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '6px',
                      padding: '3px 8px',
                    }}
                  >
                    {data.active_clients_count} Active Client{data.active_clients_count === 1 ? '' : 's'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Signed in as <strong style={{ color: '#0F172A' }}>{data.user.email}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Default Workspace & Project Preferences Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Default Workspace &amp; Project Context
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
                  Fallback tenant scope used when an AI client does not specify a project override.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label
                    htmlFor="pref-workspace"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}
                  >
                    Default Workspace
                  </label>
                  <select
                    id="pref-workspace"
                    value={defaultWorkspaceId}
                    onChange={(e) => handleWorkspaceSelectChange(e.target.value)}
                    disabled={data.workspaces.length === 0}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 10px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      color: '#0F172A',
                    }}
                  >
                    {data.workspaces.length === 0 ? (
                      <option value="">No workspaces available</option>
                    ) : (
                      data.workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="pref-project"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}
                  >
                    Default Project
                  </label>
                  <select
                    id="pref-project"
                    value={defaultProjectId}
                    onChange={(e) => setDefaultProjectId(e.target.value)}
                    disabled={workspaceFilteredProjects.length === 0}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 10px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      color: '#0F172A',
                    }}
                  >
                    {workspaceFilteredProjects.length === 0 ? (
                      <option value="">No projects configured</option>
                    ) : (
                      workspaceFilteredProjects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name} {proj.environment ? `(${proj.environment})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: 'auto' }}>
                {data.projects.length === 0 ? (
                  <Link href="/repositories" style={{ fontSize: '12.5px', fontWeight: 600, color: '#4F46E5' }}>
                    Connect a repository to create your first project →
                  </Link>
                ) : (
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {data.projects.length} authorized project{data.projects.length === 1 ? '' : 's'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={savingPreferences || (!defaultWorkspaceId && !defaultProjectId)}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: savingPreferences ? 'not-allowed' : 'pointer',
                    opacity: savingPreferences ? 0.65 : 1,
                  }}
                >
                  {savingPreferences && <Loader2 size={14} className="animate-spin" />}
                  <span>{savingPreferences ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Client Quick Setup Tabs */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EAECF0',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  AI Client Quick Setup
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
                  Zero manual API keys. All clients authenticate via OAuth 2.1 automatic metadata discovery.
                </p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                {currentTabSpec.transport}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid #EAECF0', paddingBottom: '12px' }}>
              {SETUP_TABS.map((tab) => {
                const active = tab.id === activeSetupTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSetupTab(tab.id)}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: active ? 600 : 500,
                      backgroundColor: active ? '#EEF2FF' : '#F8FAFC',
                      color: active ? '#4F46E5' : '#475569',
                      border: `1px solid ${active ? '#C7D2FE' : '#E2E8F0'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: currentTabSpec.snippet ? '1.15fr 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>
              <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                {currentTabSpec.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>

              {currentTabSpec.snippet && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
                      <Terminal size={13} />
                      Configuration Snippet
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`snippet-${currentTabSpec.id}`, currentTabSpec.snippet!, `${currentTabSpec.label} config`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedKey === `snippet-${currentTabSpec.id}` ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      <span>{copiedKey === `snippet-${currentTabSpec.id}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: '#0F172A',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {currentTabSpec.snippet}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Connected AI Clients Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #EAECF0',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Connected AI Clients ({data.connected_clients.length})
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0 0' }}>
                  Switch an active project per client or revoke OAuth 2.1 access tokens independently.
                </p>
              </div>
            </div>

            {data.connected_clients.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <Plug size={28} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                  No AI clients connected yet
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px', margin: '6px auto 16px auto', lineHeight: 1.5 }}>
                  Add <code style={{ fontFamily: 'var(--font-mono)', color: '#0F172A' }}>{PRODUCTION_MCP_ENDPOINT}</code> to Claude, ChatGPT, Cursor, or VS Code to authorize your first client.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy('empty-endpoint', PRODUCTION_MCP_ENDPOINT, 'MCP endpoint')}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={14} />
                  <span>Copy Universal MCP URL</span>
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>AI Client</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Active Project</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Scopes</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Last Used / Connected</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.connected_clients.map((client) => {
                      const isActive = client.status === 'ACTIVE';
                      const isUpdatingProject = updatingClientProjectId === client.client_id;
                      return (
                        <tr key={client.client_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{client.client_name}</span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#475569',
                                  backgroundColor: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                }}
                              >
                                {formatClientType(client.client_type)}
                              </span>
                              {client.is_verified && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#059669',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '4px',
                                    padding: '1px 6px',
                                  }}
                                >
                                  <BadgeCheck size={11} />
                                  Verified
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: '3px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {client.client_id}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2',
                                color: isActive ? '#059669' : '#DC2626',
                                border: `1px solid ${isActive ? '#A7F3D0' : '#FECACA'}`,
                              }}
                            >
                              {client.status}
                            </span>
                            {isActive && (
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                                {client.active_tokens_count} active token{client.active_tokens_count === 1 ? '' : 's'}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            {data.projects.length === 0 ? (
                              <span style={{ fontSize: '12px', color: '#64748B' }}>No project</span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <select
                                  aria-label={`Active project for ${client.client_name}`}
                                  value={client.active_project?.id || ''}
                                  disabled={isUpdatingProject}
                                  onChange={(e) => handleClientProjectChange(client.client_id, e.target.value)}
                                  style={{
                                    height: '34px',
                                    minHeight: '34px',
                                    padding: '0 8px',
                                    fontSize: '12.5px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    color: '#0F172A',
                                    maxWidth: '210px',
                                  }}
                                >
                                  {!client.active_project?.id && <option value="">Select project...</option>}
                                  {data.projects.map((proj) => (
                                    <option key={proj.id} value={proj.id}>
                                      {proj.name}
                                    </option>
                                  ))}
                                </select>
                                {isUpdatingProject && <Loader2 size={14} className="animate-spin" color="#4F46E5" />}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                              {client.scopes.map((sc) => (
                                <span
                                  key={sc}
                                  style={{
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-mono)',
                                    color: '#334155',
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '4px',
                                    padding: '1px 6px',
                                  }}
                                >
                                  {sc}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: '12px', color: '#475569' }}>
                            <div>Last used: {formatDateTime(client.last_used_at)}</div>
                            <div style={{ color: '#64748B', marginTop: '2px' }}>
                              Connected: {formatDateTime(client.connected_at)}
                            </div>
                          </td>

                          <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                            {isActive ? (
                              <button
                                type="button"
                                onClick={() => setClientToDisconnect(client)}
                                disabled={disconnectingClientId === client.client_id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  height: '34px',
                                  padding: '0 12px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #FECACA',
                                  color: '#DC2626',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Disconnect</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#64748B' }}>Revoked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Grid: Security & Policy Controls + Live MCP Audit Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {/* Security & Policy Controls Summary */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="#059669" />
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Security &amp; Policy Controls
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    title: 'OAuth Authentication',
                    enabled: data.security_controls.oauth_authentication.enabled,
                    detail: data.security_controls.oauth_authentication.standard,
                  },
                  {
                    title: 'Project Isolation',
                    enabled: data.security_controls.project_isolation.enabled,
                    detail: data.security_controls.project_isolation.mode,
                  },
                  {
                    title: 'OPA Policy Enforcement',
                    enabled: data.security_controls.opa_policy_enforcement.enabled,
                    detail: data.security_controls.opa_policy_enforcement.engine,
                  },
                  {
                    title: 'Immutable Audit Logging',
                    enabled: data.security_controls.audit_logging.enabled,
                    detail: data.security_controls.audit_logging.backend,
                  },
                ].map((ctrl) => (
                  <div
                    key={ctrl.title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{ctrl.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{ctrl.detail}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        backgroundColor: ctrl.enabled ? '#ECFDF5' : '#FEF2F2',
                        color: ctrl.enabled ? '#059669' : '#DC2626',
                        border: `1px solid ${ctrl.enabled ? '#A7F3D0' : '#FECACA'}`,
                        flexShrink: 0,
                      }}
                    >
                      {ctrl.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live MCP Audit Activity */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="#4F46E5" />
                  <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Live MCP &amp; OAuth Audit Activity
                  </h2>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  {data.recent_activity.length} events
                </span>
              </div>

              {data.recent_activity.length === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    border: '1px dashed #E2E8F0',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                    No MCP or OAuth audit events recorded yet
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                    Authorization grants, disconnections, and MCP tool executions appear here in real time.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                  {data.recent_activity.map((ev) => {
                    const isSuccess = ev.status === 'SUCCESS' || ev.status === 'ALLOW';
                    return (
                      <div
                        key={ev.id}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                              {ev.action}
                            </code>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: isSuccess ? '#ECFDF5' : '#FEF2F2',
                                color: isSuccess ? '#059669' : '#DC2626',
                              }}
                            >
                              {ev.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', wordBreak: 'break-word' }}>
                            {ev.metadata?.client_id ? `Client: ${ev.metadata.client_id}` : ev.resource_type || 'Audit event'}
                            {ev.metadata?.tool_name ? ` • Tool: ${ev.metadata.tool_name}` : ''}
                            {ev.metadata?.scope ? ` • Scope: ${ev.metadata.scope}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#64748B', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {formatDateTime(ev.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Explicit Disconnect Confirmation Modal */}
      {clientToDisconnect && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="disconnect-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #EAECF0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={16} />
              </div>
              <div>
                <h3 id="disconnect-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Disconnect {clientToDisconnect.client_name}?
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                  This immediately revokes all active OAuth 2.1 access and refresh tokens for{' '}
                  <strong style={{ color: '#0F172A' }}>{clientToDisconnect.client_name}</strong>. Other connected AI clients will remain unaffected.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setClientToDisconnect(null)}
                disabled={disconnectingClientId !== null}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnectingClientId !== null}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: disconnectingClientId ? 'not-allowed' : 'pointer',
                }}
              >
                {disconnectingClientId && <Loader2 size={14} className="animate-spin" />}
                <span>{disconnectingClientId ? 'Revoking...' : 'Disconnect Client'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
