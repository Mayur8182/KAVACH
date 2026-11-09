'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Globe,
  Layers,
  Zap,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface ApiSecurityResultsCardProps {
  data?: any;
  result?: any;
}

export function ApiSecurityResultsCard({ data, result }: ApiSecurityResultsCardProps) {
  const cardData = data || result || {};
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  // Track status updates per finding ID
  const [findingStatuses, setFindingStatuses] = useState<Record<string, string>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

  const crit = cardData.critical_count ?? 0;
  const high = cardData.high_count ?? 0;
  const med = cardData.medium_count ?? 0;
  const low = cardData.low_count ?? 0;

  const findingsList: any[] = cardData.findings || [];
  const filteredFindings = findingsList.filter((f: any) => {
    if (activeTab === 'all') return true;
    return (f.severity || '').toLowerCase() === activeTab;
  });

  const protocolCounts = cardData.protocol_counts || {
    REST: cardData.endpoints_count || 12,
    GraphQL: cardData.graphql_count || 0,
    WebSocket: cardData.websocket_count || 0,
    gRPC: cardData.grpc_count || 0,
    SOAP: cardData.soap_count || 0,
    SSE: cardData.sse_count || 0,
  };

  const handleApplyFix = async (findingId: string) => {
    setApplyingId(findingId);
    setActionFeedback(null);
    try {
      const res = await api.apiSecurity.applyFindingFix(findingId);
      setFindingStatuses((prev) => ({ ...prev, [findingId]: 'FIX_APPLIED' }));
      setActionFeedback({
        id: findingId,
        text: res.message || 'Patch applied successfully to codebase.',
        type: 'success',
      });
    } catch (err: any) {
      setActionFeedback({
        id: findingId,
        text: err.message || 'Unable to apply patch automatically.',
        type: 'error',
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleVerifyFix = async (findingId: string) => {
    setVerifyingId(findingId);
    setActionFeedback(null);
    try {
      const res = await api.apiSecurity.verifyFindingFix(findingId);
      const isClean = res.verified || res.status === 'VERIFIED_FIXED';
      setFindingStatuses((prev) => ({
        ...prev,
        [findingId]: isClean ? 'VERIFIED_FIXED' : 'RESOLVED',
      }));
      setActionFeedback({
        id: findingId,
        text: res.message || 'Deterministic AST rescan completed successfully.',
        type: isClean ? 'success' : 'error',
      });
    } catch (err: any) {
      setActionFeedback({
        id: findingId,
        text: err.message || 'Rescan verification failed.',
        type: 'error',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 22px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB',
            }}
          >
            <Globe size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Kavach Multi-Protocol API Security Assessment
            </h4>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Target: <strong>{cardData.target_name || cardData.repository || 'Kavach API Gateway'}</strong> ({cardData.base_url || 'Active Codebase'})
            </div>
          </div>
        </div>

        {/* Action Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/api-security/inventory"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Layers size={13} />
            <span>Inventory</span>
          </Link>
          <Link
            href="/api-security/fix-verify"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              backgroundColor: '#F0FDF4',
              color: '#15803D',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ShieldCheck size={13} />
            <span>Fix & Verify</span>
          </Link>
          <Link
            href={cardData.dashboard_url || '/api-security'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Dashboard</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Multi-Protocol Discovery Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '8px 12px',
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
          Protocols Detected:
        </span>
        {Object.entries(protocolCounts).map(([proto, count]: [string, any]) => (
          <span
            key={proto}
            style={{
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: count > 0 ? '#EFF6FF' : '#F1F5F9',
              color: count > 0 ? '#1D4ED8' : '#64748B',
              border: `1px solid ${count > 0 ? '#BFDBFE' : '#E2E8F0'}`,
            }}
          >
            {proto}: <strong>{count}</strong>
          </span>
        ))}
      </div>

      {/* 4 Severity Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Critical', count: crit, bg: '#FEF2F2', text: '#DC2626' },
          { label: 'High', count: high, bg: '#FFF7ED', text: '#EA580C' },
          { label: 'Medium', count: med, bg: '#FEFCE8', text: '#D97706' },
          { label: 'Low', count: low, bg: '#F1F5F9', text: '#475569' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              backgroundColor: m.bg,
              border: `1px solid ${m.bg === '#FEF2F2' ? '#FECACA' : '#E2E8F0'}`,
              borderRadius: 8,
              padding: '10px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: m.text }}>
              {m.count}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: m.text, textTransform: 'uppercase', marginTop: 2 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tests Telemetry Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          fontSize: 12,
          color: '#334155',
          marginBottom: 16,
        }}
      >
        <div>
          Total Endpoints Tested: <strong>{cardData.endpoints_count ?? 0}</strong>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ color: '#16A34A', fontWeight: 600 }}>
            Passed: {cardData.tests_passed ?? 0}
          </span>
          <span style={{ color: '#DC2626', fontWeight: 600 }}>
            Failed: {cardData.tests_failed ?? 0}
          </span>
        </div>
      </div>

      {/* Findings Catalog List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            Verified API Vulnerabilities ({filteredFindings.length})
          </span>
          {filteredFindings.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'critical', 'high', 'medium'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeTab === t ? '#0F172A' : '#F1F5F9',
                    color: activeTab === t ? '#FFFFFF' : '#475569',
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredFindings.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 8,
              border: '1px dashed #CBD5E1',
              color: '#64748B',
              fontSize: 13,
            }}
          >
            <CheckCircle2 size={24} color="#16A34A" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: '#0F172A' }}>Zero Vulnerabilities in Selected Category</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>All verified multi-protocol API endpoints meet security baselines.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredFindings.map((f: any, idx: number) => {
              const sev = (f.severity || '').toUpperCase();
              const isCrit = sev === 'CRITICAL';
              const isHigh = sev === 'HIGH';
              const currentStatus = findingStatuses[f.id] || f.status || 'OPEN';
              const isVerified = currentStatus === 'VERIFIED_FIXED';
              const isFixApplied = currentStatus === 'RESOLVED' || currentStatus === 'FIX_APPLIED';

              return (
                <div
                  key={f.id || idx}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    backgroundColor: isVerified ? '#F0FDF4' : '#FFFFFF',
                    border: `1px solid ${isVerified ? '#BBF7D0' : '#E2E8F0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: isCrit ? '#FEF2F2' : isHigh ? '#FFF7ED' : '#FEFCE8',
                            color: isCrit ? '#DC2626' : isHigh ? '#EA580C' : '#D97706',
                          }}
                        >
                          {f.severity}
                        </span>

                        {isVerified ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <ShieldCheck size={11} />
                            VERIFIED FIXED
                          </span>
                        ) : isFixApplied ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Zap size={11} />
                            FIX APPLIED
                          </span>
                        ) : null}

                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                          {f.title}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        <code>{f.method || 'ROUTE'} {f.path || f.code_file_path || '/api'}</code>
                        {f.line_number && <span>:{f.line_number}</span>} · <strong>{f.cwe || 'CWE'}</strong> · {f.owasp_category || f.category || 'API Security'}
                      </div>

                      <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                        {f.description}
                      </div>
                    </div>

                    {/* Action Buttons for this finding */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {!isVerified && !isFixApplied && (
                        <button
                          type="button"
                          onClick={() => handleApplyFix(f.id)}
                          disabled={applyingId === f.id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: applyingId === f.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {applyingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                          <span>1-Click Fix</span>
                        </button>
                      )}

                      {!isVerified && (
                        <button
                          type="button"
                          onClick={() => handleVerifyFix(f.id)}
                          disabled={verifyingId === f.id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: verifyingId === f.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {verifyingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                          <span>Verify</span>
                        </button>
                      )}

                      <Link
                        href={`/api-security/fix-verify?findingId=${f.id}`}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>Studio</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>

                  {/* Inline feedback if any */}
                  {actionFeedback && actionFeedback.id === f.id && (
                    <div
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        backgroundColor: actionFeedback.type === 'success' ? '#DCFCE7' : '#FEF2F2',
                        color: actionFeedback.type === 'success' ? '#15803D' : '#DC2626',
                        border: `1px solid ${actionFeedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                      }}
                    >
                      {actionFeedback.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}