'use client';

/**
 * Thing Protect — Runtime Threat Center (/protect/threats)
 * Active behavioral anomalies, prompt injection signatures, and exfiltration signals.
 */

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Shield,
  Activity,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  ThreatVerificationBadge,
  EnforcementDecisionBadge,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';

export default function ThreatsPage() {
  const [threats, setThreats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadThreats = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.threats();
      const list = Array.isArray(data) ? data : data?.items || [];
      setThreats(list);
    } catch (err) {
      console.error('Failed to load threats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreats();
  }, []);

  const safeThreats = Array.isArray(threats) ? threats : [];
  const filtered = safeThreats.filter((t) => {
    const tName = t.threat_name || t.name || '';
    const tActor = t.actor || '';
    const tTarget = t.target_resource || t.target || '';
    return (
      tName.toLowerCase().includes(search.toLowerCase()) ||
      tActor.toLowerCase().includes(search.toLowerCase()) ||
      tTarget.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              RUNTIME THREAT CENTER
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Active behavioral anomalies, prompt injection signatures, data exfiltration, and lateral movement signals.
            </p>
          </div>

          <button
            onClick={loadThreats}
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
            Sync Signals
          </button>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search threat, actor, target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Threats Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeThreats.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading runtime threat detections...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO ACTIVE THREAT SIGNALS"
              description="Zero runtime threats or prompt injections detected in this environment."
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-text-muted)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>DETECTED AT</th>
                  <th style={{ padding: '10px 16px' }}>THREAT SIGNATURE</th>
                  <th style={{ padding: '10px 16px' }}>SEVERITY</th>
                  <th style={{ padding: '10px 16px' }}>VERIFICATION</th>
                  <th style={{ padding: '10px 16px' }}>ACTOR</th>
                  <th style={{ padding: '10px 16px' }}>TARGET &amp; SOURCE</th>
                  <th style={{ padding: '10px 16px' }}>ACTION</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                      {t.detected_at}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {t.threat_name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          background: t.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(234, 179, 8, 0.14)',
                          color: t.severity === 'CRITICAL' ? '#ef4444' : '#eab308',
                        }}
                      >
                        {t.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ThreatVerificationBadge verification={t.verification_status || t.verification_state || 'DETECTED'} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)' }}>{t.actor || 'unauthorized'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {t.target_resource || t.target} ({t.source})
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <EnforcementDecisionBadge decision={t.action_taken || 'BLOCK'} />
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                      {t.status || 'ACTIVE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectWorkshell>
  );
}
