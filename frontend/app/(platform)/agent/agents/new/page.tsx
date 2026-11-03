'use client';

/**
 * THING AGENT — Register Agent Wizard (10-Step Lifecycle Flow)
 * Route: /agent/agents/new
 * Produces real backend entity via POST /api/v1/agent/agents
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import { SectionHeader, RiskBadge } from '@/components/agent/AgentComponents';
import {
  Bot,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Shield,
  KeyRound,
  Wrench,
  Database,
  Lock,
  Loader2,
} from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Identity' },
  { id: 2, name: 'Owner' },
  { id: 3, name: 'Environment' },
  { id: 4, name: 'Capabilities' },
  { id: 5, name: 'Permissions' },
  { id: 6, name: 'Tool Access' },
  { id: 7, name: 'Data Scope' },
  { id: 8, name: 'Policy' },
  { id: 9, name: 'Review' },
  { id: 10, name: 'Register' },
];

export default function RegisterAgentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration Form State
  const [form, setForm] = useState({
    name: '',
    identity_uri: '',
    description: '',
    owner: '',
    owner_email: '',
    environment_id: 'production',
    capabilities: ['READ'],
    permissions: ['github.repo.read', 'tickets.read'],
    tools: ['github.create_pr', 'database.query'],
    data_classification: 'SENSITIVE',
    policy: 'agent-least-privilege-v2',
  });

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCapability = (cap: string) => {
    setForm((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter((c) => c !== cap)
        : [...prev.capabilities, cap],
    }));
  };

  const handleRegister = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim() || 'Custom AI Agent',
        identity_uri: form.identity_uri.trim() || `agent://custom/${Date.now()}`,
        description: form.description || 'Enterprise agent registered via control plane',
        owner: form.owner || 'Internal Platform Team',
        owner_email: form.owner_email || 'platform@internal',
        environment_id: form.environment_id,
        capabilities: form.capabilities,
        tags: ['custom-registered', form.environment_id],
      };

      const res = await fetch('/api/v1/agent/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Agent registration failed with status ${res.status}`);
      }

      const created = await res.json();
      router.push(`/agent/agents/${created.id || created.agent_id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840 }}>
        <SectionHeader
          title="Register AI Agent"
          sub="Explicit identity, capability scoping, and deterministic authority binding for autonomous AI systems."
          actions={
            <Link
              href="/agent/agents"
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ← BACK TO REGISTRY
            </Link>
          }
        />

        {/* Step Progress Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 8,
          borderBottom: '1px solid var(--color-border)',
        }}>
          {STEPS.map((step) => {
            const isDone = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            return (
              <div
                key={step.id}
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: isCurrent ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                  border: `1px solid ${isCurrent ? '#7c3aed' : 'transparent'}`,
                  cursor: isDone ? 'pointer' : 'default',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: isDone ? '#22c55e' : isCurrent ? '#7c3aed' : 'var(--color-surface)',
                  color: isDone || isCurrent ? '#fff' : 'var(--color-text-muted)',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {isDone ? '✓' : step.id}
                </div>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: isCurrent ? '#a78bfa' : isDone ? 'var(--color-text)' : 'var(--color-text-muted)',
                  fontWeight: isCurrent ? 700 : 500,
                }}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {/* Step Container */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* Step 1: Agent Identity */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 1: Agent Identity</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>AGENT DISPLAY NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Production Payment Reviewer"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  style={{
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '8px 12px', color: 'var(--color-text)', fontSize: 12, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>IDENTITY URI (RFC 3986)</label>
                <input
                  type="text"
                  placeholder="agent://payments/reviewer-01"
                  value={form.identity_uri}
                  onChange={(e) => updateForm('identity_uri', e.target.value)}
                  style={{
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '8px 12px', color: 'var(--color-text)', fontSize: 12, outline: 'none',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>OPERATIONAL PURPOSE / DESCRIPTION</label>
                <textarea
                  placeholder="Explains what this agent does, its domain, and authorized triggers..."
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  rows={3}
                  style={{
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '8px 12px', color: 'var(--color-text)', fontSize: 12, outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 2: Owner */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 2: Ownership & Human Sponsor</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>RESPONSIBLE TEAM / ORGANIZATION</label>
                <input
                  type="text"
                  placeholder="e.g. Payments Engineering Platform"
                  value={form.owner}
                  onChange={(e) => updateForm('owner', e.target.value)}
                  style={{
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '8px 12px', color: 'var(--color-text)', fontSize: 12, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>SPONSOR EMAIL</label>
                <input
                  type="email"
                  placeholder="team-leads@internal"
                  value={form.owner_email}
                  onChange={(e) => updateForm('owner_email', e.target.value)}
                  style={{
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '8px 12px', color: 'var(--color-text)', fontSize: 12, outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Environment */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 3: Target Deployment Environment</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {['production', 'staging', 'development'].map((env) => (
                  <div
                    key={env}
                    onClick={() => updateForm('environment_id', env)}
                    style={{
                      background: form.environment_id === env ? 'rgba(124, 58, 237, 0.12)' : 'var(--color-bg)',
                      border: `1px solid ${form.environment_id === env ? '#7c3aed' : 'var(--color-border)'}`,
                      borderRadius: 8, padding: 16, cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: form.environment_id === env ? '#a78bfa' : 'var(--color-text)' }}>
                      {env}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {env === 'production' ? 'Strict isolation & policy check' : 'Standard sandbox policy'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Capabilities */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 4: Assigned Action Capabilities</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { name: 'READ', desc: 'Query and inspect data' },
                  { name: 'WRITE', desc: 'Create and update resources' },
                  { name: 'EXECUTE', desc: 'Trigger tools, scripts, commands' },
                  { name: 'ADMIN', desc: 'Manage system settings and IAM' },
                ].map((cap) => {
                  const active = form.capabilities.includes(cap.name);
                  return (
                    <div
                      key={cap.name}
                      onClick={() => toggleCapability(cap.name)}
                      style={{
                        background: active ? 'rgba(124, 58, 237, 0.12)' : 'var(--color-bg)',
                        border: `1px solid ${active ? '#7c3aed' : 'var(--color-border)'}`,
                        borderRadius: 8, padding: 16, cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#a78bfa' : 'var(--color-text)' }}>
                          {cap.name}
                        </span>
                        {active && <CheckCircle2 size={14} color="#7c3aed" />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                        {cap.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Permissions */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 5: Resource Permissions</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Select initial discrete scopes for this agent:
              </div>
              {['github.repo.read', 'tickets.read', 'database.payments.query', 'aws.s3.read'].map((p) => {
                const active = form.permissions.includes(p);
                return (
                  <div
                    key={p}
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        permissions: active ? prev.permissions.filter((x) => x !== p) : [...prev.permissions, p],
                      }));
                    }}
                    style={{
                      background: active ? 'rgba(124, 58, 237, 0.1)' : 'var(--color-bg)',
                      border: `1px solid ${active ? '#7c3aed' : 'var(--color-border)'}`,
                      borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                    }}
                  >
                    <span>{p}</span>
                    {active ? <CheckCircle2 size={14} color="#7c3aed" /> : <span style={{ color: 'var(--color-text-muted)' }}>+ Add</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 6: Tool Access */}
          {currentStep === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 6: Allowed Tools</div>
              {['github.create_pr', 'database.query', 'kubernetes.get_pod', 'email.send'].map((t) => {
                const active = form.tools.includes(t);
                return (
                  <div
                    key={t}
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        tools: active ? prev.tools.filter((x) => x !== t) : [...prev.tools, t],
                      }));
                    }}
                    style={{
                      background: active ? 'rgba(124, 58, 237, 0.1)' : 'var(--color-bg)',
                      border: `1px solid ${active ? '#7c3aed' : 'var(--color-border)'}`,
                      borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                    }}
                  >
                    <span>{t}</span>
                    {active ? <CheckCircle2 size={14} color="#7c3aed" /> : <span style={{ color: 'var(--color-text-muted)' }}>+ Allow</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 7: Data Scope */}
          {currentStep === 7 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 7: Maximum Data Sensitivity Allowed</div>
              {['PUBLIC', 'INTERNAL', 'SENSITIVE', 'RESTRICTED'].map((lvl) => (
                <div
                  key={lvl}
                  onClick={() => updateForm('data_classification', lvl)}
                  style={{
                    background: form.data_classification === lvl ? 'rgba(124, 58, 237, 0.1)' : 'var(--color-bg)',
                    border: `1px solid ${form.data_classification === lvl ? '#7c3aed' : 'var(--color-border)'}`,
                    borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{lvl}</span>
                  {form.data_classification === lvl && <CheckCircle2 size={14} color="#7c3aed" />}
                </div>
              ))}
            </div>
          )}

          {/* Step 8: Policy */}
          {currentStep === 8 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 8: Binding Security Policy</div>
              {['agent-least-privilege-v2', 'prod-high-assurance-v1', 'developer-sandbox-v3'].map((pol) => (
                <div
                  key={pol}
                  onClick={() => updateForm('policy', pol)}
                  style={{
                    background: form.policy === pol ? 'rgba(124, 58, 237, 0.1)' : 'var(--color-bg)',
                    border: `1px solid ${form.policy === pol ? '#7c3aed' : 'var(--color-border)'}`,
                    borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{pol}</span>
                  {form.policy === pol && <CheckCircle2 size={14} color="#7c3aed" />}
                </div>
              ))}
            </div>
          )}

          {/* Step 9: Review */}
          {currentStep === 9 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Step 9: Security Review & Authority Summary</div>
              <div style={{
                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Agent Name:</span>
                  <strong style={{ color: 'var(--color-text)', fontSize: 12 }}>{form.name || 'Untitled Agent'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Identity URI:</span>
                  <span style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{form.identity_uri || 'agent://custom/...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Owner:</span>
                  <span style={{ color: 'var(--color-text)', fontSize: 12 }}>{form.owner || 'Internal Platform'} ({form.owner_email || 'n/a'})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Environment:</span>
                  <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#facc15' }}>{form.environment_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Capabilities:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{form.capabilities.join(', ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Tools Allowed:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{form.tools.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Register */}
          {currentStep === 10 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(124, 58, 237, 0.15)', border: '1px solid #7c3aed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
              }}>
                <Bot size={24} color="#7c3aed" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                Ready to Register Agent
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 420, margin: '0 auto' }}>
                Submitting will create an authoritative database record in PostgreSQL, bind the cryptographic identity, and initialize continuous runtime observation.
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={handleRegister}
                  disabled={submitting}
                  style={{
                    background: '#7c3aed', border: 'none', color: '#fff',
                    borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {submitting ? 'Registering Agent...' : 'CONFIRM & REGISTER AGENT'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep === 1 || submitting}
              style={{
                background: 'transparent', border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)', borderRadius: 6, padding: '6px 16px',
                fontSize: 12, cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            {currentStep < 10 ? (
              <button
                onClick={() => setCurrentStep((s) => Math.min(10, s + 1))}
                style={{
                  background: '#7c3aed', border: 'none', color: '#fff',
                  borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Next <ArrowRight size={12} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </AgentWorkshell>
  );
}
