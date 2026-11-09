'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

function OnboardingOrganizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState('Software & Cloud Services');
  const [region, setRegion] = useState('Asia Pacific (Mumbai)');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-slugify
  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Organization name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.organizations.create({
        name: name.trim(),
        slug: slug.trim() || undefined,
        industry: industry || undefined,
        region: region || undefined,
        website: website.trim() || undefined,
      });

      router.push(`/onboarding/workspace?org_id=${encodeURIComponent(res?.id || '')}`);
    } catch (err: any) {
      console.error('Organization creation failed:', err);
      setError(err?.message || 'Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      title="Create Your Organization"
      subtitle="Set up your organization to manage teams, projects, and unified security policies."
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
          {/* Organization Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
              Organization Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="e.g. Acme Corporation"
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

          {/* Organization Slug */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
              Organization Slug <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="acme-corp"
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
            <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
              Used in your organization URL (e.g. app.kavach.corp/{slug || 'your-org'})
            </span>
          </div>

          {/* Industry */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
              Industry <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
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
            >
              <option value="Software & Cloud Services">Software & Cloud Services</option>
              <option value="Financial Services & Fintech">Financial Services & Fintech</option>
              <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
              <option value="E-Commerce & Retail">E-Commerce & Retail</option>
              <option value="Enterprise IT & Security">Enterprise IT & Security</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Region */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
              Data Residency & Region <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
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
            >
              <option value="Asia Pacific (Mumbai)">Asia Pacific (Mumbai) — ap-south-1</option>
              <option value="US East (N. Virginia)">US East (N. Virginia) — us-east-1</option>
              <option value="US West (Oregon)">US West (Oregon) — us-west-2</option>
              <option value="Europe (Frankfurt)">Europe (Frankfurt) — eu-central-1</option>
              <option value="Asia Pacific (Singapore)">Asia Pacific (Singapore) — ap-southeast-1</option>
            </select>
          </div>

          {/* Website */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>
              Organization Website <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
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

          {/* Submit Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
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
              <span>{loading ? 'Creating...' : 'Continue to Workspace'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}

export default function OnboardingOrganizationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading organization setup...</div>}>
      <OnboardingOrganizationContent />
    </Suspense>
  );
}
