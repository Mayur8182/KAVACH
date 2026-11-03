'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import {
  Bot, Play, CheckCircle2, AlertTriangle, Shield,
  Terminal, ArrowRight, Loader2, Sparkles, RefreshCw, Check, X
} from 'lucide-react';

interface AgentRole {
  id: string;
  name: string;
  description: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defaultPrompt: string;
}

const AGENT_ROLES: AgentRole[] = [
  {
    id: 'code-agent',
    name: 'Code Security Agent',
    description: 'SAST, Secret scanning, AST analysis & automated diff remediation.',
    risk: 'HIGH',
    defaultPrompt: 'Scan the codebase for exposed secrets and vulnerabilities, and synthesize verified security diffs.',
  },
  {
    id: 'cloud-agent',
    name: 'Cloud Posture Agent',
    description: 'Multi-cloud audit, IAM overprivileged principal discovery & posture scoring.',
    risk: 'MEDIUM',
    defaultPrompt: 'Audit cloud infrastructure posture across connected providers and report high-risk IAM policies.',
  },
  {
    id: 'threat-agent',
    name: 'Threat Detection Agent',
    description: 'SIEM log correlation, MITRE ATT&CK vectors, and telemetry analysis.',
    risk: 'HIGH',
    defaultPrompt: 'Analyze SIEM telemetry and correlate active indicators against the MITRE ATT&CK framework.',
  },
  {
    id: 'compliance-agent',
    name: 'Continuous Compliance Agent',
    description: 'Automated SOC2 Type II, ISO 27001, and HIPAA control verification.',
    risk: 'LOW',
    defaultPrompt: 'Audit project compliance controls against SOC2 Type II and compute verifiable pass score.',
  },
  {
    id: 'response-agent',
    name: 'Incident Response Agent',
    description: 'Autonomous threat containment, token revocation & host quarantine with approval gates.',
    risk: 'CRITICAL',
    defaultPrompt: 'Investigate open incidents and prepare containment actions for compromised resources.',
  },
  {
    id: 'infra-agent',
    name: 'Infrastructure & Container Agent',
    description: 'Docker image CVE analysis, Kubernetes manifest audits, and CI/CD policy.',
    risk: 'HIGH',
    defaultPrompt: 'Inspect container image security and identify critical CVE vulnerabilities.',
  },
  {
    id: 'data-agent',
    name: 'DSPM & Data Security Agent',
    description: 'PII classification, database query monitoring & data residency audits.',
    risk: 'MEDIUM',
    defaultPrompt: 'Audit sensitive data posture and check database classifications for exposed PII.',
  },
  {
    id: 'identity-agent',
    name: 'Agent Governance Agent',
    description: 'Identity verification, least-privilege auditing & delegation chain inspection.',
    risk: 'LOW',
    defaultPrompt: 'Audit all active AI agent permissions, sessions, and flag privilege escalation anomalies.',
  },
];

export function AgentCockpitLauncher() {
  const { currentProject } = useProject();
  const [selectedAgent, setSelectedAgent] = useState<AgentRole>(AGENT_ROLES[0]);
  const [prompt, setPrompt] = useState<string>(AGENT_ROLES[0].defaultPrompt);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvingApproval, setResolvingApproval] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string>('');

  const handleSelectRole = (role: AgentRole) => {
    setSelectedAgent(role);
    setPrompt(role.defaultPrompt);
    setResult(null);
    setError(null);
    setStreamingStatus('');
  };

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    try {
      setIsRunning(true);
      setError(null);
      setStreamingStatus('Initializing session & resolving MCP tools...');

      // Initial live state
      const liveState: any = {
        session_id: '',
        agent_id: selectedAgent.id,
        agent_name: selectedAgent.name,
        status: 'RUNNING',
        task: prompt,
        steps: [],
        final_response: '',
        approval_ticket: null,
        duration_ms: 0,
        engine: 'Google Gemini',
      };
      setResult({ ...liveState });

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8000');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch(`${apiUrl}/api/v1/agent/run/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          task: prompt,
          project_id: currentProject?.id,
          max_turns: 6,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to start streaming session.`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;
          const lines = eventBlock.split('\n');
          let eventName = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.replace('data:', '').trim();
            }
          }

          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);

            if (eventName === 'session_init') {
              liveState.session_id = data.session_id;
              setStreamingStatus(`Session authenticated (${data.session_id.slice(0, 8)}...).`);
            } else if (eventName === 'turn_start') {
              setStreamingStatus(`Turn ${data.turn}/${data.max_turns}: Reasoning with Gemini...`);
            } else if (eventName === 'thought') {
              liveState.engine = data.engine || liveState.engine;
            } else if (eventName === 'tool_call') {
              setStreamingStatus(`Executing tool '${data.tool}' via MCP Security Gateway...`);
              liveState.steps.push({
                turn: data.turn,
                type: 'tool_call',
                tool: data.tool,
                arguments: data.arguments,
                result_status: 'DISPATCHING',
              });
            } else if (eventName === 'tool_result') {
              const lastStep = liveState.steps[liveState.steps.length - 1];
              if (lastStep) {
                lastStep.result_status = data.status;
                lastStep.message = data.message;
                lastStep.data = data.data;
              }
              setStreamingStatus(`Tool '${data.tool}' returned ${data.status}.`);
            } else if (eventName === 'approval_required') {
              liveState.status = 'WAITING_FOR_APPROVAL';
              liveState.approval_ticket = {
                approval_id: data.approval_id,
                tool_name: data.tool,
                arguments: data.arguments,
                reason: data.reason,
              };
              setStreamingStatus(`Execution PAUSED: Operator approval required.`);
            } else if (eventName === 'final_response') {
              liveState.final_response = data.content;
            } else if (eventName === 'done') {
              liveState.status = data.status;
              liveState.duration_ms = data.duration_ms;
              liveState.engine = data.engine;
              setStreamingStatus(`Execution complete in ${data.duration_ms} ms.`);
            }

            setResult({ ...liveState });
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        }
      }
    } catch (err: any) {
      console.warn('Streaming connection issue, falling back to non-streaming API:', err);
      // Fallback to standard non-streaming api.agent.run
      try {
        const fallbackRes = await api.agent.run({
          agent_id: selectedAgent.id,
          task: prompt,
          project_id: currentProject?.id,
          max_turns: 6,
        });
        setResult(fallbackRes);
        setStreamingStatus('Execution completed via fallback.');
      } catch (fallbackErr: any) {
        setError(fallbackErr?.message || 'Agent execution failed.');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleResolveApproval = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!result?.approval_ticket?.approval_id) return;
    try {
      setResolvingApproval(true);
      await api.agent.resolveApproval(result.approval_ticket.approval_id, {
        decision,
        reason: `Operator decision: ${decision}`,
        project_id: currentProject?.id,
      });
      // Update local state
      setResult({
        ...result,
        status: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
        approval_ticket: {
          ...result.approval_ticket,
          status: decision,
        },
      });
    } catch (err: any) {
      alert(`Failed to resolve approval: ${err?.message}`);
    } finally {
      setResolvingApproval(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.75)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 16,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#f8fafc' }}>
              Autonomous AI Agent Cockpit
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              Direct Gemini-powered reasoning with deterministic MCP Security Gateway policy interception.
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 20,
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#a5b4fc',
          fontSize: 12,
        }}>
          <Shield size={14} />
          <span>MCP Gateway Active</span>
        </div>
      </div>

      {/* Agent Selector Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Agent Persona (8 Specializations)
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10,
        }}>
          {AGENT_ROLES.map((role) => {
            const isSelected = selectedAgent.id === role.id;
            return (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'rgba(30, 41, 59, 0.6)',
                  border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#e0e7ff' : '#cbd5e1' }}>
                    {role.name}
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: role.risk === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : role.risk === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: role.risk === 'CRITICAL' ? '#fca5a5' : role.risk === 'HIGH' ? '#fdba74' : '#86efac',
                  }}>
                    {role.risk}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Prompt Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mission Objective / Task Prompt
          </label>
          <button
            onClick={() => setPrompt(selectedAgent.defaultPrompt)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#818cf8',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RefreshCw size={11} /> Reset to Preset
          </button>
        </div>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the security task for this agent..."
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 10,
            padding: '12px 14px',
            color: '#f8fafc',
            fontSize: 13,
            lineHeight: 1.5,
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {streamingStatus ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: isRunning ? '#a5b4fc' : '#86efac',
              background: 'rgba(30, 41, 59, 0.7)',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isRunning ? '#818cf8' : '#22c55e',
                boxShadow: isRunning ? '0 0 8px #818cf8' : 'none',
              }} />
              <span>{streamingStatus}</span>
            </div>
          ) : <div />}
          <button
            onClick={handleExecute}
            disabled={isRunning || !prompt.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              background: isRunning ? 'rgba(99, 102, 241, 0.4)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            {isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Live Streaming Thoughts & Tools...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Execute Agent ({selectedAgent.name})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Live Result View */}
      {result && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 16,
          borderRadius: 12,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {/* Status Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 20,
                background: result.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.2)' : result.status === 'WAITING_FOR_APPROVAL' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: result.status === 'COMPLETED' ? '#4ade80' : result.status === 'WAITING_FOR_APPROVAL' ? '#fb923c' : '#f87171',
                border: '1px solid currentColor',
              }}>
                {result.status}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                {result.agent_name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#94a3b8' }}>
              <span>Engine: <strong style={{ color: '#c7d2fe' }}>{result.engine}</strong></span>
              <span>Duration: <strong style={{ color: '#cbd5e1' }}>{result.duration_ms} ms</strong></span>
              <span>Tools Run: <strong style={{ color: '#cbd5e1' }}>{result.steps_count}</strong></span>
            </div>
          </div>

          {/* Approval Ticket Card (If triggered) */}
          {result.approval_ticket && (
            <div style={{
              padding: 14,
              borderRadius: 8,
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fdba74' }}>
                <AlertTriangle size={18} />
                <strong style={{ fontSize: 13 }}>Human Authorization Required (Ticket: {result.approval_ticket.approval_id})</strong>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#fed7aa' }}>
                Tool <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>{result.approval_ticket.tool_name}</code> is a high-risk containment or remediation action. Execution has paused.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => handleResolveApproval('APPROVED')}
                  disabled={resolvingApproval}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 6,
                    background: '#22c55e',
                    border: 'none',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={14} /> Approve Execution
                </button>
                <button
                  onClick={() => handleResolveApproval('REJECTED')}
                  disabled={resolvingApproval}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          )}

          {/* Steps Stepper */}
          {result.steps && result.steps.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                Execution Trace & Tool Dispatches
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.steps.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Terminal size={14} color="#818cf8" />
                        <strong style={{ color: '#e2e8f0' }}>Turn {step.turn}: {step.tool || step.type}</strong>
                      </div>
                      <span style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: step.result_status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.2)' : step.result_status === 'DISPATCHING' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                        color: step.result_status === 'SUCCESS' ? '#86efac' : step.result_status === 'DISPATCHING' ? '#a5b4fc' : '#fdba74',
                      }}>
                        {step.result_status === 'DISPATCHING' && <Loader2 size={10} className="animate-spin" />}
                        {step.result_status || 'DISPATCHED'}
                      </span>
                    </div>
                    {step.thought && (
                      <p style={{ margin: 0, color: '#cbd5e1', fontStyle: 'italic', fontSize: 11 }}>
                        "{step.thought}"
                      </p>
                    )}
                    {step.message && (
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: 11 }}>
                        Result: {step.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Response Summary */}
          <div style={{
            padding: 14,
            borderRadius: 8,
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a5b4fc', fontSize: 12, fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>Agent Synthesis & Conclusion</span>
            </div>
            <div style={{
              color: '#f1f5f9',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {result.final_response}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
