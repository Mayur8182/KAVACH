'use client';

/**
 * /settings/login-history — Chronological Account Login Audit Log
 * Displays past authentication attempts, IP addresses, locations, methods, and status.
 * Sourced directly from backend GET /api/v1/auth/login-history.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, ShieldCheck, ShieldAlert, ArrowLeft, Globe, Filter } from 'lucide-react';
import { api } from '@/lib/api/client';

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await api.auth.getLoginHistory();
        setHistory(res || []);
      } catch (err: any) {
        setHistory([]);
        setErrorMsg(err?.message || 'Could not retrieve login history from backend.');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '40px 24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '8px' }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Login History &amp; Audit Trail</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
            Detailed tamper-evident record of all authentication attempts for your user account.
          </p>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Authentication Events ({history.length})
            </span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Audit retention: 90 days
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>IP Address</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>Location</th>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>Method</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    Loading authentication history from backend...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                    {errorMsg || 'No login history records found for this account.'}
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: item.status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2',
                          color: item.status === 'SUCCESS' ? '#16A34A' : '#DC2626',
                        }}
                      >
                        {item.status === 'SUCCESS' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#0F172A', fontWeight: 500 }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#334155' }}>
                      {item.ip_address}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}>
                      {item.location || 'Unknown'}
                    </td>
                    <td style={{ padding: '14px 18px', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>
                      {item.auth_method}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
