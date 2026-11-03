'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Globe,
  Layers,
  Activity,
} from 'lucide-react';

interface ApiSecurityResultsCardProps {
  data?: any;
  result?: any;
}

export function ApiSecurityResultsCard({ data, result }: ApiSecurityResultsCardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'medium'>('all');
  const cardData = data || result || {};

  const crit = cardData.critical_count ?? 0;
  const high = cardData.high_count ?? 0;
  const med = cardData.medium_count ?? 0;
  const low = cardData.low_count ?? 0;
  const total = (cardData.findings?.length) ?? (crit + high + med + low);

  const findingsList = cardData.findings || [];
  const filteredFindings = findingsList.filter((f: any) => {
    if (activeTab === 'all') return true;
    return (f.severity || '').toLowerCase() === activeTab;
  });

  return (
    <div
      style={{
        marginTop: 14,
        padding: '22px 24px',
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
              width: 36,
              height: 36,
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
              API Security Verification
            </h4>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Target: <strong>{cardData.target_name || 'Control Plane API'}</strong> ({cardData.base_url || 'http://127.0.0.1:8000'})
            </div>
          </div>
        </div>

        <Link
          href={cardData.dashboard_url || '/api-security'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <span>Open API Dashboard</span>
          <ExternalLink size={13} />
        </Link>
      </div>

      {/* 4 Severity Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 18,
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
          Endpoints Tested: <strong>{cardData.endpoints_count ?? 0}</strong>
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

      {/* OWASP Top 10 Summary Chips */}
      {cardData.owasp_categories && cardData.owasp_categories.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
            OWASP API Security Top 10 Coverage
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {cardData.owasp_categories.map((cat: any, i: number) => {
              const isFail = cat.status === 'FAIL';
              const isWarn = cat.status === 'WARN';
              return (
                <span
                  key={i}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: isFail ? '#FEF2F2' : isWarn ? '#FEFCE8' : '#F0FDF4',
                    color: isFail ? '#DC2626' : isWarn ? '#B45309' : '#15803D',
                    border: `1px solid ${isFail ? '#FECACA' : isWarn ? '#FEF08A' : '#DCFCE7'}`,
                  }}
                >
                  {cat.code || cat.name}: {cat.status}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Findings Catalog List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            Detected API Vulnerabilities ({filteredFindings.length})
          </span>
          {filteredFindings.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'high', 'medium'] as const).map((t) => (
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
            <div style={{ fontWeight: 600, color: '#0F172A' }}>No API vulnerabilities detected</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>All evaluated endpoints passed deterministic OWASP API checks.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredFindings.map((f: any, idx: number) => {
              const isHigh = (f.severity || '').toUpperCase() === 'HIGH';
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: isHigh ? '#FEF2F2' : '#FEFCE8',
                          color: isHigh ? '#DC2626' : '#D97706',
                        }}
                      >
                        {f.severity}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        {f.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      <code>{f.method || 'GET'} {f.path || '/api'}</code> · {f.cwe || 'CWE'} · {f.owasp_category || 'OWASP API'}
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                      {f.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
