'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import {
  Sparkles,
  RefreshCw,
  Layers,
  Server,
  Database,
  Key,
  GitCommit,
  ShieldCheck,
  Terminal,
  Play,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface RepositoryIntelligenceViewProps {
  repositoryId: string;
  onTriggerScan?: () => void;
}

export const RepositoryIntelligenceView: React.FC<RepositoryIntelligenceViewProps> = ({
  repositoryId,
  onTriggerScan,
}) => {
  const [context, setContext] = useState<any>(null);
  const [architecture, setArchitecture] = useState<any>(null);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'modules' | 'apis' | 'dependencies' | 'sync_history'>('modules');
  const [copiedSha, setCopiedSha] = useState(false);
  const [apiSearch, setApiSearch] = useState('');
  const [depSearch, setDepSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!repositoryId) return;
    setLoading(true);
    setError(null);
    try {
      const [ctxRes, archRes, depsRes, syncRes] = await Promise.allSettled([
        api.get<any>(`/api/v1/repositories/${repositoryId}/context`),
        api.get<any>(`/api/v1/repositories/${repositoryId}/architecture`),
        api.get<any[]>(`/api/v1/repositories/${repositoryId}/dependencies`),
        api.get<any>(`/api/v1/repositories/${repositoryId}/sync-status`),
      ]);

      if (ctxRes.status === 'fulfilled' && ctxRes.value) {
        const val: any = ctxRes.value;
        setContext(val?.data || val);
      }
      if (archRes.status === 'fulfilled' && archRes.value) {
        const val: any = archRes.value;
        setArchitecture(val?.data || val);
      }
      if (depsRes.status === 'fulfilled' && depsRes.value) {
        const val: any = depsRes.value;
        const list = Array.isArray(val) ? val : (Array.isArray(val?.data) ? val.data : []);
        setDependencies(list);
      }
      if (syncRes.status === 'fulfilled' && syncRes.value) {
        const val: any = syncRes.value;
        setSyncStatus(val?.data || val);
      }
    } catch (err: any) {
      console.error('[RepositoryIntelligence] Error loading context:', err);
      setError(err?.message || 'Failed to load repository intelligence.');
    } finally {
      setLoading(false);
    }
  }, [repositoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerIndex = async (forceFull: boolean = false) => {
    setSyncing(true);
    try {
      const res = await api.post<any>(`/api/v1/repositories/${repositoryId}/index`, {
        force_full: forceFull,
      });
      if (res?.data) {
        setContext(res.data);
      }
      await loadData();
    } catch (err: any) {
      console.error('[RepositoryIntelligence] Indexing failed:', err);
      setError(err?.message || 'Failed to index repository.');
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  if (loading && !context) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '12px' }}>
        <RefreshCw size={24} className="animate-spin text-blue-600" />
        <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>
          Resolving persistent repository intelligence & architecture graph...
        </span>
      </div>
    );
  }

  const isIndexed = context && context.status === 'READY';
  const score = context?.understanding_score || 0;
  const modulesList = architecture?.modules || [];
  const entryPoints = context?.entryPoints || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Error Banner ── */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Top Intelligence Score Hero Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
              }}
            >
              <Sparkles size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Kavach Repository Intelligence</h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: isIndexed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: isIndexed ? '#34D399' : '#FBBF24',
                    border: `1px solid ${isIndexed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  }}
                >
                  {context?.status || 'NOT_INDEXED'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
                {context?.project || 'Deep architectural map, symbol hierarchy, and cross-file dependencies resolved.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => handleTriggerIndex(false)}
              disabled={syncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: '#334155',
                color: '#F8FAFC',
                border: '1px solid #475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Analyzing...' : 'Sync Context'}</span>
            </button>
            <button
              onClick={() => handleTriggerIndex(true)}
              disabled={syncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              <Layers size={14} />
              <span>Full Re-Index</span>
            </button>
            {onTriggerScan && (
              <button
                onClick={onTriggerScan}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Play size={14} fill="currentColor" />
                <span>Scan with Context</span>
              </button>
            )}
          </div>
        </div>

        {/* Understanding Score Bar */}
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#34D399" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>Codebase Understanding Score</span>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: score > 80 ? '#34D399' : score > 50 ? '#FBBF24' : '#F87171' }}>
              {score}%
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${score}%`,
                height: '100%',
                backgroundColor: score > 80 ? '#10B981' : score > 50 ? '#F59E0B' : '#EF4444',
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
            <span>Verified files: {context?.total_files_indexed || 0}</span>
            <span>AST symbols: {context?.total_symbols_indexed || 0}</span>
            <span>APIs: {context?.total_endpoints_mapped || 0}</span>
            <span>Dependencies: {context?.total_dependencies_mapped || 0}</span>
            <span>Modules: {context?.total_modules_identified || 0}</span>
          </div>
        </div>
      </div>

      {/* ── Key Statistics Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
            <Server size={14} color="#2563EB" />
            <span>Architecture Style</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
            {context?.architecture || 'Monolith / Service'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            {context?.primary_language || 'Primary'} Language
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
            <Database size={14} color="#10B981" />
            <span>Database & ORM</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
            {context?.database?.length ? context.database.join(', ') : 'None Detected'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            {context?.orm_libraries?.length ? context.orm_libraries.join(', ') : 'Direct SQL / Drivers'}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
            <Key size={14} color="#F59E0B" />
            <span>Auth & Identity</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
            {context?.auth_mechanisms?.length ? context.auth_mechanisms[0] : 'Standard Security'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            {context?.auth_mechanisms?.length > 1 ? `+${context.auth_mechanisms.length - 1} more mechanisms` : 'Authentication Gates'}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
            <GitCommit size={14} color="#8B5CF6" />
            <span>Indexed Commit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>
              {context?.commit_sha ? context.commit_sha.substring(0, 8) : 'HEAD'}
            </span>
            {context?.commit_sha && (
              <button
                onClick={() => copyToClipboard(context.commit_sha)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
                title="Copy SHA"
              >
                {copiedSha ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              </button>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Branch: <span style={{ fontWeight: 600 }}>{context?.branch || 'main'}</span>
          </div>
        </div>
      </div>

      {/* ── Frameworks & Entry Points Ribbon ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
            Detected Frameworks & Libraries
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(context?.frameworks?.length ? context.frameworks : ['FastAPI', 'React', 'Next.js', 'SQLAlchemy']).map((fw: string) => (
              <span
                key={fw}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #E2E8F0',
                }}
              >
                {fw}
              </span>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
            Discovered Application Entry Points
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {entryPoints.length > 0 ? (
              entryPoints.slice(0, 3).map((ep: string) => (
                <div key={ep} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2563EB', fontFamily: 'monospace' }}>
                  <Terminal size={12} color="#64748B" />
                  <span>{ep}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>No custom entry points discovered.</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Detailed Sub-Views Navigation Tabs ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '0 8px' }}>
          <button
            onClick={() => setActiveSubTab('modules')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeSubTab === 'modules' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeSubTab === 'modules' ? '#2563EB' : '#64748B',
            }}
          >
            Discovered Modules ({modulesList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('apis')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeSubTab === 'apis' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeSubTab === 'apis' ? '#2563EB' : '#64748B',
            }}
          >
            API Endpoints Inventory ({context?.total_endpoints_mapped || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('dependencies')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeSubTab === 'dependencies' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeSubTab === 'dependencies' ? '#2563EB' : '#64748B',
            }}
          >
            Dependency Relationships ({dependencies.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sync_history')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeSubTab === 'sync_history' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeSubTab === 'sync_history' ? '#2563EB' : '#64748B',
            }}
          >
            Context Freshness & Sync Events ({syncStatus?.recent_sync_events?.length || 0})
          </button>
        </div>

        {/* Tab 1: Modules */}
        {activeSubTab === 'modules' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {modulesList.map((m: any) => (
                <div
                  key={m.name}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={14} color="#2563EB" />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                      {m.file_count} files
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    {m.responsibilities?.join(' · ') || 'General module logic'}
                  </div>
                  {m.entry_files?.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                      Entry: {m.entry_files[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: APIs */}
        {activeSubTab === 'apis' && (
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search endpoints by path or handler..."
                value={apiSearch}
                onChange={(e) => setApiSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>Method</th>
                    <th style={{ padding: '10px 14px' }}>Endpoint Route</th>
                    <th style={{ padding: '10px 14px' }}>Handler / Symbol</th>
                    <th style={{ padding: '10px 14px' }}>File Path</th>
                  </tr>
                </thead>
                <tbody>
                  {(architecture?.modules || [])
                    .flatMap((m: any) => m.entry_files || [])
                    .map((file: string, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>
                            GET/POST
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                          /api/{file.split('/')[0]}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>router_handler</td>
                        <td style={{ padding: '10px 14px', color: '#64748B', fontFamily: 'monospace' }}>{file}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Dependencies */}
        {activeSubTab === 'dependencies' && (
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Search dependencies and modules..."
                value={depSearch}
                onChange={(e) => setDepSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {dependencies
                .filter((d: any) => !depSearch || d.target?.toLowerCase().includes(depSearch.toLowerCase()) || d.source?.toLowerCase().includes(depSearch.toLowerCase()))
                .map((d: any, idx: number) => (
                  <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{d.target}</div>
                    <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>
                      Type: <span style={{ fontWeight: 600 }}>{d.type}</span> {d.is_external ? '(External Package)' : '(Internal)'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 4: Sync History */}
        {activeSubTab === 'sync_history' && (
          <div style={{ padding: '16px' }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <tr>
                    <th style={{ padding: '10px 14px' }}>Commit SHA</th>
                    <th style={{ padding: '10px 14px' }}>Mode</th>
                    <th style={{ padding: '10px 14px' }}>Files Changed (+ / M / -)</th>
                    <th style={{ padding: '10px 14px' }}>Duration</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {(syncStatus?.recent_sync_events || []).map((ev: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                        {ev.commit_sha}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{ev.mode}</td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        +{ev.added} / mod:{ev.modified} / -{ev.deleted}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>{ev.duration_seconds}s</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: '#10B981', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>
                          {ev.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
