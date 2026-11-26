'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Bot,
  RefreshCw,
  Search,
  Plus,
  Play,
  Cpu,
  Server,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface ModelSource {
  id: string;
  name: string;
  source_type: string;
  status: string;
  status_message?: string;
  model_count?: number;
  last_synced_at?: string;
  created_at?: string;
}

interface ModelAsset {
  id: string;
  model_id_str: string;
  name: string;
  provider: string;
  model_family?: string;
  task_type?: string;
  model_format?: string;
  risk_level: string;
  security_score: number;
  finding_count: number;
  deployment_status?: string;
  integrity_status?: string;
  last_scanned_at?: string;
}

interface ModelFinding {
  id: string;
  title: string;
  severity: string;
  status: string;
  finding_type: string;
  model_name?: string;
  created_at?: string;
}

export default function ModelSecurityPage() {
  const [models, setModels] = useState<ModelAsset[]>([]);
  const [sources, setSources] = useState<ModelSource[]>([]);
  const [findings, setFindings] = useState<ModelFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'sources' | 'findings'>('inventory');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsRes, sourcesRes, findingsRes] = await Promise.allSettled([
        api.get<any>('/api/v1/model-security/models'),
        api.get<any>('/api/v1/model-security/sources'),
        api.get<any>('/api/v1/model-security/findings'),
      ]);

      if (modelsRes.status === 'fulfilled' && modelsRes.value?.models) {
        setModels(modelsRes.value.models);
      } else {
        setModels([]);
      }

      if (sourcesRes.status === 'fulfilled' && sourcesRes.value?.sources) {
        setSources(sourcesRes.value.sources);
      } else {
        setSources([]);
      }

      if (findingsRes.status === 'fulfilled' && findingsRes.value?.findings) {
        setFindings(findingsRes.value.findings);
      } else {
        setFindings([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load model security data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.model_family && m.model_family.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const highRiskCount = models.filter(
    (m) => m.risk_level === 'CRITICAL' || m.risk_level === 'HIGH'
  ).length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6366F1',
                backgroundColor: '#EEF2FF',
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              AI & LLM Security
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Model Security & Governance
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Continuous security scanning, integrity verification, and runtime defense for AI models & weights.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchData()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Total Discovered Models</span>
            <Bot size={16} color="#6366F1" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '8px' }}>
            {models.length}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            Across connected repositories & sources
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Connected Model Sources</span>
            <Server size={16} color="#0EA5E9" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '8px' }}>
            {sources.length}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            HuggingFace, SageMaker, GitHub & registries
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Open Security Findings</span>
            <ShieldAlert size={16} color="#EF4444" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '8px' }}>
            {findings.length}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            Pickle exploits, backdoors, & vulnerabilities
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>High / Critical Risk Models</span>
            <AlertTriangle size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginTop: '8px' }}>
            {highRiskCount}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            Requires immediate triage & hardening
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: activeTab === 'inventory' ? '#0F172A' : '#64748B',
            borderBottom: activeTab === 'inventory' ? '2px solid #0F172A' : '2px solid transparent',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            borderBottomColor: activeTab === 'inventory' ? '#0F172A' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Model Inventory ({models.length})
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: activeTab === 'sources' ? '#0F172A' : '#64748B',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            borderBottomColor: activeTab === 'sources' ? '#0F172A' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Connected Sources ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: activeTab === 'findings' ? '#0F172A' : '#64748B',
            background: 'none',
            border: 'none',
            borderBottomWidth: '2px',
            borderBottomStyle: 'solid',
            borderBottomColor: activeTab === 'findings' ? '#0F172A' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Security Findings ({findings.length})
        </button>
      </div>

      {/* Tab Content: Inventory */}
      {activeTab === 'inventory' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
              <Search
                size={14}
                color="#94A3B8"
                style={{ position: 'absolute', left: '10px', top: '10px' }}
              />
              <input
                type="text"
                placeholder="Search models by name, provider, or family..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  fontSize: '12.5px',
                  borderRadius: '7px',
                  border: '1px solid #E2E8F0',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Showing {filteredModels.length} of {models.length} models
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Loading Model Inventory…
            </div>
          ) : error ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#EF4444', fontSize: '13px' }}>
              <AlertTriangle size={24} style={{ margin: '0 auto 12px', color: '#EF4444' }} />
              <div>Failed to load models: {error}</div>
              <button
                onClick={() => fetchData()}
                style={{
                  marginTop: '12px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : filteredModels.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <Bot size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                No AI Models Found
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 16px', maxWidth: '420px' }}>
                Connect a model registry (HuggingFace, SageMaker, or Git repositories) to discover and audit model artifacts.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Model</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Provider</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Format</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Risk Level</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Security Score</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Findings</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((m) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{m.model_id_str}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{m.provider}</td>
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                      {m.model_format || 'Safetensors / GGUF'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            m.risk_level === 'CRITICAL'
                              ? '#FEE2E2'
                              : m.risk_level === 'HIGH'
                                ? '#FFEDD5'
                                : m.risk_level === 'MEDIUM'
                                  ? '#FEF3C7'
                                  : '#DCFCE7',
                          color:
                            m.risk_level === 'CRITICAL'
                              ? '#991B1B'
                              : m.risk_level === 'HIGH'
                                ? '#9A3412'
                                : m.risk_level === 'MEDIUM'
                                  ? '#92400E'
                                  : '#166534',
                        }}
                      >
                        {m.risk_level || 'LOW'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                      {m.security_score ?? 100} / 100
                    </td>
                    <td style={{ padding: '12px 16px', color: m.finding_count > 0 ? '#EF4444' : '#16A34A', fontWeight: 600 }}>
                      {m.finding_count} open
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Content: Sources */}
      {activeTab === 'sources' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Loading Connected Model Sources…
            </div>
          ) : sources.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <Server size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                No Model Sources Connected
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 16px', maxWidth: '420px' }}>
                Connect Hugging Face, Amazon SageMaker, AWS Bedrock, or custom inference endpoints to start automated security scanning.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Source Name</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Type</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Status</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Models</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Last Synced</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{s.name}</td>
                    <td style={{ padding: '12px 16px', color: '#334155', textTransform: 'capitalize' }}>
                      {s.source_type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: s.status === 'CONNECTED' ? '#DCFCE7' : '#FEE2E2',
                          color: s.status === 'CONNECTED' ? '#166534' : '#991B1B',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>{s.model_count ?? 0}</td>
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>
                      {s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Content: Findings */}
      {activeTab === 'findings' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Loading Security Findings…
            </div>
          ) : findings.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <ShieldCheck size={36} color="#16A34A" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                No Security Findings Detected
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '6px auto 16px', maxWidth: '420px' }}>
                All scanned model weights, serialization pickles, and configurations adhere to safe AI execution standards.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Finding</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Severity</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Type</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Model</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: '#475569', fontSize: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{f.title}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            f.severity === 'CRITICAL'
                              ? '#FEE2E2'
                              : f.severity === 'HIGH'
                                ? '#FFEDD5'
                                : '#FEF3C7',
                          color:
                            f.severity === 'CRITICAL'
                              ? '#991B1B'
                              : f.severity === 'HIGH'
                                ? '#9A3412'
                                : '#92400E',
                        }}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px' }}>{f.finding_type}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{f.model_name || 'Global'}</td>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 500 }}>{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

