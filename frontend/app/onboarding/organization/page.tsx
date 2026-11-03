'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { api } from '@/lib/api/client';

export default function OnboardingOrganizationPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState('Software & Cloud Services');
  const [region, setRegion] = useState('Asia Pacific (Mumbai)');
  const [website, setWebsite] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function loadOrg() {
      try {
        const [me, res] = await Promise.all([
          api.auth.me().catch(() => null),
          api.organizations.list().catch(() => ({ items: [] })),
        ]);
        if (isMounted && res?.items && res.items.length > 0 && me?.email) {
          const userOrg = res.items.find((o: any) => o.owner_email === me.email);
          if (userOrg) {
            setName((prev) => prev || userOrg.name || '');
            setSlug((prev) => prev || userOrg.slug || '');
            if (userOrg.industry) setIndustry(userOrg.industry);
            if (userOrg.region) setRegion(userOrg.region);
            if (userOrg.website) setWebsite((prev) => prev || userOrg.website || '');
          }
        }
      } catch (err) {
        console.warn('Could not load org info:', err);
      }
    }
    loadOrg();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
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
        industry,
        region,
        website: website.trim() || undefined,
      });
      router.push(`/onboarding/workspace?org_id=${encodeURIComponent(res?.id || '')}`);
    } catch (err: any) {
      console.error('Organization creation failed:', err);
      setError(err?.message || 'Failed to create organization. Please verify your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      title="Create Your Organization"
      subtitle="Set up your organization to manage your teams, projects and security configuration."
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
            Organization Details
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '18px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Organization Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Organization Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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

            {/* Organization Slug */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Organization Slug <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
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
              <p style={{ fontSize: '12px', color: '#64748B', margin: '5px 0 0 0' }}>
                This will be used in your organization URL (e.g. app.kavach.corp/{slug || 'your-organization'})
              </p>
            </div>

            {/* Industry */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Industry <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
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
                  <option value="Education & Research">Education & Research</option>
                  <option value="Financial Services & Fintech">Financial Services & Fintech</option>
                  <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                  <option value="Software & Cloud Services">Software & Cloud Services</option>
                  <option value="Ecommerce & Retail">Ecommerce & Retail</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>
            </div>

            {/* Region */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Region <span style={{ color: '#EF4444' }}>*</span>
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
                  <option value="Asia Pacific (Mumbai)">Asia Pacific (Mumbai)</option>
                  <option value="US East (N. Virginia)">US East (N. Virginia)</option>
                  <option value="US West (Oregon)">US West (Oregon)</option>
                  <option value="Europe (Frankfurt)">Europe (Frankfurt)</option>
                  <option value="Europe (Ireland)">Europe (Ireland)</option>
                  <option value="Asia Pacific (Singapore)">Asia Pacific (Singapore)</option>
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
              </div>
            </div>

            {/* Organization Website */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Organization Website (Optional)
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.example.com"
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

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => router.push('/')}
                style={{
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
                Cancel
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
                <span>{loading ? 'Creating...' : 'Next: Workspace'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Card: Why an Organization? */}
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
            <Building size={20} />
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
            Why an Organization?
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Centralized team management',
              'Unified security and compliance',
              'Manage multiple workspaces',
              'Role based access control',
              'Audit logs and activity tracking',
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
