'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  Box,
  Key,
  Network,
  Wrench,
  SearchCode,
  FileCheck2,
} from 'lucide-react';

interface TimelineEvent {
  timestamp: string;
  stage: string;
  agent: string;
  description: string;
  status: 'completed' | 'running' | 'pending';
}

interface ExecutionTimelineViewProps {
  runId: string;
  elapsedTime: string;
  progressPercentage: number;
}

export const ExecutionTimelineView: React.FC<ExecutionTimelineViewProps> = ({
  runId,
  elapsedTime,
  progressPercentage,
}) => {
  const timelineStages = [
    {
      title: '1. Repository Checkout & Cloned Context',
      duration: '00:01',
      status: 'completed',
      events: [
        { time: '14:02:18', desc: 'Secure ephemeral workspace initialized for job execution' },
        { time: '14:02:19', desc: 'Cloned repository commit 8f4c2e1 (branch: main)' },
      ],
    },
    {
      title: '2. Codebase Indexing & AST Generation',
      duration: '00:16',
      status: 'completed',
      events: [
        { time: '14:03:02', desc: 'Indexed 1,284 repository files across JavaScript, TypeScript, Terraform, Docker' },
        { time: '14:03:41', desc: 'Built Abstract Syntax Trees (AST) and Control Flow Graphs (CFG)' },
      ],
    },
    {
      title: '3. Multi-Agent Security Analysis',
      duration: elapsedTime,
      status: 'running',
      events: [
        { time: '14:04:07', desc: 'SAST Agent: Initialized Semgrep 1.178 analysis on src/auth/session.ts' },
        { time: '14:04:12', desc: 'SAST Agent: Flagged SQL Injection vulnerability (CWE-89) at line 42' },
        { time: '14:04:18', desc: 'SCA Agent: Audited package-lock.json against OSV database' },
        { time: '14:04:22', desc: 'IaC Agent: Scanned Terraform infrastructure configurations via Checkov' },
        { time: '14:04:30', desc: 'Container Agent: Inspected Dockerfile layers and non-root execution' },
      ],
    },
    {
      title: '4. Autonomous Investigation & Taint Tracing',
      duration: '00:45',
      status: 'completed',
      events: [
        { time: '14:05:10', desc: 'Investigation Agent: Traced req.body.email source to db.query() sink' },
        { time: '14:05:28', desc: 'Investigation Agent: Confirmed unescaped user input reaching database' },
      ],
    },
    {
      title: '5. Automated Remediation Patch Synthesis',
      duration: '00:30',
      status: 'completed',
      events: [
        { time: '14:06:01', desc: 'Remediation Agent: Synthesized parameterized query patch for CWE-89' },
        { time: '14:06:14', desc: 'Generated unified diff for src/auth/session.ts' },
      ],
    },
    {
      title: '6. Verification & Policy Rescan Proof',
      duration: 'Pending',
      status: 'pending',
      events: [
        { time: '--:--', desc: 'Standing by for patch approval to trigger deterministic rescan' },
      ],
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
          Execution Pipeline Timeline
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Chronological milestone progression of autonomous multi-agent analysis and security verification.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {timelineStages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isRunning = stage.status === 'running';

          return (
            <div
              key={idx}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px 20px',
                backgroundColor: isRunning ? '#FEFDF8' : '#FFFFFF',
                borderColor: isRunning ? '#FDE047' : '#E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isCompleted ? (
                    <CheckCircle2 size={18} color="#16A34A" />
                  ) : isRunning ? (
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#CA8A04',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '1.5px solid #CBD5E1',
                      }}
                    />
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    {stage.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isCompleted ? '#16A34A' : isRunning ? '#854D0E' : '#64748B',
                      backgroundColor: isCompleted ? '#F0FDF4' : isRunning ? '#FEF9C3' : '#F1F5F9',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {isCompleted ? 'Completed' : isRunning ? 'In Progress' : 'Pending'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                    {stage.duration}
                  </span>
                </div>
              </div>

              {/* Stage Sub-Events */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  paddingLeft: '28px',
                  borderLeft: `2px solid ${isCompleted ? '#BBF7D0' : isRunning ? '#FDE047' : '#E2E8F0'}`,
                  marginLeft: '8px',
                }}
              >
                {stage.events.map((ev, eIdx) => (
                  <div key={eIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                    <span style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '11px' }}>
                      {ev.time}
                    </span>
                    <span style={{ color: '#475569' }}>{ev.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

