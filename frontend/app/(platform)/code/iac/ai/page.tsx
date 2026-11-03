'use client';

/**
 * Kavach — IaC Security: AI Security Assistant (/code/iac/ai)
 * Screen 07: Repository-aware AI assistant explaining Terraform, Kubernetes,
 * IAM, and network security misconfigurations with real code evidence.
 */

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  FolderGit2,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function IaCAssistantContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams?.get('prompt') || '';
  const initialFindingId = searchParams?.get('finding_id') || undefined;

  const { currentRepository } = useScope();
  const repoName = currentRepository?.name || 'terraform-aws-production';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### Welcome to Kavach IaC Security Assistant\n\nI am analyzing infrastructure code for **${repoName}**.\n\nYou can ask me to explain misconfigurations, audit Terraform or Kubernetes files, evaluate pre-deployment plans, or recommend hardened configurations.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [input, setInput] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = [
    'How do I fix S3 bucket encryption in Terraform?',
    'What are the Kubernetes Pod Security Standard violations in my manifests?',
    'Explain the security impact of unrestricted Security Group ingress 0.0.0.0/0.',
    'How can I restrict IAM wildcard policies to least-privilege?',
    'Evaluate our Terraform plan before production deployment.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/api/v1/iac/ai/chat', {
        prompt: query,
        repository_name: repoName,
        finding_id: initialFindingId,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.content || 'Analysis complete.',
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error contacting IaC Security Assistant: ${err.message || 'Service temporarily unavailable.'}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#2563EB',
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              borderRadius: '4px',
              padding: '2px 6px',
              textTransform: 'uppercase',
            }}
          >
            IaC Security
          </span>
          <span style={{ fontSize: '12px', color: '#64748B' }}>/</span>
          <span style={{ fontSize: '12px', color: '#64748B' }}>AI Intelligence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              AI Security Assistant
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
              Repository-aware infrastructure security guidance grounded in actual scan evidence and policy gates.
            </p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              fontSize: '12.5px',
              color: '#334155',
            }}
          >
            <FolderGit2 size={14} color="#2563EB" />
            <span>Active Repository: <strong>{repoName}</strong></span>
          </div>
        </div>
      </div>

      {/* Chat Area Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          minHeight: '520px',
        }}
      >
        {/* Messages List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '75%' : '85%',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2563EB',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: isUser ? '#2563EB' : '#F8FAFC',
                    color: isUser ? '#FFFFFF' : '#0F172A',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: isUser ? 'none' : '1px solid #E2E8F0',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: isUser ? 'inherit' : 'Inter, -apple-system, sans-serif',
                    }}
                  >
                    {m.content}
                  </div>

                  {!isUser && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid #E2E8F0',
                        fontSize: '11px',
                        color: '#94A3B8',
                      }}
                    >
                      <span>{m.timestamp}</span>
                      <button
                        onClick={() => copyToClipboard(m.id, m.content)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {copiedId === m.id ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        {copiedId === m.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '13px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}
              >
                <RefreshCw size={16} className="animate-spin" />
              </div>
              <span>Kavach AI is synthesizing repository manifests and policy evidence...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Bar */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <Lightbulb size={12} color="#F59E0B" /> Suggested:
          </span>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={loading}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#BFDBFE';
                e.currentTarget.style.color = '#1E40AF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.color = '#334155';
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <input
              type="text"
              placeholder="Ask anything about your Terraform, Kubernetes, Helm, or IAM security..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              <Send size={14} />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function IaCAssistantPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#64748B' }}>Loading IaC AI Assistant...</div>}>
      <IaCAssistantContent />
    </Suspense>
  );
}
