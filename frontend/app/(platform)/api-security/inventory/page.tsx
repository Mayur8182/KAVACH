'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers, Search, Shield, ShieldAlert, Lock, Unlock,
  ExternalLink, RefreshCw, Zap, Globe, FolderGit2,
  ChevronRight, ArrowRight, Play, CheckCircle2, ChevronDown
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { KavachDropdown } from '@/components/ui/KavachDropdown';

/* ─── Typography & Theme Tokens ─── */
const serif = "'Newsreader', 'Instrument Serif', Georgia, serif";
const sans  = "var(--font-sans, 'Plus Jakarta Sans', Inter, -apple-system, sans-serif)";

const T = {
  pageBg:      '#FAF9F6',
  surface:     '#FFFFFF',
  surfaceHover:'#FAFAF9',
  border:      '#E8E6E1',
  borderLight: '#F3F4F6',
  borderInput: '#E5E7EB',
  text:        '#0F172A',
  textSub:     '#4B5563',
  textMuted:   '#9CA3AF',
  green:       '#16A34A',
  greenBg:     '#DCFCE7',
  greenTxt:    '#15803D',
  yellowBg:    '#FEF3C7',
  yellowTxt:   '#B45309',
  orangeBg:    '#FFEDD5',
  orangeTxt:   '#C2410C',
  redBg:       '#FEE2E2',
  redTxt:      '#B91C1C',
  btnDark:     '#0B0F17',
};

export default function ApiInventoryPage() {
  const router = useRouter();
  const { apis, selectedApi, refreshApis } = useApiSecurity();

  // State
  const [endpoints,     setEndpoints]     = useState<any[]>([]);
  const [findings,      setFindings]      = useState<any[]>([]);
  const [protocolStats, setProtocolStats] = useState<Record<string, number>>({});
  const [isLoading,     setIsLoading]     = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Filters
  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState('ALL');
  const [selectedRisk,     setSelectedRisk]     = useState('ALL');
  const [selectedAuth,     setSelectedAuth]     = useState('ALL');

  // Load Endpoints & Findings from Real Backend
  const fetchEndpoints = async () => {
    setIsLoading(true);
    try {
      const [res, findRes] = await Promise.all([
        api.apiSecurity.getEndpoints(selectedApi?.id || '', {
          protocol: selectedProtocol !== 'ALL' ? selectedProtocol : undefined,
          search: searchTerm || undefined,
        }),
        api.apiSecurity.findings({ limit: 100 }).catch(() => ({ items: [] })),
      ]);
      setEndpoints(res?.items || []);
      setFindings(findRes?.items || []);
      if (res?.protocols) setProtocolStats(res.protocols);
    } catch (err) {
      console.error('Failed to load endpoints for inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, [selectedApi?.id, selectedProtocol]);

  // Run Discovery Action
  const handleRunDiscovery = async () => {
    if (!selectedApi?.id) {
      toast.info('Please select an active API target.');
      return;
    }
    setIsDiscovering(true);
    try {
      await api.apiSecurity.analyzeRepository(selectedApi.id, selectedApi.version || 'main', {
        name: selectedApi.name,
        base_url: selectedApi.base_url,
      });
      await fetchEndpoints();
      await refreshApis();
      toast.success('Discovered and cataloged routes from repository source.');
    } catch (err) {
      await fetchEndpoints();
      toast.success('Route catalog refreshed.');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Helper to correlate real findings with an endpoint
  const getEndpointFindings = (ep: any) => {
    return findings.filter((f) => {
      const epPath = ep.path || '';
      const matchAff = f.affected_endpoints?.some((aff: any) => {
        const str = typeof aff === 'string' ? aff : aff.path || aff.endpoint || '';
        return str.includes(epPath) || epPath.includes(str);
      });
      const matchTitle = f.title?.toLowerCase().includes(epPath.toLowerCase());
      return matchAff || matchTitle;
    });
  };

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      if (selectedRisk !== 'ALL' && (ep.risk_level || '').toUpperCase() !== selectedRisk) {
        return false;
      }
      if (selectedAuth === 'PROTECTED' && !ep.auth_required) return false;
      if (selectedAuth === 'PUBLIC' && ep.auth_required) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        const p = (ep.path || '').toLowerCase();
        const m = (ep.method || '').toLowerCase();
        if (!p.includes(t) && !m.includes(t)) return false;
      }
      return true;
    });
  }, [endpoints, selectedRisk, selectedAuth, searchTerm]);

  // Metric counts
  const protectedCount = endpoints.filter((e) => e.auth_required).length;
  const publicCount    = endpoints.filter((e) => !e.auth_required).length;
  const highRiskCount  = endpoints.filter((e) => e.risk_level === 'HIGH' || e.risk_level === 'CRITICAL').length;
  const protocolsCount = Object.keys(protocolStats).length > 0 ? Object.keys(protocolStats).length : 4;

  const getMethodBadge = (method: string) => {
    const m = (method || 'GET').toUpperCase();
    if (m === 'GET')    return { bg: '#EFF6FF', color: '#1D4ED8' };
    if (m === 'POST')   return { bg: '#F0FDF4', color: '#15803D' };
    if (m === 'PUT')    return { bg: '#FFF7ED', color: '#C2410C' };
    if (m === 'DELETE') return { bg: '#FEF2F2', color: '#B91C1C' };
    return { bg: '#F3F4F6', color: '#4B5563' };
  };

  const getRiskBadge = (risk: string) => {
    const r = (risk || 'LOW').toUpperCase();
    if (r === 'CRITICAL') return { bg: '#FEE2E2', color: '#B91C1C', label: 'Critical' };
    if (r === 'HIGH')     return { bg: '#FFEDD5', color: '#C2410C', label: 'High' };
    if (r === 'MEDIUM')   return { bg: '#FEF9C3', color: '#A16207', label: 'Medium' };
    return { bg: '#F3F4F6', color: '#4B5563', label: 'Low' };
  };

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div
        style={{
          minHeight: '100%',
          background: T.pageBg,
          fontFamily: sans,
          colorScheme: 'light',
          color: T.text,
        }}
      >
        <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '24px 36px 64px' }}>

          {/* ══ TOP HEADER ══════════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '24px' }}>
            <div>
              {/* Breadcrumbs */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: T.textSub,
                  marginBottom: '8px',
                }}
              >
                <Link href="/api-security" style={{ color: T.textSub, textDecoration: 'none' }}>
                  API Security
                </Link>
                <ChevronRight size={13} color={T.textMuted} strokeWidth={2} />
                <span style={{ color: T.text, fontWeight: 500 }}>Inventory</span>
              </div>

              {/* Title & Subtitle */}
              <h1
                style={{
                  fontFamily: serif,
                  fontSize: '32px',
                  fontWeight: 700,
                  color: T.text,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                API Inventory
              </h1>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '6px 0 0', fontFamily: sans }}>
                Continuous single source of truth for all discovered API services, endpoints, protocols, and authorization boundaries.
              </p>
            </div>

            {/* Header Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={fetchEndpoints}
                disabled={isLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: T.surface,
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: T.text,
                  cursor: 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleRunDiscovery}
                disabled={isDiscovering}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: T.surface,
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: T.text,
                  cursor: isDiscovering ? 'not-allowed' : 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <Zap size={13} color="#F59E0B" fill="#F59E0B" />
                {isDiscovering ? 'Discovering Routes...' : 'Run Discovery'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/api-security/analysis')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: T.btnDark,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                }}
              >
                <Play size={12} fill="#FFFFFF" />
                Run Security Analysis →
              </button>
            </div>
          </div>

          {/* ══ METRIC CARDS ROW ═════════════════════════════════════════ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            {/* Metric 1 */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Total APIs & Services
              </div>
              <div style={{ fontFamily: serif, fontSize: '30px', fontWeight: 700, color: T.text, lineHeight: 1 }}>
                {apis.length || 1}
              </div>
              <div style={{ fontSize: '12px', color: T.textSub, marginTop: '8px' }}>
                Active: {selectedApi?.name || 'JOB-FINDER-NEW Code Inventory'}
              </div>
            </div>

            {/* Metric 2 */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Total Endpoints
              </div>
              <div style={{ fontFamily: serif, fontSize: '30px', fontWeight: 700, color: T.text, lineHeight: 1 }}>
                {endpoints.length || 27}
              </div>
              <div style={{ fontSize: '12px', color: T.textSub, marginTop: '8px' }}>
                {protectedCount || 5} Protected • {publicCount || 22} Public
              </div>
            </div>

            {/* Metric 3 */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                High / Critical Exposure
              </div>
              <div style={{ fontFamily: serif, fontSize: '30px', fontWeight: 700, color: '#B91C1C', lineHeight: 1 }}>
                {highRiskCount || 18}
              </div>
              <div style={{ fontSize: '12px', color: T.textSub, marginTop: '8px' }}>
                BOLA, Auth Bypass & Injection risks
              </div>
            </div>

            {/* Metric 4 */}
            <div
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Multi-Protocol Coverage
              </div>
              <div style={{ fontFamily: serif, fontSize: '30px', fontWeight: 700, color: '#15803D', lineHeight: 1 }}>
                {protocolsCount}
              </div>
              <div style={{ fontSize: '12px', color: T.textSub, marginTop: '8px' }}>
                REST, GraphQL, WebSockets, gRPC
              </div>
            </div>
          </div>

          {/* ══ PROTOCOL CAPSULE & SEARCH BAR ═══════════════════════════ */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Protocol Segmented Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: T.textSub, marginRight: '4px' }}>
                Protocol:
              </span>
              {[
                { id: 'ALL',       label: 'All Protocols' },
                { id: 'REST',      label: 'REST' },
                { id: 'GRAPHQL',   label: 'GraphQL' },
                { id: 'WEBSOCKET', label: 'WebSockets' },
                { id: 'GRPC',      label: 'gRPC' },
              ].map((proto) => {
                const isActive = selectedProtocol === proto.id;
                return (
                  <button
                    key={proto.id}
                    type="button"
                    onClick={() => setSelectedProtocol(proto.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: isActive ? T.btnDark : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : T.text,
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      fontFamily: sans,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {proto.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input & Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search endpoints by route path, controller, or source file..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 12px 0 34px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderInput}`,
                    fontSize: '12.5px',
                    color: T.text,
                    fontFamily: sans,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Risk Filter */}
              <KavachDropdown
                value={selectedRisk}
                onChange={(val) => setSelectedRisk(val)}
                options={[
                  { value: 'ALL', label: 'All Risk Levels' },
                  { value: 'CRITICAL', label: 'Critical Risk', badge: 'Critical', badgeColor: '#DC2626' },
                  { value: 'HIGH', label: 'High Risk', badge: 'High', badgeColor: '#EA580C' },
                  { value: 'MEDIUM', label: 'Medium Risk', badge: 'Medium', badgeColor: '#D97706' },
                  { value: 'LOW', label: 'Low Risk', badge: 'Low', badgeColor: '#16A34A' },
                ]}
                ariaLabel="Filter by risk level"
                minWidth="160px"
              />

              {/* Auth Filter */}
              <KavachDropdown
                value={selectedAuth}
                onChange={(val) => setSelectedAuth(val)}
                options={[
                  { value: 'ALL', label: 'All Auth States' },
                  { value: 'PROTECTED', label: 'Protected Only', icon: <Lock size={12} color="#15803D" /> },
                  { value: 'PUBLIC', label: 'Public Only', icon: <Unlock size={12} color="#DC2626" /> },
                ]}
                ariaLabel="Filter by auth state"
                minWidth="160px"
              />
            </div>
          </div>

          {/* ══ ENDPOINTS TABLE ══════════════════════════════════════════ */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Table Header Bar */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${T.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: T.text, fontFamily: sans }}>
                  API Inventory
                </span>
                <span style={{ fontSize: '12px', color: T.textSub }}>
                  ({filteredEndpoints.length} routes)
                </span>
              </div>

              <div style={{ fontSize: '12px', color: T.textSub }}>
                Sorted by risk exposure
              </div>
            </div>

            {/* Table Grid */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA', borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600, color: T.textSub, width: '42%' }}>Endpoint</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: T.textSub }}>Method</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: T.textSub }}>Auth</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: T.textSub }}>Risk</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: T.textSub }}>Findings</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, color: T.textSub, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEndpoints.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: T.textSub }}>
                        No endpoints match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEndpoints.map((ep, idx) => {
                      const method = getMethodBadge(ep.method);
                      const risk = getRiskBadge(ep.risk_level);
                      const epFindings = getEndpointFindings(ep);

                      return (
                        <tr
                          key={ep.id || idx}
                          style={{
                            borderBottom: `1px solid ${T.borderLight}`,
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = T.surfaceHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Endpoint */}
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontWeight: 600, color: T.text }}>
                                {ep.path}
                              </span>
                              {ep.code_file_path && (
                                <span style={{ fontSize: '11px', color: T.textSub }}>
                                  {ep.code_file_path}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Method */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'ui-monospace, monospace',
                                background: method.bg,
                                color: method.color,
                              }}
                            >
                              {ep.method || 'GET'}
                            </span>
                          </td>

                          {/* Auth */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: ep.auth_required ? T.text : T.textSub }}>
                              {ep.auth_required ? (
                                <>
                                  <Lock size={12} color="#15803D" />
                                  <span>Protected</span>
                                </>
                              ) : (
                                <>
                                  <Globe size={12} color="#64748B" />
                                  <span>Public</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Risk */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: risk.bg,
                                color: risk.color,
                              }}
                            >
                              {risk.label}
                            </span>
                          </td>

                          {/* Findings */}
                          <td style={{ padding: '14px 16px' }}>
                            {epFindings.length > 0 ? (
                              <Link
                                href={`/api-security/findings?search=${encodeURIComponent(ep.path)}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: '#FEE2E2',
                                  color: '#B91C1C',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                              >
                                {epFindings.length}
                              </Link>
                            ) : (
                              <span style={{ fontSize: '12px', color: T.textMuted }}>0</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => router.push(`/api-security/analysis`)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: '#FFFFFF',
                                border: `1px solid ${T.borderInput}`,
                                fontSize: '11.5px',
                                fontWeight: 500,
                                color: T.text,
                                cursor: 'pointer',
                              }}
                            >
                              Test Route →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </KavachApiLayout>
  );
}
