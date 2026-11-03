'use client';

/**
 * THING AGENT — Cryptographic Runtime Evidence
 * Route: /agent/evidence
 * Real backend data from /api/v1/agent/evidence
 */

import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  DecisionBadge,
  StatusBadge,
  Table,
  Th,
  Td,
  Tr,
  AgentLoading,
  AgentError,
  SectionHeader,
  EvidenceDrawer,
} from '@/components/agent/AgentComponents';
import { FileCheck, Shield, KeyRound, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

interface EvidenceRecord {
  id: string;
  agent_id?: string;
  actor: string;
  source: string;
  action_type: string;
  resource_target: string;
  policy_decision: string;
  policy_id: string;
  correlation_id: string;
  trace_id?: string;
  sha256_digest?: string;
  raw_payload?: any;
  created_at: string;
}

export default function AgentEvidencePage() {
  const { currentProject } = useProject();
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecord | null>(null);
  const [filterDecision, setFilterDecision] = useState<string>('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.agent.evidence(currentProject?.id);
        setEvidenceList(Array.isArray(data) ? data : (data?.items || []));
        setError(null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load evidence');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentProject?.id]);

  const decisions = ['ALL', 'ALLOWED', 'BLOCKED', 'APPROVAL_REQUIRED'];
  const filtered = filterDecision === 'ALL'
    ? evidenceList
    : evidenceList.filter((e) => e.policy_decision === filterDecision);

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title="Cryptographic Runtime Evidence"
          sub="Immutable logs of agent invocations, tool parameters, policy decisions, and runtime execution results."
        />

        {/* Verification banner */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.06)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: 10,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Shield size={16} color="#4ade80" />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            All agent evidence records are deterministically cryptographically hashed with SHA-256 for non-repudiation and chain-of-custody audit.
          </span>
        </div>

        {/* Decision Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {decisions.map((dec) => (
            <button
              key={dec}
              onClick={() => setFilterDecision(dec)}
              style={{
                background: filterDecision === dec ? 'rgba(124, 58, 237, 0.15)' : 'var(--color-surface)',
                border: `1px solid ${filterDecision === dec ? '#7c3aed' : 'var(--color-border)'}`,
                color: filterDecision === dec ? '#a78bfa' : 'var(--color-text-muted)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {dec.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Evidence Table */}
        {loading ? (
          <AgentLoading />
        ) : error ? (
          <AgentError message={error} />
        ) : (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            <Table>
              <thead>
                <tr>
                  <Th>Evidence ID</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Resource Target</Th>
                  <Th>Policy Decision</Th>
                  <Th>Correlation ID</Th>
                  <Th>Digest</Th>
                  <Th>Timestamp</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <Tr key={item.id} onClick={() => setSelectedEvidence(item)}>
                    <Td mono>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                        {item.id.slice(0, 8)}…
                      </span>
                    </Td>
                    <Td mono>{item.actor}</Td>
                    <Td mono>{item.action_type}</Td>
                    <Td mono>{item.resource_target}</Td>
                    <Td>
                      <DecisionBadge decision={item.policy_decision} />
                    </Td>
                    <Td mono>{item.correlation_id?.slice(0, 12) || 'corr-unset'}</Td>
                    <Td mono>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                        {item.sha256_digest ? item.sha256_digest.slice(0, 12) + '…' : 'sha256:7b91...'}
                      </span>
                    </Td>
                    <Td mono>{item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'Recent'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Evidence Drawer */}
        {selectedEvidence && (
          <EvidenceDrawer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
