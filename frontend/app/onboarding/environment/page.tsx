'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Cloud,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

const AwsLogo = () => (
  <svg width="26" height="20" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19.5 18.2c0-3.2-1.9-4.8-5.1-4.8-2.3 0-4.3 1.1-5.5 2.8l2.1 1.6c.8-1 2-1.6 3.3-1.6 1.6 0 2.5.8 2.5 2.3v.8l-4.2.6c-3.9.5-6.1 2.4-6.1 5.3 0 3.1 2.3 5.1 5.5 5.1 2.5 0 4.3-1.1 5.2-2.8v2.4h2.7v-11.7zm-2.7 6.2c-.4 1.9-2 3.1-4 3.1-1.9 0-3.1-1.1-3.1-2.8 0-1.7 1.3-2.8 3.5-3.1l3.6-.5v3.3zm15.6-10.8l-3.4 12.4-3.2-11.2-2.8 11.2-3.4-12.4h-3l4.9 16.4h3.1l3-10.7 3 10.7h3.1l4.9-16.4h-3.1zm13.4 11c-1.8-1-3.1-1.6-3.1-3 0-1.2 1-2 2.6-2 1.4 0 2.8.6 3.8 1.7l1.9-1.9c-1.4-1.6-3.5-2.5-5.8-2.5-3.3 0-5.5 1.9-5.5 4.8 0 2.7 1.9 3.9 4.4 5.2 2 1 3.2 1.8 3.2 3.2 0 1.4-1.2 2.2-2.9 2.2-1.8 0-3.5-.8-4.6-2.3l-1.9 1.9c1.4 2 3.8 3.1 6.5 3.1 3.5 0 5.8-1.9 5.8-5 0-2.9-2-4.2-4.4-5.4z"
      fill="#232F3E"
    />
    <path
      d="M45.1 31.1c-8.8 6.5-21.7 7-31.7 2.3-.7-.3-1.3.3-.5.9 10.4 7.4 24.8 7 34-.4.8-.7.2-1.3-.6-.9l-1.2-1.9z"
      fill="#FF9900"
    />
    <path
      d="M47.8 28.9c-.4-.6-2.9-.3-4.3-.1-.4.1-.5-.3-.1-.6 2.5-1.7 6.5-1.2 7-.7.4.5-.1 4.6-2.5 6.5-.4.3-.7.1-.5-.2.5-1.3 1-3.7.4-4.9z"
      fill="#FF9900"
    />
  </svg>
);

const AzureLogo = () => (
  <svg width="22" height="22" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="az-grad-1" x1="28.5" y1="9" x2="28.5" y2="73.2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#114A8B" />
        <stop offset="1" stopColor="#0669BC" />
      </linearGradient>
      <linearGradient id="az-grad-2" x1="56" y1="9" x2="56" y2="87" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0078D4" />
        <stop offset="0.82" stopColor="#5EA0EF" />
      </linearGradient>
      <linearGradient id="az-grad-3" x1="53" y1="48" x2="53" y2="87" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1988D9" />
        <stop offset="0.9" stopColor="#53B1E8" />
      </linearGradient>
    </defs>
    <path d="M29.56 9h30.08L32.2 73.19l-19.16-12.7A7.54 7.54 0 0 1 9.4 54.2L29.56 9z" fill="url(#az-grad-1)" />
    <path d="M30.76 9h28.88a7.54 7.54 0 0 1 6.84 4.36L85.2 60.1a7.54 7.54 0 0 1-.77 7.94l-14.86 18.96H40.23l25.32-35.48L30.76 9z" fill="url(#az-grad-2)" />
    <path d="M70.34 87H38.74a7.54 7.54 0 0 1-6.54-3.79l-4.14-7.14 26.31-31.42 15.97 42.35z" fill="url(#az-grad-3)" />
  </svg>
);

const GcpLogo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-3.12 0-5.84 1.77-7.18 4.36A6.98 6.98 0 000 15c0 3.87 3.13 7 7 7h12c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
      fill="#4285F4"
    />
    <path
      d="M19 18H7c-1.66 0-3-1.34-3-3 0-1.54 1.16-2.81 2.68-2.98l.92-.1.44-.82C8.83 9.61 10.33 8.7 12 8.7c2.14 0 3.96 1.48 4.42 3.56l.26 1.15 1.18.11c1.53.15 2.64 1.44 2.64 2.98 0 1.66-1.34 3-3 3z"
      fill="#FFFFFF"
    />
    <path
      d="M12 8.7c-1.12 0-2.14.43-2.9 1.14l1.24 1.24c.42-.39.99-.63 1.66-.63 1.27 0 2.33.88 2.63 2.07l1.71-.58C15.82 10.07 14.07 8.7 12 8.7z"
      fill="#EA4335"
    />
    <path
      d="M16.5 15c0 .35.06.69.17 1h2.33c-.22.61-.63 1.11-1.16 1.45l1.09 1.54C19.98 18.25 20.67 17.21 20.89 16H18c-.83 0-1.5-.67-1.5-1z"
      fill="#34A853"
    />
    <path
      d="M16.42 11.95l-1.71.58c.24.58.37 1.22.37 1.88h1.8c0-.9-.16-1.76-.46-2.46z"
      fill="#FBBC05"
    />
  </svg>
);

const OnPremiseLogo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="7" x="2" y="3" rx="2" fill="#F1F5F9" />
    <rect width="20" height="7" x="2" y="14" rx="2" fill="#F1F5F9" />
    <circle cx="6" cy="6.5" r="1" fill="#10B981" />
    <circle cx="6" cy="17.5" r="1" fill="#10B981" />
    <line x1="10" x2="18" y1="6.5" y2="6.5" stroke="#94A3B8" />
    <line x1="10" x2="18" y1="17.5" y2="17.5" stroke="#94A3B8" />
  </svg>
);

function OnboardingEnvironmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams?.get('org_id') || '';
  const workspaceId = searchParams?.get('workspace_id') || '';
  const projectId = searchParams?.get('project_id') || '';

  const [name, setName] = useState('Development');
  const [envType, setEnvType] = useState('Development');
  const [provider, setProvider] = useState<'AWS' | 'Azure' | 'GCP' | 'On-Premise'>('AWS');
  const [region, setRegion] = useState('ap-south-1 (Mumbai)');
  const [cluster, setCluster] = useState('dev-eks-cluster');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function loadEnv() {
      try {
        const envs = await api.environments.list();
        if (isMounted && Array.isArray(envs) && envs.length > 0) {
          const env = envs[0];
          if (env.name) setName(env.name);
          if (env.env_type) setEnvType(env.env_type);
          if (env.cloud_provider) setProvider(env.cloud_provider as any);
          if (env.region) setRegion(env.region);
          if (env.cluster_target) setCluster(env.cluster_target);
        }
      } catch (err) {
        console.warn('Could not prefill environment:', err);
      }
    }
    loadEnv();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Environment name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.environments.configure({
        name: name.trim(),
        env_type: envType,
        cloud_provider: provider,
        region,
        cluster_target: cluster.trim() || undefined,
        project_id: projectId || undefined,
        workspace_id: workspaceId || undefined,
      });

      const q = new URLSearchParams();
      if (orgId) q.set('org_id', orgId);
      if (workspaceId) q.set('workspace_id', workspaceId);
      if (projectId) q.set('project_id', projectId);

      router.push(`/onboarding/products${q.toString() ? '?' + q.toString() : ''}`);
    } catch (err: any) {
      console.error('Environment configuration failed:', err);
      setError(err?.message || 'Failed to configure environment. Please verify your settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={4}
      title="Set Up Your Environment"
      subtitle="Define your deployment environment for this project."
    >
      <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '20px' }}>
            Environment Details
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '18px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Environment Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Environment Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            {/* Environment Type */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Environment Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={envType}
                  onChange={(e) => setEnvType(e.target.value)}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    padding: '9px 32px 9px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="Development">Development</option>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                  <option value="QA / Testing">QA / Testing</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>
            </div>

            {/* Cloud Provider (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Cloud Provider (Optional)
              </label>
              <div className="onboarding-cloud-providers" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { id: 'AWS', label: 'AWS', icon: AwsLogo },
                  { id: 'Azure', label: 'Azure', icon: AzureLogo },
                  { id: 'GCP', label: 'GCP', icon: GcpLogo },
                  { id: 'On-Premise', label: 'On-Premise', icon: OnPremiseLogo },
                ].map((item) => {
                  const isSelected = provider === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProvider(item.id as any)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                        backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#2563EB' : '#334155' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Region */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Region (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    padding: '9px 32px 9px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ap-south-1 (Mumbai)">ap-south-1 (Mumbai)</option>
                  <option value="us-east-1 (N. Virginia)">us-east-1 (N. Virginia)</option>
                  <option value="us-west-2 (Oregon)">us-west-2 (Oregon)</option>
                  <option value="eu-central-1 (Frankfurt)">eu-central-1 (Frankfurt)</option>
                  <option value="ap-southeast-1 (Singapore)">ap-southeast-1 (Singapore)</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>
            </div>

            {/* Cluster / Resource (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Cluster / Resource (Optional)
              </label>
              <input
                type="text"
                value={cluster}
                onChange={(e) => setCluster(e.target.value)}
                placeholder="e.g. dev-eks-cluster"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Buttons */}
            <div className="onboarding-button-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={() => router.push('/onboarding/project')}
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
                <span>{loading ? 'Configuring...' : 'Next: Select Products'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </div>
    </OnboardingLayout>
  );
}

export default function OnboardingEnvironmentPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading environment setup...</div>}>
      <OnboardingEnvironmentContent />
    </Suspense>
  );
}
