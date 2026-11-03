'use client';

/**
 * Thing Attack — Settings Workspace (/attack/settings)
 * Engine parameters, execution sandboxes, rate limit defaults, and redaction patterns.
 */

import React, { useState } from 'react';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { Settings2, Save, Shield, Terminal, Lock } from 'lucide-react';

export default function AttackSettingsPage() {
  const [dastEngine, setDastEngine] = useState('NATIVE_SANDBOX');
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [defaultRateLimit, setDefaultRateLimit] = useState(30);
  const [redactHeaders, setRedactHeaders] = useState(true);
  const [redactBodyTokens, setRedactBodyTokens] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AttackWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Attack Engine &amp; Execution Settings
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Configure sandbox execution runners, default rate limit thresholds, and cryptographic redaction behavior.
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Execution Sandbox
            </h3>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                DAST &amp; Exploit Runner Mode
              </label>
              <select
                value={dastEngine}
                onChange={(e) => setDastEngine(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="NATIVE_SANDBOX">Native Isolated Sandbox (Docker Container)</option>
                <option value="K8S_EPHEMERAL">Kubernetes Ephemeral Job Runner</option>
                <option value="LOCAL_PROCESS">Local Asynchronous Worker</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Default Max Concurrency
                </label>
                <input
                  type="number"
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Global Rate Limit (Req/s)
                </label>
                <input
                  type="number"
                  value={defaultRateLimit}
                  onChange={(e) => setDefaultRateLimit(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Data Redaction &amp; Privacy Policies
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="redact_headers"
                checked={redactHeaders}
                onChange={(e) => setRedactHeaders(e.target.checked)}
              />
              <label htmlFor="redact_headers" style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                Automatically redact Authorization, Cookie, and API Key headers in evidence storage
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="redact_body"
                checked={redactBodyTokens}
                onChange={(e) => setRedactBodyTokens(e.target.checked)}
              />
              <label htmlFor="redact_body" style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                Redact JWT signatures, passwords, and API keys found in response payloads
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {saved && (
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                ✓ Configuration updated successfully
              </span>
            )}
            <div style={{ flexGrow: 1 }} />
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Save size={13} />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </AttackWorkshell>
  );
}
