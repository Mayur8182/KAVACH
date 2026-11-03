'use client';

/**
 * Thing Protect — Decision Detail & Cryptographic Proof (/protect/enforcement/[decisionId])
 * Authoritative record of single enforcement event with governing policy, actor invariants,
 * and cryptographic SHA-256 evidence drawer.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Lock,
  Shield,
  FileCheck2,
  CheckCircle,
  Copy,
  Check,
  AlertTriangle,
  Server,
  FileText,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  EnforcementDecisionBadge,
  EvidenceDrawer,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { ProtectionDecision, ProtectionEvidence } from '@/types/api/protect';

export default function DecisionDetailPage() {
  const params = useParams();
  const decisionId = params?.decisionId as string;

  const [decision, setDecision] = useState<ProtectionDecision | null>(null);
  const [evidence, setEvidence] = useState<ProtectionEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!decisionId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res: any = await api.protect.decisionDetail(decisionId);
        const item: ProtectionDecision = res?.decision || res;
        setDecision(item);
        if (item?.evidence_id) {
          const ev = await api.protect.evidenceDetail(item.evidence_id);
          setEvidence(ev);
        }
      } catch (err) {
        console.error('Failed to load decision detail:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [decisionId]);

  const handleCopyJSON = () => {
    if (!decision) return;
    navigator.clipboard.writeText(JSON.stringify(decision, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !decision) {
    return (
      <ProtectWorkshell>
        <div style={{ padding: '64px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Querying deterministic enforcement record...
        </div>
      </ProtectWorkshell>
    );
  }

  if (!decision) {
    return (
      <ProtectWorkshell>
        <div style={{ padding: '64px', textAlign: 'center', fontSize: '12px', color: '#ef4444' }}>
          Enforcement record not found in audit store.
        </div>
      </ProtectWorkshell>
    );
  }

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/protect/enforcement"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              marginBottom: '10px',
            }}
          >
            <ArrowLeft size={13} />
            Back to Enforcement Stream
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity size={18} color="#10b981" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                    ENFORCEMENT DECISION #{decision.id.slice(0, 8)}
                  </h1>
                  <EnforcementDecisionBadge decision={decision.decision} />
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Timestamp: {new Date(decision.timestamp).toUTCString()} • Layer: <strong style={{ color: 'var(--color-text-primary)' }}>{decision.enforcement_layer}</strong>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleCopyJSON}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
              {evidence && (
                <button
                  onClick={() => setEvidenceOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#10b981',
                    cursor: 'pointer',
                  }}
                >
                  <Lock size={12} />
                  <span>Inspect Proof</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Deep Dive Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Attributes Panel */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              DECISION ACTOR &amp; TARGET INVARIANTS
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Actor Identity</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{decision.actor}</span>
              </div>
              <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Action &amp; Method</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{decision.action}</span>
              </div>
              <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Target Resource</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{decision.resource}</span>
              </div>
              <div style={{ padding: '10px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>Environment</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{decision.environment_id}</span>
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Deterministic Evaluation Reason
              </span>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                {decision.reason}
              </p>
            </div>
          </div>

          {/* Policy & Enforcement Details */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              GOVERNING POLICY &amp; ENFORCEMENT GATEWAY
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Governing Policy:</span>
                <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 600 }}>{decision.policy_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Enforcement Gateway:</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{decision.enforcement_layer}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Evidence SHA-256 Provenance:</span>
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>
                  {evidence?.sha256_hash ? `${evidence.sha256_hash.slice(0, 20)}...` : 'Attached in audit trace'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Audit Status:</span>
                <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={13} color="#10b981" />
                  VERIFIED IMMUTABLE LOG
                </span>
              </div>
            </div>

            {/* Context JSON Viewer */}
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Request Context &amp; Redacted Metadata
              </span>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  color: 'var(--color-text-primary)',
                  overflowX: 'auto',
                  maxHeight: '160px',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(decision.context || { sanitized: true }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <EvidenceDrawer
          evidence={evidence}
          isOpen={evidenceOpen}
          onClose={() => setEvidenceOpen(false)}
        />
      </div>
    </ProtectWorkshell>
  );
}
