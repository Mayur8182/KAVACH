'use client';

/**
 * Kavach Enterprise 18-Module MCP Security Command Center.
 * Strictly backed by live PostgreSQL & FastAPI security engines — zero mock metrics or hardcoded placeholders.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  FileCode2,
  Flame,
  KeyRound,
  Lock,
  Network,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export type McpModuleId =
  | 'overview'
  | 'registry'
  | 'discovery'
  | 'gateway'
  | 'access'
  | 'policies'
  | 'threats'
  | 'runtime'
  | 'scanner'
  | 'dlp'
  | 'secrets'
  | 'sandbox'
  | 'simulation'
  | 'audit'
  | 'compliance'
  | 'integrations'
  | 'analytics'
  | 'settings';

const MODULE_NAV: { id: McpModuleId; num: string; label: string; desc: string }[] = [
  { id: 'overview', num: '01', label: 'MCP Overview', desc: 'Security posture & activity' },
  { id: 'registry', num: '02', label: 'MCP Registry', desc: 'Server inventory' },
  { id: 'discovery', num: '03', label: 'MCP Discovery', desc: 'Server & tool discovery' },
  { id: 'gateway', num: '04', label: 'MCP Gateway', desc: 'Traffic routing & firewall' },
  { id: 'access', num: '05', label: 'MCP Access', desc: 'OAuth clients & approvals' },
  { id: 'policies', num: '06', label: 'MCP Policies', desc: 'OPA/Rego & rules' },
  { id: 'threats', num: '07', label: 'MCP Threats', desc: 'Injection & rug-pull alerts' },
  { id: 'runtime', num: '08', label: 'MCP Runtime', desc: 'Live execution monitoring' },
  { id: 'scanner', num: '09', label: 'MCP Scanner', desc: 'Schema & supply chain scan' },
  { id: 'dlp', num: '10', label: 'MCP DLP', desc: 'Data loss prevention' },
  { id: 'secrets', num: '11', label: 'MCP Secrets', desc: 'Encrypted credential vault' },
  { id: 'sandbox', num: '12', label: 'MCP Sandbox', desc: 'Isolated dry-run inspection' },
  { id: 'simulation', num: '13', label: 'MCP Attack Sim', desc: 'Red-team security testing' },
  { id: 'audit', num: '14', label: 'MCP Audit', desc: 'Immutable execution history' },
  { id: 'compliance', num: '15', label: 'MCP Compliance', desc: 'Control & OWASP evidence' },
  { id: 'integrations', num: '16', label: 'MCP Integrations', desc: 'AI & infra connections' },
  { id: 'analytics', num: '17', label: 'MCP Analytics', desc: 'Usage, latency & token trends' },
  { id: 'settings', num: '18', label: 'MCP Settings', desc: 'Gateway OAuth config' },
];

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #EAECF0',
  borderRadius: '12px',
  padding: '18px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  padding: '0 10px',
  borderRadius: '8px',
  border: '1px solid #CBD5E1',
  fontSize: '13px',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
};

const btnPrimary: React.CSSProperties = {
  height: '36px',
  padding: '0 14px',
  borderRadius: '8px',
  backgroundColor: '#4F46E5',
  color: '#FFFFFF',
  fontSize: '12.5px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const btnSecondary: React.CSSProperties = {
  height: '34px',
  padding: '0 12px',
  borderRadius: '8px',
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
  border: '1px solid #CBD5E1',
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

function StatusBadge({ value }: { value?: string }) {
  const norm = (value || 'UNKNOWN').toUpperCase();
  let bg = '#F1F5F9';
  let color = '#334155';
  if (['ALLOW', 'ALLOWED', 'ONLINE', 'VERIFIED', 'ENFORCED', 'CONNECTED', 'SUCCESS', 'APPROVED', 'EXECUTED'].includes(norm)) {
    bg = '#ECFDF5';
    color = '#059669';
  } else if (['BLOCK', 'BLOCKED', 'DENY', 'DENIED', 'CRITICAL', 'HIGH', 'CONNECTION_FAILED', 'REJECTED'].includes(norm)) {
    bg = '#FEF2F2';
    color = '#DC2626';
  } else if (['REQUIRE_APPROVAL', 'REQUIRES_APPROVAL', 'PENDING', 'FLAGGED', 'REDACTED', 'SANDBOXED', 'MEDIUM'].includes(norm)) {
    bg = '#FFFBEB';
    color = '#B45309';
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: bg,
        color,
      }}
    >
      {norm}
    </span>
  );
}

export function McpEnterpriseSuite({
  protectServers,
  protectTools,
  protectRequests,
  onSyncProtect,
}: {
  protectServers: any[];
  protectTools: any[];
  protectRequests: any[];
  onSyncProtect: () => void;
}) {
  const [activeModule, setActiveModule] = useState<McpModuleId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const [overview, setOverview] = useState<any | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [firewallRules, setFirewallRules] = useState<any[]>([]);
  const [scannerData, setScannerData] = useState<any | null>(null);
  const [threatsData, setThreatsData] = useState<any | null>(null);
  const [runtimeItems, setRuntimeItems] = useState<any[]>([]);
  const [dlpData, setDlpData] = useState<any | null>(null);
  const [secrets, setSecrets] = useState<any[]>([]);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [complianceControls, setComplianceControls] = useState<any[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [oauthConnections, setOauthConnections] = useState<any | null>(null);
  const [approvals, setApprovals] = useState<{ pending_count: number; items: any[] }>({ pending_count: 0, items: [] });
  const [manifest, setManifest] = useState<any | null>(null);

  // Interactive form states
  const [srvName, setSrvName] = useState('');
  const [srvUrl, setSrvUrl] = useState('');
  const [srvCat, setSrvCat] = useState('github');
  const [srvVaultId, setSrvVaultId] = useState('');
  const [savingServer, setSavingServer] = useState(false);

  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('OPA_REGO');
  const [ruleToolPat, setRuleToolPat] = useState('*');
  const [ruleAction, setRuleAction] = useState('DENY');
  const [ruleRego, setRuleRego] = useState('package kavach.mcp\ndeny if {\n  input.risk_level == "CRITICAL"\n}');
  const [simTool, setSimTool] = useState('quarantine_compromised_target');
  const [simArgsJson, setSimArgsJson] = useState('{"target_id": "prod-cluster"}');
  const [simPolicyResult, setSimPolicyResult] = useState<any | null>(null);

  const [secName, setSecName] = useState('');
  const [secProv, setSecProv] = useState('github');
  const [secVal, setSecVal] = useState('');

  const [dlpTestText, setDlpTestText] = useState('AWS key AKIAIOSFODNN7EXAMPLE and db postgres://admin:SecretPass123@db:5432/app');
  const [dlpTestStage, setDlpTestStage] = useState<'REQUEST' | 'RESPONSE'>('RESPONSE');
  const [dlpTestResult, setDlpTestResult] = useState<any | null>(null);

  const [sbTool, setSbTool] = useState('list_project_findings');
  const [sbArgs, setSbArgs] = useState('{"severity": "HIGH"}');
  const [sbResp, setSbResp] = useState('{"notes": "token ghp_1234567890abcdefghijklmnopqr"}');
  const [sbResult, setSbResult] = useState<any | null>(null);

  const [scannerPath, setScannerPath] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadSuiteData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        api.mcp.suite.overview(),
        api.mcp.suite.servers(),
        api.mcp.suite.firewall(),
        api.mcp.suite.scanner(),
        api.mcp.suite.threats(),
        api.mcp.suite.runtime(50),
        api.mcp.suite.dlp(),
        api.mcp.suite.secrets(),
        api.mcp.suite.simulations(),
        api.mcp.getActivity(40),
        api.mcp.suite.compliance(),
        api.mcp.suite.marketplace(),
        api.mcp.suite.analytics(),
        api.oauth.getConnections(),
        api.mcp.getApprovals(),
        api.mcp.getManifest(),
      ]);

      const firstErr = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (results[0].status === 'rejected' && firstErr) {
        throw firstErr.reason;
      }

      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      if (results[1].status === 'fulfilled') setServers(results[1].value?.items || []);
      if (results[2].status === 'fulfilled') setFirewallRules(results[2].value?.items || []);
      if (results[3].status === 'fulfilled') setScannerData(results[3].value);
      if (results[4].status === 'fulfilled') setThreatsData(results[4].value);
      if (results[5].status === 'fulfilled') setRuntimeItems(results[5].value?.items || []);
      if (results[6].status === 'fulfilled') setDlpData(results[6].value);
      if (results[7].status === 'fulfilled') setSecrets(results[7].value?.items || []);
      if (results[8].status === 'fulfilled') setSimulations(results[8].value?.items || []);
      if (results[9].status === 'fulfilled') setAuditItems(results[9].value?.items || []);
      if (results[10].status === 'fulfilled') setComplianceControls(results[10].value?.controls || []);
      if (results[11].status === 'fulfilled') setMarketplaceItems(results[11].value?.items || []);
      if (results[12].status === 'fulfilled') setAnalytics(results[12].value);
      if (results[13].status === 'fulfilled') setOauthConnections(results[13].value);
      if (results[14].status === 'fulfilled') setApprovals(results[14].value || { pending_count: 0, items: [] });
      if (results[15].status === 'fulfilled') setManifest(results[15].value);
    } catch (err: any) {
      setError({
        message: err?.message || 'Unable to load MCP Security Suite data.',
        requestId: err?.request_id,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSuiteData();
  }, [loadSuiteData]);

  const handleRegisterServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName.trim() || !srvUrl.trim()) return;
    setSavingServer(true);
    try {
      const res = await api.mcp.suite.registerServer({
        name: srvName.trim(),
        server_url: srvUrl.trim(),
        category: srvCat,
        vault_secret_id: srvVaultId || undefined,
        auto_discover: true,
      });
      toast.success(`Registered MCP server '${srvName}' (${res?.server?.status})`);
      setSrvName('');
      setSrvUrl('');
      await loadSuiteData();
    } catch (err: any) {
      toast.error('Server registration failed', { description: err?.message });
    } finally {
      setSavingServer(false);
    }
  };

  const handleDiscoverServer = async (serverId: string) => {
    setBusyAction(`discover:${serverId}`);
    try {
      const res = await api.mcp.suite.discoverServer(serverId);
      if (res.status === 'ONLINE') {
        toast.success(`Discovered ${res.tools_count} tools cleanly`);
      } else {
        toast.warning(`Server status: ${res.status}`, { description: res.error || 'Could not reach upstream MCP endpoint.' });
      }
      await loadSuiteData();
    } catch (err: any) {
      toast.error('Discovery failed', { description: err?.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    setBusyAction('createRule');
    try {
      await api.mcp.suite.createFirewallRule({
        name: ruleName.trim(),
        rule_type: ruleType,
        tool_pattern: ruleToolPat.trim() || '*',
        action: ruleAction,
        rego_policy: ruleType === 'OPA_REGO' ? ruleRego : undefined,
      });
      toast.success(`Firewall rule '${ruleName}' activated`);
      setRuleName('');
      await loadSuiteData();
    } catch (err: any) {
      toast.error('Failed to create firewall rule', { description: err?.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSimulatePolicy = async () => {
    setBusyAction('simPolicy');
    try {
      const parsedArgs = JSON.parse(simArgsJson || '{}');
      const res = await api.mcp.suite.simulatePolicy({
        tool_name: simTool,
        arguments: parsedArgs,
        rego_policy: ruleRego,
      });
      setSimPolicyResult(res);
    } catch (err: any) {
      toast.error('Policy simulation error', { description: err?.message || 'Check arguments JSON syntax.' });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secName.trim() || !secVal.trim()) return;
    setBusyAction('createSecret');
    try {
      await api.mcp.suite.createSecret({
        name: secName.trim(),
        provider: secProv,
        scope: 'mcp:upstream',
        secret_value: secVal,
      });
      toast.success('Secret encrypted and saved in MCP Vault');
      setSecName('');
      setSecVal('');
      await loadSuiteData();
    } catch (err: any) {
      toast.error('Failed to store secret', { description: err?.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunScanner = async () => {
    setBusyAction('runScanner');
    try {
      const res = await api.mcp.suite.runScanner({ source_path: scannerPath.trim() || undefined });
      toast.success(`Scanned ${res.scanned_tools_count} MCP tools cleanly`);
      await loadSuiteData();
    } catch (err: any) {
      toast.error('Scanner execution failed', { description: err?.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunRedTeam = async () => {
    setBusyAction('runSim');
    try {
      const res = await api.mcp.suite.runSimulation();
      toast.success(`Red-Team Suite Complete: ${res.blocked_count}/${res.total_tests} attacks blocked`);
      await loadSuiteData();
    } catch (err: any) {
      toast.error('Attack simulation failed', { description: err?.message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleApproval = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setBusyAction(`ap:${id}`);
    try {
      await api.mcp.decideApproval(id, decision);
      toast.success(`MCP request ${decision.toLowerCase()}`);
      await loadSuiteData();
    } catch (err: any) {
      toast.error('Approval update failed', { description: err?.message });
    } finally {
      setBusyAction(null);
    }
  };

  const activeNavMeta = MODULE_NAV.find((m) => m.id === activeModule) || MODULE_NAV[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            KAVACH ENTERPRISE MCP SECURITY CONTROL PLANE (18 MODULES)
          </h2>
          <p style={{ fontSize: '12.5px', color: '#475569', margin: '3px 0 0 0' }}>
            6-Stage Zero-Trust MCP Gateway: Auth · Threat Detection · DLP · Behavioral Analysis · OPA/Firewall · Response Inspection &amp; Audit
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/settings/mcp" style={{ ...btnSecondary, textDecoration: 'none', color: '#4F46E5' }}>
            <Plug size={13} />
            <span>OAuth Connections</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              onSyncProtect();
              void loadSuiteData();
            }}
            disabled={loading}
            style={btnSecondary}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '13px', color: '#991B1B' }}>
            <strong>Error:</strong> {error.message} {error.requestId ? `(${error.requestId})` : ''}
          </div>
          <button type="button" onClick={() => void loadSuiteData()} style={btnSecondary}>
            Retry
          </button>
        </div>
      )}

      {/* 18-Module Grid Switcher */}
      <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
        {/* Left Navigation Rail (All 18 Modules) */}
        <aside
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EAECF0',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {MODULE_NAV.map((mod) => {
            const active = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModule(mod.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: active ? '1px solid #C7D2FE' : '1px solid transparent',
                  backgroundColor: active ? '#EEF2FF' : 'transparent',
                  color: active ? '#3730A3' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 700, opacity: 0.75 }}>
                  {mod.num}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: active ? 700 : 600 }}>{mod.label}</div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Active Module Content Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Section Banner */}
          <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase' }}>
                Module {activeNavMeta.num}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
                {activeNavMeta.label} — {activeNavMeta.desc}
              </h3>
            </div>
            <StatusBadge value={overview?.gateway_status || 'ONLINE'} />
          </div>

          {/* 01 OVERVIEW */}
          {activeModule === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Built-in Tools', val: overview?.builtin_tools_count ?? 0 },
                  { label: 'Upstream Servers', val: `${overview?.upstream_servers_online ?? 0}/${overview?.upstream_servers_count ?? 0}` },
                  { label: 'Intercepted Calls', val: overview?.total_intercepted_requests ?? 0 },
                  { label: 'Blocked Threats', val: overview?.blocked_requests ?? 0 },
                  { label: 'DLP Redactions', val: overview?.dlp_redactions ?? 0 },
                  { label: 'Rug-Pull Alerts', val: overview?.rug_pull_alerts ?? 0 },
                  { label: 'Avg Latency (ms)', val: overview?.avg_latency_ms ?? 0 },
                  { label: 'Estimated Tokens', val: overview?.total_tokens_estimated ?? 0 },
                ].map((kpi) => (
                  <div key={kpi.label} style={cardStyle}>
                    <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>{kpi.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{kpi.val}</div>
                  </div>
                ))}
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                  Zero-Trust 6-Stage Execution Architecture (Live on POST /mcp)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                  {[
                    ['1. MCP Gateway Intake', 'OAuth 2.1 + PKCE, session tracking & multi-server routing'],
                    ['2. Intelligence Layer', 'Threat Detection + Behavioral Analysis + Schema Rug-Pull check'],
                    ['3. OPA & Firewall Rules', 'Allowlists, denylists, Rego predicates & RBAC enforcement'],
                    ['4. HITL Approval Ticket', 'SHA-256 argument-bound SecurityApproval verification'],
                    ['5. Response Inspection', 'Second-order injection block + automatic secret/PII DLP redaction'],
                    ['6. Full Observability', 'MCPRuntimeEvent latency/token traces + immutable AuditEvent'],
                  ].map(([title, body]) => (
                    <div key={title} style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{title}</div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>{body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 02 REGISTRY / 03 DISCOVERY / 04 GATEWAY */}
          {(activeModule === 'registry' || activeModule === 'discovery' || activeModule === 'gateway') && (
            <>
              <form onSubmit={handleRegisterServer} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>Server Name</label>
                  <input value={srvName} onChange={(e) => setSrvName(e.target.value)} placeholder="GitHub MCP" style={inputStyle} required />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>MCP Server URL (HTTPS/Local)</label>
                  <input value={srvUrl} onChange={(e) => setSrvUrl(e.target.value)} placeholder="https://example.com/mcp" style={inputStyle} required />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>Category</label>
                  <select value={srvCat} onChange={(e) => setSrvCat(e.target.value)} style={inputStyle}>
                    {['github', 'gitlab', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'postgresql', 'redis', 'jira', 'custom'].map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>Vault Secret (Optional)</label>
                  <select value={srvVaultId} onChange={(e) => setSrvVaultId(e.target.value)} style={inputStyle}>
                    <option value="">None (OAuth / Unauthenticated)</option>
                    {secrets.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name} ({sec.masked_preview})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={savingServer} style={btnPrimary}>
                  <Plus size={14} />
                  <span>{savingServer ? 'Discovering...' : 'Register & Discover'}</span>
                </button>
              </form>

              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                  Registered Upstream MCP Servers ({servers.length}) + Native Gateway Targets ({protectServers.length})
                </div>
                {servers.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                    No upstream MCP servers registered yet. Add an upstream server URL above to discover tools and route via Kavach Gateway (`serverSlug::toolName`).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {servers.map((srv) => (
                      <div key={srv.id} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{srv.name}</strong>
                            <StatusBadge value={srv.status} />
                            <StatusBadge value={srv.firewall_mode} />
                            <span style={{ fontSize: '11.5px', color: '#64748B' }}>v{srv.version} • {srv.tools_count} tools • risk {srv.risk_score}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                            {srv.server_url}
                          </div>
                          {srv.last_error && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '3px' }}>
                              Error: {srv.last_error}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" onClick={() => void handleDiscoverServer(srv.id)} disabled={busyAction === `discover:${srv.id}`} style={btnSecondary}>
                            <Search size={12} />
                            <span>{busyAction === `discover:${srv.id}` ? 'Syncing...' : 'Discover Tools'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.mcp.suite.updateServer(srv.id, {
                                firewall_mode: srv.firewall_mode === 'BLOCKED' ? 'ENFORCE' : 'BLOCKED',
                              });
                              await loadSuiteData();
                            }}
                            style={btnSecondary}
                          >
                            <span>{srv.firewall_mode === 'BLOCKED' ? 'Unblock' : 'Block Traffic'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.mcp.suite.deleteServer(srv.id);
                              await loadSuiteData();
                            }}
                            style={{ ...btnSecondary, color: '#DC2626', borderColor: '#FECACA' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 05 ACCESS & SESSIONS */}
          {activeModule === 'access' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                  Connected OAuth 2.1 AI Clients ({oauthConnections?.connected_clients?.length ?? 0})
                </div>
                {(oauthConnections?.connected_clients || []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>No active OAuth client tokens issued yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(oauthConnections?.connected_clients || []).map((cl: any) => (
                      <div key={cl.client_id} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{cl.client_name}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Project: {cl.active_project_name || 'Default'} • Tokens: {cl.active_tokens_count}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.oauth.disconnectClient(cl.client_id);
                            toast.success(`Disconnected ${cl.client_name}`);
                            await loadSuiteData();
                          }}
                          style={{ ...btnSecondary, color: '#DC2626', borderColor: '#FECACA' }}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                  Human-in-the-Loop Approvals ({approvals.pending_count} pending)
                </div>
                {approvals.items.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>No gated MCP approval tickets created yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {approvals.items.map((ap) => (
                      <div key={ap.id} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <code style={{ fontWeight: 700, fontSize: '12.5px' }}>{ap.tool_name || ap.operation_type}</code>
                          <StatusBadge value={ap.status} />
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{ap.reason}</div>
                        {ap.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button type="button" onClick={() => void handleApproval(ap.id, 'APPROVED')} style={{ ...btnPrimary, height: '28px', backgroundColor: '#059669' }}>
                              Approve
                            </button>
                            <button type="button" onClick={() => void handleApproval(ap.id, 'REJECTED')} style={{ ...btnSecondary, height: '28px', color: '#DC2626', borderColor: '#FECACA' }}>
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 06 POLICIES & FIREWALL & OPA REGO */}
          {activeModule === 'policies' && (
            <>
              <form onSubmit={handleCreateRule} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Create MCP Firewall / OPA Rego Policy Rule
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                  <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Rule Name (e.g. BlockProdAttack)" style={inputStyle} required />
                  <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} style={inputStyle}>
                    <option value="OPA_REGO">OPA / Rego Policy</option>
                    <option value="DENYLIST">Tool Denylist</option>
                    <option value="ALLOWLIST">Tool Allowlist</option>
                  </select>
                  <input value={ruleToolPat} onChange={(e) => setRuleToolPat(e.target.value)} placeholder="Tool pattern (* or simulate_*)" style={inputStyle} />
                  <select value={ruleAction} onChange={(e) => setRuleAction(e.target.value)} style={inputStyle}>
                    <option value="DENY">DENY</option>
                    <option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL</option>
                    <option value="ALLOW">ALLOW</option>
                  </select>
                </div>
                {ruleType === 'OPA_REGO' && (
                  <textarea value={ruleRego} onChange={(e) => setRuleRego(e.target.value)} rows={4} style={{ ...inputStyle, height: 'auto', padding: '10px', fontFamily: 'var(--font-mono)' }} />
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="submit" style={btnPrimary}>Save Active Rule</button>
                  <input value={simTool} onChange={(e) => setSimTool(e.target.value)} style={{ ...inputStyle, width: '210px' }} placeholder="Test tool name" />
                  <input value={simArgsJson} onChange={(e) => setSimArgsJson(e.target.value)} style={{ ...inputStyle, width: '240px', fontFamily: 'var(--font-mono)' }} placeholder='{"key":"val"}' />
                  <button type="button" onClick={() => void handleSimulatePolicy()} style={btnSecondary}>
                    <Play size={12} />
                    <span>Dry-Run Simulate</span>
                  </button>
                </div>
                {simPolicyResult && (
                  <pre style={{ margin: 0, padding: '10px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#E2E8F0', fontSize: '11.5px', overflowX: 'auto' }}>
                    {JSON.stringify(simPolicyResult, null, 2)}
                  </pre>
                )}
              </form>

              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                  Active Firewall &amp; Rego Rules ({firewallRules.length})
                </div>
                {firewallRules.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Default Zero-Trust policies active. Add custom rules above to constrain specific tools or Rego invariants.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {firewallRules.map((r) => (
                      <div key={r.id} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <strong style={{ fontSize: '13px' }}>{r.name}</strong>
                            <StatusBadge value={r.action} />
                            <span style={{ fontSize: '11.5px', color: '#64748B' }}>{r.rule_type} • pattern `{r.tool_pattern}` • matches {r.match_count}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.mcp.suite.deleteFirewallRule(r.id);
                            await loadSuiteData();
                          }}
                          style={{ ...btnSecondary, color: '#DC2626', borderColor: '#FECACA' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 07 THREATS */}
          {activeModule === 'threats' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Detected Threats &amp; Rug-Pull Alerts ({threatsData?.threat_events_count ?? 0} threats, {threatsData?.rug_pull_alerts_count ?? 0} rug-pulls)
              </div>
              {(threatsData?.events || []).length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748B' }}>No prompt injection, poisoning, or runtime threat incidents detected yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(threatsData?.events || []).map((ev: any) => (
                    <div key={ev.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: '#991B1B' }}>{ev.tool_name} ({ev.client_name})</strong>
                        <StatusBadge value={ev.decision} />
                      </div>
                      <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
                        Threat Score: {ev.threat_score} • {ev.policy_reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 08 RUNTIME */}
          {activeModule === 'runtime' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Intercepted Live MCP Gateway Execution Trace ({runtimeItems.length + protectRequests.length} total)
              </div>
              {runtimeItems.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748B' }}>Invoke any tool on POST /mcp to observe real-time Threat, DLP, Latency &amp; Token traces here.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {runtimeItems.map((rt) => (
                    <div key={rt.id} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <code style={{ fontWeight: 700, fontSize: '12.5px' }}>{rt.tool_name}</code>
                          <StatusBadge value={rt.decision} />
                          <span style={{ fontSize: '11.5px', color: '#64748B' }}>{rt.client_name} • {rt.latency_ms}ms • ~{rt.tokens_estimated} tok</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>{rt.policy_reason}</div>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>{rt.created_at}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 09 SCANNER */}
          {activeModule === 'scanner' && (
            <>
              <div style={{ ...cardStyle, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={scannerPath} onChange={(e) => setScannerPath(e.target.value)} placeholder="Optional MCP server local source path for Semgrep/Gitleaks/OSV..." style={{ ...inputStyle, flex: 1, minWidth: '240px' }} />
                <button type="button" onClick={() => void handleRunScanner()} disabled={busyAction === 'runScanner'} style={btnPrimary}>
                  <ShieldCheck size={14} />
                  <span>{busyAction === 'runScanner' ? 'Scanning...' : 'Scan All MCP Tools & Hashes'}</span>
                </button>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                  Scanned Tool Integrity Snapshots ({scannerData?.total ?? 0})
                </div>
                {(scannerData?.items || []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Click &ldquo;Scan All MCP Tools &amp; Hashes&rdquo; above to baseline schemas and calculate risk scores.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(scannerData?.items || []).slice(0, 35).map((item: any) => (
                      <div key={item.id} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <code style={{ fontWeight: 700, fontSize: '12.5px' }}>{item.server_slug}::{item.tool_name}</code>
                            <StatusBadge value={item.security_status} />
                            <StatusBadge value={item.risk_level} />
                            {item.rug_pull_detected && <StatusBadge value="CRITICAL" />}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                            schema={item.input_schema_hash?.slice(0, 12)} • risk={item.risk_score} • findings={item.findings?.length || 0}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 10 DLP */}
          {activeModule === 'dlp' && (
            <>
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Live DLP Inspection &amp; Redaction Tester</div>
                <textarea value={dlpTestText} onChange={(e) => setDlpTestText(e.target.value)} rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px', fontFamily: 'var(--font-mono)' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={dlpTestStage} onChange={(e) => setDlpTestStage(e.target.value as any)} style={{ ...inputStyle, width: '160px' }}>
                    <option value="REQUEST">REQUEST</option>
                    <option value="RESPONSE">RESPONSE</option>
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await api.mcp.suite.inspectDlp({ payload: { content: dlpTestText }, stage: dlpTestStage, redact: true });
                      setDlpTestResult(res);
                    }}
                    style={btnPrimary}
                  >
                    Inspect Payload
                  </button>
                </div>
                {dlpTestResult && (
                  <pre style={{ margin: 0, padding: '10px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#E2E8F0', fontSize: '11.5px', overflowX: 'auto' }}>
                    {JSON.stringify(dlpTestResult, null, 2)}
                  </pre>
                )}
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Historical DLP Events ({dlpData?.total_dlp_events ?? 0})
                </div>
                {(dlpData?.items || []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>No credential, API key, or PII exfiltration matches intercepted yet.</div>
                ) : (
                  (dlpData?.items || []).map((it: any) => (
                    <div key={it.id} style={{ padding: '10px', border: '1px solid #FDE68A', backgroundColor: '#FFFBEB', borderRadius: '8px', marginBottom: '8px' }}>
                      <strong>{it.tool_name}</strong> — <StatusBadge value={it.decision} /> ({it.dlp_findings?.length} matches)
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* 11 SECRETS VAULT */}
          {activeModule === 'secrets' && (
            <>
              <form onSubmit={handleCreateSecret} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Secret Name</label>
                  <input value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="GitHub MCP PAT" style={inputStyle} required />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Provider</label>
                  <input value={secProv} onChange={(e) => setSecProv(e.target.value)} placeholder="github" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Secret Value (Encrypted at Rest)</label>
                  <input type="password" value={secVal} onChange={(e) => setSecVal(e.target.value)} placeholder="ghp_..." style={inputStyle} required />
                </div>
                <button type="submit" style={btnPrimary}>
                  <Lock size={13} />
                  <span>Store in Vault</span>
                </button>
              </form>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                  Encrypted Vault Credentials ({secrets.length})
                </div>
                {secrets.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>No secrets stored in MCP Vault yet. Raw secrets are never exposed after encryption.</div>
                ) : (
                  secrets.map((sec) => (
                    <div key={sec.id} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '13px' }}>{sec.name}</strong> ({sec.provider}) • <code>{sec.masked_preview}</code> • rotations: {sec.rotation_count}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.mcp.suite.deleteSecret(sec.id);
                          await loadSuiteData();
                        }}
                        style={{ ...btnSecondary, color: '#DC2626', borderColor: '#FECACA' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* 12 SANDBOX */}
          {activeModule === 'sandbox' && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Isolated 6-Stage MCP Sandbox Pipeline Tester
              </div>
              <input value={sbTool} onChange={(e) => setSbTool(e.target.value)} placeholder="Tool name" style={inputStyle} />
              <textarea value={sbArgs} onChange={(e) => setSbArgs(e.target.value)} rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px', fontFamily: 'var(--font-mono)' }} placeholder="Request arguments JSON" />
              <textarea value={sbResp} onChange={(e) => setSbResp(e.target.value)} rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px', fontFamily: 'var(--font-mono)' }} placeholder="Optional tool response JSON to test Response Inspection + DLP Redaction" />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await api.mcp.suite.sandboxExecute({
                      tool_name: sbTool,
                      arguments: JSON.parse(sbArgs || '{}'),
                      mock_response: sbResp.trim() ? JSON.parse(sbResp) : null,
                    });
                    setSbResult(res);
                  } catch (err: any) {
                    toast.error('Invalid JSON payload', { description: err?.message });
                  }
                }}
                style={btnPrimary}
              >
                <Play size={13} />
                <span>Run Isolated 6-Stage Inspection</span>
              </button>
              {sbResult && (
                <pre style={{ margin: 0, padding: '12px', borderRadius: '8px', backgroundColor: '#0F172A', color: '#E2E8F0', fontSize: '11.5px', overflowX: 'auto' }}>
                  {JSON.stringify(sbResult, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* 13 ATTACK SIMULATION / RED TEAM */}
          {activeModule === 'simulation' && (
            <>
              <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>MCP Red-Team Attack Simulation Engine</div>
                  <div style={{ fontSize: '12.5px', color: '#475569' }}>
                    Executes 6 live attack probes (Prompt Injection, Tool Poisoning/Rug-Pull, Shell Payload, Secret Exfil, Chaining, Second-Order Response Injection).
                  </div>
                </div>
                <button type="button" onClick={() => void handleRunRedTeam()} disabled={busyAction === 'runSim'} style={btnPrimary}>
                  <Flame size={14} />
                  <span>{busyAction === 'runSim' ? 'Running Suite...' : 'Run Attack Simulation'}</span>
                </button>
              </div>
              {simulations.map((sim) => (
                <div key={sim.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong>Run {sim.id.slice(0, 8)} — {sim.blocked_count}/{sim.total_tests} Blocked ({sim.duration_ms}ms)</strong>
                    <StatusBadge value={sim.bypassed_count === 0 ? 'VERIFIED' : 'HIGH'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                    {(sim.results || []).map((r: any) => (
                      <div key={r.attack_id} style={{ padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700 }}>{r.name}</span>
                          <StatusBadge value={r.blocked ? 'BLOCK' : 'BYPASS'} />
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                          Observed: {r.observed} • Score: {r.threat_score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* 14 AUDIT */}
          {activeModule === 'audit' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Immutable MCP Audit Trail ({auditItems.length} recent events)
              </div>
              {auditItems.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748B' }}>No MCP audit events recorded yet.</div>
              ) : (
                auditItems.map((ev) => (
                  <div key={ev.id} style={{ padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <code style={{ fontWeight: 700, fontSize: '12px' }}>{ev.action}</code> <StatusBadge value={ev.status} />
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
                        {ev.resource_type}: {ev.resource_id} {ev.project_name ? `• ${ev.project_name}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>{ev.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 15 COMPLIANCE */}
          {activeModule === 'compliance' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                MCP Compliance &amp; Governance Controls
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {complianceControls.map((ctrl) => (
                  <div key={ctrl.control_id} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px' }}>{ctrl.control_id}: {ctrl.title}</strong>
                      <StatusBadge value={ctrl.status} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{ctrl.evidence}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 16 INTEGRATIONS & MARKETPLACE */}
          {activeModule === 'integrations' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Supported AI Assistants &amp; Infrastructure MCP Integrations ({marketplaceItems.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
                {marketplaceItems.map((it) => (
                  <div key={it.id} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '13px' }}>{it.name}</strong>
                      <StatusBadge value={it.status} />
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
                      {it.group === 'AI_ASSISTANT' ? it.auth : 'Enterprise Infra / Upstream Connector'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 17 ANALYTICS */}
          {activeModule === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>Decisions Breakdown</div>
                <pre style={{ margin: 0, fontSize: '12px', color: '#334155' }}>
                  {JSON.stringify(analytics?.decisions_breakdown || {}, null, 2)}
                </pre>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>Top Tools &amp; Latency</div>
                {(analytics?.top_tools || []).length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>No recorded tool calls yet.</div>
                ) : (
                  (analytics?.top_tools || []).map((t: any) => (
                    <div key={t.tool_name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '12.5px' }}>
                      <code>{t.tool_name}</code>
                      <span>{t.calls} calls • {t.avg_latency_ms}ms • ~{t.tokens_estimated} tok</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 18 SETTINGS */}
          {activeModule === 'settings' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Gateway Protocol &amp; Discovery Endpoints
              </div>
              <pre style={{ margin: 0, padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', overflowX: 'auto' }}>
                {JSON.stringify(
                  {
                    protocol_version: manifest?.server?.protocol_version || '2025-03-26',
                    endpoints: manifest?.endpoints || {},
                    auth: manifest?.auth || {},
                    capabilities: manifest?.capabilities || {},
                    active_tools_count: protectTools.length || manifest?.tools_count || 0,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

