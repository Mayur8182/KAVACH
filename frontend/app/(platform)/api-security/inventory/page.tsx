'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Layers,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Lock,
  Unlock,
  Code2,
  ExternalLink,
  RefreshCw,
  Plus,
  Radio,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Zap,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export default function ApiInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apis, selectedApi, setSelectedApi } = useApiSecurity();

  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [protocolStats, setProtocolStats] = useState<Record<string, number>>({});
  const [lifecycleStats, setLifecycleStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedAuth, setSelectedAuth] = useState<string>('ALL');

  const fetchEndpoints = async () => {
    if (!selectedApi?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.apiSecurity.getEndpoints(selectedApi.id, {
        protocol: selectedProtocol !== 'ALL' ? selectedProtocol : undefined,
        search: searchTerm || undefined,
      });
      setEndpoints(res.items || []);
      if (res.protocols) setProtocolStats(res.protocols);
      if (res.lifecycle) setLifecycleStats(res.lifecycle);
    } catch (err) {
      console.error('Failed to load endpoints for inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, [selectedApi?.id, selectedProtocol]);

  // Client-side filtering for risk and auth
  const filteredEndpoints = endpoints.filter((ep) => {
    if (selectedRisk !== 'ALL' && ep.risk_level?.toUpperCase() !== selectedRisk) {
      return false;
    }
    if (selectedAuth === 'PROTECTED' && !ep.auth_required) {
      return false;
    }
    if (selectedAuth === 'PUBLIC' && ep.auth_required) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesPath = ep.path?.toLowerCase().includes(term);
      const matchesMethod = ep.method?.toLowerCase().includes(term);
      const matchesCategory = ep.category?.toLowerCase().includes(term);
      const matchesFile = ep.code_file_path?.toLowerCase().includes(term);
      if (!matchesPath && !matchesMethod && !matchesCategory && !matchesFile) {
        return false;
      }
    }
    return true;
  });

  const getMethodBadgeStyle = (method: string) => {
    const m = (method || 'GET').toUpperCase();
    switch (m) {
      case 'GET':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'POST':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'PUT':
      case 'PATCH':
        return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
      case 'DELETE':
        return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
      case 'WS':
        return { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' };
      case 'RPC':
        return { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const getRiskBadgeStyle = (risk: string) => {
    const r = (risk || 'LOW').toUpperCase();
    switch (r) {
      case 'CRITICAL':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
      case 'HIGH':
        return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
      case 'MEDIUM':
        return { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const protocolsList = [
    { id: 'ALL', label: 'All Protocols' },
    { id: 'REST', label: 'REST APIs' },
    { id: 'GRAPHQL', label: 'GraphQL' },
    { id: 'WEBSOCKET', label: 'WebSockets' },
    { id: 'GRPC', label: 'gRPC' },
    { id: 'SOAP', label: 'SOAP / XML' },
    { id: 'SSE', label: 'SSE Streams' },
  ];

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Title & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
              Multi-Protocol API Inventory &amp; Catalog
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              Continuous code-discovered and runtime-observed endpoint inventory across REST, GraphQL, WebSocket, gRPC, SOAP, and SSE protocols.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchEndpoints}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh Inventory</span>
            </button>

            <Link
              href="/api-security"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Zap size={14} />
              <span>Scan Repository Code</span>
            </Link>
          </div>
        </div>

        {/* Metric Overview Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Endpoints
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
              {endpoints.length}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              In {selectedApi?.name || 'Selected Target'}
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Authentication Required
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669', marginTop: '6px' }}>
              {endpoints.filter((e) => e.auth_required).length}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {endpoints.filter((e) => !e.auth_required).length} Public Endpoints
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              High &amp; Critical Risk
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
              {endpoints.filter((e) => e.risk_level === 'HIGH' || e.risk_level === 'CRITICAL').length}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              BOLA / Exposure Risk
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Protocols
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#2563EB', marginTop: '6px' }}>
              {Object.keys(protocolStats).length > 0 ? Object.keys(protocolStats).length : 1}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              REST, GraphQL, WS, gRPC
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            padding: '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Protocol Switcher Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginRight: '6px' }}>
              Protocol:
            </span>
            {protocolsList.map((p) => {
              const active = selectedProtocol === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProtocol(p.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: active ? '1px solid #0F172A' : '1px solid #E2E8F0',
                    backgroundColor: active ? '#0F172A' : '#F8FAFC',
                    color: active ? '#FFFFFF' : '#475569',
                    fontSize: '12px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Search & Risk / Auth Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search endpoints by path, controller, or source file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="CRITICAL">Critical Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>

              <select
                value={selectedAuth}
                onChange={(e) => setSelectedAuth(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Auth States</option>
                <option value="PROTECTED">Auth Required</option>
                <option value="PUBLIC">Public Access</option>
              </select>
            </div>
          </div>
        </div>

        {/* Endpoints Table */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading API Inventory...</div>
            </div>
          ) : filteredEndpoints.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Layers size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 6px 0' }}>
                No endpoints found
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '480px', margin: '0 auto 16px' }}>
                {searchTerm || selectedProtocol !== 'ALL'
                  ? 'No endpoints match your current filter parameters. Try clearing your search.'
                  : 'Run an autonomous code scan on your connected repository to automatically discover and map all API routes.'}
              </p>
              <Link
                href="/api-security"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Zap size={14} />
                <span>Go to Autonomous Code Scanner</span>
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Method</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Route Path</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Category</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Auth</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Risk</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700 }}>Code Location</th>
                    <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEndpoints.map((ep, idx) => {
                    const mStyle = getMethodBadgeStyle(ep.method);
                    const rStyle = getRiskBadgeStyle(ep.risk_level);
                    return (
                      <tr
                        key={ep.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Method Badge */}
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: mStyle.bg,
                              color: mStyle.text,
                              border: `1px solid ${mStyle.border}`,
                              fontFamily: 'monospace',
                            }}
                          >
                            {ep.method}
                          </span>
                        </td>

                        {/* Route Path */}
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace', fontSize: '13px' }}>
                              {ep.path}
                            </span>
                            {ep.protocol && ep.protocol !== 'REST' && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  backgroundColor: '#F1F5F9',
                                  color: '#475569',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {ep.protocol}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '12px 18px', color: '#64748B' }}>
                          {ep.category || 'General'}
                        </td>

                        {/* Auth Status */}
                        <td style={{ padding: '12px 18px' }}>
                          {ep.auth_required ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#059669',
                              }}
                            >
                              <Lock size={12} />
                              <span>Protected</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#D97706',
                              }}
                            >
                              <Unlock size={12} />
                              <span>Public</span>
                            </span>
                          )}
                        </td>

                        {/* Risk Level */}
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: rStyle.bg,
                              color: rStyle.text,
                              border: `1px solid ${rStyle.border}`,
                            }}
                          >
                            {ep.risk_level || 'LOW'}
                          </span>
                        </td>

                        {/* Code File Path */}
                        <td style={{ padding: '12px 18px' }}>
                          {ep.code_file_path ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontFamily: 'monospace', fontSize: '11.5px' }}>
                              <FileCode size={13} color="#94A3B8" />
                              <span>{ep.code_file_path}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '12px' }}>Spec / Runtime</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <Link
                            href={`/api-security/findings?endpoint=${encodeURIComponent(ep.path)}`}
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#2563EB',
                              textDecoration: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#EFF6FF',
                            }}
                          >
                            Findings
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </KavachApiLayout>
  );
}
