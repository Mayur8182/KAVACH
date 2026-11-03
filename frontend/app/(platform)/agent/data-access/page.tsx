'use client';

/**
 * THING AGENT — Data Access & Exfiltration Monitoring
 * Route: /agent/data-access
 * Real backend data from /api/v1/agent/data-access
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
import { Database, ShieldAlert, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';

interface DataAccessItem {
  id: string;
  agent_id: string;
  agent_name?: string;
  resource_name: string;
  data_classification: string;
  action: string;
  purpose: string;
  environment: string;
  policy_id: string;
  destination_type?: string;
  destination_endpoint?: string;
  is_external?: boolean;
  decision?: string;
  risk_level: string;
  last_access: string;
  access_count?: number;
}

export default function AgentDataAccessPage() {
  const [items, setItems] = useState<DataAccessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DataAccessItem | null>(null);
  const [filterClass, setFilterClass] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/v1/agent/data-access')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const classifications = ['ALL', 'CRITICAL_PII', 'RESTRICTED', 'SENSITIVE', 'INTERNAL', 'PUBLIC'];

  const filtered = filterClass === 'ALL'
    ? items
    : items.filter((i) => i.data_classification === filterClass);

  const exfiltrationEvents = items.filter((i) => i.is_external || i.destination_type === 'EXTERNAL');

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title="Data Access & Flow Telemetry"
          sub="Track sensitive data resources accessed by AI agents and monitor external data boundary crossings."
        />

        {/* Exfiltration Boundary Alerts */}
        {exfiltrationEvents.length > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} color="#f87171" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171', letterSpacing: '0.05em' }}>
                EXTERNAL DATA BOUNDARY CROSSINGS DETECTED ({exfiltrationEvents.length})
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
              {exfiltrationEvents.map((ev) => (
                <div key={ev.id} style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                      {ev.resource_name}
                    </span>
                    <RiskBadge risk={ev.risk_level || 'HIGH'} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    <span>Agent: <strong style={{ color: 'var(--color-text)' }}>{ev.agent_name || ev.agent_id}</strong></span>
                    <ArrowRight size={12} />
                    <span>Destination: <strong style={{ color: '#f87171' }}>{ev.destination_endpoint || 'External API'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, paddingTop: 4, borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                      Policy: {ev.policy_id || 'boundary-policy-v1'}
                    </span>
                    <StatusBadge status={ev.decision || 'BLOCKED'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classification Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {classifications.map((c) => (
            <button
              key={c}
              onClick={() => setFilterClass(c)}
              style={{
                background: filterClass === c ? 'rgba(124, 58, 237, 0.15)' : 'var(--color-surface)',
                border: `1px solid ${filterClass === c ? '#7c3aed' : 'var(--color-border)'}`,
                color: filterClass === c ? '#a78bfa' : 'var(--color-text-muted)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Data Access Inventory Table */}
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
                  <Th>Resource</Th>
                  <Th>Classification</Th>
                  <Th>Action</Th>
                  <Th>Purpose</Th>
                  <Th>Environment</Th>
                  <Th>Risk</Th>
                  <Th>Last Access</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <Tr key={item.id} onClick={() => setSelectedItem(item)}>
                    <Td mono>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                        {item.agent_name || item.agent_id}
                      </span>
                    </Td>
                    <Td mono>{item.resource_name}</Td>
                    <Td>
                      <span style={{
                        display: 'inline-flex',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        background:
                          item.data_classification === 'CRITICAL_PII' || item.data_classification === 'RESTRICTED'
                            ? 'rgba(239,68,68,0.12)'
                            : item.data_classification === 'SENSITIVE'
                            ? 'rgba(249,115,22,0.12)'
                            : 'rgba(99,102,241,0.12)',
                        color:
                          item.data_classification === 'CRITICAL_PII' || item.data_classification === 'RESTRICTED'
                            ? '#f87171'
                            : item.data_classification === 'SENSITIVE'
                            ? '#fb923c'
                            : '#818cf8',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        {item.data_classification}
                      </span>
                    </Td>
                    <Td mono>{item.action}</Td>
                    <Td>{item.purpose || 'Operational query'}</Td>
                    <Td mono>{item.environment}</Td>
                    <Td>
                      <RiskBadge risk={item.risk_level || 'MEDIUM'} />
                    </Td>
                    <Td mono>{item.last_access ? new Date(item.last_access).toLocaleTimeString() : 'Recent'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Evidence Drawer */}
        {selectedItem && (
          <EvidenceDrawer evidence={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
