'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Webhook,
} from 'lucide-react';

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: string;
  created_at: string;
  last_triggered: string;
}

export default function WebhooksIntegrationPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form Fields
  const [showAddForm, setShowAddForm] = useState<boolean>(true);
  const [nameInput, setNameInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [secretInput, setSecretInput] = useState<string>('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set(['scan_completed', 'scan_failed'])
  );

  // Test Delivery Result
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status_code?: number;
    latency_ms: number;
    error?: string;
  } | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.integrations.listWebhooks();
      setWebhooks(list || []);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleToggleEvent = (eventKey: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventKey)) next.delete(eventKey);
      else next.add(eventKey);
      return next;
    });
  };

  const handleTestDelivery = async () => {
    if (!urlInput) {
      alert('Please enter an Endpoint URL first.');
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.integrations.testWebhook({
        url: urlInput,
        secret: secretInput || undefined,
      });
      setTestResult({
        success: res.success,
        status_code: res.status_code,
        latency_ms: res.latency_ms,
        error: res.error,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        latency_ms: 0,
        error: err?.message || 'Delivery failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !urlInput) {
      alert('Name and Endpoint URL are required.');
      return;
    }
    try {
      setCreating(true);
      setActionMessage(null);
      await api.integrations.createWebhook({
        name: nameInput,
        url: urlInput,
        events: Array.from(selectedEvents),
        secret: secretInput || undefined,
      });
      setNameInput('');
      setUrlInput('');
      setSecretInput('');
      setTestResult(null);
      setActionMessage('Webhook created and actively listening for events!');
      await fetchWebhooks();
    } catch (err) {
      console.error('Failed to create webhook:', err);
      setActionMessage('Failed to create webhook endpoint.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) return;
    try {
      await api.integrations.deleteWebhook(id);
      await fetchWebhooks();
      setActionMessage('Webhook deleted.');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatEventLabel = (evt: string) => {
    return evt
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
        <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>THING CODE</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>SAST</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>Integrations</Link>
        <ChevronRight size={12} />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Webhooks</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Webhook size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Webhooks
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Configure webhooks to get real-time notifications about scan events.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Enabled Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: isEnabled ? '#059669' : '#64748B' }}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              style={{
                width: '42px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: isEnabled ? '#2563EB' : '#CBD5E1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: isEnabled ? '20px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  transition: 'left 200ms ease',
                }}
              />
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Add Webhook
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Webhooks List Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0' }}>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>URL</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Events</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Last Triggered</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No webhooks configured. Add a webhook below to receive event notifications.
                </td>
              </tr>
            ) : (
              webhooks.map((wh) => (
                <tr key={wh.id} style={{ borderBottom: '1px solid #EAECF0' }}>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {wh.name}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '12px', color: '#2563EB', fontFamily: 'monospace' }}>
                    {wh.url}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {wh.events.map((e, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                          }}
                        >
                          {formatEventLabel(e)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: wh.status === 'active' ? '#ECFDF5' : '#FEF2F2',
                        color: wh.status === 'active' ? '#059669' : '#DC2626',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: wh.status === 'active' ? '#10B981' : '#EF4444' }} />
                      {wh.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748B' }}>
                    {wh.last_triggered}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      title="Delete webhook"
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Webhook Form Card */}
      {showAddForm && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px 0' }}>
            Add New Webhook
          </h3>

          <form onSubmit={handleCreateWebhook}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Slack Integration"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Endpoint URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Events Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Events
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { key: 'scan_started', label: 'Scan Started' },
                  { key: 'scan_completed', label: 'Scan Completed' },
                  { key: 'scan_failed', label: 'Scan Failed' },
                  { key: 'finding_resolved', label: 'Finding Resolved' },
                  { key: 'quality_gate_failed', label: 'Quality Gate Failed' },
                  { key: 'policy_violation', label: 'Policy Violation' },
                ].map((item) => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(item.key)}
                      onChange={() => handleToggleEvent(item.key)}
                      style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Secret (Optional)
              </label>
              <input
                type="password"
                placeholder="Enter webhook secret"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                style={{ width: '100%', maxWidth: '400px', padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
              />
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                Used to compute the HMAC-SHA256 signature in the <code style={{ color: '#2563EB' }}>X-THING-Signature</code> header.
              </div>
            </div>

            {testResult && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: testResult.success ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${testResult.success ? '#A7F3D0' : '#FECACA'}`,
                  color: testResult.success ? '#065F46' : '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>
                  {testResult.success
                    ? `Delivery successful! Endpoint returned HTTP ${testResult.status_code} in ${testResult.latency_ms}ms.`
                    : `Test failed: ${testResult.error || 'Server error'}`}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #EAECF0', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={handleTestDelivery}
                disabled={testing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Send size={12} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Sending...' : 'Test Delivery'}
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput('');
                    setUrlInput('');
                    setSecretInput('');
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {creating ? 'Creating...' : 'Create Webhook'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
