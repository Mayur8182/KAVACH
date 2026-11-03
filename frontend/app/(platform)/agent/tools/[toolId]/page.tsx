'use client';

/**
 * THING AGENT — Tool Detail & Risk Analysis
 * Route: /agent/tools/[toolId]
 * Real backend data from /api/v1/agent/tools/{toolId}
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  RiskBadge,
  StatusBadge,
  DecisionBadge,
  Table,
  Th,
  Td,
  Tr,
  AgentLoading,
  AgentError,
  SectionHeader,
  EvidenceDrawer,
} from '@/components/agent/AgentComponents';
import { Wrench, Shield, AlertTriangle, Layers, Clock, ArrowLeft, Database, CheckCircle2 } from 'lucide-react';

interface ToolDetailData {
  id: string;
  tool_id: string;
  tool_name: string;
  display_name: string;
  description?: string;
  provider: string;
  tool_type: string;
  risk_level: string;
  risk_factors: string[];
  risk_reason?: string;
  requires_approval: boolean;
  status: string;
  execution_count: number;
  last_used_at?: string;
  created_at: string;
  recent_executions?: Array<{
    id: string;
    agent_entity_id: string;
    decision: string;
    result: string;
    target_resource: string;
    duration_ms?: number;
    executed_at: string;
  }>;
}

export default function ToolDetailPage() {
  const params = useParams();
  const toolId = params?.toolId as string;

  const [tool, setTool] = useState<ToolDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExec, setSelectedExec] = useState<any | null>(null);

  useEffect(() => {
    if (!toolId) return;
    fetch(`/api/v1/agent/tools/${toolId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setTool(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [toolId]);

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title={tool ? (tool.display_name || tool.tool_name) : 'Tool Profile'}
          sub={`Tool ID: ${toolId} • Provider: ${tool?.provider || 'Native'}`}
          actions={
            <Link
              href="/agent/tools"
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ← BACK TO TOOLS
            </Link>
          }
        />

        {loading ? (
          <AgentLoading />
        ) : error || !tool ? (
          <AgentError message={error || 'Tool not found'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header Identity Card */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: 'rgba(124, 58, 237, 0.12)', border: '1px solid #7c3aed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Wrench size={20} color="#7c3aed" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                      {tool.display_name || tool.tool_name}
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                      {tool.tool_name}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiskBadge risk={tool.risk_level} />
                  <StatusBadge status={tool.status} />
                </div>
              </div>

              {/* Tool Parameters & Risk Justification */}
              <div style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  RISK JUSTIFICATION & CAPABILITIES
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>
                  {tool.risk_reason || 'Tool execution evaluated against standard agent security boundary.'}
                </div>
                {tool.risk_factors && tool.risk_factors.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {tool.risk_factors.map((rf, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                        }}
                      >
                        {rf}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>TYPE</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', marginTop: 4 }}>
                    {tool.tool_type}
                  </div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>EXECUTIONS</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a78bfa', marginTop: 4 }}>
                    {tool.execution_count}
                  </div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>APPROVAL REQUIRED</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: tool.requires_approval ? '#facc15' : '#4ade80', marginTop: 4 }}>
                    {tool.requires_approval ? 'YES' : 'NO'}
                  </div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>LAST EXECUTED</div>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', marginTop: 4 }}>
                    {tool.last_used_at ? new Date(tool.last_used_at).toLocaleTimeString() : 'Never'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Tool Executions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                Recent Tool Execution Audit
              </div>
              {(!tool.recent_executions || tool.recent_executions.length === 0) ? (
                <div style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '32px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 12,
                }}>
                  No executions recorded for this tool yet.
                </div>
              ) : (
                <div style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Execution ID</Th>
                        <Th>Target Resource</Th>
                        <Th>Decision</Th>
                        <Th>Result</Th>
                        <Th>Duration</Th>
                        <Th>Timestamp</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {tool.recent_executions.map((x) => (
                        <Tr key={x.id} onClick={() => setSelectedExec(x)}>
                          <Td mono>
                            <span style={{ color: '#a78bfa' }}>{x.id.slice(0, 8)}…</span>
                          </Td>
                          <Td mono>{x.target_resource}</Td>
                          <Td>
                            <DecisionBadge decision={x.decision} />
                          </Td>
                          <Td>
                            <StatusBadge status={x.result} />
                          </Td>
                          <Td mono>{x.duration_ms ? `${x.duration_ms}ms` : '—'}</Td>
                          <Td mono>{new Date(x.executed_at).toLocaleTimeString()}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Execution Drawer */}
        {selectedExec && (
          <EvidenceDrawer evidence={selectedExec} onClose={() => setSelectedExec(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
