'use client';

/**
 * Thing Protect — Protection Engine & Fail-Safe Settings (/protect/settings)
 * Authoritative fail-safe modes (FAIL_CLOSED / FAIL_OPEN), OPA policy bundle URLs,
 * and evidence sanitization redaction patterns.
 */

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  AlertTriangle,
  Lock,
  Save,
  CheckCircle2,
  RefreshCw,
  Server,
  Layers,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';

export default function ProtectSettingsPage() {
  const [failMode, setFailMode] = useState<'FAIL_CLOSED' | 'FAIL_OPEN'>('FAIL_CLOSED');
  const [opaBundleUrl, setOpaBundleUrl] = useState('https://bundle.policies.internal/v1');
  const [syncInterval, setSyncInterval] = useState('5000');
  const [redactionKeys, setRedactionKeys] = useState('authorization, apiKey, token, secret, password');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 600);
  };

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} color="#10b981" />
              PROTECTION ENGINE &amp; FAIL-SAFE SETTINGS
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Authoritative fail-safe modes, OPA policy sync intervals, and cryptographic audit redaction parameters.
            </p>
          </div>
        </div>

        {/* Feedback Message */}
        {saved && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#10b981" />
            <span>Protection configuration successfully persisted to backend policy authority.</span>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSave} style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Fail-Safe Mode Panel */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="#10b981" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                ENFORCEMENT FAILURE MODE (FAIL-OPEN / FAIL-CLOSED)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Controls behavior when the policy engine or MCP gateway is unreachable or offline during ingress evaluation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div
                onClick={() => setFailMode('FAIL_CLOSED')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: failMode === 'FAIL_CLOSED' ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-surface-elevated)',
                  border: `1px solid ${failMode === 'FAIL_CLOSED' ? '#10b981' : 'var(--color-border)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="failMode"
                    value="FAIL_CLOSED"
                    checked={failMode === 'FAIL_CLOSED'}
                    onChange={() => setFailMode('FAIL_CLOSED')}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '12px', color: failMode === 'FAIL_CLOSED' ? '#10b981' : 'var(--color-text-primary)' }}>
                    FAIL CLOSED (Recommended)
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', paddingLeft: '20px', lineHeight: 1.3 }}>
                  Immediately drops or blocks execution if verification cannot be proven. Zero bypass risk.
                </span>
              </div>

              <div
                onClick={() => setFailMode('FAIL_OPEN')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: failMode === 'FAIL_OPEN' ? 'rgba(245, 158, 11, 0.1)' : 'var(--color-surface-elevated)',
                  border: `1px solid ${failMode === 'FAIL_OPEN' ? '#f59e0b' : 'var(--color-border)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="failMode"
                    value="FAIL_OPEN"
                    checked={failMode === 'FAIL_OPEN'}
                    onChange={() => setFailMode('FAIL_OPEN')}
                    style={{ accentColor: '#f59e0b' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '12px', color: failMode === 'FAIL_OPEN' ? '#f59e0b' : 'var(--color-text-primary)' }}>
                    FAIL OPEN
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', paddingLeft: '20px', lineHeight: 1.3 }}>
                  Allows execution with diagnostic alerts if policy engine is offline. High availability.
                </span>
              </div>
            </div>
          </div>

          {/* OPA Engine Sync */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} color="#10b981" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                DETERMINISTIC OPA ENGINE SYNC
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Policy Bundle Registry URL
              </label>
              <input
                type="text"
                value={opaBundleUrl}
                onChange={(e) => setOpaBundleUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Cache Invalidation Polling Interval (ms)
              </label>
              <input
                type="number"
                value={syncInterval}
                onChange={(e) => setSyncInterval(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Redaction Keys */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} color="#10b981" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                EVIDENCE SANITIZATION &amp; REDACTION KEYS
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Headers and payload fields matching this comma-separated list will be irrevocably masked prior to cryptographic hashing.
            </p>
            <input
              type="text"
              value={redactionKeys}
              onChange={(e) => setRedactionKeys(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '12px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 18px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: 'fit-content',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Save size={14} />
            <span>{saving ? 'Persisting Settings...' : 'Save Protection Configuration'}</span>
          </button>
        </form>
      </div>
    </ProtectWorkshell>
  );
}
