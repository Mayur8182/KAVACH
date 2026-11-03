'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Check,
  CheckCircle2,
  ChevronDown,
  Mail,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/lib/toast';

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 09: Member Invite Card (Matching Reference Image)
// ─────────────────────────────────────────────────────────────────────────────
interface MemberInviteCardProps {
  initialEmail: string;
  initialRole: string;
  rolesAvailable: string[];
  workspaceName: string;
  onSendInvite: (email: string, role: string) => void;
  onCancel: () => void;
}

export function MemberInviteCard({
  initialEmail,
  initialRole,
  rolesAvailable = ['Viewer', 'Developer', 'Admin', 'Security Auditor'],
  workspaceName,
  onSendInvite,
  onCancel,
}: MemberInviteCardProps) {
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState(initialRole || 'Viewer');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        maxWidth: 520,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <User size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', wordBreak: 'break-all' }}>
            {email}
          </div>

          {/* Role Selection Dropdown */}
          <div style={{ position: 'relative', marginTop: 8 }}>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: '#0F172A',
              }}
            >
              <span>
                Role: <strong>{role}</strong>
              </span>
              <ChevronDown size={14} color="#64748B" />
            </div>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  zIndex: 30,
                  padding: 4,
                }}
              >
                {rolesAvailable.map((r) => (
                  <div
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: r === role ? 600 : 400,
                      backgroundColor: r === role ? '#EFF6FF' : 'transparent',
                      color: r === role ? '#2563EB' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{r}</span>
                    {r === role && <Check size={12} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
            Workspace: <span style={{ fontWeight: 600, color: '#334155' }}>{workspaceName || 'ADIT Projects'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          id="send-workspace-invite-btn"
          onClick={() => onSendInvite(email, role)}
          style={{
            padding: '8px 18px',
            backgroundColor: '#0F172A',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Send Invite</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 09 SUCCESS: Invitation Sent Card
// ─────────────────────────────────────────────────────────────────────────────
interface MemberInviteSuccessCardProps {
  email: string;
  role: string;
  workspaceName: string;
  statusBadge?: string;
  inviteUrl?: string;
}

export function MemberInviteSuccessCard({
  email,
  role,
  workspaceName,
  statusBadge = 'Pending Acceptance',
  inviteUrl,
}: MemberInviteSuccessCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invitation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        textAlign: 'center',
        maxWidth: 520,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={28} strokeWidth={3} />
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
        Invitation Sent Successfully!
      </h2>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
        The invitation has been dispatched and recorded in the database.
      </p>

      <div
        style={{
          padding: '14px 18px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          textAlign: 'left',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
          Recipient: <strong>{email}</strong>
        </div>
        <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
          Role: <strong>{role}</strong>
        </div>
        <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
          Workspace: <strong>{workspaceName}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>Status:</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 9999,
              backgroundColor: '#FEF3C7',
              color: '#D97706',
            }}
          >
            {statusBadge}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        {inviteUrl && (
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Copy size={13} />
            <span>{copied ? 'Copied!' : 'Copy Invite Link'}</span>
          </button>
        )}

        <Link
          href="/settings/members"
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#334155',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>View in Members</span>
          <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  );
}
