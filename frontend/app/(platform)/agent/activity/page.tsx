'use client';

/**
 * THING AGENT — Audit Trail & Security Activity
 * Route: /agent/activity
 * Real backend data from /api/v1/agent/activity
 */

import React, { useEffect, useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
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
import { Layers, Shield, Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  agent_entity_id?: string;
  project_id?: string;
  event_type: string;
  actor: string;
  target_entity_id?: string;
  details?: any;
  outcome: string;
  created_at: string;
}

export default function AgentActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  useEffect(() => {
    fetch('/api/v1/agent/activity')
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

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title="Agent Security Audit Log"
          sub="Complete and non-repudiable audit trail of administrative modifications, authority grants, revocations, and policy adjustments."
        />

        {loading ? (
          <AgentLoading />
        ) : error ? (
          <AgentError message={error} />
        ) : items.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 13,
          }}>
            No audit events recorded.
          </div>
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
                  <Th>Timestamp</Th>
                  <Th>Event Type</Th>
                  <Th>Actor</Th>
                  <Th>Target ID</Th>
                  <Th>Details</Th>
                  <Th>Outcome</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <Tr key={it.id} onClick={() => setSelectedItem(it)}>
                    <Td mono>{new Date(it.created_at).toLocaleString()}</Td>
                    <Td mono>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>{it.event_type}</span>
                    </Td>
                    <Td mono>{it.actor}</Td>
                    <Td mono>{it.target_entity_id ? it.target_entity_id.slice(0, 8) + '…' : '—'}</Td>
                    <Td mono>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {typeof it.details === 'object' ? JSON.stringify(it.details) : String(it.details || '—')}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={it.outcome || 'SUCCESS'} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Selected Event Drawer */}
        {selectedItem && (
          <EvidenceDrawer evidence={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
