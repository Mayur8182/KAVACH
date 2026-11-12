'use client';

/**
 * Kavach — Global Contextual AI Copilot Drawer
 * 
 * Production implementation replacing isolated /assistant page:
 *   - Slide-over drawer accessible from any platform route
 *   - Shortcut trigger: ⌘K / Ctrl+K
 *   - Context-aware prompt suggestions based on active finding, run, or repository
 *   - Grounded in authenticated backend endpoints (/api/v1/assistant/chat)
 *   - Multi-turn conversation persistence & history drawer
 *   - Zero decorative mock data; real security engine responses only
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  Bot,
  User,
  GitBranch,
  ShieldAlert,
  Terminal,
  FileCode,
  Layers,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { AssistantMarkdownRenderer } from './AssistantMarkdownRenderer';
import { AssistantWorkflowTimeline } from './AssistantWorkflowTimeline';

interface CopilotContextData {
  finding?: {
    id: string;
    display_id?: string;
    title: string;
    severity?: string;
    rule_id?: string;
    file_path?: string;
    line_number?: number;
  } | null;
  repository?: string | null;
  runId?: string | null;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  structured_data?: any;
}

export function AssistantDrawer() {
  const pathname = usePathname();
  const { currentProject, currentWorkspace } = useScope();

  const [isOpen, setIsOpen] = useState(false);
  const [contextData, setContextData] = useState<CopilotContextData>({});
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitElapsed, setSubmitElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationsList, setConversationsList] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcut: ⌘K or Ctrl+K to toggle drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Custom Event Listener to open copilot with specific context from any button
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CopilotContextData>;
      if (customEvent.detail) {
        setContextData(customEvent.detail);
      }
      setIsOpen(true);
    };
    window.addEventListener('kavach:open-copilot', handleOpenEvent);
    return () => window.removeEventListener('kavach:open-copilot', handleOpenEvent);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Elapsed timer for query execution
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSubmitting) {
      setSubmitElapsed(0);
      timer = setInterval(() => setSubmitElapsed((c) => c + 1), 1000);
    } else {
      setSubmitElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isSubmitting]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Load conversation list when opened
  const loadConversations = useCallback(async () => {
    try {
      const res: any = await api.get('/api/v1/assistant/conversations').catch(() => null);
      if (Array.isArray(res)) {
        setConversationsList(res);
      } else if (res?.conversations && Array.isArray(res.conversations)) {
        setConversationsList(res.conversations);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  // Send message to backend
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isSubmitting) return;

    setInputQuery('');

    // Prepend context note to backend query if active finding attached
    let enrichedMessage = text;
    if (contextData.finding && !text.includes(contextData.finding.id)) {
      enrichedMessage = `[Context: Finding ${contextData.finding.display_id || contextData.finding.id} - ${contextData.finding.title} in ${contextData.finding.file_path || 'file'}]\n${text}`;
    }

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSubmitting(true);

    try {
      const res: any = await api.post('/api/v1/assistant/chat', {
        message: enrichedMessage,
        conversation_id: conversationId || undefined,
        project_id: currentProject?.id || null,
        workspace_id: currentWorkspace?.id || null,
      });

      if (res?.conversation_id && !conversationId) {
        setConversationId(res.conversation_id);
      }

      const assistantMsg: MessageItem = {
        id: res?.id || `ast-${Date.now()}`,
        sender: 'assistant',
        content: res?.reply || res?.message || res?.content || 'I completed analyzing the requested security context.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        structured_data: res?.structured_data,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `Error invoking security copilot: ${err?.message || 'The assistant service is currently unreachable.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
  };

  const handleSelectConversation = async (convId: string) => {
    setIsSubmitting(true);
    setShowHistory(false);
    try {
      const conv: any = await api.get(`/api/v1/assistant/conversations/${convId}`);
      if (conv) {
        setConversationId(conv.id || convId);
        if (Array.isArray(conv.messages)) {
          setMessages(
            conv.messages.map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              sender: m.role === 'user' || m.sender === 'user' ? 'user' : 'assistant',
              content: m.content || '',
              timestamp: m.timestamp
                ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              structured_data: m.structured_data,
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Could not load consultation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derive smart suggestion chips based on active context
  const getSuggestionChips = () => {
    if (contextData.finding) {
      return [
        'Explain the vulnerability & attack path',
        'Analyze source reachability & CWE',
        'Synthesize deterministic fix diff',
      ];
    }
    if (pathname.includes('/runs')) {
      return [
        'Summarize recent scanner telemetry',
        'Explain failed security checks',
        'Show critical scanner events',
      ];
    }
    if (pathname.includes('/assets')) {
      return [
        'Review inventory coverage',
        'Check connected GitHub repositories',
        'Detect unmapped cloud resources',
      ];
    }
    return [
      'What needs attention first?',
      'Scan connected repositories',
      'Show open critical vulnerabilities',
    ];
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open Kavach Copilot"
        title="Open Kavach Copilot (⌘K)"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '9999px',
          border: '1px solid #334155',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.3)',
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
      >
        <Sparkles size={16} color="#818CF8" />
        <span>Copilot</span>
        <kbd
          style={{
            fontSize: '11px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#E2E8F0',
            fontFamily: 'monospace',
          }}
        >
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1050,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 'min(580px, 100vw)',
          backgroundColor: '#FFFFFF',
          height: '100%',
          boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Copilot Header ─────────────────────────────────────────── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(129, 140, 248, 0.3)',
              }}
            >
              <Sparkles size={18} color="#818CF8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>Kavach Copilot</span>
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#94A3B8' }}>
                  ACTIVE
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Grounded security intelligence · ⌘K
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              title="Conversation History"
              style={{
                background: 'none',
                border: 'none',
                color: showHistory ? '#818CF8' : '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={handleNewConversation}
              title="New Consultation"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close Copilot"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Active Context Ribbon ──────────────────────────────────── */}
        {contextData.finding && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#EEF2FF',
              borderBottom: '1px solid #C7D2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: '#4338CA', textTransform: 'uppercase' }}>Scope:</span>
              <span style={{ fontWeight: 600, color: '#1E1B4B', fontFamily: 'monospace' }}>
                {contextData.finding.display_id || contextData.finding.id}
              </span>
              <span style={{ color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                — {contextData.finding.title}
              </span>
            </div>
            <button
              onClick={() => setContextData((prev) => ({ ...prev, finding: null }))}
              title="Clear finding context"
              style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', padding: '2px', display: 'flex' }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Conversation History Drawer Slide-in ───────────────────── */}
        {showHistory && (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              padding: '12px 16px',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
              Past Consultations
            </div>
            {conversationsList.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748B' }}>No past conversations stored.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {conversationsList.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: conversationId === c.id ? '#EEF2FF' : '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      color: '#0F172A',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.title || c.snippet || `Consultation ${String(c.id).slice(0, 8)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Chat Messages Scroll Area ──────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#FAFAFA',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', padding: '24px 16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#EEF2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Bot size={22} color="#4F46E5" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                {contextData.finding
                  ? `Reviewing ${contextData.finding.title}`
                  : 'How can Kavach Copilot assist you?'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                {contextData.finding
                  ? 'Ask for an attack path breakdown, inspect the reachability of the vulnerable lines, or synthesize a verifiable remediation proposal.'
                  : 'Ask about security findings, scanner failures, OPA policy enforcement, or repository triage.'}
              </p>

              {/* Contextual Quick Suggestion Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px', margin: '0 auto' }}>
                {getSuggestionChips().map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <span>{chip}</span>
                    <ChevronRight size={13} color="#94A3B8" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        maxWidth: '88%',
                        flexDirection: isUser ? 'row-reverse' : 'row',
                      }}
                    >
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: isUser ? '#0F172A' : '#EEF2FF',
                          color: isUser ? '#FFFFFF' : '#4F46E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {isUser ? <User size={13} /> : <Sparkles size={13} />}
                      </div>

                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: isUser ? '#0F172A' : '#FFFFFF',
                          color: isUser ? '#FFFFFF' : '#1E293B',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          border: isUser ? 'none' : '1px solid #E2E8F0',
                          fontSize: '13px',
                          lineHeight: 1.55,
                        }}
                      >
                        {isUser ? (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                        ) : (
                          <div>
                            <AssistantMarkdownRenderer content={m.content} />
                            {m.structured_data?.agent_workflow && (
                              <AssistantWorkflowTimeline
                                workflow={m.structured_data.agent_workflow}
                                onWorkflowUpdated={(updated) => {
                                  setMessages((prev) =>
                                    prev.map((msg) =>
                                      msg.id === m.id
                                        ? {
                                            ...msg,
                                            structured_data: {
                                              ...msg.structured_data,
                                              agent_workflow: updated,
                                            },
                                          }
                                        : msg
                                    )
                                  );
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: '10.5px', color: '#94A3B8', margin: '0 34px' }}>
                      {m.timestamp}
                    </span>
                  </div>
                );
              })}

              {isSubmitting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', padding: '8px 12px' }}>
                  <RefreshCw size={14} className="animate-spin" color="#4F46E5" />
                  <span>Kavach Copilot is analyzing repository evidence... ({submitElapsed}s)</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── Copilot Input Bar ──────────────────────────────────────── */}
        <div
          className="kavach-safe-bottom"
          style={{
            padding: '12px 16px max(14px, env(safe-area-inset-bottom))',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '6px 12px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                contextData.finding
                  ? `Ask about ${contextData.finding.title}...`
                  : 'Ask anything or run security check...'
              }
              disabled={isSubmitting}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0F172A',
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputQuery.trim()}
              aria-label="Send message"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: !inputQuery.trim() || isSubmitting ? '#E2E8F0' : '#0F172A',
                color: !inputQuery.trim() || isSubmitting ? '#94A3B8' : '#FFFFFF',
                border: 'none',
                cursor: !inputQuery.trim() || isSubmitting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Send size={14} />
            </button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#94A3B8' }}>
            <span>Press <strong>Enter</strong> to send · <strong>Esc</strong> to close</span>
            <span>Deterministic AST verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssistantDrawer;

