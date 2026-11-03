'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Folder,
  Lock,
  Building,
  Globe,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

function OnboardingWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('org_id') || undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'Private' | 'Internal' | 'Public'>('Private');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function loadWorkspace() {
      try {
        const list = await api.workspaces.list();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          const ws = list[0];
          setName((prev) => prev || ws.name || '');
          setDescription((prev) => prev || ws.description || '');
          if (ws.visibility) setVisibility(ws.visibility);
        }
      } catch (err) {
        console.warn('Could not prefill workspace:', err);
      }
    }
    loadWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.workspaces.create({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        organization_id: orgId,
      });
      router.push(`/onboarding/project?org_id=${encodeURIComponent(orgId || '')}&workspace_id=${encodeURIComponent(res?.id || '')}`);
    } catch (err: any) {
      console.error('Workspace creation failed:', err);
      setError(err?.message || 'Failed to create workspace. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={2}
      title="Create Your Workspace"
      subtitle="A workspace helps you organize projects, teams and environments."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) 300px',
          gap: '32px',
          alignItems: 'start',
        }}
        className="onboarding-split"
      >
        {/* Left Form Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '20px' }}>
            Workspace Details
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '18px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Workspace Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Workspace Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Core Engineering or Production Services"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Primary workspace for developer repositories, pipelines, and runtime protection."
                rows={3}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Visibility */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                Visibility <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  {
                    id: 'Private',
                    icon: Lock,
                    label: 'Private',
                    desc: 'Only invited members can access',
                  },
                  {
                    id: 'Internal',
                    icon: Building,
                    label: 'Internal',
                    desc: 'All organization members can access',
                  },
                  {
                    id: 'Public',
                    icon: Globe,
                    label: 'Public',
                    desc: 'Anyone in the organization can access',
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const isChecked = visibility === option.id;

                  return (
                    <label
                      key={option.id}
                      onClick={() => setVisibility(option.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: isChecked ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                        backgroundColor: isChecked ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.id}
                        checked={isChecked}
                        onChange={() => setVisibility(option.id as any)}
                        style={{ accentColor: '#2563EB', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <Icon size={16} style={{ color: isChecked ? '#2563EB' : '#64748B' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {option.label}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {option.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => router.push('/onboarding/organization')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
                className="hover:bg-slate-50"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.25)',
                }}
                className="hover:bg-blue-700"
              >
                <span>{loading ? 'Saving...' : 'Next: Project'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Card: Workspaces in SecuLayer */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Folder size={20} />
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
            Workspaces in Kavach
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Isolate projects and environments',
              'Manage team access',
              'Apply security policies',
              'Separate dev, staging and prod',
              'Multiple workspaces per organization',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '1.5px solid #94A3B8',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {i + 1}
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

export default function OnboardingWorkspacePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading workspace setup...</div>}>
      <OnboardingWorkspaceContent />
    </Suspense>
  );
}
