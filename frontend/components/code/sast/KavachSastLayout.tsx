'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, Sparkles } from 'lucide-react';

export interface KavachSastLayoutProps {
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function KavachSastLayout({ children, headerAction }: KavachSastLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        minHeight: 0,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
      }}
    >
      {/* Top Agent Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B' }}>
          <Link href="/code/sast" style={{ color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>
            SAST Analysis Engine
          </Link>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ color: '#64748B' }}>Deterministic AST Security</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/code/sast/agent"
            title="Inspect Autonomous SAST Agent (agt_sast_agent) Console"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '14px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#15803D',
              fontSize: '11.5px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
            <span>Autonomous Agent: agt_sast_agent (ONLINE)</span>
          </Link>

          <Link
            href="/assistant"
            title="Open Interactive AI Security Assistant"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: '#2563EB',
              fontSize: '11.5px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
            }}
          >
            <Bot size={13} />
            <span>AI Assistant</span>
          </Link>

          {headerAction}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>{children}</div>
    </div>
  );
}

export default KavachSastLayout;
