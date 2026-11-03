'use client';

/**
 * Thing Attack — API Endpoint Detail (/attack/apis/:apiId)
 * Deep dive into an individual API endpoint:
 * Overview, Auth, Parameters, Schemas, Security Checks (BOLA, IDOR, SSRF, Injection), Findings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  SeverityBadge,
  AttackStatusBadge,
  ProvenanceBadge,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackApiEndpointDetailResponse } from '@/types/api/attack';
import {
  ArrowLeft,
  FileCode2,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react';

export default function ApiEndpointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const endpointId = params?.apiId as string;

  const [detail, setDetail] = useState<AttackApiEndpointDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!endpointId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.apiDetail(endpointId);
      setDetail(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load endpoint detail');
    } finally {
      setLoading(false);
    }
  }, [endpointId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <AttackWorkshell>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading endpoint security assertions...
        </div>
      </AttackWorkshell>
    );
  }

  if (error || !detail) {
    return (
      <AttackWorkshell>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>{error || 'API endpoint not found'}</p>
          <button
            onClick={() => router.push('/attack/apis')}
            style={{
              padding: '6px 12px',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            ← Back to API Inventory
          </button>
        </div>
      </AttackWorkshell>
    );
  }

  const { endpoint } = detail;
  const checks = detail.security_checks || {};

  return (
    <AttackWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.push('/attack/apis')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <ArrowLeft size={13} /> API Inventory
          </button>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{endpoint.path}</span>
        </div>

        {/* Header Card */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: endpoint.method === 'GET' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: endpoint.method === 'GET' ? '#60a5fa' : '#f87171',
                }}
              >
                {endpoint.method}
              </span>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                {endpoint.path}
              </h2>
              <SeverityBadge severity={endpoint.risk_level} size="sm" />
              <AttackStatusBadge status={endpoint.test_status} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
              <span>Target Asset: <strong>{endpoint.asset_name || 'Unassigned'}</strong></span>
              <span>Authentication: <strong>{endpoint.auth_type}</strong></span>
              <span>Discovery Source: <ProvenanceBadge provenance={endpoint.discovery_source} /></span>
              <span>Last Tested: <strong>{endpoint.last_tested || 'Never'}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => router.push('/attack/dast')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <Flame size={12} />
              Test This Endpoint
            </button>
          </div>
        </div>

        {/* Security Checks Matrix */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <h3 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Security Test Assertions &amp; Invariants
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { key: 'bola_idor', label: 'BOLA / IDOR Boundary' },
              { key: 'auth_bypass', label: 'Authentication Bypass' },
              { key: 'sqli', label: 'SQL / NoSQL Injection' },
              { key: 'rate_limiting', label: 'Rate Limiting / Abuse' },
              { key: 'sensitive_data', label: 'Sensitive Data Exposure' },
              { key: 'ssrf', label: 'SSRF Validation' },
            ].map((check) => {
              const val = checks[check.key] || 'NOT_TESTED';
              const isPass = val === 'PASS' || val === 'VERIFIED_SAFE';
              const isFail = val === 'FAIL' || val === 'EXPLOITABLE';

              return (
                <div
                  key={check.key}
                  style={{
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {check.label}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isPass ? 'rgba(16, 185, 129, 0.15)' : isFail ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: isPass ? '#10b981' : isFail ? '#ef4444' : '#9ca3af',
                    }}
                  >
                    {val.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schemas & Parameters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Request Schema */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Request Schema &amp; Parameters
            </h3>
            <pre
              style={{
                background: '#0d1117',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11px',
                color: '#e6edf3',
                fontFamily: 'monospace',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(detail.request_schema || detail.parameters, null, 2)}
            </pre>
          </div>

          {/* Response Schema */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Response Schema
            </h3>
            <pre
              style={{
                background: '#0d1117',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11px',
                color: '#7ee787',
                fontFamily: 'monospace',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(detail.response_schema, null, 2)}
            </pre>
          </div>
        </div>

        {/* Associated Findings */}
        {detail.findings && detail.findings.length > 0 && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Findings Detected on this Endpoint ({detail.findings.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {detail.findings.map((f) => (
                <div
                  key={f.id}
                  onClick={() => router.push(`/attack/findings/${f.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SeverityBadge severity={f.severity} size="sm" />
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.title}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>{f.exploitability}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AttackWorkshell>
  );
}
