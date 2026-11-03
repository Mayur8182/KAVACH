'use client';

import React, { useState } from 'react';
import {
  Cloud,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Server,
  Database,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  Layers,
  Box,
  Key,
  Info,
  ChevronRight,
  Search,
} from 'lucide-react';

export interface ActionButtonDef {
  id: string;
  label: string;
  action_type?: string; // 'api_call', 'navigate', 'open_modal', 'custom', 'download'
  target?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  icon?: string;
  payload?: Record<string, any>;
}

export interface UniversalDynamicSchema {
  version?: string;
  component: string;
  title?: string;
  subtitle?: string;
  props?: Record<string, any>;
  data?: Record<string, any>;
  actions?: ActionButtonDef[];
  state?: string;
  error?: string;
}

export interface UniversalDynamicWorkspaceCardProps {
  schema: UniversalDynamicSchema;
  onAction?: (action: ActionButtonDef) => void;
  onSendMessage?: (text: string) => void;
  onOpenModal?: (modalTarget: string, payload?: any) => void;
}

export function UniversalDynamicWorkspaceCard({
  schema,
  onAction,
  onSendMessage,
  onOpenModal,
}: UniversalDynamicWorkspaceCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('ALL');

  const componentType = schema.component;
  const title = schema.title || 'Dynamic Security Workspace';
  const subtitle = schema.subtitle || '';
  const props = schema.props || {};
  const data = schema.data || {};
  const actions = schema.actions || [];

  const handleActionClick = (act: ActionButtonDef) => {
    if (onAction) {
      onAction(act);
    }
    if (act.action_type === 'open_modal' && act.target && onOpenModal) {
      onOpenModal(act.target, act.payload);
    } else if (act.action_type === 'navigate' && act.target) {
      window.location.href = act.target;
    } else if (act.action_type === 'custom' && onSendMessage) {
      if (act.target === 'scan_secrets') {
        onSendMessage('scan secrets');
      } else if (act.target === 'enforce_cloud_policy') {
        onSendMessage('enforce policy block public s3');
      } else {
        onSendMessage(act.label);
      }
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CLOUD CONNECT PROMPT (Phase 9 when NOT connected)
  // ───────────────────────────────────────────────────────────────────────────
  if (componentType === 'cloud_connect_prompt') {
    const providers = data.supported_providers || [
      {
        id: 'aws',
        name: 'Amazon Web Services',
        icon: 'aws',
        auth_method: 'Cross-Account IAM Role / STS',
        features: ['S3 Public Access Block', 'IAM Escalation Detection', 'Security Group Audits'],
      },
      {
        id: 'azure',
        name: 'Microsoft Azure',
        icon: 'azure',
        auth_method: 'ARM Managed Identity / App Registration',
        features: ['NSG & Public IP Audits', 'RBAC Role Evaluation', 'CIS Azure Baselines'],
      },
      {
        id: 'gcp',
        name: 'Google Cloud Platform',
        icon: 'gcp',
        auth_method: 'Workload Identity Federation',
        features: ['IAM Service Account Keys', 'Cloud Storage Bucket ACLs', 'VPC Perimeter Checks'],
      },
    ];

    return (
      <div
        style={{
          marginTop: 14,
          padding: '22px 24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 14,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Cloud size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {title}
                </h4>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                  }}
                >
                  Not Connected
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '4px 0 0' }}>{subtitle}</p>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            fontSize: 12,
            color: '#475569',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
            🛡️ Zero-Mock Security Directives Active:
          </div>
          Kavach only evaluates authentic infrastructure telemetry. Connect your cloud account with read-only
          permissions to discover cloud assets, audit IAM privileges, and verify CIS benchmarks.
        </div>

        {/* Cloud Provider Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          {providers.map((p: any) => (
            <div
              key={p.id}
              style={{
                padding: '16px 18px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    {p.id.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 10 }}>
                  Auth: <code style={{ color: '#0F172A', backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: 4 }}>{p.auth_method}</code>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#475569', lineHeight: 1.6 }}>
                  {(p.features || []).map((feat: string, idx: number) => (
                    <li key={idx}>{feat}</li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenModal) {
                    onOpenModal('connect_integration', { provider: p.id });
                  } else if (onSendMessage) {
                    onSendMessage(`connect ${p.id}`);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Connect {p.name}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CLOUD SECURITY POSTURE DASHBOARD (Phase 9 when connected)
  // ───────────────────────────────────────────────────────────────────────────
  if (componentType === 'cloud_posture') {
    const counts = data.counts || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    const observations = data.observations || [];
    const complianceScore = props.compliance_score ?? data.compliance_score ?? 88;
    const assetsCount = props.assets_count ?? data.assets_count ?? observations.length;
    const connections = data.connections || [];

    const filteredObservations = observations.filter((obs: any) => {
      const matchSearch =
        searchTerm === '' ||
        (obs.rule_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (obs.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (obs.resource_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchProv =
        selectedProviderFilter === 'ALL' ||
        (obs.provider || '').toUpperCase() === selectedProviderFilter.toUpperCase();
      return matchSearch && matchProv;
    });

    return (
      <div
        style={{
          marginTop: 14,
          padding: '22px 24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 14,
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: complianceScore >= 80 ? '#DCFCE7' : '#FEF3C7',
                border: `2px solid ${complianceScore >= 80 ? '#16A34A' : '#D97706'}`,
                color: complianceScore >= 80 ? '#15803D' : '#B45309',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{complianceScore}</span>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Score</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {title}
                </h4>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    backgroundColor: '#DCFCE7',
                    color: '#16A34A',
                  }}
                >
                  Active Telemetry
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '4px 0 0' }}>{subtitle}</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {actions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => handleActionClick(act)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: act.variant === 'primary' ? '#0F172A' : '#FFFFFF',
                  color: act.variant === 'primary' ? '#FFFFFF' : '#0F172A',
                  border: act.variant === 'primary' ? 'none' : '1px solid #CBD5E1',
                }}
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Stat Metric Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
          }}
        >
          <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Cloud Assets</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{assetsCount}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>Critical Risks</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626', marginTop: 2 }}>{counts.critical}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#EA580C' }}>High Misconfigs</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#EA580C', marginTop: 2 }}>{counts.high}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB' }}>Total Findings</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#2563EB', marginTop: 2 }}>{counts.total}</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              padding: '6px 12px',
              flex: 1,
              maxWidth: 320,
            }}
          >
            <Search size={14} color="#94A3B8" style={{ marginRight: 8 }} />
            <input
              type="text"
              placeholder="Search cloud rule or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: 12,
                color: '#0F172A',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'AWS', 'AZURE', 'GCP'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedProviderFilter(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: selectedProviderFilter === p ? '1px solid #0F172A' : '1px solid #E2E8F0',
                  backgroundColor: selectedProviderFilter === p ? '#0F172A' : '#FFFFFF',
                  color: selectedProviderFilter === p ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Observations Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '9px 14px' }}>Severity</th>
                <th style={{ padding: '9px 14px' }}>Rule ID / Misconfiguration</th>
                <th style={{ padding: '9px 14px' }}>Resource Target</th>
                <th style={{ padding: '9px 14px' }}>Provider</th>
                <th style={{ padding: '9px 14px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredObservations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px 14px', textAlign: 'center', color: '#94A3B8' }}>
                    Zero findings matching filter criteria. All evaluated cloud rules satisfy security baseline.
                  </td>
                </tr>
              ) : (
                filteredObservations.map((obs: any, i: number) => {
                  const sev = (obs.severity || 'MEDIUM').toUpperCase();
                  const sevColor =
                    sev === 'CRITICAL' ? '#DC2626' : sev === 'HIGH' ? '#EA580C' : sev === 'MEDIUM' ? '#D97706' : '#16A34A';
                  const sevBg =
                    sev === 'CRITICAL' ? '#FEF2F2' : sev === 'HIGH' ? '#FFF7ED' : sev === 'MEDIUM' ? '#FEFCE8' : '#F0FDF4';

                  return (
                    <tr
                      key={obs.id || i}
                      style={{
                        borderBottom: i === filteredObservations.length - 1 ? 'none' : '1px solid #F1F5F9',
                      }}
                      className="hover:bg-slate-50"
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: sevBg,
                            color: sevColor,
                          }}
                        >
                          {sev}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>
                        {obs.rule_id || obs.title || 'Cloud Misconfiguration'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>
                        {obs.resource_name || obs.provider_resource_id || 'AWS S3 Bucket'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                          {(obs.provider || 'AWS').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSendMessage) {
                              onSendMessage(`Remediate cloud finding ${obs.rule_id || obs.id}`);
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#0F172A',
                            cursor: 'pointer',
                          }}
                        >
                          Remediate
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
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CAPABILITY UNAVAILABLE CARD (Phase 6 / Production Transparency)
  // ───────────────────────────────────────────────────────────────────────────
  if (componentType === 'capability_unavailable') {
    return (
      <div
        style={{
          marginTop: 14,
          padding: '20px 22px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Info size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{title}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 4,
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                }}
              >
                In Development
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
          {data.reason || 'This capability is not yet connected to an active production backend service.'}
        </div>

        {actions.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {actions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => handleActionClick(act)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                }}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. UNIVERSAL DYNAMIC CARD (Default fallback for tables, forms, metrics)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 22px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h4>
          {subtitle && <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>{subtitle}</p>}
        </div>
        {props.badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
            }}
          >
            {props.badge}
          </span>
        )}
      </div>

      {/* Render Actions */}
      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => handleActionClick(act)}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: act.variant === 'primary' ? '#0F172A' : '#FFFFFF',
                color: act.variant === 'primary' ? '#FFFFFF' : '#0F172A',
                border: act.variant === 'primary' ? 'none' : '1px solid #CBD5E1',
              }}
            >
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
