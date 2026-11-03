'use client';

import React, { useState } from 'react';
import { X, User, Users, Shield, Check, Loader2, GitBranch } from 'lucide-react';
import { useScope } from '@/context/ScopeContext';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdWs: any) => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const { createWorkspace, workspaces, currentOrg } = useScope();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceType, setWorkspaceType] = useState<'PERSONAL' | 'ORGANIZATION'>('ORGANIZATION');
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    workspaces.organizations[0]?.id || currentOrg?.id || ''
  );
  const [visibility, setVisibility] = useState<'Private' | 'Internal' | 'Public'>('Private');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Workspace name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        workspace_type: workspaceType,
        organization_id: workspaceType === 'ORGANIZATION' ? selectedOrgId || undefined : undefined,
        visibility,
        default_branch: defaultBranch.trim() || 'main',
      });

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to create workspace:', err);
      setErrorMessage(err?.message || 'Failed to create workspace. Please check your permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: 520,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 16px 28px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Create a new workspace
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              Set up a workspace to organize your projects and repositories.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 28px 24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                color: '#DC2626',
                fontSize: 12,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Workspace Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
              Workspace name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Company, Team, Project"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
              Description <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Security analysis for internal projects"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          {/* Type Selector (Cards matching Screen 03) */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>
              Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Personal Card */}
              <div
                onClick={() => setWorkspaceType('PERSONAL')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: workspaceType === 'PERSONAL' ? '2px solid #0F172A' : '1px solid #E2E8F0',
                  backgroundColor: workspaceType === 'PERSONAL' ? '#F8FAFC' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: workspaceType === 'PERSONAL' ? '#0F172A' : '#F1F5F9',
                    color: workspaceType === 'PERSONAL' ? '#FFFFFF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Personal</div>
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.3, marginTop: 2 }}>
                    Only you can access this workspace
                  </div>
                </div>
              </div>

              {/* Organization Card */}
              <div
                onClick={() => setWorkspaceType('ORGANIZATION')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: workspaceType === 'ORGANIZATION' ? '2px solid #0F172A' : '1px solid #E2E8F0',
                  backgroundColor: workspaceType === 'ORGANIZATION' ? '#F8FAFC' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: workspaceType === 'ORGANIZATION' ? '#0F172A' : '#F1F5F9',
                    color: workspaceType === 'ORGANIZATION' ? '#FFFFFF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Users size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Organization</div>
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.3, marginTop: 2 }}>
                    Shared with your team
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* If Organization Type, show Organization selector if multiple organizations exist */}
          {workspaceType === 'ORGANIZATION' && workspaces.organizations.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  color: '#0F172A',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                {workspaces.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Visibility */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                color: '#0F172A',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <option value="Private">Private (Only you can access)</option>
              <option value="Internal">Internal (Members only)</option>
              <option value="Public">Public</option>
            </select>
          </div>

          {/* Default Branch */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
              Default branch
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 34px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF',
                }}
              />
              <GitBranch size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 10,
              paddingTop: 16,
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              style={{
                padding: '9px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: isSubmitting || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !name.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Create workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
