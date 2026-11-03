'use client';

/**
 * Thing Protect — Network & DNS Runtime Defense (/protect/network)
 * Segmentation rules, eBPF socket filters, and DNS exfiltration shielding.
 */

import React, { useEffect, useState } from 'react';
import {
  Radio,
  Globe,
  Search,
  RefreshCw,
  Shield,
  Activity,
  AlertTriangle,
  Lock,
  Layers,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  EnforcementDecisionBadge,
  EvidenceDrawer,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { ProtectionEvidence } from '@/types/api/protect';

export default function NetworkProtectionPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'dns'>('rules');
  const [rules, setRules] = useState<any[]>([]);
  const [dnsLogs, setDnsLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<ProtectionEvidence | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [r, d]: any = await Promise.all([
        api.protect.network(),
        api.protect.dns(),
      ]);
      setRules(Array.isArray(r) ? r : r?.items || []);
      setDnsLogs(Array.isArray(d) ? d : d?.items || []);
    } catch (err) {
      console.error('Failed to load network protection data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspectEvidence = async (evId?: string) => {
    if (!evId) return;
    try {
      const ev = await api.protect.evidenceDetail(evId);
      setSelectedEvidence(ev);
      setDrawerOpen(true);
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    }
  };

  const safeRules = Array.isArray(rules) ? rules : [];
  const safeDns = Array.isArray(dnsLogs) ? dnsLogs : [];

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              NETWORK &amp; DNS RUNTIME DEFENSE
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              eBPF socket filtering, Suricata signatures, zero-trust network segmentation, and DNS exfiltration shielding.
            </p>
          </div>

          <button
            onClick={loadData}
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
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Sync Network Sensors
          </button>
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '12px',
          }}
        >
          <button
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'rules' ? 700 : 500,
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'rules' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)',
              color: activeTab === 'rules' ? '#10b981' : 'var(--color-text-secondary)',
              border: activeTab === 'rules' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={13} />
            <span>SEGMENTATION RULES ({safeRules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('dns')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: activeTab === 'dns' ? 700 : 500,
              borderRadius: 'var(--radius-sm)',
              background: activeTab === 'dns' ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-surface)',
              color: activeTab === 'dns' ? '#10b981' : 'var(--color-text-secondary)',
              border: activeTab === 'dns' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--color-border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Globe size={13} />
            <span>DNS SHIELD ({safeDns.length})</span>
          </button>
        </div>

        {/* Content Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {activeTab === 'rules' && (
            safeRules.length === 0 ? (
              <EmptyProtectState title="NO NETWORK RULES" description="No active network segmentation rules configured." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px' }}>RULE NAME</th>
                    <th style={{ padding: '10px 16px' }}>SOURCE</th>
                    <th style={{ padding: '10px 16px' }}>DESTINATION</th>
                    <th style={{ padding: '10px 16px' }}>PORT</th>
                    <th style={{ padding: '10px 16px' }}>ACTION</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>ENFORCER</th>
                  </tr>
                </thead>
                <tbody>
                  {safeRules.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {r.rule_name || r.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.source}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.destination}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{r.port}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <EnforcementDecisionBadge decision={r.action || 'ALLOW'} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981' }}>{r.enforcement_layer || 'eBPF / Cilium'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'dns' && (
            safeDns.length === 0 ? (
              <EmptyProtectState title="NO DNS EVENTS" description="Zero suspicious DNS queries intercepted." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px' }}>TIMESTAMP</th>
                    <th style={{ padding: '10px 16px' }}>WORKLOAD / ACTOR</th>
                    <th style={{ padding: '10px 16px' }}>DOMAIN</th>
                    <th style={{ padding: '10px 16px' }}>DECISION</th>
                    <th style={{ padding: '10px 16px' }}>TUNNELING DETECTIONS</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>EVIDENCE</th>
                  </tr>
                </thead>
                <tbody>
                  {safeDns.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                        {d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : 'Now'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{d.actor}</td>
                      <td style={{ padding: '12px 16px', color: '#34d399', fontFamily: 'var(--font-mono)' }}>{d.domain}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <EnforcementDecisionBadge decision={d.decision || 'BLOCK'} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {d.is_tunneling_suspicion ? (
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                            SUSPECTED TUNNELING
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>BENIGN</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {d.evidence_id ? (
                          <button
                            onClick={() => handleInspectEvidence(d.evidence_id)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            PROOF
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      <EvidenceDrawer
        evidence={selectedEvidence}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </ProtectWorkshell>
  );
}
