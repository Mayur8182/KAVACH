'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Check, AlertCircle, ArrowRight, Loader2, Lock, User, Mail } from 'lucide-react';
import { KavachMark } from '@/components/common/KavachLogo';
import { api } from '@/lib/api/client';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please check the link from your email or inviter.');
      setLoading(false);
      return;
    }

    api.invitations
      .verify(token)
      .then((data) => {
        setInvitation(data);
        if (data.email) {
          setFullName(data.email.split('@')[0].capitalize?.() || data.email.split('@')[0]);
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err.message || 'Invitation is invalid or has expired.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.invitations.accept({
        token,
        full_name: fullName.trim() || undefined,
        password: password || undefined,
      });

      setAccepted(true);
      setTimeout(() => {
        router.push('/code');
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to accept invitation.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        color: '#0F172A',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Brand Bar */}
        <div
          style={{
            padding: '28px 24px 24px',
            background: '#0F172A',
            color: '#FFFFFF',
            textAlign: 'center',
            fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}
          >
            <KavachMark size={24} />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Join Kavach Workspace
          </h1>
          <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '5px' }}>
            Deterministic Runtime Security &amp; Autonomous Defense Control Plane
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '28px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '13px' }}>Verifying invitation token...</div>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                }}
              >
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              <Link
                href="/login"
                style={{
                  fontSize: '13px',
                  color: '#2563EB',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Return to Login
              </Link>
            </div>
          ) : accepted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <Check size={28} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Welcome to the Team!
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
                Your workspace membership has been verified. Redirecting to Code Security Hub...
              </p>
            </div>
          ) : (
            <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Invitation Summary Card */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 700 }}>
                  Assigned Invitation
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E3A8A' }}>
                  {invitation?.email}
                </div>
                <div style={{ fontSize: '12px', color: '#3B82F6' }}>
                  Role: <strong>{invitation?.role?.replace(/_/g, ' ')}</strong>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Your Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Choose Account Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Permissions list */}
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
                  Granted Permissions:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(invitation?.permissions || ['view_findings', 'run_scans']).map((p: string) => (
                    <span
                      key={p}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: '#F1F5F9',
                        color: '#475569',
                      }}
                    >
                      ✓ {p.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !fullName.trim()}
                style={{
                  marginTop: '8px',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                <span>{submitting ? 'Setting up Workspace...' : 'Accept Invitation & Enter Workspace'}</span>
                {!submitting && <ArrowRight size={15} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
