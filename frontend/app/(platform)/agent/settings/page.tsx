'use client';

/**
 * THING AGENT — Security Settings & Autonomous Enforcement Configuration
 * Route: /agent/settings
 */

import React, { useState } from 'react';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { SectionHeader, StatusBadge } from '@/components/agent/AgentComponents';
import { Settings, Shield, Lock, Bell, CheckCircle2, Save } from 'lucide-react';

export default function AgentSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    auto_quarantine_on_critical: true,
    require_human_approval_for_prod_write: true,
    max_delegation_depth: 2,
    session_timeout_minutes: 60,
    enforce_sha256_evidence: true,
    block_unregistered_mcp_servers: true,
    behavior_anomaly_sensitivity: 'HIGH',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        <SectionHeader
          title="Agent Security Workspace Settings"
          sub="Autonomous containment rules, delegation depth limits, and baseline behavioral detection sensitivity."
        />

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* Setting 1: Auto Quarantine */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                Autonomous Quarantine on Critical Policy Breach
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Instantly revoke all active sessions and block outgoing tool execution when verified critical violations occur.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.auto_quarantine_on_critical}
              onChange={(e) => setSettings({ ...settings, auto_quarantine_on_critical: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Setting 2: Human in the loop for prod writes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                Mandatory Human Authorization for Production Write
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Hold production infrastructure tools (Kubernetes apply, Cloud scaling, DB writes) for dual-party review.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.require_human_approval_for_prod_write}
              onChange={(e) => setSettings({ ...settings, require_human_approval_for_prod_write: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Setting 3: Max Delegation Depth */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                Maximum Transitive Delegation Depth
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Limits the number of agent-to-agent authority hops permitted across the network.
              </div>
            </div>
            <select
              value={settings.max_delegation_depth}
              onChange={(e) => setSettings({ ...settings, max_delegation_depth: Number(e.target.value) })}
              style={{
                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', borderRadius: 6, padding: '6px 12px', fontSize: 12,
                fontFamily: 'var(--font-mono)', outline: 'none',
              }}
            >
              <option value={1}>1 (Direct Only)</option>
              <option value={2}>2 (Primary + Sub-Agent)</option>
              <option value={3}>3 (Multi-tier)</option>
            </select>
          </div>

          <div style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Setting 4: Cryptographic Evidence */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                Cryptographic SHA-256 Non-Repudiation Digest
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Generate deterministic hash receipts for every tool call and policy enforcement event.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enforce_sha256_evidence}
              onChange={(e) => setSettings({ ...settings, enforce_sha256_evidence: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12 }}>
            <button
              onClick={handleSave}
              style={{
                background: '#7c3aed', border: 'none', color: '#fff',
                borderRadius: 6, padding: '8px 18px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {saved ? <CheckCircle2 size={14} color="#fff" /> : <Save size={14} />}
              {saved ? 'Saved' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </AgentWorkshell>
  );
}
