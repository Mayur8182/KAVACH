'use client';

/**
 * /settings/sessions — Active Sessions Management Screen
 * View and revoke active authenticated sessions, devices, and IP addresses.
 * Sourced directly from backend GET /api/v1/auth/sessions and DELETE /api/v1/auth/sessions/{id}.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Laptop, Smartphone, Globe, Shield, Trash2, LogOut, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api/client';

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.auth.getSessions();
      setSessions(res || []);
    } catch (err: any) {
      setSessions([]);
      setActionMsg(err?.message || 'Could not load active sessions from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? The device will be signed out.')) return;
    try {
      await api.auth.revokeSession(sessionId);
      setActionMsg('Session revoked successfully.');
      fetchSessions();
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke session.');
    }
  };

  const handleRevokeAllOther = async () => {
    if (!confirm('This will sign out all other devices and active browsers. Continue?')) return;
    try {
      await api.auth.revokeAllOtherSessions();
      setActionMsg('All other sessions revoked successfully.');
      fetchSessions();
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke sessions.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '40px 24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <Link href="/home" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '8px' }}>
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Active Login Sessions</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
              Review all web and API sessions currently authenticated under your enterprise account.
            </p>
          </div>

          <button
            onClick={handleRevokeAllOther}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>Revoke All Other Sessions</span>
          </button>
        </div>

        {actionMsg && (
          <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#065F46', fontSize: '13px', marginBottom: '20px' }}>
            {actionMsg}
          </div>
        )}

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Connected Devices ({sessions.length})
            </span>
            <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={14} /> TLS 1.3 Encrypted
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                Loading active sessions from backend...
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                No active authenticated sessions found.
              </div>
            ) : (
              sessions.map((sess) => (
              <div
                key={sess.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: sess.is_current ? '#EFF6FF' : '#F1F5F9', color: sess.is_current ? '#2563EB' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {sess.client_name?.toLowerCase().includes('phone') ? <Smartphone size={20} /> : <Laptop size={20} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{sess.client_name}</span>
                      {sess.is_current && (
                        <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#16A34A', fontSize: '11px', fontWeight: 700 }}>
                          Current Session
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>IP: {sess.ip_address}</span>
                      <span>•</span>
                      <span>Location: {sess.location || 'Unknown'}</span>
                      <span>•</span>
                      <span>Active: {new Date(sess.last_active).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!sess.is_current && (
                  <button
                    onClick={() => handleRevoke(sess.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      color: '#DC2626',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Revoke</span>
                  </button>
                )}
              </div>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
}
