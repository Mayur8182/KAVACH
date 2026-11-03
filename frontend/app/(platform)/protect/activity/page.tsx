'use client';

/**
 * Thing Protect — Activity Stream Page (/protect/activity)
 * Immutable operational activity log tracking policy lifecycle changes, admin actions, and gate triggers.
 */

import React, { useEffect, useState } from 'react';
import {
  Clock,
  Activity,
  Search,
  RefreshCw,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import { EmptyProtectState } from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';

export default function ActivityStreamPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.activity();
      const list = Array.isArray(data) ? data : data?.items || [];
      setActivities(list);
    } catch (err) {
      console.error('Failed to load activity stream:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const safeActivities = Array.isArray(activities) ? activities : [];
  const filtered = safeActivities.filter((a) => {
    const actType = a.activity_type || a.event_type || a.title || '';
    const actor = a.actor || '';
    const target = a.target || a.resource || '';
    const details = a.details || a.title || '';
    return (
      actType.toLowerCase().includes(search.toLowerCase()) ||
      actor.toLowerCase().includes(search.toLowerCase()) ||
      target.toLowerCase().includes(search.toLowerCase()) ||
      details.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              PROTECTION AUDIT ACTIVITY STREAM
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Immutable operational activity log tracking policy lifecycle changes, admin actions, and gate triggers.
            </p>
          </div>

          <button
            onClick={loadActivities}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Sync Activity
          </button>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search activity, actor, target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Stream List */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeActivities.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading audit activity stream...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO ACTIVITY EVENTS"
              description="No operational audit events recorded."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Activity size={14} color="#10b981" />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {item.activity_type || item.event_type || item.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {item.timestamp ? new Date(item.timestamp).toUTCString() : 'Now'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {item.details || item.title || 'Security event recorded'}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                      <span>Actor: <strong style={{ color: 'var(--color-text-primary)' }}>{item.actor || 'system'}</strong></span>
                      <span>Target: <strong style={{ color: 'var(--color-text-primary)' }}>{item.target || item.resource || 'gateway'}</strong></span>
                      <span>Environment: <strong style={{ color: 'var(--color-text-primary)' }}>{item.environment_id || item.environment || 'production'}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectWorkshell>
  );
}
