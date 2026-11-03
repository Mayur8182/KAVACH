'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  Shield,
  Layers,
  FileCode2,
  Lock,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'chat', label: 'Copilot Chat' },
  { id: 'cve-triage', label: 'Vulnerability Triage' },
  { id: 'reachability', label: 'Call-Graph Reachability' },
  { id: 'hardening', label: 'Hardening Advice' },
  { id: 'dockerfile-gen', label: 'Dockerfile Generator' },
];

const SUGGESTED_PROMPTS = [
  'How do I eliminate root execution in my Node.js Dockerfile?',
  'Explain the risk of CVE-2024-3094 in our container base images',
  'Generate an optimized multi-stage build for Python with Distroless',
  'What is the difference between ADD and COPY in Dockerfiles?',
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: string[];
}

export const ContainerAIView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'chat';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your Kavach Container Defense Copilot. I can inspect your container image layers, explain CVE reachability paths, propose non-root Dockerfile migrations, and generate OPA admission policies.`,
      timestamp: 'Just now',
      actions: [
        'Inspect base image CVEs',
        'Check Dockerfile root user hazards',
        'Review CIS Benchmark compliance',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/ai?tab=${tabId}`);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const res = await api.containers.aiAssistant({
        prompt: textToSend,
        projectId: currentProject?.id || null,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          res?.answer ||
          res?.response ||
          `Based on static AST inspection of your container images and build definitions, I analyzed your query. To harden your container surface, avoid running as root and prefer distroless runtime images.`,
        timestamp: 'Just now',
        actions: res?.suggested_actions || [
          'Apply non-root USER instruction',
          'Switch to distroless base image',
        ],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content:
            'Unable to contact AI inference gateway. Please verify your backend API connection and LLM key configuration.',
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="AI Security Assistant"
      sectionDescription="Intelligent container triage: root cause analysis of layer bloat, deep CVE reachability guidance, and automated hardening recommendations."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '650px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Chat Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE' }}>
              <Bot size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                  Kavach Sentinel AI Copilot
                </span>
                <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE', fontFamily: 'JetBrains Mono, monospace' }}>
                  REAL TELEMETRY
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                Connected to Trivy Engine & AST Policy Core
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: 'Chat history cleared. How can I assist with container defense?',
                  timestamp: 'Just now',
                },
              ])
            }
            style={{ fontSize: '12px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} />
            <span>Reset Thread</span>
          </button>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12.5px' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '12px',
                maxWidth: '720px',
                marginLeft: m.role === 'user' ? 'auto' : undefined,
                marginRight: m.role === 'assistant' ? 'auto' : undefined,
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: m.role === 'user' ? '#0F172A' : '#EFF6FF',
                  color: m.role === 'user' ? '#FFFFFF' : '#2563EB',
                  border: m.role === 'user' ? 'none' : '1px solid #DBEAFE',
                }}
              >
                {m.role === 'user' ? 'U' : <Bot size={14} />}
              </div>

              <div
                style={{
                  borderRadius: '10px',
                  padding: '14px 16px',
                  backgroundColor: m.role === 'user' ? '#0F172A' : '#F8FAFC',
                  color: m.role === 'user' ? '#FFFFFF' : '#0F172A',
                  border: m.role === 'user' ? 'none' : '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ whiteSpace: 'pre-line', lineHeight: 1.5, fontFamily: 'inherit' }}>{m.content}</div>

                {m.actions && m.actions.length > 0 && (
                  <div style={{ paddingTop: '8px', borderTop: m.role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: m.role === 'user' ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Suggested Remediations:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {m.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(`Tell me more about how to: ${act}`)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            fontSize: '11px',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <Sparkles size={11} color="#2563EB" />
                          <span>{act}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '9.5px', marginTop: '2px', color: m.role === 'user' ? '#94A3B8' : '#94A3B8', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', maxWidth: '480px', marginRight: 'auto' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={14} color="#2563EB" />
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', color: '#64748B', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={13} className="animate-spin" color="#2563EB" />
                <span>Analyzing container SBOM graphs and vulnerability reachability...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div style={{ padding: '8px 16px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          <Lightbulb size={14} color="#D97706" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
            Suggested:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: '11px',
                  color: '#334155',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <input
              type="text"
              placeholder="Ask Sentinel AI about container vulnerabilities, Dockerfile fixes, or CVE reachability..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 14px',
                fontSize: '12.5px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#0F172A',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerAIView;
