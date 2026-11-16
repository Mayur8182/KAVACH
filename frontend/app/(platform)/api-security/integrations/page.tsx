'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Link2, Search, CheckCircle2, AlertCircle, RefreshCw, Plus, Shield,
  Layers, Activity, Filter, Check, Globe, SlidersHorizontal, ArrowRight,
  ExternalLink, Download, Key, Send, Trash2, X, Lock, Eye, EyeOff,
  Sparkles, CheckSquare, ShieldCheck, Terminal, Copy, ArrowUpRight,
  Zap, Clock, Radio, Info, ChevronRight
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

/* ─── Typography & Theme Tokens (API Security Standard) ─── */
const serif = "'Newsreader', 'Instrument Serif', Georgia, serif";
const sans = "var(--font-sans, 'Plus Jakarta Sans', Inter, -apple-system, sans-serif)";

const T = {
  pageBg: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceHover: '#FAFAF9',
  border: '#E8E6E1',
  borderLight: '#F3F4F6',
  borderInput: '#E5E7EB',
  text: '#0F172A',
  textSub: '#4B5563',
  textMuted: '#9CA3AF',
  green: '#16A34A',
  greenBg: '#DCFCE7',
  greenTxt: '#15803D',
  yellowBg: '#FEF3C7',
  yellowTxt: '#B45309',
  orangeBg: '#FFEDD5',
  orangeTxt: '#C2410C',
  redBg: '#FEE2E2',
  redTxt: '#B91C1C',
  btnDark: '#0B0F17',
};

type CategoryFilter = 'all' | 'aspm' | 'siem' | 'ticketing' | 'alerts' | 'standards';

interface IntegrationItem {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  capabilities: string[];
  docs_url?: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED';
  account_name?: string | null;
  connected_at?: string | null;
  last_synced_at?: string | null;
  instance_url?: string | null;
}

/* ─── High-Fidelity Brand Icons ─── */
function BrandIcon({ provider, size = 26 }: { provider: string; size?: number }) {
  const p = (provider || '').toLowerCase();

  if (p === 'aikido') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#18181B" />
        <path d="M16 6L24.66 11V21L16 26L7.34 21V11L16 6Z" stroke="#38BDF8" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 11L20.33 13.5V18.5L16 21L11.67 18.5V13.5L16 11Z" fill="#38BDF8" />
      </svg>
    );
  }
  if (p === 'snyk') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#4C1D95" />
        <path d="M16 7L24 11.5V18.5C24 22.5 19.5 25 16 26C12.5 25 8 22.5 8 18.5V11.5L16 7Z" fill="#A855F7" />
        <path d="M14 14C14 12.8954 14.8954 12 16 12C17.1046 12 18 12.8954 18 14V17C18 18.1046 17.1046 19 16 19C14.8954 19 14 18.1046 14 17V14Z" stroke="#FFFFFF" strokeWidth="2" />
      </svg>
    );
  }
  if (p === 'wiz') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#0A0E1A" />
        <circle cx="16" cy="16" r="8" stroke="#3B82F6" strokeWidth="2.5" />
        <path d="M10 16L14 20L22 12" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (p === 'datadog') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#632CA6" />
        <path d="M10 20C10 15 13 11 18 11C20.5 11 22 12.5 22 14.5C22 17 19.5 18 16 18C13 18 11.5 20.5 11.5 22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="21" r="1.5" fill="#FFFFFF" />
      </svg>
    );
  }
  if (p === 'splunk') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#000000" />
        <path d="M9 19L14 11H17L12 19H9ZM15 19L20 11H23L18 19H15Z" fill="#F43F5E" />
      </svg>
    );
  }
  if (p === 'jira') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#0052CC" />
        <path d="M16 7L10 13H16V19L22 13H16V7Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M16 13L10 19H16V25L22 19H16V13Z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (p === 'slack') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
        <path d="M10 15.5C9.17 15.5 8.5 16.17 8.5 17C8.5 17.83 9.17 18.5 10 18.5H12V16.5C12 15.95 11.45 15.5 10 15.5Z" fill="#E01E5A" />
        <path d="M13 18.5C13.83 18.5 14.5 17.83 14.5 17V10H12.5C11.67 10 11 10.67 11 11.5C11 12.33 11.67 13 12.5 13H13V18.5Z" fill="#36C5F0" />
        <path d="M22 16.5C22 15.67 21.33 15 20.5 15H18.5V17C18.5 17.83 19.17 18.5 20 18.5C20.83 18.5 21.5 17.83 22 17V16.5Z" fill="#2EB67D" />
        <path d="M19 13.5C18.17 13.5 17.5 14.17 17.5 15V22H19.5C20.33 22 21 21.33 21 20.5C21 19.67 20.33 19 19.5 19H19V13.5Z" fill="#ECB22E" />
      </svg>
    );
  }
  if (p === 'pagerduty') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#06AC38" />
        <path d="M11 8H18C20.5 8 22 9.5 22 12C22 14.5 20.5 16 18 16H14V24H11V8ZM14 13.5H17.5C18.5 13.5 19 13 19 12C19 11 18.5 10.5 17.5 10.5H14V13.5Z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (p === 'defectdojo') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#DC2626" />
        <path d="M16 6L25 11V18C25 23 21 26 16 27C11 26 7 23 7 18V11L16 6Z" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16.5" r="4" fill="#FFFFFF" />
      </svg>
    );
  }
  if (p === 'github') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#0F172A" />
        <path fillRule="evenodd" clipRule="evenodd" d="M16 8C11.58 8 8 11.58 8 16C8 19.54 10.29 22.54 13.47 23.6C13.87 23.67 14.02 23.43 14.02 23.22C14.02 23.03 14.01 22.39 14.01 21.72C11.78 22.2 11.31 20.64 11.31 20.64C10.95 19.72 10.42 19.47 10.42 19.47C9.69 18.98 10.48 18.99 10.48 18.99C11.29 19.05 11.71 19.82 11.71 19.82C12.43 21.05 13.59 20.7 14.05 20.49C14.12 19.97 14.33 19.62 14.56 19.42C12.78 19.22 10.91 18.53 10.91 15.46C10.91 14.59 11.22 13.88 11.73 13.32C11.65 13.12 11.38 12.31 11.81 11.21C11.81 11.21 12.48 10.99 14.01 12.03C14.65 11.85 15.33 11.76 16 11.76C16.67 11.76 17.35 11.85 17.99 12.03C19.52 10.99 20.19 11.21 20.19 11.21C20.62 12.31 20.35 13.12 20.27 13.32C20.78 13.88 21.09 14.59 21.09 15.46C21.09 18.54 19.22 19.22 17.43 19.42C17.72 19.67 17.98 20.16 17.98 20.91C17.98 21.98 17.97 22.84 17.97 23.22C17.97 23.43 18.12 23.68 18.53 23.6C21.71 22.53 24 19.53 24 16C24 11.58 20.42 8 16 8Z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (p === 'gitlab') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#FC6D26" />
        <path d="M23.1 18.8L21.3 13.2L19.4 18.8H12.6L10.7 13.2L8.9 18.8C8.7 19.4 9 20 9.5 20.4L16 25L22.5 20.4C23 20 23.3 19.4 23.1 18.8Z" fill="#E24329" />
        <path d="M16 25L12.6 18.8H19.4L16 25Z" fill="#FCA326" />
      </svg>
    );
  }
  if (p === 'sarif') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#0284C7" />
        <path d="M10 9H22M10 16H22M10 23H17" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="21" cy="22" r="2.5" fill="#38BDF8" />
      </svg>
    );
  }
  if (p === 'sonarqube') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#4B9FD5" />
        <path d="M9 16C9 12.13 12.13 9 16 9C19.87 9 23 12.13 23 16" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12 16C12 13.79 13.79 12 16 12C18.21 12 20 13.79 20 16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="18" r="2.5" fill="#FFFFFF" />
      </svg>
    );
  }
  if (p === 'aws_security_hub') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#1E293B" />
        <path d="M16 6L24 10.5V17C24 21.5 20.5 24.5 16 26C11.5 24.5 8 21.5 8 17V10.5L16 6Z" stroke="#FF9900" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="3" fill="#FF9900" />
      </svg>
    );
  }
  if (p === 'azure_sentinel') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#0078D4" />
        <path d="M16 7L24 11V18C24 22 20 25 16 26C12 25 8 22 8 18V11L16 7Z" fill="#FFFFFF" opacity="0.2" />
        <path d="M16 7L24 11V18C24 22 20 25 16 26C12 25 8 22 8 18V11L16 7Z" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 12L20 16L16 20L12 16L16 12Z" fill="#50E6FF" />
      </svg>
    );
  }
  if (p === 'servicenow') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#293E40" />
        <circle cx="16" cy="12" r="4.5" stroke="#81B5A1" strokeWidth="2.5" />
        <path d="M10 23C10 19.68 12.68 17 16 17C19.32 17 22 19.68 22 23" stroke="#81B5A1" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (p === 'webhook') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#0D9488" />
        <path d="M12 16C12 13.79 13.79 12 16 12C18.21 12 20 13.79 20 16C20 18.21 18.21 20 16 20" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="9" cy="16" r="2" fill="#5EEAD4" />
        <circle cx="23" cy="16" r="2" fill="#5EEAD4" />
      </svg>
    );
  }
  // Fallback / Partner API
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <path d="M10 16H22M16 10V22" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function UniversalIntegrationsPage() {
  const { apis, selectedApi } = useApiSecurity();

  // State
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Modals
  const [connectModalItem, setConnectModalItem] = useState<IntegrationItem | null>(null);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isSubmittingConnect, setIsSubmittingConnect] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>('');
  const [accountInput, setAccountInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>('');
  const [workspaceInput, setWorkspaceInput] = useState<string>('');
  const [autoSyncToggle, setAutoSyncToggle] = useState<boolean>(true);

  // Partner API Modal
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState<boolean>(false);
  const [hasCopiedCurl, setHasCopiedCurl] = useState<boolean>(false);

  // Fetch Integrations Catalog
  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.apiSecurity.listIntegrations();
      if (res?.items) {
        setIntegrations(res.items);
      }
    } catch (err) {
      console.error('Failed to load integrations catalog:', err);
      toast.error('Failed to query integration catalog from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Connect Handler
  const handleOpenConnectModal = (item: IntegrationItem) => {
    setConnectModalItem(item);
    setTokenInput('');
    setAccountInput(item.account_name || '');
    setUrlInput(item.instance_url || '');
    setWebhookUrlInput('');
    setWorkspaceInput('');
    setAutoSyncToggle(true);
    setShowToken(false);
  };

  const handleSaveConnection = async () => {
    if (!connectModalItem) return;
    setIsSubmittingConnect(true);

    try {
      await api.apiSecurity.connectIntegration({
        provider: connectModalItem.id,
        token: tokenInput || undefined,
        api_token: tokenInput || undefined,
        account_name: accountInput || undefined,
        instance_url: urlInput || undefined,
        webhook_url: webhookUrlInput || undefined,
        workspace_id: workspaceInput || undefined,
        auto_sync: autoSyncToggle,
      });

      toast.success('Integration Connected', {
        description: `Successfully linked ${connectModalItem.name} with Kavach API Security.`,
      });
      setConnectModalItem(null);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error('Connection Failed', {
        description: err?.message || 'Invalid credentials or endpoint unreachable.',
      });
    } finally {
      setIsSubmittingConnect(false);
    }
  };

  // Disconnect Handler
  const handleDisconnect = async (item: IntegrationItem) => {
    if (!window.confirm(`Disconnect ${item.name}? Automated findings sync will be halted.`)) {
      return;
    }
    try {
      await api.apiSecurity.disconnectIntegration(item.id);
      toast.info(`${item.name} Disconnected`);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(`Failed to disconnect: ${err?.message}`);
    }
  };

  // Test Health Action
  const handleTestConnection = async (item: IntegrationItem) => {
    setTestingId(item.id);
    try {
      const res = await api.apiSecurity.testIntegration(item.id);
      if (res?.healthy) {
        toast.success(`Handshake Verified`, {
          description: `${item.name} is online and operational (${res.latency_ms}ms latency).`,
        });
      } else {
        toast.error(`Health Check Alert`, {
          description: res?.message || 'Endpoint reported an error.',
        });
      }
    } catch (err: any) {
      toast.error(`Connection check failed: ${err?.message}`);
    } finally {
      setTestingId(null);
    }
  };

  // Sync Action
  const handleSyncFindings = async (item: IntegrationItem) => {
    setSyncingId(item.id);
    try {
      const res = await api.apiSecurity.syncIntegration(item.id, selectedApi?.id);
      toast.success(`Vulnerabilities Synchronized`, {
        description: `Dispatched ${res.total_findings_synced} findings to ${item.name} (Job: ${res.sync_job_id}).`,
      });
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(`Sync Failed`, {
        description: err?.message || 'Could not push findings.',
      });
    } finally {
      setSyncingId(null);
    }
  };

  // Export SARIF Download
  const handleDownloadSarif = async () => {
    try {
      const sarifData = await api.apiSecurity.exportSarif(selectedApi?.id);
      const blob = new Blob([JSON.stringify(sarifData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kavach-api-security-findings-${selectedApi?.name ? selectedApi.name.toLowerCase().replace(/\s+/g, '-') : 'all'}.sarif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('SARIF 2.1.0 Export Ready', {
        description: 'File downloaded. Ready for import into Aikido, GitHub, Snyk, or DefectDojo.',
      });
    } catch (err: any) {
      toast.error('Export Failed', { description: err?.message });
    }
  };

  // Copy Curl Helper
  const handleCopyPartnerCurl = () => {
    const curlCode = `curl -X GET "http://localhost:8000/api/v1/api-security/findings?severity=CRITICAL" \\
  -H "Authorization: Bearer kv_live_partner_key" \\
  -H "Accept: application/json"`;
    navigator.clipboard.writeText(curlCode);
    setHasCopiedCurl(true);
    setTimeout(() => setHasCopiedCurl(false), 3000);
    toast.success('cURL Command Copied to Clipboard');
  };

  // Filtering
  const filtered = useMemo(() => {
    return integrations.filter((item) => {
      const matchCat = category === 'all' || item.category === category;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.capabilities.some((c) => c.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [integrations, category, search]);

  // Statistics
  const connectedCount = integrations.filter((i) => i.status === 'CONNECTED').length;

  return (
    <KavachApiLayout>
      <div style={{ padding: '32px 40px', maxWidth: '1440px', margin: '0 auto', fontFamily: sans }}>
        
        {/* ── Top Breadcrumb & Header ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.textMuted, marginBottom: '8px' }}>
            <Link href="/api-security/inventory" style={{ color: T.textSub, textDecoration: 'none' }}>
              API Security
            </Link>
            <ChevronRight size={14} />
            <span style={{ color: T.text, fontWeight: 500 }}>Universal Integration & Partner Hub</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'between', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '320px' }}>
              <h1 style={{ fontFamily: serif, fontSize: '32px', fontWeight: 600, color: T.text, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Universal Integration & Partner Hub
              </h1>
              <p style={{ margin: 0, fontSize: '14px', color: T.textSub, lineHeight: 1.5, maxWidth: '800px' }}>
                Connect Kavach API Security with any company’s platform (Aikido, Snyk, Wiz, Datadog, Jira, Slack, PagerDuty) or export findings as universal SARIF 2.1.0 and live webhooks.
              </p>
            </div>

            {/* Header Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDownloadSarif}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: T.surface,
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <Download size={15} style={{ color: '#2563EB' }} />
                <span>Download SARIF 2.1.0</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: T.btnDark,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <Key size={15} style={{ color: '#FCD34D' }} />
                <span>Partner Ingestion API</span>
              </button>

              <button
                type="button"
                onClick={fetchIntegrations}
                disabled={loading}
                title="Refresh Status"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  backgroundColor: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: T.textSub,
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Metric Summary Strip ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          <div style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '18px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Connected Platforms
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 600, color: T.text }}>{connectedCount}</span>
              <span style={{ fontSize: '13px', color: T.greenTxt, fontWeight: 500 }}>of {integrations.length} Active</span>
            </div>
          </div>

          <div style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '18px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Universal Finding Stream
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 600, color: T.text }}>Active</span>
              <span style={{ fontSize: '13px', color: T.textSub }}>BOLA · AuthZ · Shadow APIs</span>
            </div>
          </div>

          <div style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '18px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Interoperability Standards
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 600, color: T.text }}>SARIF + REST</span>
              <span style={{ fontSize: '13px', color: T.textMuted }}>OASIS 2.1.0</span>
            </div>
          </div>

          <div style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '18px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Real-Time Push Handshake
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 600, color: '#16A34A' }}>Verified</span>
              <span style={{ fontSize: '13px', color: T.textSub }}>Deterministic Evidence</span>
            </div>
          </div>
        </div>

        {/* ── Search Bar & Category Filters ── */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '24px',
          backgroundColor: T.surface,
          padding: '12px 16px',
          borderRadius: '10px',
          border: `1px solid ${T.border}`,
        }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              { id: 'all', label: 'All Platforms' },
              { id: 'aspm', label: 'ASPM & Security' },
              { id: 'siem', label: 'SIEM & SOC' },
              { id: 'ticketing', label: 'Issue Tracking' },
              { id: 'alerts', label: 'Alerts & Paging' },
              { id: 'standards', label: 'Universal Standards' },
            ].map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as CategoryFilter)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 400,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: active ? T.btnDark : 'transparent',
                    color: active ? '#FFFFFF' : T.textSub,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: T.textMuted }} />
            <input
              type="text"
              placeholder="Search partner, protocol, or standard..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                fontSize: '13px',
                border: `1px solid ${T.borderInput}`,
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: '#FAF9F6',
                color: T.text,
              }}
            />
          </div>
        </div>

        {/* ── Integrations Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px',
        }}>
          {filtered.map((item) => {
            const isConnected = item.status === 'CONNECTED';
            const isSyncing = syncingId === item.id;
            const isTesting = testingId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: T.surface,
                  border: `1px solid ${isConnected ? '#CBD5E1' : T.border}`,
                  borderRadius: '12px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Card Header: Brand Icon + Title + Status Pill */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <BrandIcon provider={item.id} size={32} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: T.text }}>{item.name}</span>
                          {item.docs_url && (
                            <a
                              href={item.docs_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Official Documentation"
                              style={{ color: T.textMuted }}
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {item.type}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 9px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isConnected ? T.greenBg : '#F1F5F9',
                        color: isConnected ? T.greenTxt : '#64748B',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: isConnected ? T.green : '#94A3B8',
                        }}
                      />
                      <span>{isConnected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '13px', color: T.textSub, lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    {item.description}
                  </p>

                  {/* Account Name if connected */}
                  {isConnected && item.account_name && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: T.textSub,
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 500, color: T.text }}>{item.account_name}</span>
                      <span style={{ fontSize: '11px', color: T.textMuted }}>Auto-sync Active</span>
                    </div>
                  )}

                  {/* Capabilities Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {item.capabilities.map((cap, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  {isConnected ? (
                    <>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleSyncFindings(item)}
                          disabled={isSyncing}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: T.btnDark,
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Send size={12} className={isSyncing ? 'animate-spin' : ''} />
                          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTestConnection(item)}
                          disabled={isTesting}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: T.surface,
                            color: T.textSub,
                            border: `1px solid ${T.border}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Activity size={12} className={isTesting ? 'animate-pulse text-blue-500' : ''} />
                          <span>{isTesting ? 'Testing...' : 'Test Health'}</span>
                        </button>
                      </div>

                      {item.id !== 'sarif' && (
                        <button
                          type="button"
                          onClick={() => handleDisconnect(item)}
                          title="Disconnect Integration"
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            borderRadius: '6px',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenConnectModal(item)}
                      style={{
                        width: '100%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: '#F8FAFC',
                        color: T.text,
                        border: `1px solid ${T.border}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span>Connect Platform</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Connect Provider Modal ── */}
        {connectModalItem && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: `1px solid ${T.border}`,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                width: '100%',
                maxWidth: '520px',
                padding: '28px',
                maxHeight: '90vh',
                overflowY: 'auto',
                fontFamily: sans,
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BrandIcon provider={connectModalItem.id} size={30} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: T.text, fontFamily: serif }}>
                      Connect {connectModalItem.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: T.textMuted }}>{connectModalItem.type}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConnectModalItem(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Account / Workspace Label */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: T.textSub, marginBottom: '6px' }}>
                    Connection Display Name
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${connectModalItem.name} Production`}
                    value={accountInput}
                    onChange={(e) => setAccountInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '13px',
                      border: `1px solid ${T.borderInput}`,
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Instance URL if applicable */}
                {['jira', 'splunk', 'defectdojo', 'jenkins', 'webhook', 'servicenow', 'sonarqube'].includes(connectModalItem.id) && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: T.textSub, marginBottom: '6px' }}>
                      {connectModalItem.id === 'webhook' ? 'Webhook Endpoint URL *' : 'Instance / Server URL *'}
                    </label>
                    <input
                      type="url"
                      placeholder={
                        connectModalItem.id === 'jira'
                          ? 'https://your-domain.atlassian.net'
                          : connectModalItem.id === 'splunk'
                          ? 'https://splunk.corp.local:8088/services/collector'
                          : connectModalItem.id === 'servicenow'
                          ? 'https://instance.service-now.com'
                          : connectModalItem.id === 'sonarqube'
                          ? 'https://sonarqube.corp.local:9000'
                          : 'https://endpoint.company.com/webhook'
                      }
                      value={connectModalItem.id === 'webhook' ? webhookUrlInput : urlInput}
                      onChange={(e) =>
                        connectModalItem.id === 'webhook'
                          ? setWebhookUrlInput(e.target.value)
                          : setUrlInput(e.target.value)
                      }
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {/* API Token / Key */}
                {connectModalItem.id !== 'webhook' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: T.textSub }}>
                        {connectModalItem.id === 'aikido'
                          ? 'Aikido API Key *'
                          : connectModalItem.id === 'datadog'
                          ? 'Datadog API Key *'
                          : connectModalItem.id === 'pagerduty'
                          ? 'Integration Routing Key *'
                          : connectModalItem.id === 'aws_security_hub'
                          ? 'AWS Access Key or IAM Role ARN *'
                          : connectModalItem.id === 'azure_sentinel'
                          ? 'Azure Workspace Primary Key *'
                          : 'API Token / Key *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        style={{ background: 'none', border: 'none', fontSize: '11px', color: '#2563EB', cursor: 'pointer' }}
                      >
                        {showToken ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <input
                      type={showToken ? 'text' : 'password'}
                      placeholder={
                        connectModalItem.id === 'aikido'
                          ? 'ak_live_...'
                          : connectModalItem.id === 'snyk'
                          ? 'snyk_api_token_...'
                          : connectModalItem.id === 'aws_security_hub'
                          ? 'arn:aws:iam::123456789012:role/KavachSecurityHubRole'
                          : 'Enter private API token'
                      }
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '6px',
                        outline: 'none',
                        fontFamily: showToken ? sans : 'monospace',
                      }}
                    />
                  </div>
                )}

                {/* Workspace ID if applicable */}
                {['aikido', 'snyk', 'azure_sentinel'].includes(connectModalItem.id) && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: T.textSub, marginBottom: '6px' }}>
                      {connectModalItem.id === 'azure_sentinel' ? 'Log Analytics Workspace ID *' : 'Workspace / Organization ID (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={connectModalItem.id === 'azure_sentinel' ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'e.g. ws_prod_aikido_928'}
                      value={workspaceInput}
                      onChange={(e) => setWorkspaceInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {/* Auto-Sync Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>Auto-Sync on Scan Completion</div>
                    <div style={{ fontSize: '11px', color: T.textMuted }}>Automatically dispatch Critical & High findings</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSyncToggle}
                    onChange={(e) => setAutoSyncToggle(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setConnectModalItem(null)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    color: T.textSub,
                    backgroundColor: 'transparent',
                    border: `1px solid ${T.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConnection}
                  disabled={isSubmittingConnect}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: T.btnDark,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingConnect ? 'Validating & Linking...' : 'Connect & Authorize'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Partner Ingestion API Modal ── */}
        {isPartnerModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: `1px solid ${T.border}`,
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '640px',
                padding: '28px',
                fontFamily: sans,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={18} style={{ color: '#4F46E5' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: T.text, fontFamily: serif }}>
                      Kavach Partner Ingestion API
                    </h3>
                    <span style={{ fontSize: '12px', color: T.textMuted }}>Allow third-party security platforms to query Kavach findings</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '13px', color: T.textSub, lineHeight: 1.5, marginBottom: '18px' }}>
                Other platforms can query Kavach API Security findings (including BOLA, IDOR, GraphQL vulnerabilities, and remediation diffs) directly over HTTPS using Bearer token authentication.
              </p>

              {/* cURL Snippet */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <pre
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    margin: 0,
                  }}
                >
{`curl -X GET "http://localhost:8000/api/v1/api-security/findings?severity=CRITICAL" \\
  -H "Authorization: Bearer kv_live_partner_89f02a83" \\
  -H "Accept: application/json"`}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyPartnerCurl}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {hasCopiedCurl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{hasCopiedCurl ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>

              {/* API Capabilities list */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: T.text, marginBottom: '6px' }}>
                  Supported Partner Endpoints
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: T.textSub, lineHeight: 1.6 }}>
                  <li><code>GET /api/v1/api-security/findings</code> — Filter by severity, protocol (REST/GraphQL/gRPC), and status</li>
                  <li><code>GET /api/v1/api-security/integrations/export/sarif</code> — Ingest full SARIF 2.1.0 document</li>
                  <li><code>POST /api/v1/api-security/scans</code> — Programmatically trigger on-demand test runs</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: T.btnDark,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </KavachApiLayout>
  );
}
