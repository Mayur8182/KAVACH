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
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (promptToSend?: string) => {
    const prompt = promptToSend || inputPrompt;
    if (!prompt.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        content: prompt,
        timestamp: new Date().toLocaleTimeString(),
      },
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
      <div className="w-full space-y-6">
        <PageHeader
          title="AI Security Analyst"
          subtitle="Interactive reasoning engine for investigating findings, attack chains, and code remediation."
          breadcrumbs={[
            { label: 'API Security', href: '/api-security' },
            { label: 'Analyst' },
          ]}
        />

        {/* Full Width Chat Container */}
        <div className="w-full">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col h-[calc(100vh-250px)] min-h-[540px] overflow-hidden shadow-xs w-full">
            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center text-center p-8 m-auto">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60 flex items-center justify-center mb-3">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Kavach Gemini Security Analyst
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mt-1 mb-6">
                    Ask specific questions regarding vulnerability impact, BOLA access control, injection risks, or remediation patches.
                  </p>

                  {/* Suggestion Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                    {suggestedPrompts.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(suggestion)}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-850/60 border border-slate-200 dark:border-zinc-700/80 text-xs font-medium text-slate-700 dark:text-zinc-300 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 transition"
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
                    className={`flex items-start gap-3 max-w-[85%] ${
                      isUser ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-zinc-700 rounded-tl-xs'
                      }`}
                    >
                      {msg.content}
                      <span
                        className={`block text-[10px] mt-1.5 text-right ${
                          isUser ? 'text-blue-200' : 'text-slate-400 dark:text-zinc-500'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-zinc-400">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
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
              className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-850/60 flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask anything about your API security posture, findings, or patches..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
