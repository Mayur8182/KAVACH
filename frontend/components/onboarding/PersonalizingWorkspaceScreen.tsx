'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Cpu,
  Lock,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { KavachMark } from '@/components/common/KavachLogo';

export interface PersonalizingWorkspaceProps {
  workspaceName?: string;
  organizationName?: string;
  selectedProducts?: string[];
  onComplete: () => void;
}

interface AnalysisStep {
  id: string;
  label: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 'step-tenant',
    label: 'Establishing Multi-Tenant Workspace Boundary',
    detail: 'Provisioning encrypted schema, workspace isolation & access controls',
    icon: Layers,
  },
  {
    id: 'step-policies',
    label: 'Configuring Zero-Trust Deterministic Policies',
    detail: 'Enforcing OPA guardrails, OWASP Top 10 API contracts & compliance baseline',
    icon: Lock,
  },
  {
    id: 'step-scanners',
    label: 'Initializing Scanner Container Sandboxes',
    detail: 'Wiring Semgrep SAST, Gitleaks secrets detection & OSV/Trivy SCA engines',
    icon: Cpu,
  },
  {
    id: 'step-assistant',
    label: 'Activating Kavach AI Security Orchestrator',
    detail: 'Syncing real AST telemetry, context models & audit trail verification',
    icon: Sparkles,
  },
];

export const PersonalizingWorkspaceScreen: React.FC<PersonalizingWorkspaceProps> = ({
  workspaceName = 'Production Workspace',
  organizationName = 'Acme Corp',
  selectedProducts = ['thing_code'],
  onComplete,
}) => {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(15);

  useEffect(() => {
    const totalSteps = ANALYSIS_STEPS.length;
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < totalSteps) {
        const step = ANALYSIS_STEPS[currentIdx];
        setCompletedSteps((prev) => [...prev, step.id]);
        currentIdx += 1;
        setActiveStepIndex(currentIdx);
        setProgress(Math.round(((currentIdx) / totalSteps) * 100));
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 700);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '580px',
        margin: '0 auto',
        padding: '24px 0',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.06)',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 16px',
              borderRadius: '14px',
              backgroundColor: '#EEF2FF',
              border: '1px solid #C7D2FE',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(79, 70, 229, 0.15)',
            }}
          >
            <KavachMark size={32} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Personalizing Your Security Workspace
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            Configuring zero-trust policies, AST scanners, and orchestrator pipelines for{' '}
            <strong style={{ color: '#0F172A' }}>{workspaceName || organizationName}</strong>.
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
            <span>Provisioning Security Engines</span>
            <span style={{ color: '#4F46E5', fontFamily: 'monospace', fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                backgroundColor: '#4F46E5',
                borderRadius: '9999px',
                transition: 'width 0.6s ease-out',
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        {/* Live Step Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ANALYSIS_STEPS.map((step, idx) => {
            const isDone = completedSteps.includes(step.id);
            const isRunning = activeStepIndex === idx;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isDone
                    ? '1px solid #D1FAE5'
                    : isRunning
                    ? '1px solid #C7D2FE'
                    : '1px solid #F1F5F9',
                  backgroundColor: isDone
                    ? '#F0FDF4'
                    : isRunning
                    ? '#F5F7FF'
                    : '#FFFFFF',
                  opacity: isDone || isRunning ? 1 : 0.45,
                  transition: 'all 0.25s ease',
                }}
              >
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  {isDone ? (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle2 size={13} strokeWidth={2.8} />
                    </div>
                  ) : isRunning ? (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid #4F46E5',
                        borderTopColor: 'transparent',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10.5px',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: isDone ? '#065F46' : isRunning ? '#1E1B4B' : '#64748B' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '11.5px', color: isDone ? '#047857' : isRunning ? '#4F46E5' : '#94A3B8', marginTop: '2px' }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
