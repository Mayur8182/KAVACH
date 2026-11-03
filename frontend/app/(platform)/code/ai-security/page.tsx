'use client';

/**
 * Thing Code — AI Security Controls (/code/ai-security)
 * 
 * Production-grade AI coding agent security and governance console.
 * Strictly adheres to AGENTS.md:
 * - "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
 * - Zero hardcoded mock data. 100% PostgreSQL persistence.
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import {
  Bot,
  User,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Zap,
  Wrench,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Database,
  Globe,
  Folder,
  Code2,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';

// ── SVG Sparkline ─────────────────────────────────────────────────────────────

const Sparkline: React.FC<{ color: string }> = ({ color }) => (
  <svg width="84" height="26" viewBox="0 0 84 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 18C16 16 22 24 36 19C48 14 54 6 66 10C72 12 78 4 82 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Header Isometric AI Network Graphic (Matching Image) ──────────────────────

const AiHexNetworkGraphic: React.FC = () => (
  <div style={{ position: 'relative', width: '180px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* Center Hexagon: AI */}
    <div
      style={{
        position: 'relative',
        width: '54px',
        height: '62px',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #DBEAFE 100%)',
        border: '1.5px solid #93C5FD',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.12)',
        zIndex: 2,
      }}
    >
      <span style={{ fontSize: '15px', fontWeight: 800, color: '#1D4ED8', letterSpacing: '-0.02em' }}>
        AI
      </span>
    </div>

    {/* Top Right Node: Shield Purple */}
    <div
      style={{
        position: 'absolute',
        right: '16px',
        top: '6px',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: '#F5F3FF',
        border: '1px solid #DDD6FE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)',
        zIndex: 1,
      }}
    >
      <ShieldCheck size={16} color="#8B5CF6" />
    </div>

    {/* Bottom Left Node: Shield Green */}
    <div
      style={{
        position: 'absolute',
        left: '14px',
        bottom: '8px',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: '#ECFDF5',
        border: '1px solid #A7F3D0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
        zIndex: 1,
      }}
    >
      <ShieldCheck size={16} color="#10B981" />
    </div>

    {/* Connecting SVG lines */}
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="42" y1="52" x2="68" y2="42" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="112" y1="42" x2="148" y2="24" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  </div>
);

// ── Management Card Empty State Illustrations ──────────────────────────────────

const EmptyAgentsIllustration: React.FC = () => (
  <div style={{ position: 'relative', width: '84px', height: '70px', margin: '0 auto 14px' }}>
    <div
      style={{
        width: '64px',
        height: '52px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '8px',
        margin: '0 auto',
        boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ width: '24px', height: '4px', backgroundColor: '#CBD5E1', borderRadius: '2px' }} />
      <div style={{ width: '40px', height: '3px', backgroundColor: '#E2E8F0', borderRadius: '2px' }} />
    </div>
    {/* Blue Plus Badge */}
    <div
      style={{
        position: 'absolute',
        right: '4px',
        bottom: '6px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: '#2563EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
      }}
    >
      <Plus size={14} color="#FFFFFF" />
    </div>
  </div>
);

const EmptyPermissionsIllustration: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto 14px' }}>
    {[
      { icon: Terminal, color: '#3B82F6', bg: '#EFF6FF' },
      { icon: Database, color: '#8B5CF6', bg: '#F5F3FF' },
      { icon: Globe, color: '#10B981', bg: '#ECFDF5' },
      { icon: Folder, color: '#F59E0B', bg: '#FFFBEB' },
    ].map((item, idx) => {
      const Icon = item.icon;
      return (
        <div
          key={idx}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: item.bg,
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={14} color={item.color} />
        </div>
      );
    })}
  </div>
);

const EmptyExecutionsIllustration: React.FC = () => (
  <div style={{ width: '48px', height: '56px', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div
      style={{
        width: '44px',
        height: '52px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '6px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ width: '20px', height: '3px', backgroundColor: '#94A3B8', borderRadius: '1px' }} />
      <div style={{ width: '28px', height: '2px', backgroundColor: '#CBD5E1', borderRadius: '1px' }} />
      <div style={{ width: '24px', height: '2px', backgroundColor: '#CBD5E1', borderRadius: '1px' }} />
    </div>
  </div>
);

const EmptyPolicyIllustration: React.FC = () => (
  <div style={{ width: '48px', height: '56px', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div
      style={{
        width: '44px',
        height: '52px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '6px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}
    >
      <ShieldCheck size={20} color="#2563EB" />
    </div>
  </div>
);

// ── Main Page Component ────────────────────────────────────────────────────────

type ActiveNavTab = 'Overview' | 'Agents' | 'Tool Permissions' | 'Policies' | 'Audit Logs' | 'Settings';

function AISecurityContent() {
  const searchParams = useSearchParams();
  const { currentProject } = useScope();

  // Navigation state
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('Overview');

  // Backend Data States
  const [overview, setOverview] = useState<any>({
    metrics: {
      registered_agents: { label: 'Registered Agents', value: '—', count: 0, color: '#2563EB' },
      tool_executions: { label: 'Tool Executions', value: '—', count: 0, color: '#8B5CF6' },
      allowed_executions: { label: 'Allowed Executions', value: '—', count: 0, color: '#10B981' },
      blocked_executions: { label: 'Blocked Executions', value: '—', count: 0, color: '#EF4444' },
    },
    agents: [],
    tool_permissions: [],
    recent_executions: [],
    policies: [],
  });

  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [toolPermissions, setToolPermissions] = useState<any[]>([]);
  const [policiesList, setPoliciesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState('coding_assistant');
  const [newAgentTrust, setNewAgentTrust] = useState('restricted');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [isSubmittingAgent, setIsSubmittingAgent] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Load Real Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewData, agentsData, permsData, polsData, auditData] = await Promise.all([
        api.code.aiSecurityOverview(currentProject?.id).catch(() => null),
        api.code.aiSecurityAgents(currentProject?.id).catch(() => ({ total: 0, items: [] })),
        api.code.aiSecurityToolPermissions().catch(() => ({ total: 0, items: [] })),
        api.code.aiSecurityPolicies().catch(() => ({ total: 0, items: [] })),
        api.code.aiSecurityAuditLogs().catch(() => ({ total: 0, items: [] })),
      ]);

      if (overviewData) setOverview(overviewData);
      if (agentsData?.items) setAgentsList(agentsData.items);
      if (permsData?.items) setToolPermissions(permsData.items);
      if (polsData?.items) setPoliciesList(polsData.items);
      if (auditData?.items) setAuditLogs(auditData.items);
    } catch (err: any) {
      console.error('[AISecurity] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    setIsSubmittingAgent(true);
    try {
      await api.code.registerAiAgent({
        name: newAgentName.trim(),
        agent_type: newAgentType,
        trust_level: newAgentTrust,
        description: newAgentDesc.trim(),
        project_id: currentProject?.id,
      });
      showToast(`Agent '${newAgentName}' registered successfully.`, 'success');
      setNewAgentName('');
      setNewAgentDesc('');
      setIsRegisterModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to register agent.', 'error');
    } finally {
      setIsSubmittingAgent(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await api.code.deleteAiAgent(agentId);
      showToast('Agent revoked successfully.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke agent.', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toastMsg.type === 'success' ? '#064E3B' : '#7F1D1D',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 size={16} color="#34D399" /> : <AlertTriangle size={16} color="#F87171" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ── 1. Top Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
        <span>GOVERNANCE &amp; CONFIG</span>
        <ChevronRight size={12} color="#94A3B8" />
        <span style={{ color: '#2563EB' }}>AI Security</span>
      </div>

      {/* ── 2. Top Header with Title, Hexagon Graphic, and Action Buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)',
            }}
          >
            <User size={22} color="#2563EB" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
              AI Security Controls
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0' }}>
              Manage and govern AI coding agents, tool permissions, policy enforcement, and execution audit.
            </p>
          </div>
        </div>

        {/* Center/Right Decorative Graphic & Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <AiHexNetworkGraphic />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <FileText size={14} color="#64748B" />
              <span>Docs</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} color="#64748B" style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Plus size={15} />
              <span>Register Agent</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Horizontal Navigation Tabs ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '0px',
        }}
      >
        {(['Overview', 'Agents', 'Tool Permissions', 'Policies', 'Audit Logs', 'Settings'] as ActiveNavTab[]).map(
          (tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 2px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  color: isActive ? '#2563EB' : '#64748B',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                {tab}
              </button>
            );
          }
        )}
      </div>

      {/* ── 4. Metric Cards (Row of 4 Cards) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          {
            label: 'Registered Agents',
            value: overview.metrics.registered_agents.value,
            color: '#2563EB',
            icon: User,
            bg: '#EFF6FF',
            tabTarget: 'Agents' as ActiveNavTab,
          },
          {
            label: 'Tool Executions',
            value: overview.metrics.tool_executions.value,
            color: '#8B5CF6',
            icon: Code2,
            bg: '#F5F3FF',
            tabTarget: 'Audit Logs' as ActiveNavTab,
          },
          {
            label: 'Allowed Executions',
            value: overview.metrics.allowed_executions.value,
            color: '#10B981',
            icon: ShieldCheck,
            bg: '#ECFDF5',
            tabTarget: 'Audit Logs' as ActiveNavTab,
          },
          {
            label: 'Blocked Executions',
            value: overview.metrics.blocked_executions.value,
            color: '#EF4444',
            icon: ShieldAlert,
            bg: '#FEF2F2',
            tabTarget: 'Audit Logs' as ActiveNavTab,
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => setActiveTab(card.tabTarget)}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'border-color 120ms ease, box-shadow 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: card.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={14} color={card.color} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {card.label} <span style={{ color: '#94A3B8' }}>&gt;</span>
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', margin: '10px 0 6px', letterSpacing: '-0.02em' }}>
                {card.value}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Sparkline color={card.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 5. Tab Views ── */}

      {/* ── VIEW: Overview (2x2 Grid) ── */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          
          {/* Card 1: AI Agents */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '260px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={16} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>AI Agents</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                    Manage AI coding agents and their capabilities.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                <span>Add Agent</span>
              </button>
            </div>

            {agentsList.length === 0 ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px' }}>
                <EmptyAgentsIllustration />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  No agents registered
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '300px', margin: '0 auto 16px', lineHeight: 1.45 }}>
                  Register AI coding agents to control tool access, apply policies, and monitor executions.
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Register your first agent</span>
                </button>
              </div>
            ) : (
              <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {agentsList.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{agent.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        Type: {agent.agent_type} • Trust: {agent.trust_level}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Tool Permissions */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '260px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#F5F3FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wrench size={16} color="#8B5CF6" />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Tool Permissions</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                    Control which tools and resources agents can access.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('Tool Permissions')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Manage Permissions
              </button>
            </div>

            {toolPermissions.length === 0 ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px' }}>
                <EmptyPermissionsIllustration />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  No tool permissions configured
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '300px', margin: '0 auto 16px', lineHeight: 1.45 }}>
                  Define allowed tools, resources, and scopes for your AI agents to ensure secure execution.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('Tool Permissions')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: '#2563EB',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: '1px solid #BFDBFE',
                    cursor: 'pointer',
                  }}
                >
                  <span>+ Configure tool permissions</span>
                </button>
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toolPermissions.slice(0, 3).map((tool, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <span style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                      {tool.tool_name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        color: tool.effect === 'ALLOW' ? '#059669' : tool.effect === 'DENY' ? '#DC2626' : '#D97706',
                        backgroundColor: tool.effect === 'ALLOW' ? '#ECFDF5' : tool.effect === 'DENY' ? '#FEF2F2' : '#FFFBEB',
                      }}
                    >
                      {tool.effect}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Recent Agent Executions */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '260px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={16} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Agent Executions</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                    Track and monitor AI agent tool executions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('Audit Logs')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View all
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px' }}>
                <EmptyExecutionsIllustration />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  No execution logs yet
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '300px', margin: '0 auto', lineHeight: 1.45 }}>
                  Agent executions will appear here once agents start running.
                </div>
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{log.tool_name}</span>
                      <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>{log.operation}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: log.decision === 'ALLOW' ? '#059669' : '#DC2626' }}>
                      {log.decision}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Policy Enforcement */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '260px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={16} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Policy Enforcement</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                    Govern agent behavior with OPA policies.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('Policies')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Manage Policies
              </button>
            </div>

            {policiesList.length === 0 ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px' }}>
                <EmptyPolicyIllustration />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  No policies configured
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '300px', margin: '0 auto', lineHeight: 1.45 }}>
                  Create OPA policies to enforce security rules for AI agents.
                </div>
              </div>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {policiesList.slice(0, 3).map((pol, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{pol.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{pol.rule_id} • {pol.severity}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                      {pol.mode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW: Agents Inventory Tab ── */}
      {activeTab === 'Agents' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Registered AI Coding Agents</h3>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>Register Agent</span>
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFBFD', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                <th style={{ padding: '12px 20px' }}>Agent Name</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Trust Level</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Created</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agentsList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8' }}>
                    No agents registered yet. Click &quot;Register Agent&quot; to onboard an AI assistant.
                  </td>
                </tr>
              ) : (
                agentsList.map((agent) => (
                  <tr key={agent.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>{agent.name}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{agent.agent_type}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', textTransform: 'capitalize' }}>
                        {agent.trust_level}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                        {agent.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>
                      {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteAgent(agent.id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VIEW: Tool Permissions Tab ── */}
      {activeTab === 'Tool Permissions' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Tool Permission Policy Matrix</h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                Enforced by the deterministic MCP Security Gateway before tool execution.
              </p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFBFD', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                <th style={{ padding: '12px 20px' }}>Tool Identifier</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Enforced Effect</th>
              </tr>
            </thead>
            <tbody>
              {toolPermissions.map((tool, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, fontFamily: 'monospace', color: '#0F172A' }}>
                    {tool.tool_name}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{tool.category}</td>
                  <td style={{ padding: '14px 16px', color: '#64748B' }}>{tool.description}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '4px',
                        color: tool.effect === 'ALLOW' ? '#059669' : tool.effect === 'DENY' ? '#DC2626' : '#D97706',
                        backgroundColor: tool.effect === 'ALLOW' ? '#ECFDF5' : tool.effect === 'DENY' ? '#FEF2F2' : '#FFFBEB',
                      }}
                    >
                      {tool.effect}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VIEW: Policies Tab ── */}
      {activeTab === 'Policies' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>OPA Agent Guardrail Policies</h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Deterministic Open Policy Agent rules evaluated on every agent request.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFBFD', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                <th style={{ padding: '12px 20px' }}>Rule ID</th>
                <th style={{ padding: '12px 16px' }}>Policy Name</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 16px' }}>Severity</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Mode</th>
              </tr>
            </thead>
            <tbody>
              {policiesList.map((pol, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, fontFamily: 'monospace', color: '#2563EB' }}>
                    {pol.rule_id}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>{pol.name}</td>
                  <td style={{ padding: '14px 16px', color: '#64748B' }}>{pol.description}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: pol.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }}>
                      {pol.severity}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                      {pol.mode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VIEW: Audit Logs Tab ── */}
      {activeTab === 'Audit Logs' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Agent Tool Execution Audit Trail</h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Cryptographically verified execution events and policy enforcement decisions.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFBFD', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                <th style={{ padding: '12px 20px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Tool</th>
                <th style={{ padding: '12px 16px' }}>Operation</th>
                <th style={{ padding: '12px 16px' }}>Resource Type</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Policy Decision</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8' }}>
                    No agent tool executions recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', color: '#64748B', fontSize: '12px' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, fontFamily: 'monospace', color: '#0F172A' }}>
                      {log.tool_name}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{log.operation}</td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>{log.resource_type}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: log.decision === 'ALLOW' ? '#059669' : '#DC2626',
                          backgroundColor: log.decision === 'ALLOW' ? '#ECFDF5' : '#FEF2F2',
                        }}
                      >
                        {log.decision}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VIEW: Settings Tab ── */}
      {activeTab === 'Settings' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
            AI Security Gateway Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                Strict MCP Gateway Enforcement
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                All AI agent tool calls must route through the official Model Context Protocol (MCP) gateway with input parameter validation.
              </p>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                Automatic Anomaly Isolation
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Immediately revoke agent session and block credentials if high-severity policy violations occur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Register New Agent ── */}
      {isRegisterModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsRegisterModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '28px 32px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Register AI Coding Agent
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Agent Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Antigravity Coding Assistant"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Agent Role / Type
                </label>
                <select
                  value={newAgentType}
                  onChange={(e) => setNewAgentType(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="coding_assistant">Coding Assistant</option>
                  <option value="security_auditor">Security Auditor</option>
                  <option value="pr_reviewer">PR Reviewer</option>
                  <option value="remediation_agent">Remediation Agent</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Trust Level
                </label>
                <select
                  value={newAgentTrust}
                  onChange={(e) => setNewAgentTrust(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="restricted">Restricted (Read-only + sandbox)</option>
                  <option value="standard">Standard (Branch commit + PR create)</option>
                  <option value="privileged">Privileged (CI/CD trigger)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Operational responsibilities and scope"
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAgent || !newAgentName.trim()}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: isSubmittingAgent ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingAgent ? 'Registering...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AISecurityPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
          <RefreshCw size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      }
    >
      <AISecurityContent />
    </Suspense>
  );
}
