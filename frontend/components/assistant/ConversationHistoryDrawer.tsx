'use client';

import React, { useState } from 'react';
import { X, MessageSquare, Trash2, Plus, Clock, Search, ExternalLink } from 'lucide-react';

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  context_metadata?: any;
}

interface ConversationHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  currentConversationId?: string | null;
  activeConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationHistoryDrawer({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: ConversationHistoryDrawerProps) {
  const activeId = activeConversationId ?? currentConversationId;
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

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
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          backgroundColor: '#FFFFFF',
          height: '100%',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="#2563EB" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Consultation History
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action: New Conversation */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <button
            type="button"
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '9px 14px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(15,23,42,0.1)',
            }}
          >
            <Plus size={15} />
            <span>Start New Conversation</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px 8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '6px 12px',
            }}
          >
            <Search size={14} color="#94A3B8" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past conversations..."
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: 12.5,
                color: '#0F172A',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 10px', color: '#CBD5E1' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No saved conversations</div>
              <p style={{ fontSize: 12, margin: '4px 0 0', color: '#94A3B8' }}>
                Your security consultations with Kavach will automatically be saved and accessible here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94A3B8', fontSize: 12.5 }}>
              No conversations match &quot;{search}&quot;
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                    border: isActive ? '1px solid #BFDBFE' : '1px solid #F1F5F9',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
                    <MessageSquare size={16} color={isActive ? '#2563EB' : '#94A3B8'} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#1D4ED8' : '#0F172A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.title || 'Security Consultation'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                        {formatDate(conv.updated_at || conv.created_at)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    title="Delete Conversation"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      padding: 4,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
