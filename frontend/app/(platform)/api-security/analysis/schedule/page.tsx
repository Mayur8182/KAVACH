'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bell,
  Sliders,
  Shield,
  Save,
  Trash2,
} from 'lucide-react';
import { KavachApiLayout } from '../../components/KavachApiLayout';
import { useApiSecurity } from '../../context/ApiSecurityContext';
import { api } from '@/lib/api/client';

export default function AnalysisSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryApiId = searchParams.get('apiId');

  const { apis, selectedApi } = useApiSecurity();
  const activeApi = (queryApiId ? apis.find((a) => a.id === queryApiId) : null) || selectedApi || apis[0];

  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [customCron, setCustomCron] = useState('0 2 * * *');
  const [targetEnv, setTargetEnv] = useState<'STAGING' | 'PRODUCTION'>('STAGING');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySlack, setNotifySlack] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleSaveSchedule = async () => {
    if (!activeApi) return;
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const cronExpression =
        frequency === 'daily'
          ? `0 ${scheduleTime.split(':')[0]} * * *`
          : frequency === 'weekly'
          ? `0 ${scheduleTime.split(':')[0]} * * 1`
          : frequency === 'monthly'
          ? `0 ${scheduleTime.split(':')[0]} 1 * *`
          : customCron;

      await api.apiSecurity.createTestPlan(activeApi.id, {
        name: `Automated Scheduled Scan - ${frequency.toUpperCase()}`,
        schedule: cronExpression,
        configurations: {
          environment: targetEnv,
          notify_email: notifyEmail,
          notify_slack: notifySlack,
          webhook_url: webhookUrl,
          frequency,
        },
      });

      setSaveSuccess(`Scheduled analysis configured: ${cronExpression} (${targetEnv})`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to schedule scan:', err);
      alert(err?.message || 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KavachApiLayout
      activeApiId={activeApi?.id}
      subnavTabs={[
        { id: 'wizard', label: 'Guided Security Analysis', href: `/api-security/analysis?apiId=${activeApi?.id || ''}`, active: false },
        { id: 'schedule', label: 'Schedule Automated Scans', href: `/api-security/analysis/schedule?apiId=${activeApi?.id || ''}`, active: true },
      ]}
      headerAction={
        <button
          type="button"
          onClick={handleSaveSchedule}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={13} />}
          <span>{isSaving ? 'Saving...' : 'Save Schedule'}</span>
        </button>
      }
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Automated Analysis Schedule
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Configure recurring security scans against target environments to detect newly introduced API vulnerabilities.
          </p>
        </div>

        {saveSuccess && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #86EFAC',
              color: '#166534',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{saveSuccess}</span>
          </div>
        )}

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Execution Frequency
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { id: 'daily', label: 'Daily', desc: 'Every night at 02:00' },
                { id: 'weekly', label: 'Weekly', desc: 'Every Monday' },
                { id: 'monthly', label: 'Monthly', desc: '1st of every month' },
                { id: 'custom', label: 'Custom Cron', desc: 'Precision expression' },
              ].map((opt) => {
                const isSelected = frequency === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFrequency(opt.id as any)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#2563EB' : '#CBD5E1'}`,
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#2563EB' : '#0F172A' }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {frequency !== 'custom' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Execution Time (UTC)
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                  }}
                />
              </div>

              {frequency === 'weekly' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Day of the Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Standard 5-Field Cron Expression
              </label>
              <input
                type="text"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 2 * * *"
                style={{
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Target Environment
            </label>
            <select
              value={targetEnv}
              onChange={(e) => setTargetEnv(e.target.value as any)}
              style={{
                padding: '9px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="STAGING">Staging Environment (Isolated Fuzzing)</option>
              <option value="PRODUCTION">Production Environment (Safe Read-Only Passive Analysis)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
              Alerts & Notifications
            </span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Send scan summary email to workspace admins on critical findings</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
              <input
                type="checkbox"
                checked={notifySlack}
                onChange={(e) => setNotifySlack(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Send alert to configured Slack security channel</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Webhook Notification URL (Optional)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                style={{
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </KavachApiLayout>
  );
}
