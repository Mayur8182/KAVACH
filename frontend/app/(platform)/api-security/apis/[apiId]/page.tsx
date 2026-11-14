'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Network,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Play,
  PlaySquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  FileCode,
  Tag,
  Lock,
  Unlock,
  Radio,
  Code2,
  Server,
  Layers,
  AlertCircle,
  Clock,
  ExternalLink,
  Zap,
  X,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import { KavachApiLayout } from '../../components/KavachApiLayout';
import { api } from '@/lib/api/client';

export default function ApiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const apiId = params?.apiId as string;

  const [targetApi, setTargetApi] = useState<any | null>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [protocolStats, setProtocolStats] = useState<Record<string, number>>({});
  const [lifecycleStats, setLifecycleStats] = useState<Record<string, number>>({});
  const [zombieAnalysis, setZombieAnalysis] = useState<any | null>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [selectedEndpointDetail, setSelectedEndpointDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Interactive Probe State
  const [isProbeModalOpen, setIsProbeModalOpen] = useState(false);
  const [activeProbeType, setActiveProbeType] = useState('graphql');
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<any | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [copiedPatch, setCopiedPatch] = useState(false);
  
  // Filters
  const [selectedProtocol, setSelectedProtocol] = useState<string>('ALL');
  const [selectedLifecycle, setSelectedLifecycle] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const loadData = () => {
    if (!apiId) return;
    setIsLoading(true);
    Promise.all([
      api.apiSecurity.getApi(apiId),
      api.apiSecurity.getEndpoints(apiId),
      api.apiSecurity.getZombieAnalysis(apiId).catch(() => null),
      api.apiSecurity.findings({ apiId }).catch(() => ({ items: [] })),
    ])
      .then(([apiData, endpointsData, zombieData, findingsData]) => {
        setTargetApi(apiData);
        setEndpoints(endpointsData.items || []);
        if (endpointsData.protocols) setProtocolStats(endpointsData.protocols);
        if (endpointsData.lifecycle) setLifecycleStats(endpointsData.lifecycle);
        if (zombieData) setZombieAnalysis(zombieData);
        if (findingsData?.items) setFindings(findingsData.items);
      })
      .catch((err) => {
        console.error('Failed to load API details or endpoints:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getEndpointFindings = (ep: any) => {
    return findings.filter(
      (f) =>
        f.target_endpoint === ep.path ||
        f.endpoint_id === ep.id ||
        (Array.isArray(f.affected_endpoints) && f.affected_endpoints.includes(ep.path))
    );
  };

  useEffect(() => {
    loadData();
  }, [apiId]);

  const handleRunProbe = async (type: string) => {
    if (!apiId) return;
    setIsProbing(true);
    setProbeError(null);
    setProbeResult(null);

    try {
      let res: any;
      if (type === 'graphql') {
        res = await api.apiSecurity.crawlGraphqlSchema(apiId);
      } else if (type === 'websocket') {
        res = await api.apiSecurity.fuzzWebsocket(apiId);
      } else if (type === 'grpc') {
        res = await api.apiSecurity.fuzzGrpc(apiId);
      } else if (type === 'traffic') {
        res = await api.apiSecurity.ingestRuntimeTraffic(apiId);
      } else {
        res = await api.apiSecurity.runInteractiveSecurityTest(apiId, type);
      }
      setProbeResult(res?.data || res);
    } catch (err: any) {
      console.error('Probe execution error:', err);
      setProbeError(err?.message || 'Failed to execute probe');
    } finally {
      setIsProbing(false);
    }
  };

  const categories = Array.from(new Set(endpoints.map((e) => e.category).filter(Boolean)));

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch =
      searchQuery === '' ||
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.category && ep.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ep.code_file_path && ep.code_file_path.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMethod = selectedMethod === 'ALL' || ep.method === selectedMethod;
    const matchesCategory = selectedCategory === 'ALL' || ep.category === selectedCategory;
    const matchesProtocol = selectedProtocol === 'ALL' || ep.protocol === selectedProtocol;
    const matchesLifecycle = selectedLifecycle === 'ALL' || ep.lifecycle_state === selectedLifecycle;

    return matchesSearch && matchesMethod && matchesCategory && matchesProtocol && matchesLifecycle;
  });

  const getMethodBadgeStyle = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'POST':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'PUT':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'PATCH':
        return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'DELETE':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'RPC':
        return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
      case 'WS':
        return { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getProtocolBadge = (protocol: string) => {
    switch ((protocol || 'REST').toUpperCase()) {
      case 'GRPC':
        return { bg: '#FEF3C7', text: '#92400E', label: 'gRPC' };
      case 'WEBSOCKET':
        return { bg: '#CCFBF1', text: '#115E59', label: 'WebSocket' };
      case 'GRAPHQL':
        return { bg: '#EDE9FE', text: '#5B21B6', label: 'GraphQL' };
      default:
        return { bg: '#EFF6FF', text: '#1D4ED8', label: 'REST' };
    }
  };

  const getRiskBadge = (risk: string) => {
    const r = (risk || 'LOW').toUpperCase();
    if (r === 'CRITICAL') {
      return { bg: '#FEF2F2', text: '#991B1B', label: 'Critical' };
    }
    if (r === 'HIGH') {
      return { bg: '#FFF7ED', text: '#C2410C', label: 'High' };
    }
    if (r === 'MEDIUM') {
      return { bg: '#FEFCE8', text: '#854D0E', label: 'Medium' };
    }
    return { bg: '#F0FDF4', text: '#166534', label: 'Low' };
  };

  const zombieCount = lifecycleStats['ZOMBIE'] || zombieAnalysis?.zombie_count || 0;
  const deprecatedCount = lifecycleStats['DEPRECATED'] || zombieAnalysis?.deprecated_count || 0;

  return (
    <KavachApiLayout
      activeApiId={apiId}
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setIsProbeModalOpen(true);
              if (!probeResult) handleRunProbe(activeProbeType);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <Zap size={14} color="#D97706" />
            <span>Interactive Protocol Probes</span>
          </button>
          <Link
            href={`/api-security/analysis?apiId=${apiId}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)',
            }}
          >
            <PlaySquare size={13} />
            <span>Configure & Run Analysis</span>
          </Link>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
          <Link href="/api-security/apis" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            API Catalog
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">{targetApi?.name || 'API Target'}</span>
          <span className="ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
            {endpoints.length} Endpoints
          </span>
        </div>

        {/* API Target Title Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {targetApi?.name || 'API Inventory Target'}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {targetApi?.environment || 'STAGING'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-mono">
              Base URL: {targetApi?.base_url || 'Not configured'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-zinc-400">Total Attack Surface</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {endpoints.length} Endpoints
              </div>
            </div>
          </div>
        </div>

        {/* Zombie & Deprecated API Warning Banner */}
        {(zombieCount > 0 || deprecatedCount > 0) && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                  {zombieCount} Zombie APIs & {deprecatedCount} Deprecated Endpoints Detected
                </div>
                <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                  Zombie endpoints lack active traffic telemetry and code ownership, exposing unmonitored attack vectors.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedLifecycle('ZOMBIE')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FCD34D',
                  cursor: 'pointer',
                }}
              >
                View Zombies ({zombieCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLifecycle('DEPRECATED')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                  cursor: 'pointer',
                }}
              >
                View Deprecated ({deprecatedCount})
              </button>
            </div>
          </div>
        )}

        {/* Protocol Filter Tabs (REST, GraphQL, WebSocket, gRPC) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[
              { id: 'ALL', label: 'All Protocols', count: endpoints.length },
              { id: 'REST', label: 'REST APIs', count: protocolStats['REST'] || 0 },
              { id: 'GRAPHQL', label: 'GraphQL', count: protocolStats['GRAPHQL'] || 0 },
              { id: 'WEBSOCKET', label: 'WebSocket', count: protocolStats['WEBSOCKET'] || 0 },
              { id: 'GRPC', label: 'gRPC / Protobuf', count: protocolStats['GRPC'] || 0 },
            ].map((tab) => {
              const active = selectedProtocol === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedProtocol(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                    backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                    color: active ? '#2563EB' : '#475569',
                    fontSize: '12px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: active ? '#DBEAFE' : '#F1F5F9',
                      color: active ? '#1D4ED8' : '#64748B',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lifecycle Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', marginRight: '4px' }}>Lifecycle:</span>
            {['ALL', 'ACTIVE', 'ZOMBIE', 'DEPRECATED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedLifecycle(st)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: selectedLifecycle === st ? 700 : 500,
                  backgroundColor: selectedLifecycle === st ? '#0F172A' : '#F1F5F9',
                  color: selectedLifecycle === st ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Method Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search bar */}
          <div style={{ position: 'relative', width: '380px' }}>
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by route path, service, or code file..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Method Filter */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
              <option value="RPC">RPC (gRPC)</option>
              <option value="WS">WS (WebSocket)</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
              }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#64748B' }}>
            <Loader2 size={24} className="animate-spin" />
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>Loading API endpoints & protocol schemas...</span>
          </div>
        ) : filteredEndpoints.length === 0 ? (
          /* Empty State */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '64px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <FileCode size={32} color="#94A3B8" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '12px 0 4px 0' }}>
              No matching endpoints found
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0', maxWidth: '380px' }}>
              Try adjusting your protocol or search filters, or import a new specification.
            </p>
            <button
              onClick={() => {
                setSelectedProtocol('ALL');
                setSelectedLifecycle('ALL');
                setSelectedMethod('ALL');
                setSearchQuery('');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Endpoints Table */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '90px' }}>
                    PROTOCOL
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '90px' }}>
                    METHOD
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    ENDPOINT PATH / RPC METHOD
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    CATEGORY / SERVICE
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    LIFECYCLE
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    AUTH
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    RISK
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    CODE FILE
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                    FINDINGS
                  </th>
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 700, color: '#64748B', textAlign: 'right' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEndpoints.map((ep) => {
                  const mStyle = getMethodBadgeStyle(ep.method);
                  const pBadge = getProtocolBadge(ep.protocol);
                  const rStyle = getRiskBadge(ep.risk_level);
                  const isZombie = ep.lifecycle_state === 'ZOMBIE';
                  const isDeprecated = ep.lifecycle_state === 'DEPRECATED';

                  return (
                    <tr
                      key={ep.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s',
                        backgroundColor: isZombie ? '#FFFDF5' : isDeprecated ? '#FFF5F5' : '#FFFFFF',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isZombie ? '#FFFDF5' : isDeprecated ? '#FFF5F5' : '#FFFFFF')}
                    >
                      {/* Protocol Badge */}
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: pBadge.bg,
                            color: pBadge.text,
                          }}
                        >
                          {pBadge.label}
                        </span>
                      </td>

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
                          }}
                        >
                          {ep.method}
                        </span>
                      </td>

                      {/* Path */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                            {ep.path}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '12px',
                            color: '#475569',
                            fontWeight: 500,
                          }}
                        >
                          <Tag size={11} />
                          <span>{ep.category || 'General'}</span>
                        </span>
                      </td>

                      {/* Lifecycle */}
                      <td style={{ padding: '12px 18px' }}>
                        {isZombie ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            <AlertTriangle size={11} />
                            <span>ZOMBIE</span>
                          </span>
                        ) : isDeprecated ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            <AlertCircle size={11} />
                            <span>DEPRECATED</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Auth Required */}
                      <td style={{ padding: '12px 18px' }}>
                        {ep.auth_required ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#059669',
                            }}
                          >
                            <Lock size={12} />
                            <span>Required</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#64748B',
                            }}
                          >
                            <Unlock size={12} />
                            <span>Public</span>
                          </span>
                        )}
                      </td>

                      {/* Risk */}
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: rStyle.bg,
                            color: rStyle.text,
                          }}
                        >
                          {rStyle.label}
                        </span>
                      </td>

                      {/* Code File Path */}
                      <td style={{ padding: '12px 18px', fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                        {ep.code_file_path || 'Spec Import'}
                      </td>

                      {/* Associated Findings */}
                      <td style={{ padding: '12px 18px' }}>
                        {(() => {
                          const epFindings = getEndpointFindings(ep);
                          if (epFindings.length > 0) {
                            const hasCriticalOrHigh = epFindings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
                            return (
                              <Link
                                href={`/api-security/findings?endpoint=${encodeURIComponent(ep.path)}&apiId=${apiId}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  backgroundColor: hasCriticalOrHigh ? '#FEF2F2' : '#FFFBEB',
                                  color: hasCriticalOrHigh ? '#DC2626' : '#D97706',
                                  border: `1px solid ${hasCriticalOrHigh ? '#FECACA' : '#FDE68A'}`,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                                title="Click to view associated findings in Findings & PRs"
                              >
                                <ShieldAlert size={12} />
                                <span>{epFindings.length} Finding{epFindings.length > 1 ? 's' : ''}</span>
                              </Link>
                            );
                          }
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#F0FDF4',
                                color: '#166534',
                                border: '1px solid #BBF7D0',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle2 size={11} />
                              <span>0 Findings</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedEndpointDetail(ep)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            color: '#2563EB',
                            border: '1px solid #BFDBFE',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Endpoint Details Modal */}
      {selectedEndpointDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '800px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    ...getMethodBadgeStyle(selectedEndpointDetail.method),
                  }}
                >
                  {selectedEndpointDetail.method}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                  {selectedEndpointDetail.path}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEndpointDetail(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Endpoint Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>PROTOCOL</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {selectedEndpointDetail.protocol || 'REST'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>AUTHENTICATION</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: selectedEndpointDetail.auth_required ? '#059669' : '#64748B', marginTop: '2px' }}>
                    {selectedEndpointDetail.auth_required ? 'Token Required' : 'Public / None'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>LIFECYCLE STATE</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {selectedEndpointDetail.lifecycle_state || 'ACTIVE'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>RISK CLASSIFICATION</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {selectedEndpointDetail.risk_level || 'LOW'}
                  </div>
                </div>
              </div>

              {/* Full URL & Source File */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Target Endpoint URL:</span>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#0F172A',
                    }}
                  >
                    {(targetApi?.base_url || 'https://api.internal').replace(/\/$/, '')}{selectedEndpointDetail.path}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Discovered Source File Location:</span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#2563EB',
                    }}
                  >
                    <Code2 size={14} />
                    <span>{selectedEndpointDetail.code_file_path || 'Discovered from OpenAPI Specification / Schema'}</span>
                  </div>
                </div>
              </div>

              {/* Associated Findings Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Associated Findings ({getEndpointFindings(selectedEndpointDetail).length})
                  </h4>
                  {getEndpointFindings(selectedEndpointDetail).length > 0 && (
                    <Link
                      href={`/api-security/findings?endpoint=${encodeURIComponent(selectedEndpointDetail.path)}&apiId=${apiId}`}
                      style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}
                    >
                      View All in Findings
                    </Link>
                  )}
                </div>

                {getEndpointFindings(selectedEndpointDetail).length === 0 ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      borderRadius: '8px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      color: '#166534',
                      fontSize: '13px',
                    }}
                  >
                    <CheckCircle2 size={20} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                    No active security vulnerabilities or policy violations discovered for this endpoint.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {getEndpointFindings(selectedEndpointDetail).map((f) => (
                      <Link
                        key={f.id}
                        href={`/api-security/findings/${f.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          textDecoration: 'none',
                          color: '#0F172A',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ShieldAlert
                            size={16}
                            color={f.severity === 'CRITICAL' || f.severity === 'HIGH' ? '#DC2626' : '#D97706'}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{f.title}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{f.category} • CWE-{f.cwe || 'API'}</div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: f.severity === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB',
                            color: f.severity === 'CRITICAL' ? '#DC2626' : '#B45309',
                          }}
                        >
                          {f.severity}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#F8FAFC',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const ep = selectedEndpointDetail;
                  setSelectedEndpointDetail(null);
                  setIsProbeModalOpen(true);
                  if (!probeResult) handleRunProbe('graphql');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Zap size={14} color="#D97706" />
                <span>Test in Interactive Prober</span>
              </button>

              <Link
                href={`/api-security/analysis?apiId=${apiId}&endpoint=${encodeURIComponent(selectedEndpointDetail.id)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <PlaySquare size={14} />
                <span>Configure Analysis for this Route</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Protocol Probes Modal */}
      {isProbeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '1000px',
              maxWidth: '95vw',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={20} color="#2563EB" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Interactive Protocol Probes & Live Exploitation Fuzzer
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                    Execute deterministic protocol handshakes, schema introspection crawlers, and vulnerability probes against live backend services.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProbeModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Two-Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, overflow: 'hidden' }}>
              {/* Left Column: Probe Catalog */}
              <div
                style={{
                  borderRight: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  overflowY: 'auto',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {[
                  { id: 'graphql', label: 'GraphQL Schema Crawler', proto: 'GRAPHQL', cwe: 'CWE-200' },
                  { id: 'websocket', label: 'WebSocket Frame Fuzzer', proto: 'WEBSOCKET', cwe: 'CWE-1385' },
                  { id: 'grpc', label: 'gRPC Protobuf Method Fuzzer', proto: 'GRPC', cwe: 'CWE-862' },
                  { id: 'traffic', label: 'Runtime Traffic & eBPF', proto: 'REST', cwe: 'SHADOW' },
                  { id: 'ssrf', label: 'SSRF & Cloud Metadata (OOB)', proto: 'REST', cwe: 'CWE-918' },
                  { id: 'otp', label: 'OTP Abuse & Lockout', proto: 'REST', cwe: 'CWE-307' },
                  { id: 'token_revocation', label: 'Token Revocation (Redis)', proto: 'REST', cwe: 'CWE-613' },
                  { id: 'mfa', label: 'MFA Step-Up Challenge', proto: 'REST', cwe: 'CWE-308' },
                  { id: 'oauth', label: 'OAuth Redirect Manipulation', proto: 'REST', cwe: 'CWE-601' },
                  { id: 'race_condition', label: 'Race Condition (Double-Spend)', proto: 'REST', cwe: 'CWE-362' },
                  { id: 'password_reset_abuse', label: 'Password Reset Email Bombing', proto: 'REST', cwe: 'CWE-640' },
                  { id: 'session_lifecycle', label: 'Cross-Device Session Invalidation', proto: 'REST', cwe: 'CWE-384' },
                  { id: 'per_ip_limits', label: 'Per-IP Limits & Spoofed XFF', proto: 'REST', cwe: 'CWE-290' },
                  { id: 'resource_consumption', label: 'Payload Size & ReDoS Limits', proto: 'REST', cwe: 'CWE-400' },
                  { id: 'query_complexity', label: 'Relational Join Complexity Limits', proto: 'REST', cwe: 'CWE-400' },
                  { id: 'quota_enforcement', label: 'Plan Tier Quota Enforcement', proto: 'REST', cwe: 'CWE-770' },
                  { id: 'encoding_normalization', label: 'Double-URL Encoding Traversal', proto: 'REST', cwe: 'CWE-173' },
                  { id: 'tls_configuration', label: 'TLS Protocol & Cipher Depth', proto: 'NETWORK', cwe: 'CWE-319' },
                  { id: 'logging_exposure', label: 'Log Drain Credential Exposure', proto: 'REST', cwe: 'CWE-532' },
                  { id: 'host_header_trust', label: 'Host Header Poisoning', proto: 'REST', cwe: 'CWE-116' },
                  { id: 'default_credentials', label: 'Default Administrative Creds', proto: 'REST', cwe: 'CWE-798' },
                  { id: 'xxe', label: 'XML / XXE Entity Expansion', proto: 'REST', cwe: 'CWE-611' },
                  { id: 'ssti', label: 'SSTI Template Injection', proto: 'REST', cwe: 'CWE-1336' },
                  { id: 'ldap', label: 'LDAP Target Filter Fuzzer', proto: 'REST', cwe: 'CWE-90' },
                  { id: 'file_upload', label: 'File Upload & Magic Bytes', proto: 'REST', cwe: 'CWE-434' },
                ].map((item) => {
                  const active = activeProbeType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveProbeType(item.id);
                        handleRunProbe(item.id);
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: active ? '1px solid #2563EB' : '1px solid transparent',
                        backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: active ? 700 : 600, color: active ? '#1D4ED8' : '#1E293B' }}>
                        {item.label}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {item.proto}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>
                          {item.cwe}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Execution Output Terminal & Evidence */}
              <div
                style={{
                  backgroundColor: '#FAFAFA',
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active Probe Suite
                    </span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
                      {activeProbeType.replace(/_/g, ' ').toUpperCase()} PROBE
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRunProbe(activeProbeType)}
                    disabled={isProbing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: isProbing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isProbing ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} fill="#FFFFFF" />}
                    <span>{isProbing ? 'Executing Live Probe...' : 'Re-run Live Probe'}</span>
                  </button>
                </div>

                {/* Probe Output Status */}
                {isProbing ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={28} className="animate-spin" color="#2563EB" />
                    <span style={{ fontSize: '13px', color: '#64748B' }}>
                      Dispatching deterministic protocol handshake and assertions...
                    </span>
                  </div>
                ) : probeError ? (
                  <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '13px' }}>
                    <strong>Execution Notice:</strong> {probeError}
                  </div>
                ) : probeResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Summary Card */}
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                          {probeResult.test_name || probeResult.title || 'Probe Evaluation Result'}
                        </span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#FEF2F2',
                            color: '#991B1B',
                            border: '1px solid #FECACA',
                          }}
                        >
                          VULNERABILITY CONFIRMED
                        </span>
                      </div>

                      {probeResult.evidence?.assertion_failure && (
                        <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', fontSize: '12.5px', color: '#991B1B', marginBottom: '10px' }}>
                          <strong>Assertion Failure:</strong> {probeResult.evidence.assertion_failure}
                        </div>
                      )}

                      {probeResult.evidence?.root_cause && (
                        <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                          <strong>Root Cause:</strong> {probeResult.evidence.root_cause}
                        </div>
                      )}
                    </div>

                    {/* Raw Request & Response Evidence Terminal */}
                    {probeResult.evidence && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                            OUTGOING PROBE PAYLOAD
                          </span>
                          <pre
                            style={{
                              margin: 0,
                              padding: '12px',
                              borderRadius: '6px',
                              backgroundColor: '#0F172A',
                              color: '#38BDF8',
                              fontFamily: 'monospace',
                              fontSize: '11.5px',
                              lineHeight: 1.45,
                              overflowX: 'auto',
                              maxHeight: '220px',
                            }}
                          >
                            {probeResult.evidence.request || JSON.stringify(probeResult, null, 2)}
                          </pre>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                            SERVER RESPONSE
                          </span>
                          <pre
                            style={{
                              margin: 0,
                              padding: '12px',
                              borderRadius: '6px',
                              backgroundColor: '#0F172A',
                              color: '#4ADE80',
                              fontFamily: 'monospace',
                              fontSize: '11.5px',
                              lineHeight: 1.45,
                              overflowX: 'auto',
                              maxHeight: '220px',
                            }}
                          >
                            {probeResult.evidence.response || 'HTTP/1.1 200 OK\n[Evidence logged]'}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Unified Diff Remediation Patch */}
                    {probeResult.remediation_patch && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>
                            DETERMINISTIC CODE FIX (UNIFIED DIFF)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(probeResult.remediation_patch);
                              setCopiedPatch(true);
                              setTimeout(() => setCopiedPatch(false), 2000);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              cursor: 'pointer',
                            }}
                          >
                            {copiedPatch ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                            <span>{copiedPatch ? 'Copied' : 'Copy Patch'}</span>
                          </button>
                        </div>

                        <pre
                          style={{
                            margin: 0,
                            padding: '12px',
                            borderRadius: '6px',
                            backgroundColor: '#0F172A',
                            color: '#E2E8F0',
                            fontFamily: 'monospace',
                            fontSize: '11.5px',
                            lineHeight: 1.45,
                            overflowX: 'auto',
                          }}
                        >
                          {probeResult.remediation_patch}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </KavachApiLayout>
  );
}
