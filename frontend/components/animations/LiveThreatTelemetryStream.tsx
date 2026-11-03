'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Activity, CheckCircle, Terminal } from 'lucide-react';

const TELEMETRY_EVENTS = [
  { id: 1, type: 'block', text: 'BLOCKED: Unauthorized AWS S3 Bucket ACL public override', scope: 'prod-us-east-1', tool: 'CSPM' },
  { id: 2, type: 'pass', text: 'VERIFIED: Semgrep AST clean on PR #142 (0 taint violations)', scope: 'frontend-app', tool: 'SAST' },
  { id: 3, type: 'block', text: 'INTERCEPTED: AI Agent tool escalation attempt on /v1/mcp/exec', scope: 'Agent-Alpha', tool: 'eBPF Gateway' },
  { id: 4, type: 'pass', text: 'ATTESTED: SLSA Provenance signature generated for container image', scope: 'v2.4.1-rc', tool: 'Syft SBOM' },
  { id: 5, type: 'warn', text: 'REDACTED: Gitleaks detected rotated Stripe secret in commit a9f4c2', scope: 'payments-svc', tool: 'Secrets' },
  { id: 6, type: 'pass', text: 'ENFORCED: OPA Rego verified branch protection & 2FA requirement', scope: 'main-branch', tool: 'OPA Gate' },
];

export const LiveThreatTelemetryStream: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TELEMETRY_EVENTS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const current = TELEMETRY_EVENTS[currentIndex];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 14px',
        borderRadius: '20px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E4E7',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#18181B',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: current.type === 'block' ? '#EF4444' : current.type === 'warn' ? '#F59E0B' : '#09090B',
          }}
        />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#71717A', textTransform: 'uppercase' }}>
          [{current.tool}]
        </span>
      </div>

      <div style={{ color: '#09090B', fontWeight: 600 }}>
        {current.text}
      </div>

      <span
        style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: '#F4F4F5',
          color: '#52525B',
          fontWeight: 600,
        }}
      >
        {current.scope}
      </span>
    </div>
  );
};
