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
      subtitle="A workspace isolates your repositories, security policies, and team permissions."
    >
      <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Workspace Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
              Workspace Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Services or Core Security"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
              Description <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary workspace for code repositories, CI/CD pipelines, and runtime security monitoring."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Visibility */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>
              Visibility <span style={{ color: '#EF4444' }}>*</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  id: 'Private',
                  icon: Lock,
                  label: 'Private',
                  desc: 'Only explicitly invited team members can access',
                },
                {
                  id: 'Internal',
                  icon: Building,
                  label: 'Internal',
                  desc: 'All authenticated members of your organization can view',
                },
                {
                  id: 'Public',
                  icon: Globe,
                  label: 'Public',
                  desc: 'Accessible across your organization workspace directory',
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
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: isChecked ? '1.5px solid #09090B' : '1px solid #CBD5E1',
                      backgroundColor: isChecked ? '#F4F4F5' : '#FFFFFF',
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
                      style={{ accentColor: '#09090B', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <Icon size={16} style={{ color: isChecked ? '#09090B' : '#64748B' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                        {option.label}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        — {option.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={() => router.push('/onboarding/organization')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
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
                gap: '8px',
                padding: '11px 24px',
                backgroundColor: '#09090B',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27272A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#09090B')}
            >
              <span>{loading ? 'Saving...' : 'Next: Project'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
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
