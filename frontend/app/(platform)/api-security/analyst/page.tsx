'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  Shield,
  Loader2,
  User,
  ArrowRight,
  Code,
  FileText,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AiSecurityAnalystPage() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';

  const { selectedApi } = useApiSecurity();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = [
    'What are the biggest risks in my API?',
    'Which endpoints need authorization testing?',
    'Explain this finding in detail.',
    'Suggest a fix for this vulnerability.',
    'Show potential attack paths.',
    'How can I improve my API security?',
  ];

  const agentCapabilities = [
    { title: 'Analyze your API structure', desc: 'Evaluates OpenAPI specifications, route handlers, and data models.' },
    { title: 'Investigate findings with evidence', desc: 'Examines HTTP request/response traces and assertion failures.' },
    { title: 'Correlate related findings', desc: 'Identifies compounding vulnerabilities across multiple endpoints.' },
    { title: 'Suggest remediation steps', desc: 'Generates language-specific patch proposals and code diffs.' },
    { title: 'Help with verification/testing', desc: 'Formulates targeted security test plans to confirm fixes.' },
    { title: 'Provide security best practices', desc: 'Aligns defenses with OWASP API Security Top 10 guidelines.' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // If initialPrompt exists on mount, auto-send it
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: prompt, timestamp: new Date().toLocaleTimeString() },
    ];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await api.apiSecurity.analystChat({
        prompt: prompt,
        api_id: selectedApi?.id,
        history: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.response || res.answer || 'No response generated.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: any) {
      console.error('Analyst chat error:', err);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'I encountered an issue connecting to the Gemini security reasoning engine. Please verify connectivity or check API configuration.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Title */}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            AI Security Analyst
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Get insights, investigate findings and get remediation guidance.
          </p>
        </div>

        {/* Two Column Grid: Chat Area (Left) + Capabilities Panel (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Left Column: Chat Container */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 210px)',
              minHeight: '520px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px', margin: 'auto 0' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#F5F3FF',
                      color: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '14px',
                    }}
                  >
                    <Bot size={24} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Kavach Gemini Security Analyst
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '440px', margin: '6px 0 24px 0' }}>
                    Ask specific questions regarding vulnerability impact, BOLA access control, injection risks, or remediation patches.
                  </p>

                  {/* Suggestion Chips */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxWidth: '580px', width: '100%' }}>
                    {suggestedPrompts.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(suggestion)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#334155',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                          e.currentTarget.style.borderColor = '#BFDBFE';
                          e.currentTarget.style.color = '#1D4ED8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.color = '#334155';
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    {!isUser && (
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: '#F5F3FF',
                          color: '#7C3AED',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        <Bot size={16} />
                      </div>
                    )}

                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: isUser ? '#2563EB' : '#F8FAFC',
                        color: isUser ? '#FFFFFF' : '#0F172A',
                        border: isUser ? 'none' : '1px solid #E2E8F0',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10px',
                          color: isUser ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                          marginTop: '6px',
                          textAlign: 'right',
                        }}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {isUser && (
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        MS
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '13px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#F5F3FF',
                      color: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <span>Reasoning with Gemini API security models...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                gap: '10px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask anything about your API security..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isLoading || !inputPrompt.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <span>Send</span>
                <Send size={14} />
              </button>
            </form>
          </div>

          {/* Right Column: Agent Capabilities */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              height: 'fit-content',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Agent Capabilities
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {agentCapabilities.map((cap, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px',
                    }}
                  >
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block' }}>
                      {cap.title}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                      {cap.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
