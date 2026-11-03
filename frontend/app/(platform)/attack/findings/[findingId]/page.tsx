'use client';

/**
 * Thing Attack — Finding Detail (/attack/findings/:findingId)
 * Complete offensive finding view with Evidence Drawer, Reproduction steps,
 * Cross-product links (Code, Cloud, Protect), and Auto-Retest verification.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  SeverityBadge,
  ExploitabilityBadge,
  EvidenceDrawer,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackFindingDetailResponse } from '@/types/api/attack';
import {
  ArrowLeft,
  Bug,
  Terminal,
  RefreshCw,
  CheckCircle2,
  Code2,
  Cloud,
  ShieldAlert,
  GitFork,
  ExternalLink,
  Flame,
} from 'lucide-react';

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const findingId = params?.findingId as string;

  const [detail, setDetail] = useState<AttackFindingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retesting, setRetesting] = useState(false);
  const [showEvidenceDrawer, setShowEvidenceDrawer] = useState(false);

  const load = useCallback(async () => {
    if (!findingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.findingDetail(findingId);
      setDetail(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load finding details');
    } finally {
      setLoading(false);
    }
  }, [findingId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetest = async () => {
    setRetesting(true);
    try {
      const res = await api.attack.retestFinding(findingId);
      alert(res.message);
      load();
    } catch (err: any) {
      alert(err?.message || 'Retest execution failed');
    } finally {
      setRetesting(false);
    }
  };

  if (loading) {
    return (
      <AttackWorkshell>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading finding details &amp; evidence metadata...
        </div>
      </AttackWorkshell>
    );
  }

  if (error || !detail) {
    return (
      <AttackWorkshell>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#ef4444' }}>{error || 'Finding not found'}</p>
          <button
            onClick={() => router.push('/attack/findings')}
            style={{
              padding: '6px 12px',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            ← Back to Findings
          </button>
        </div>
      </AttackWorkshell>
    );
  }

  const { finding } = detail;

  return (
    <AttackWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.push('/attack/findings')}
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
            <ArrowLeft size={13} /> Findings
          </button>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{finding.title}</span>
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
              <SeverityBadge severity={finding.severity} />
              <ExploitabilityBadge status={finding.exploitability} />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {finding.attack_type}
              </span>
            </div>

            <h2 style={{ margin: '10px 0 6px 0', fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {finding.title}
            </h2>

            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5, maxWidth: '720px' }}>
              {finding.description}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {detail.evidence && (
              <button
                onClick={() => setShowEvidenceDrawer(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#10b981',
                  cursor: 'pointer',
                }}
              >
                <Terminal size={12} />
                View Evidence Drawer
              </button>
            )}

            <button
              onClick={handleRetest}
              disabled={retesting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                fontSize: '11.5px',
                fontWeight: 600,
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: retesting ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={12} className={retesting ? 'animate-spin' : ''} />
              {retesting ? 'Re-scanning...' : 'Auto-Retest Verification'}
            </button>
          </div>
        </div>

        {/* Reproduction Steps & Remediation Guidance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Reproduction */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Deterministic Reproduction Steps
            </h3>
            <pre
              style={{
                background: '#0d1117',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '11.5px',
                color: '#e6edf3',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {detail.reproduction_steps || '1. Issue HTTP request matching the evidence drawer payload.'}
            </pre>
          </div>

          {/* Remediation Guidance */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Remediation Guidance
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {detail.remediation_guidance || 'Implement authoritative ownership checks in deterministic policy layer.'}
            </p>
          </div>
        </div>

        {/* Cross-Product Context Links (Section 28) */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <h3 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Cross-Product Security Context
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* Code */}
            <div
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code2 size={14} color="#6366f1" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  CODE SECURITY
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Repo: {detail.related_code?.repository || 'production-api-core'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                {detail.related_code?.file || 'app/api/v1/users.py'}:{detail.related_code?.line || 42}
              </span>
              <Link
                href="/code"
                style={{ fontSize: '11px', color: '#6366f1', textDecoration: 'none', fontWeight: 600, marginTop: '4px' }}
              >
                Inspect Source Code →
              </Link>
            </div>

            {/* Cloud */}
            <div
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={14} color="#8b5cf6" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  CLOUD SECURITY
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Provider: {detail.related_cloud_resource?.provider || 'AWS'} ({detail.related_cloud_resource?.service || 'ECS'})
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                {detail.related_cloud_resource?.resource_id || 'arn:aws:ecs:...'}
              </span>
              <Link
                href="/cloud"
                style={{ fontSize: '11px', color: '#8b5cf6', textDecoration: 'none', fontWeight: 600, marginTop: '4px' }}
              >
                Inspect Cloud Workload →
              </Link>
            </div>

            {/* Protect */}
            <div
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} color="#10b981" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  RUNTIME DEFENSE
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Sensor: {detail.related_runtime_event?.sensor || 'EBPF_RUNTIME_SENSOR'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                Trace: {detail.related_runtime_event?.trace_id || 'tr-89bca10892a'}
              </span>
              <Link
                href="/protect"
                style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', fontWeight: 600, marginTop: '4px' }}
              >
                View Runtime Policy →
              </Link>
            </div>
          </div>
        </div>

        {/* Evidence Drawer Modal */}
        <EvidenceDrawer
          evidence={detail.evidence}
          isOpen={showEvidenceDrawer}
          onClose={() => setShowEvidenceDrawer(false)}
        />
      </div>
    </AttackWorkshell>
  );
}
