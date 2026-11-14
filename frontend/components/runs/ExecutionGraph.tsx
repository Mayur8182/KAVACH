'use client';

import React, { useState } from 'react';
import {
  Code2,
  Layers,
  Box,
  Network,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  GitCommit,
  ShieldAlert,
  Key,
  Cloud,
  GitBranch,
  Search,
  Sparkles,
  FileCheck,
  FileText,
  AlertTriangle,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';

export interface AgentStep {
  name: string;
  status: 'completed' | 'running' | 'pending' | 'skipped' | 'failed';
}

export interface AgentNodeData {
  id: string;
  name: string;
  type: string;
  engine?: string;
  category?: string;
  status: 'running' | 'completed' | 'failed' | 'pending' | 'initializing';
  progressPercentage: number;
  currentActivity?: string;
  currentFile?: string;
  steps: AgentStep[];
}

interface ExecutionGraphProps {
  repositoryName?: string;
  commitSha?: string;
  branchName?: string;
  agents: AgentNodeData[];
  selectedAgentId?: string;
  onSelectAgent?: (agentId: string) => void;
}

export const ExecutionGraph: React.FC<ExecutionGraphProps> = ({
  repositoryName = 'Mayur8182/KAVACH',
  commitSha = '8f4c2e1',
  branchName = 'main',
  agents = [],
  selectedAgentId = 'sast',
  onSelectAgent,
}) => {
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({
    sast: true,
    iac: true,
  });
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (agentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAgents((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  };

  const getAgentIcon = (typeOrId: string) => {
    const key = (typeOrId || '').toLowerCase();
    if (key.includes('sast') || key === 'code') return <Code2 size={15} color="#16A34A" />;
    if (key.includes('iac')) return <Layers size={15} color="#0F172A" />;
    if (key.includes('container') || key.includes('docker')) return <Box size={15} color="#D97706" />;
    if (key.includes('secret') || key.includes('gitleaks')) return <Key size={15} color="#DC2626" />;
    if (key.includes('sca') || key.includes('osv') || key.includes('dep')) return <ShieldAlert size={15} color="#DC2626" />;
    if (key.includes('api') || key.includes('dast')) return <Network size={15} color="#D97706" />;
    if (key.includes('cloud')) return <Cloud size={15} color="#0F172A" />;
    if (key.includes('scm') || key.includes('git')) return <GitBranch size={15} color="#0F172A" />;
    if (key.includes('investigat')) return <Search size={15} color="#D97706" />;
    if (key.includes('remediat') || key.includes('fix')) return <Sparkles size={15} color="#16A34A" />;
    if (key.includes('complian')) return <FileCheck size={15} color="#16A34A" />;
    if (key.includes('report')) return <FileText size={15} color="#64748B" />;
    return <Code2 size={15} color="#16A34A" />;
  };

  const runningCount = agents.filter((a) => a.status === 'running' || a.status === 'initializing').length;
  const completedCount = agents.filter((a) => a.status === 'completed').length;
  const failedCount = agents.filter((a) => a.status === 'failed').length;

  const filteredAgents = agents.filter((agent) => {
    if (filterMode === 'active' && agent.status !== 'running' && agent.status !== 'initializing') {
      return false;
    }
    if (filterMode === 'completed' && agent.status !== 'completed') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.id.toLowerCase().includes(q) ||
        (agent.currentActivity && agent.currentActivity.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '520px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        boxSizing: 'border-box',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* 1. Panel Header with Clear Hierarchy */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Agent Execution Graph
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#64748B',
            }}
          >
            {runningCount > 0 ? `${runningCount} active agents` : `${agents.length} engines active`}
          </span>
        </div>
      </div>

      {/* 2. Filter Pills & Fast Search */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { id: 'all', label: `All (${agents.length})` },
            { id: 'active', label: `Active (${runningCount})` },
            { id: 'completed', label: `Done (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              style={{
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '10.5px',
                fontWeight: filterMode === tab.id ? 700 : 500,
                backgroundColor: filterMode === tab.id ? '#0F172A' : 'transparent',
                color: filterMode === tab.id ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '95px',
          }}
        >
          <Search size={11} color="#94A3B8" style={{ position: 'absolute', left: '6px' }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '2px 6px 2px 22px',
              fontSize: '10.5px',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              color: '#0F172A',
              height: '22px',
              minHeight: '22px',
            }}
          />
        </div>
      </div>

      {/* 3. Main Tree Container: Repository Root on Left & Agent Cards on Right */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 8px',
          display: 'flex',
          position: 'relative',
          gap: '8px',
        }}
      >
        {/* Left Tree Root Box */}
        <div
          style={{
            width: '105px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <FolderGit2 size={13} color="#0F172A" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0F172A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={repositoryName}
              >
                {repositoryName.split('/').pop() || repositoryName}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
              <span>&rarr;</span>
              <span>{commitSha.slice(0, 7)}</span>
            </div>
          </div>
        </div>

        {/* Tree Branch SVG Connectors */}
        <div
          style={{
            width: '16px',
            flexShrink: 0,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible',
            }}
          >
            {filteredAgents.map((_, idx) => {
              const total = filteredAgents.length;
              if (total === 0) return null;
              const stepPercent = 100 / (total + 1);
              const targetY = (idx + 1) * stepPercent;
              return (
                <path
                  key={idx}
                  d={`M 0 50 C 8 50, 8 ${targetY}, 16 ${targetY}`}
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="1.2"
                />
              );
            })}
          </svg>
        </div>

        {/* Right Stack of Agent Cards */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: 0,
          }}
        >
          {filteredAgents.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
              No security agents match the current filter.
            </div>
          ) : (
            filteredAgents.map((agent) => {
              const isSelected = selectedAgentId === agent.id;
              const isExpanded = expandedAgents[agent.id] ?? false;
              const isCompleted = agent.status === 'completed';
              const isRunning = agent.status === 'running' || agent.status === 'initializing';
              const isFailed = agent.status === 'failed';

              return (
                <div
                  key={agent.id}
                  onClick={() => onSelectAgent?.(agent.id)}
                  style={{
                    border: isSelected ? '1.5px solid #16A34A' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    boxShadow: isSelected
                      ? '0 0 0 1px #16A34A, 0 1px 3px rgba(22, 163, 74, 0.08)'
                      : '0 1px 2px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {/* Agent Header Line */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getAgentIcon(agent.id || agent.type)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#0F172A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {agent.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isCompleted
                                ? '#16A34A'
                                : (isRunning ? '#D97706' : (isFailed ? '#DC2626' : '#64748B')),
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: isCompleted
                                  ? '#16A34A'
                                  : (isRunning ? '#D97706' : (isFailed ? '#DC2626' : '#94A3B8')),
                              }}
                            />
                            {isCompleted
                              ? 'Completed'
                              : (isRunning ? 'Running' : (isFailed ? 'Failed' : 'Pending'))}
                          </span>
                          {agent.engine && (
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#64748B',
                                backgroundColor: '#F1F5F9',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              {agent.engine}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expand / Collapse toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(agent.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title={isExpanded ? 'Collapse task details' : 'Expand task details'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar if running & measurable */}
                  {isRunning && (
                    <div
                      style={{
                        width: '100%',
                        height: '3px',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        marginTop: '2px',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(10, Math.min(100, agent.progressPercentage || 40))}%`,
                          height: '100%',
                          backgroundColor: '#16A34A',
                          borderRadius: '2px',
                          transition: 'width 200ms ease',
                        }}
                      />
                    </div>
                  )}

                  {/* Current activity badge */}
                  {agent.currentActivity && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: isRunning ? '#065F46' : (isCompleted ? '#166534' : '#475569'),
                        backgroundColor: isRunning ? '#ECFDF5' : (isCompleted ? '#F0FDF4' : '#F8FAFC'),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${isRunning ? '#A7F3D0' : '#E2E8F0'}`,
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      title={agent.currentActivity}
                    >
                      {isRunning && <Loader2 size={10} className="animate-spin" color="#16A34A" />}
                      <span>{agent.currentActivity}</span>
                    </div>
                  )}

                  {/* Sub-steps Checklist (Shown when expanded) */}
                  {isExpanded && agent.steps && agent.steps.length > 0 && (
                    <div
                      style={{
                        marginTop: '4px',
                        paddingTop: '6px',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {agent.steps.map((st, sIdx) => {
                        const isStepDone = st.status === 'completed';
                        const isStepRunning = st.status === 'running';
                        return (
                          <div
                            key={sIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              color: isStepDone ? '#0F172A' : (isStepRunning ? '#16A34A' : '#94A3B8'),
                              fontWeight: isStepRunning ? 600 : 400,
                            }}
                          >
                            {isStepDone ? (
                              <CheckCircle2 size={12} color="#16A34A" style={{ flexShrink: 0 }} />
                            ) : isStepRunning ? (
                              <Loader2 size={12} color="#16A34A" className="animate-spin" style={{ flexShrink: 0 }} />
                            ) : (
                              <Circle size={10} color="#CBD5E1" style={{ flexShrink: 0 }} />
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {st.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
