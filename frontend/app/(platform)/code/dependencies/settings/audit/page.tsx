'use client';

/**
 * Module 15 — Integrations & Settings: Notifications & Audit
 * Route: /code/dependencies/settings/audit
 * 
 * Strict AGENTS.md compliance:
 * Real data provenance loaded from and persisted to:
 * - `/api/v1/dependencies/settings/notifications`
 * - `/api/v1/dependencies/settings/audit`
 * Zero fake numbers, zero hardcoded records.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  FileText,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Send,
  MessageSquare,
  Mail,
  Zap,
  Clock,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencySettingsSubnav } from '@/components/dependencies/DependencySettingsSubnav';

interface NotificationChannel {
  id: string;
  channel_type: string;
  name: string;
  destination: string;
  events: string[];
  is_active: boolean;
  last_notified_at?: string | null;
}

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  category: string;
  target: string;
  previous_value?: string | null;
  new_value?: string | null;
  ip_address: string;
  status: string;
  timestamp: string;
}

export default function NotificationsAndAuditPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Testing map: channelId -> { loading: boolean, message?: string, success?: boolean }
  const [testingMap, setTestingMap] = useState<Record<string, { loading: boolean; message?: string; success?: boolean }>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    channel_type: 'SLACK',
    destination: '',
    events: ['vuln:critical', 'policy:violation'],
  });

  const availableEvents = [
    { key: 'vuln:critical', label: 'Critical Severity Vulnerability Discovered' },
    { key: 'policy:violation', label: 'Dependency Policy Block on Pull Request' },
    { key: 'remediation:pr', label: 'Automated Fix / Upgrade Pull Request Opened' },
    { key: 'scanner:failure', label: 'Scanner Engine Execution Failure or Timeout' },
    { key: 'license:unapproved', label: 'Non-Compliant / Prohibited License Detected' },
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifsData, auditData] = await Promise.all([
        api.dependencySettings.getNotifications(),
        api.dependencySettings.getAuditLogs({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          limit: 50,
        }),
      ]);

      setChannels(notifsData || []);
      setAuditLogs(auditData?.logs || []);
      setTotalLogs(auditData?.total || 0);
    } catch (err: any) {
      console.warn('Failed to load notifications & audit', err);
      setError(err?.message || 'Failed to load notifications & audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleTestNotification = async (id: string) => {
    setTestingMap((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const res = await api.dependencySettings.testNotification(id);
      setTestingMap((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          success: res.success,
          message: res.message,
        },
      }));
      // update last notified locally
      setChannels((prev) =>
        prev.map((c) => (c.id === id ? { ...c, last_notified_at: res.tested_at } : c))
      );
    } catch (err: any) {
      setTestingMap((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          success: false,
          message: err?.message || 'Dispatch failed',
        },
      }));
    }
  };

  const handleDeleteNotification = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove notification channel "${name}"?`)) return;
    try {
      await api.dependencySettings.deleteNotification(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(`Failed to delete channel: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleToggleEvent = (eventKey: string) => {
    setFormData((prev) => {
      const exists = prev.events.includes(eventKey);
      return {
        ...prev,
        events: exists ? prev.events.filter((e) => e !== eventKey) : [...prev.events, eventKey],
      };
    });
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.destination.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.dependencySettings.createNotification({
        name: formData.name.trim(),
        channel_type: formData.channel_type,
        destination: formData.destination.trim(),
        events: formData.events,
      });

      setChannels((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setFormData({
        name: '',
        channel_type: 'SLACK',
        destination: '',
        events: ['vuln:critical', 'policy:violation'],
      });
      // Refresh audit logs since creation was logged
      const auditRes = await api.dependencySettings.getAuditLogs({ limit: 50 });
      if (auditRes) {
        setAuditLogs(auditRes.logs || []);
        setTotalLogs(auditRes.total || 0);
      }
    } catch (err: any) {
      alert(`Failed to create notification channel: ${err?.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalChannels = channels.length;
  const activeChannels = channels.filter((c) => c.is_active).length;
  const latestAuditTimestamp = auditLogs.length > 0 ? auditLogs[0].timestamp : null;

  const getChannelIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SLACK':
        return { bg: '#FEF3C7', color: '#D97706', label: 'Slack Webhook' };
      case 'TEAMS':
        return { bg: '#EFF6FF', color: '#2563EB', label: 'Microsoft Teams' };
      case 'EMAIL':
        return { bg: '#F1F5F9', color: '#475569', label: 'Email Digest' };
      case 'PAGERDUTY':
        return { bg: '#ECFDF5', color: '#059669', label: 'PagerDuty Incident' };
      case 'WEBHOOK':
      default:
        return { bg: '#FAF5FF', color: '#8B5CF6', label: 'Custom HTTP Webhook' };
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return { bg: '#ECFDF5', text: '#059669' };
      case 'UPDATE':
        return { bg: '#EFF6FF', text: '#2563EB' };
      case 'DELETE':
        return { bg: '#FEF2F2', text: '#DC2626' };
      case 'TEST':
        return { bg: '#FFF7ED', text: '#EA580C' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Subnav Component ── */}
      <DependencySettingsSubnav
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
      />

      {/* ── Top Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={22} color="#3B82F6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Notification Channels</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : totalChannels}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Active Webhooks</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : activeChannels}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={22} color="#8B5CF6" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Audit Events Logged</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{loading ? '...' : totalLogs}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={22} color="#F97316" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '2px' }}>Latest Modification</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '...' : latestAuditTimestamp ? new Date(latestAuditTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 1: Notification Channels ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Notification Channels &amp; Webhooks</h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Alert teams on critical findings, build failures, and policy violations</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#0F172A',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Add Notification Channel
          </button>
        </div>

        {channels.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '13px' }}>
            No notification channels configured. Click "Add Notification Channel" to route alerts to Slack, Teams, or Webhooks.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {channels.map((ch) => {
              const iconInfo = getChannelIcon(ch.channel_type);
              const testState = testingMap[ch.id];

              return (
                <div
                  key={ch.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: iconInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bell size={18} color={iconInfo.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{ch.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{iconInfo.label}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteNotification(ch.id, ch.name)}
                        title="Delete Channel"
                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', color: '#334155', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', marginBottom: '12px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {ch.destination}
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>Subscribed Events:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(ch.events || []).map((ev) => (
                          <span key={ev} style={{ fontSize: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Test Feedback */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {ch.last_notified_at ? `Tested ${new Date(ch.last_notified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not tested'}
                      </span>

                      <button
                        onClick={() => handleTestNotification(ch.id)}
                        disabled={testState?.loading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#334155',
                          cursor: testState?.loading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Send size={11} color="#64748B" />
                        {testState?.loading ? 'Dispatching...' : 'Test Channel'}
                      </button>
                    </div>

                    {testState && !testState.loading && (
                      <div style={{ fontSize: '11px', color: testState.success ? '#047857' : '#B91C1C', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {testState.success ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                        {testState.message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Immutable Audit Trail ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Security Configuration Audit Trail</h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Authoritative log of all policy adjustments, credentials issued, and scanner changes</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '7px 12px',
                fontSize: '13px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Audit Categories</option>
              <option value="GENERAL_SETTINGS">General Settings</option>
              <option value="REGISTRY">Registries</option>
              <option value="SCANNERS">Scanners</option>
              <option value="ACCESS">Access &amp; Permissions</option>
              <option value="NOTIFICATIONS">Notifications</option>
            </select>

            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh Audit Logs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#475569',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Audit Table */}
        {auditLogs.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', color: '#64748B', fontSize: '13px' }}>
            No audit records found matching category filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '170px' }}>Timestamp (UTC)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '190px' }}>Actor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '100px' }}>Action</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '170px' }}>Target / Scope</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Change Summary / Payload</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '110px' }}>Origin IP</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', width: '90px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const actStyle = getActionBadge(log.action);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                      {/* Timestamp */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '12px', color: '#0F172A', fontWeight: 500 }}>
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ fontSize: '12px', color: '#334155', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                          {log.actor}
                        </code>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            backgroundColor: actStyle.bg,
                            color: actStyle.text,
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Target */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{log.category}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{log.target}</div>
                      </td>

                      {/* Change / New Value */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '12px', color: '#334155', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.new_value || log.previous_value || 'Configuration verified'}
                        </div>
                      </td>

                      {/* IP */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          {log.ip_address}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: log.status === 'SUCCESS' ? '#047857' : '#B91C1C',
                            backgroundColor: log.status === 'SUCCESS' ? '#ECFDF5' : '#FEF2F2',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Notification Modal ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={18} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Configure Notification Channel</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Route dependency events to Slack, Teams, or Webhooks</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Channel Type *
                    </label>
                    <select
                      value={formData.channel_type}
                      onChange={(e) => setFormData({ ...formData, channel_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    >
                      <option value="SLACK">Slack Incoming Webhook</option>
                      <option value="TEAMS">Microsoft Teams Webhook</option>
                      <option value="EMAIL">Email Alert Distribution</option>
                      <option value="PAGERDUTY">PagerDuty Incident API</option>
                      <option value="WEBHOOK">Generic Secure Webhook (POST)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Channel Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. #prod-dependency-alerts"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Webhook URL / Email Destination *
                  </label>
                  <input
                    type="text"
                    placeholder="https://hooks.slack.com/services/... or sec-alerts@company.com"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Event triggers */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Trigger Events
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    {availableEvents.map((ev) => {
                      const checked = formData.events.includes(ev.key);
                      return (
                        <label
                          key={ev.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleEvent(ev.key)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>{ev.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {submitting ? 'Connecting...' : 'Save & Enable Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
