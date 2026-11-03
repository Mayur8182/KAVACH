'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Terminal,
  Activity,
  Layers,
  Wrench,
} from 'lucide-react';
import { api } from '@/lib/api/client';

interface ActiveAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string | null;
  initialAgents?: any[];
}

export default function ActiveAgentsModal({
  isOpen,
  onClose,
  projectId,
  initialAgents = [],
}: ActiveAgentsModalProps) {
  const [agents, setAgents] = useState<any[]>(initialAgents);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    api.assistant
      .getLiveAgents(projectId)
      .then((data: any) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setAgents(data);
        }
      })
      .catch((err: any) => {
        console.warn('Failed to load live agents:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const displayAgents = agents;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header (Stage 14 Header) */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Active Agents
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>
                Real-time security orchestrator agent execution and telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* List of Agents (Matches Stage 14 card exactly) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '8px', color: '#64748B' }}>
              <Loader2 className="animate-spin" size={18} />
              <span>Checking live agents...</span>
            </div>
          ) : displayAgents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
              <Activity size={32} style={{ margin: '0 auto 12px', color: '#94A3B8' }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>No Active Agents Recorded</h4>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                Specialized security agents (SAST, Secrets, SCA, Container, IaC) activate dynamically during repository scans and policy enforcement.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayAgents.map((agent: any, idx: number) => {
                const isCompleted = agent.status?.toLowerCase() === 'completed';
                const isRunning = agent.status?.toLowerCase() === 'running';
                const isSkipped = agent.status?.toLowerCase() === 'skipped';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: isCompleted ? '#DCFCE7' : isRunning ? '#DBEAFE' : '#F1F5F9',
                          color: isCompleted ? '#16A34A' : isRunning ? '#2563EB' : '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isRunning ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      </div>

                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                          {agent.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          <span style={{ fontWeight: 500, color: isCompleted ? '#16A34A' : isRunning ? '#2563EB' : '#64748B' }}>
                            {agent.status}
                          </span>
                          {' · '}
                          <span>
                            {agent.issues_count > 0
                              ? `${agent.issues_count} issues found`
                              : agent.subtitle || '0 issues found'}
                          </span>
                          {agent.tools && agent.tools.length > 0 && (
                            <span style={{ marginLeft: '8px', fontFamily: 'monospace', color: '#94A3B8' }}>
                              [{agent.tools.join(', ')}]
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                      <Clock size={13} />
                      <span>{agent.duration || '0s'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/policies"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#4F46E5',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <span>Configure Agent Policies</span>
            <ExternalLink size={13} />
          </Link>

          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
