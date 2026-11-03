'use client';

/**
 * THING AGENT — Risk HQ & Multidimensional Risk Analysis
 * Route: /agent/risk
 * Real backend data from /api/v1/agent/risk
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  RiskBadge,
  Table,
  Th,
  Td,
  Tr,
  AgentLoading,
  AgentError,
  SectionHeader,
  EvidenceDrawer,
} from '@/components/agent/AgentComponents';
import { AlertTriangle, ShieldCheck, Zap, Activity, HelpCircle, Layers } from 'lucide-react';

interface AgentRiskItem {
  agent_entity_id: string;
  agent_name: string;
  overall_risk: string;
  risk_score: number;
  factors: {
    authority: string;
    data_access: string;
    production_access: boolean;
    delegation: string;
  };
  policy_violations: number;
  behavior_signals: number;
  verified_violations: number;
  computed_at: string;
}

export default function AgentRiskPage() {
  const [items, setItems] = useState<AgentRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<AgentRiskItem | null>(null);

  useEffect(() => {
    fetch('/api/v1/agent/risk')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const criticalCount = items.filter((i) => i.overall_risk === 'CRITICAL').length;
  const highCount = items.filter((i) => i.overall_risk === 'HIGH').length;
  const mediumCount = items.filter((i) => i.overall_risk === 'MEDIUM').length;

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title="Agent Risk Assessment HQ"
          sub="Multidimensional risk calculation across authority scope, data classification, runtime violations, and blast radius."
        />

        {/* Risk Distribution Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#f87171', fontWeight: 700 }}>CRITICAL RISK</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f87171', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Agents with direct prod destructive access</div>
          </div>
          <div style={{
            background: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.25)',
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fb923c', fontWeight: 700 }}>HIGH RISK</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fb923c', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {highCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>High data sensitivity or multiple tool authorizations</div>
          </div>
          <div style={{
            background: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#facc15', fontWeight: 700 }}>MEDIUM RISK</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#facc15', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {mediumCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Scoped read/query authority with constrained boundary</div>
          </div>
        </div>

        {/* Methodology explanation */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={15} color="#a78bfa" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
              Deterministic Risk Methodology (v1.4)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Risk scores are calculated deterministically by evaluating: (1) Assigned authority weight (READ=1, WRITE=3, EXECUTE=5, DELETE=8, ADMIN=10), (2) Environment boundary (Production=+25%), (3) Sensitive or PII data classification access, (4) Delegation depth and downstream blast radius, and (5) Empirical policy block frequency in the last 24h.
          </div>
        </div>

        {/* Risk Table */}
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
                  <Th>Risk Level</Th>
                  <Th>Score</Th>
                  <Th>Authority Factor</Th>
                  <Th>Data Factor</Th>
                  <Th>Prod Access</Th>
                  <Th>Violations</Th>
                  <Th>Computed At</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <Tr key={i.agent_entity_id} onClick={() => setSelectedRisk(i)}>
                    <Td mono>
                      <Link
                        href={`/agent/agents/${i.agent_entity_id}`}
                        style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {i.agent_name}
                      </Link>
                    </Td>
                    <Td>
                      <RiskBadge risk={i.overall_risk} />
                    </Td>
                    <Td mono>
                      <span style={{ fontWeight: 700, color: i.overall_risk === 'CRITICAL' ? '#f87171' : i.overall_risk === 'HIGH' ? '#fb923c' : '#facc15' }}>
                        {i.risk_score.toFixed(1)} / 100
                      </span>
                    </Td>
                    <Td mono>{i.factors?.authority || 'N/A'}</Td>
                    <Td mono>{i.factors?.data_access || 'N/A'}</Td>
                    <Td>
                      <span style={{
                        display: 'inline-flex',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        background: i.factors?.production_access ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)',
                        color: i.factors?.production_access ? '#f87171' : '#94a3b8',
                      }}>
                        {i.factors?.production_access ? 'PROD' : 'NON-PROD'}
                      </span>
                    </Td>
                    <Td mono>{i.policy_violations}</Td>
                    <Td mono>{new Date(i.computed_at).toLocaleTimeString()}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Selected Risk Factor Breakdown */}
        {selectedRisk && (
          <EvidenceDrawer evidence={selectedRisk} onClose={() => setSelectedRisk(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
