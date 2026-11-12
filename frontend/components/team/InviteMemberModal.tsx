'use client';

import React, { useState } from 'react';
import { X, Mail, Shield, Check, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultProjectId?: string;
  defaultOrgId?: string;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
  defaultOrgId,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Security Analyst');
  const [projectAccess, setProjectAccess] = useState<string[]>(['Code Security', 'Cloud Security']);
  const [permissions, setPermissions] = useState<string[]>(['View findings', 'Run scans']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInvite, setSuccessInvite] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Close on Escape key (Mistake #57, #67)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const toggleProject = (p: string) => {
    setProjectAccess((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((item) => item !== perm) : [...prev, perm]
    );
  };

  const handleSend = async () => {
    if (loading) return; // Prevent duplicate submissions (Mistake #54)
    const trimmed = email.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setError('Please provide a valid corporate email address (e.g. engineer@organization.com).');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await api.invitations.create({
        email: trimmed,
        role: role.toLowerCase().replace(/\s+/g, '_'),
        project_id: defaultProjectId,
        organization_id: defaultOrgId,
        permissions: permissions.map((p) => p.toLowerCase().replace(/\s+/g, '_')),
        project_access: projectAccess,
      });

      setSuccessInvite(res);
      toast.success(`Invitation dispatched to ${trimmed}`, {
        description: `Role: ${role} • Expires in 7 days.`,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Failed to dispatch invitation.';
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successInvite?.invite_url) {
      navigator.clipboard.writeText(successInvite.invite_url);
      setCopied(true);
      toast.info('Invitation link copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <Mail size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Invite Team Member
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Grant role-based access and permissions to your Kavach Security workspace.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {successInvite ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontWeight: 600, fontSize: '13px' }}>
                <Check size={16} />
                <span>Invitation Dispatched to {successInvite.email}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                Status: <strong>Pending Acceptance</strong> • Role: <strong>{role}</strong> • Expires in 7 days.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input
                  type="text"
                  readOnly
                  value={successInvite.invite_url || `http://localhost:3002/invitations/accept?token=${successInvite.token}`}
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #2563EB',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#DC2626',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading && email.trim()) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Role */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Workspace Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="Security Analyst">Security Analyst (Default triage & investigation)</option>
                  <option value="DevSecOps Engineer">DevSecOps Engineer (Pipeline gates & remediations)</option>
                  <option value="Security Admin">Security Admin (Full workspace & policy authority)</option>
                  <option value="Compliance Auditor">Compliance Auditor (Read-only evidence & reports)</option>
                </select>
              </div>

              {/* Project Access */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Project Workspace Access
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['Code Security', 'Cloud Security', 'Attack Surface', 'Runtime Defense', 'AI Agent Security'].map((p) => {
                    const isChecked = projectAccess.includes(p);
                    return (
                      <label
                        key={p}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                          background: isChecked ? '#EFF6FF' : '#F8FAFC',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: isChecked ? '#1D4ED8' : '#475569',
                          fontWeight: isChecked ? 600 : 400,
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProject(p)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{p}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Granted Permissions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    'View findings',
                    'Run scans',
                    'Manage policies',
                    'Manage integrations',
                  ].map((perm) => {
                    const isChecked = permissions.includes(perm);
                    return (
                      <label
                        key={perm}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: isChecked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                          background: isChecked ? '#EFF6FF' : '#F8FAFC',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: isChecked ? '#1D4ED8' : '#475569',
                          fontWeight: isChecked ? 600 : 400,
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={() => {
              setSuccessInvite(null);
              onClose();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {successInvite ? 'Done' : 'Cancel'}
          </button>
          {!successInvite && (
            <button
              onClick={handleSend}
              disabled={loading || !email.trim()}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !email.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;
