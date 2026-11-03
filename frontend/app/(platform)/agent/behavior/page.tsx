'use client';

/**
 * THING AGENT — Behavior & Anomaly Telemetry
 * Route: /agent/behavior
 * Real backend data from /api/v1/agent/behavior
 */

import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  RiskBadge,
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
import { Eye, AlertTriangle, ShieldCheck, Activity, Clock, Terminal } from 'lucide-react';

interface BehaviorSignal {
  id: string;
  agent_id: string;
  agent_name?: string;
  signal_type: string;
  severity: string;
  status: string; // OBSERVED | ANOMALOUS_SIGNAL | VERIFIED_VIOLATION
  description: string;
  observed_behavior?: any;
  baseline_expectation?: any;
  confidence_score?: number;
  evidence_id?: string;
  detected_at: string;
}

export default function AgentBehaviorPage() {
  const [signals, setSignals] = useState<BehaviorSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<BehaviorSignal | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/v1/agent/behavior')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setSignals(Array.isArray(data) ? data : data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const statuses = ['ALL', 'ANOMALOUS_SIGNAL', 'OBSERVED', 'VERIFIED_VIOLATION'];
  const filtered = filterStatus === 'ALL'
    ? signals
    : signals.filter((s) => s.status === filterStatus);

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title="Agent Behavioral Telemetry"
          sub="Detect deviations from established operational baselines, unusual tool sequences, and verified policy violations."
        />

        {/* Operational Guardrail Notice */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.06)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Eye size={18} color="#818cf8" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            <strong style={{ color: '#818cf8' }}>Golden Rule of Agent Behavior:</strong> An anomalous signal indicates statistical divergence from past baseline patterns (e.g. sudden frequency jump or tool shift), but is <strong style={{ color: 'var(--color-text)' }}>NOT</strong> an automatic attack confirmation. Every action requires deterministic verification against policy before blocking.
          </div>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                background: filterStatus === st ? 'rgba(124, 58, 237, 0.15)' : 'var(--color-surface)',
                border: `1px solid ${filterStatus === st ? '#7c3aed' : 'var(--color-border)'}`,
                color: filterStatus === st ? '#a78bfa' : 'var(--color-text-muted)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Signals Table */}
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
                  <Th>Agent</Th>
                  <Th>Signal Type</Th>
                  <Th>Description</Th>
                  <Th>Severity</Th>
                  <Th>Status</Th>
                  <Th>Confidence</Th>
                  <Th>Detected At</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <Tr key={s.id} onClick={() => setSelectedSignal(s)}>
                    <Td mono>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                        {s.agent_name || s.agent_id}
                      </span>
                    </Td>
                    <Td mono>
                      <span style={{ color: '#fb923c' }}>{s.signal_type}</span>
                    </Td>
                    <Td>{s.description}</Td>
                    <Td>
                      <RiskBadge risk={s.severity || 'MEDIUM'} />
                    </Td>
                    <Td>
                      <StatusBadge status={s.status} />
                    </Td>
                    <Td mono>
                      {s.confidence_score ? `${Math.round(s.confidence_score * 100)}%` : '85%'}
                    </Td>
                    <Td mono>
                      {s.detected_at ? new Date(s.detected_at).toLocaleTimeString() : 'Recent'}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Selected Signal Evidence */}
        {selectedSignal && (
          <EvidenceDrawer evidence={selectedSignal} onClose={() => setSelectedSignal(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
