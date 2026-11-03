'use client';

/**
 * SecuLayer SAST — Hotspot History Page (/sast/hotspots/[id]/history)
 * Screenshot Reference 10.5
 * Displays complete review history, audit timeline, comments thread, and scan history.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  History as HistoryIcon,
  MessageSquare,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  User as UserIcon,
  Activity,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import {
  HotspotsBreadcrumbs,
  HotspotSeverityBadge,
  HotspotStatusBadge,
} from '@/components/hotspots/HotspotComponents';

export default function HotspotHistoryPage() {
  const params = useParams();
  const hotspotId = params.id as string;

  const [hotspot, setHotspot] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'comments' | 'timeline' | 'scans'>('history');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!hotspotId) return;
    setLoading(true);
    try {
      const [detailData, historyData] = await Promise.all([
        api.hotspots.get(hotspotId),
        api.hotspots.getHistory(hotspotId),
      ]);
      setHotspot(detailData);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error('Failed to load history page:', err);
    } finally {
      setLoading(false);
    }
  }, [hotspotId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: '#64748B' }}>
        Loading Hotspot History...
      </div>
    );
  }

  if (!hotspot) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center' }}>
        <h2>Hotspot Not Found</h2>
        <Link href="/sast/hotspots">Return to Hotspots</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* 1. Breadcrumbs */}
      <HotspotsBreadcrumbs currentPage="History" hotspotId={hotspot.display_id} />

      {/* 2. Top Header matching Screenshot 10.5 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {hotspot.display_id}
            </span>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {hotspot.title}
            </h1>
            <HotspotSeverityBadge severity={hotspot.severity} size="sm" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <span style={{ color: '#2563EB', fontWeight: 600, fontFamily: 'monospace' }}>
              {hotspot.file_path}
            </span>
            <span>Lines {hotspot.start_line}-{hotspot.end_line}</span>
          </div>
        </div>

        {/* Metadata summary chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
          <div>
            <span style={{ color: '#94A3B8', marginRight: '6px' }}>Status:</span>
            <HotspotStatusBadge status={hotspot.status} size="sm" />
          </div>
          <div>
            <span style={{ color: '#94A3B8', marginRight: '6px' }}>Created:</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {new Date(hotspot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span style={{ color: '#94A3B8', marginRight: '6px' }}>Assignee:</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{hotspot.assignee_name}</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-tabs matching Screenshot 10.5 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        {[
          { id: 'history', label: `History (${history.length})` },
          { id: 'comments', label: `Comments (${hotspot.comments?.length || 0})` },
          { id: 'timeline', label: 'Review Timeline' },
          { id: 'scans', label: 'Scan History' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                padding: '10px 0',
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Tab 1: History Event Table (Screenshot 10.5) */}
      {activeSubTab === 'history' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            overflow: 'hidden',
            marginBottom: '28px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', width: '40px', color: '#64748B' }}>#</th>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>Date & Time</th>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>User</th>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>Action</th>
                <th style={{ padding: '12px 16px', color: '#64748B' }}>Status</th>
                <th style={{ padding: '12px 20px', color: '#64748B' }}>Comment</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                    No audit history recorded.
                  </td>
                </tr>
              ) : (
                history.map((h, idx) => (
                  <tr key={h.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 500 }}>{h.date_time}</td>
                    <td style={{ padding: '14px 16px', color: '#2563EB', fontWeight: 600 }}>{h.user}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#F1F5F9',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#334155',
                        }}
                      >
                        {h.action}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <HotspotStatusBadge status={h.status} size="sm" />
                    </td>
                    <td style={{ padding: '14px 20px', color: '#475569' }}>
                      {h.comment || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Comments */}
      {activeSubTab === 'comments' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(hotspot.comments || []).map((c: any) => (
              <div
                key={c.id}
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{c.user}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{c.created_at}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{c.comment}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Timeline */}
      {activeSubTab === 'timeline' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '28px',
          }}
        >
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div
              style={{
                position: 'absolute',
                left: '7px',
                top: '10px',
                bottom: '10px',
                width: '2px',
                backgroundColor: '#E2E8F0',
              }}
            />

            {history.map((h, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-24px',
                    top: '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '3px solid #2563EB',
                  }}
                />
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{h.action}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  by <strong>{h.user}</strong> on {h.date_time}
                </div>
                {h.comment && (
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                    "{h.comment}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Scan History Section matching Screenshot 10.5 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
          Scan History
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '10px 14px', color: '#64748B' }}>Scan ID</th>
              <th style={{ padding: '10px 14px', color: '#64748B' }}>Date</th>
              <th style={{ padding: '10px 14px', color: '#64748B' }}>Trigger</th>
              <th style={{ padding: '10px 14px', color: '#64748B' }}>Findings</th>
              <th style={{ padding: '10px 14px', color: '#64748B' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'SC-2026-0928-001', date: 'Sep 28, 2026, 04:12 PM', trigger: 'Manual', findings: 28, status: 'Completed' },
              { id: 'SC-2026-0926-003', date: 'Sep 26, 2026, 10:34 AM', trigger: 'Push', findings: 26, status: 'Completed' },
              { id: 'SC-2026-0924-002', date: 'Sep 24, 2026, 02:18 PM', trigger: 'Scheduled', findings: 31, status: 'Completed' },
            ].map((scan) => (
              <tr key={scan.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 14px', color: '#2563EB', fontWeight: 600, fontFamily: 'monospace' }}>
                  {scan.id}
                </td>
                <td style={{ padding: '12px 14px', color: '#0F172A' }}>{scan.date}</td>
                <td style={{ padding: '12px 14px', color: '#475569' }}>{scan.trigger}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>{scan.findings}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={12} />
                    {scan.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
