'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings,
  Lock,
  Users,
  Shield,
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Database,
  Cpu,
  Key,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
} from 'lucide-react';
import { KavachApiLayout } from '../../components/KavachApiLayout';
import { useApiSecurity } from '../../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export default function TestConfigurationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryApiId = searchParams.get('apiId');
  const sectionParam = searchParams.get('section');
  const validSections = ['general', 'auth', 'identities', 'categories', 'limits', 'advanced'];

  const { apis, selectedApi } = useApiSecurity();
  const activeApi = (queryApiId ? apis.find((a) => a.id === queryApiId) : null) || selectedApi || apis[0];

  const [activeNav, setActiveNav] = useState<'general' | 'auth' | 'identities' | 'categories' | 'limits' | 'advanced'>(
    validSections.includes(sectionParam || '') ? (sectionParam as any) : 'general'
  );

  React.useEffect(() => {
    if (sectionParam && validSections.includes(sectionParam)) {
      setActiveNav(sectionParam as any);
    }
  }, [sectionParam]);

  const handleNavClick = (id: 'general' | 'auth' | 'identities' | 'categories' | 'limits' | 'advanced') => {
    setActiveNav(id);
    const apiParam = activeApi?.id ? `apiId=${encodeURIComponent(activeApi.id)}&` : '';
    router.push(`/api-security/analysis/configure?${apiParam}section=${id}`, { scroll: false });
  };

  // 1. General Settings
  const [baseUrl, setBaseUrl] = useState(activeApi?.base_url || 'https://api.example.com');
  const [environment, setEnvironment] = useState<'STAGING' | 'PRODUCTION' | 'DEVELOPMENT'>(
    (activeApi?.environment?.toUpperCase() as any) || 'STAGING'
  );

  React.useEffect(() => {
    if (activeApi?.base_url) {
      setBaseUrl(activeApi.base_url);
    }
    if (activeApi?.environment) {
      setEnvironment(activeApi.environment.toUpperCase() as any);
    }
  }, [activeApi]);
  const [concurrency, setConcurrency] = useState(5);
  const [timeoutSeconds, setTimeoutSeconds] = useState(15);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [verifySsl, setVerifySsl] = useState(true);

  // 2. Authentication
  const [authType, setAuthType] = useState('OAuth2');
  const [tokenUrl, setTokenUrl] = useState('https://api.example.com/oauth/token');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [additionalHeaders, setAdditionalHeaders] = useState('{"Accept": "application/json"}');

  // 3. Test Identities (BOLA / Multi-Tenant Isolation)
  const [adminToken, setAdminToken] = useState('eyJh...admin_tenant_token');
  const [victimToken, setVictimToken] = useState('eyJh...victim_user_a');
  const [attackerToken, setAttackerToken] = useState('eyJh...attacker_user_b');
  const [testAnonymous, setTestAnonymous] = useState(true);

  // 4. Test Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'API1:2023 - Broken Object Level Authorization (BOLA/IDOR)',
    'API2:2023 - Broken Authentication',
    'API3:2023 - Broken Object Property Level Authorization',
    'API4:2023 - Unrestricted Resource Consumption & Rate Limiting',
    'API5:2023 - Broken Function Level Authorization (BFLA)',
    'API6:2023 - Unrestricted Access to Sensitive Business Flows',
    'API7:2023 - Server-Side Request Forgery (SSRF)',
    'API8:2023 - Security Misconfiguration & Permissive CORS',
  ]);

  // 5. Rate Limits & Fuzzing Throttling
  const [rpsCap, setRpsCap] = useState(25);
  const [burstLimit, setBurstLimit] = useState(50);
  const [backoffStrategy, setBackoffStrategy] = useState<'exponential' | 'pause' | 'abort'>('exponential');
  const [bypassHeader, setBypassHeader] = useState('X-SecuLayer-Scanner: true');
  const [maxDurationMin, setMaxDurationMin] = useState(15);

  // 6. Advanced Options
  const [failOnCritical, setFailOnCritical] = useState(true);
  const [failOnHigh, setFailOnHigh] = useState(true);
  const [deepFuzzing, setDeepFuzzing] = useState(false);
  const [graphqlCrawler, setGraphqlCrawler] = useState(true);
  const [aiCorrelation, setAiCorrelation] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const configNav = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'auth', label: 'Authentication', icon: Lock },
    { id: 'identities', label: 'Test Identities', icon: Users },
    { id: 'categories', label: 'Test Categories', icon: Shield },
    { id: 'limits', label: 'Rate Limits', icon: Sliders },
    { id: 'advanced', label: 'Advanced Options', icon: Settings },
  ];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleRunAnalysis = async () => {
    if (!activeApi) return;
    setIsSaving(true);
    try {
      const plan = await api.apiSecurity.createTestPlan(activeApi.id, {
        name: `Configured Analysis Plan - ${new Date().toLocaleDateString()}`,
        selected_categories: selectedCategories,
        configurations: {
          general: {
            base_url: baseUrl,
            environment,
            concurrency,
            timeout_seconds: timeoutSeconds,
            follow_redirects: followRedirects,
            verify_ssl: verifySsl,
          },
          authentication: {
            auth_type: authType,
            token_url: tokenUrl,
            client_id: clientId,
            client_secret: clientSecret ? '••••••••' : '',
            bearer_token: bearerToken ? '••••••••' : '',
            api_key_header: apiKeyHeader,
            headers: additionalHeaders,
          },
          identities: {
            admin_configured: !!adminToken,
            victim_configured: !!victimToken,
            attacker_configured: !!attackerToken,
            test_anonymous: testAnonymous,
          },
          rate_limits: {
            rps_cap: rpsCap,
            burst_limit: burstLimit,
            backoff_strategy: backoffStrategy,
            bypass_header: bypassHeader,
            max_duration_min: maxDurationMin,
          },
          advanced: {
            fail_on_critical: failOnCritical,
            fail_on_high: failOnHigh,
            deep_fuzzing: deepFuzzing,
            graphql_crawler: graphqlCrawler,
            ai_correlation: aiCorrelation,
          },
        },
      });

      const scan = await api.apiSecurity.startScan({
        api_id: activeApi.id,
        plan_id: plan.id,
      });

      const targetScanId = scan?.scan_id || scan?.id || 'latest';
      router.push(`/api-security/scans/${targetScanId}`);
    } catch (err: any) {
      console.error('Failed to start configured scan:', err);
      alert(err?.message || 'Failed to trigger scan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KavachApiLayout
      activeApiId={activeApi?.id}
      subnavTabs={[
        { id: 'overview', label: 'Overview', href: activeApi ? `/api-security/apis/${activeApi.id}?tab=overview` : '#', active: false },
        { id: 'recommended', label: 'Recommended Tests', href: `/api-security/analysis?apiId=${activeApi?.id || ''}`, active: false },
        { id: 'config', label: 'Configuration', href: `/api-security/analysis/configure?apiId=${activeApi?.id || ''}`, active: true },
        { id: 'schedule', label: 'Schedule', href: `/api-security/analysis/schedule?apiId=${activeApi?.id || ''}`, active: false },
      ]}
      headerAction={
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} fill="#FFFFFF" />}
          <span>{isSaving ? 'Launching...' : 'Run Analysis'}</span>
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: '24px',
          maxWidth: '1100px',
          margin: '0 auto',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Left Sub-Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderRight: '1px solid #F1F5F9', paddingRight: '16px' }}>
          {configNav.map((item) => {
            const active = activeNav === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: active ? '#EFF6FF' : 'transparent',
                  color: active ? '#2563EB' : '#475569',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Configuration Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* TAB 1: GENERAL SETTINGS */}
          {activeNav === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  General Settings
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Define target environment, execution parameters, and network connection properties.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Target Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  style={{
                    padding: '9px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Environment Scope
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="STAGING">Staging (Full Active Fuzzing)</option>
                    <option value="DEVELOPMENT">Development / Localhost</option>
                    <option value="PRODUCTION">Production (Guarded Non-Destructive)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Request Concurrency
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Request Timeout (Seconds)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={timeoutSeconds}
                    onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={followRedirects}
                      onChange={(e) => setFollowRedirects(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Follow HTTP 3xx Redirects</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={verifySsl}
                      onChange={(e) => setVerifySsl(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Verify TLS / SSL Certificates</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTHENTICATION */}
          {activeNav === 'auth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Authentication Configuration
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Configure credentials for authenticated endpoint fuzzing and token manipulation tests.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Authentication Type
                </label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="OAuth2">OAuth 2.0 (Client Credentials / Password)</option>
                  <option value="Bearer">Bearer Token (JWT)</option>
                  <option value="ApiKey">API Key Header</option>
                  <option value="Basic">Basic Auth</option>
                  <option value="None">None (Unauthenticated Public Testing)</option>
                </select>
              </div>

              {authType === 'OAuth2' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      Token URL
                    </label>
                    <input
                      type="url"
                      value={tokenUrl}
                      onChange={(e) => setTokenUrl(e.target.value)}
                      placeholder="https://api.example.com/oauth/token"
                      style={{
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="e.g. sec-fuzzer-agent"
                        style={{
                          padding: '9px 12px',
                          fontSize: '13px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Client Secret
                      </label>
                      <input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="••••••••••••••••"
                        style={{
                          padding: '9px 12px',
                          fontSize: '13px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {authType === 'Bearer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Bearer JWT Token
                  </label>
                  <textarea
                    rows={3}
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    style={{
                      padding: '9px 12px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {authType === 'ApiKey' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      Header Name
                    </label>
                    <input
                      type="text"
                      value={apiKeyHeader}
                      onChange={(e) => setApiKeyHeader(e.target.value)}
                      placeholder="X-API-Key"
                      style={{
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      API Key Value
                    </label>
                    <input
                      type="password"
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      placeholder="secret_key_..."
                      style={{
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Additional Headers (JSON format)
                </label>
                <textarea
                  rows={2}
                  value={additionalHeaders}
                  onChange={(e) => setAdditionalHeaders(e.target.value)}
                  placeholder='{"Accept": "application/json"}'
                  style={{
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: TEST IDENTITIES */}
          {activeNav === 'identities' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Test Identities (Multi-Role BOLA Matrix)
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Deterministic authorization fuzzing cross-replaces tokens to prove Broken Object Level Authorization (IDOR).
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Role 1: High Privilege / Admin Token
                </label>
                <input
                  type="text"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Bearer token or identity credentials for Administrator"
                  style={{
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Role 2: Victim User (Tenant A)
                </label>
                <input
                  type="text"
                  value={victimToken}
                  onChange={(e) => setVictimToken(e.target.value)}
                  placeholder="Bearer token for legitimate resource owner"
                  style={{
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Role 3: Attacker / Cross-Tenant User (Tenant B)
                </label>
                <input
                  type="text"
                  value={attackerToken}
                  onChange={(e) => setAttackerToken(e.target.value)}
                  placeholder="Bearer token used to attempt unauthorized access against Tenant A"
                  style={{
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  checked={testAnonymous}
                  onChange={(e) => setTestAnonymous(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Include unauthenticated anonymous probes across all protected endpoints</span>
              </label>
            </div>
          )}

          {/* TAB 4: TEST CATEGORIES */}
          {activeNav === 'categories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Test Categories (OWASP API Top 10:2023)
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Select automated vulnerability test modules to execute against discovered routes.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  {
                    id: 'API1:2023 - Broken Object Level Authorization (BOLA/IDOR)',
                    name: 'API1:2023 - Broken Object Level Authorization (BOLA)',
                    desc: 'Cross-tenant IDOR probes on path/query parameters',
                    severity: 'CRITICAL',
                  },
                  {
                    id: 'API2:2023 - Broken Authentication',
                    name: 'API2:2023 - Broken Authentication & Weak Tokens',
                    desc: 'Tests token expiration, unsigned JWTs, algorithm confusion',
                    severity: 'CRITICAL',
                  },
                  {
                    id: 'API3:2023 - Broken Object Property Level Authorization',
                    name: 'API3:2023 - Excessive Data Exposure & Mass Assignment',
                    desc: 'Probes hidden admin fields and unredacted PII in responses',
                    severity: 'HIGH',
                  },
                  {
                    id: 'API4:2023 - Unrestricted Resource Consumption & Rate Limiting',
                    name: 'API4:2023 - Unrestricted Resource Consumption',
                    desc: 'High-frequency burst fuzzing, pagination limits, regex complexity',
                    severity: 'HIGH',
                  },
                  {
                    id: 'API5:2023 - Broken Function Level Authorization (BFLA)',
                    name: 'API5:2023 - Broken Function Level Authorization (BFLA)',
                    desc: 'Tests standard users executing administrative mutation routes',
                    severity: 'HIGH',
                  },
                  {
                    id: 'API6:2023 - Unrestricted Access to Sensitive Business Flows',
                    name: 'API6:2023 - Unrestricted Business Flow Access',
                    desc: 'Probes checkout manipulation, coupon abuse, and inventory locking',
                    severity: 'MEDIUM',
                  },
                  {
                    id: 'API7:2023 - Server-Side Request Forgery (SSRF)',
                    name: 'API7:2023 - Server-Side Request Forgery (SSRF)',
                    desc: 'Tests internal metadata endpoints and webhook redirect abuse',
                    severity: 'HIGH',
                  },
                  {
                    id: 'API8:2023 - Security Misconfiguration & Permissive CORS',
                    name: 'API8:2023 - Security Misconfiguration',
                    desc: 'Exposed stack traces, wildcard CORS origins, default headers',
                    severity: 'MEDIUM',
                  },
                ].map((item) => {
                  const isChecked = selectedCategories.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCategory(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${isChecked ? '#BFDBFE' : '#E2E8F0'}`,
                        backgroundColor: isChecked ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {item.name}
                            </span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: item.severity === 'CRITICAL' ? '#FEF2F2' : '#FFF7ED',
                                color: item.severity === 'CRITICAL' ? '#DC2626' : '#EA580C',
                              }}
                            >
                              {item.severity}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>{item.desc}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: RATE LIMITS */}
          {activeNav === 'limits' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Rate Limits & Fuzzing Throttling
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Protect target downstream servers from accidental denial-of-service during active testing.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Max Requests Per Second (RPS)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={rpsCap}
                    onChange={(e) => setRpsCap(Number(e.target.value))}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Burst Limit Allowance
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={burstLimit}
                    onChange={(e) => setBurstLimit(Number(e.target.value))}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    HTTP 429 Backoff Strategy
                  </label>
                  <select
                    value={backoffStrategy}
                    onChange={(e) => setBackoffStrategy(e.target.value as any)}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="exponential">Exponential Backoff (Retry after 2s, 4s, 8s)</option>
                    <option value="pause">Pause for 30 Seconds then Resume</option>
                    <option value="abort">Abort Scan Immediately</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Max Scan Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={maxDurationMin}
                    onChange={(e) => setMaxDurationMin(Number(e.target.value))}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  WAF / Rate-Limit Bypass Header
                </label>
                <input
                  type="text"
                  value={bypassHeader}
                  onChange={(e) => setBypassHeader(e.target.value)}
                  placeholder="X-SecuLayer-Scanner: true"
                  style={{
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 6: ADVANCED OPTIONS */}
          {activeNav === 'advanced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Advanced Options & Deterministic Gates
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Configure CI/CD security gate thresholds, deep payload mutators, and AI root cause correlation.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={failOnCritical}
                    onChange={(e) => setFailOnCritical(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>Deterministic CI/CD Gate: Fail on Critical Finding</span>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      Exit with non-zero status if any unverified Critical BOLA, Auth, or SSRF issue is detected.
                    </p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={failOnHigh}
                    onChange={(e) => setFailOnHigh(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>Fail on High Finding</span>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      Block pipeline if any High severity vulnerability remains unverified.
                    </p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={deepFuzzing}
                    onChange={(e) => setDeepFuzzing(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>Aggressive Payload Mutation Fuzzing</span>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      Generates up to 100 mutated inputs per parameter including SQLi, polyglots, and type confusion.
                    </p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={graphqlCrawler}
                    onChange={(e) => setGraphqlCrawler(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>GraphQL Introspection & Circular Query Detection</span>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      Crawls `/graphql` endpoints, detects circular references, and probes batch query amplification.
                    </p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={aiCorrelation}
                    onChange={(e) => setAiCorrelation(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>Gemini AI Attack Path Correlation</span>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      Correlates isolated findings into composite attack paths with code-level patch proposals.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: '1px solid #CBD5E1',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>{isSaving ? 'Launching...' : 'Run Analysis'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
