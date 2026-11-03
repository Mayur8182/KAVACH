'use client';

/**
 * Thing Attack — Evidence Catalogue (/attack/evidence)
 * Authoritative, cryptographically verifiable repository of offensive evidence.
 * All credentials, tokens, and authorization headers are redacted.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  EvidenceDrawer,
  EmptyAttackState,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackEvidenceItemSchema } from '@/types/api/attack';
import { Archive, RefreshCw, Terminal, CheckCircle2, ChevronRight, Lock } from 'lucide-react';

export default function AttackEvidencePage() {
  const [evidenceItems, setEvidenceItems] = useState<AttackEvidenceItemSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEvidence, setSelectedEvidence] = useState<AttackEvidenceItemSchema | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.evidence();
      setEvidenceItems(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load evidence records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AttackWorkshell
      actions={
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Verifiable Offensive Security Evidence
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Every confirmed security finding is backed by deterministic HTTP interaction evidence and trace signatures. All secrets are redacted.
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Evidence Chain Records ({evidenceItems.length})
            </h3>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              SECRETS REDACTED
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading verifiable evidence records...
              </div>
            ) : evidenceItems.length === 0 ? (
              <EmptyAttackState
                title="No Evidence Records"
                description="Evidence is automatically captured upon completion of DAST scans and verified pentests."
              />
            ) : (
              evidenceItems.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEvidence(e)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(el) => (el.currentTarget.style.background = 'var(--color-surface-elevated)')}
                  onMouseLeave={(el) => (el.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Terminal size={14} color="#ef4444" />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {e.evidence_type}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#3b82f6',
                        }}
                      >
                        {e.source}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace', display: 'block', marginTop: '3px' }}>
                      Target: {e.target_url} • Status Code: {e.response_status || 200} OK
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{e.observed_at}</span>
                    <button
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#ef4444',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Drawer →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Evidence Drawer */}
        <EvidenceDrawer
          evidence={selectedEvidence}
          isOpen={!!selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      </div>
    </AttackWorkshell>
  );
}
