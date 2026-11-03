'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Server,
  Users,
  CheckCircle2,
  Building2,
  FileCheck,
  Headphones,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { api } from '@/lib/api/client';

export default function EnterprisePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [teamSize, setTeamSize] = useState('100-500');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.contact.submit({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        inquiry_type: 'enterprise_sales',
        subject: `Enterprise Tier Demo Inquiry (${company || name})`,
        message: `Team Size: ${teamSize}\n\nRequirements:\n${message.trim()}`,
      });
      setSuccess(`Inquiry submitted successfully! Reference ID: ${res.inquiry_id}. Our Enterprise Solutions team will contact you within ${res.estimated_response_sla}.`);
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
    } catch (err: any) {
      console.error('Enterprise inquiry failed:', err);
      setError(err?.message || 'Failed to submit inquiry. Please try again or email sales@kavachsecurity.me.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      {/* Hero Section */}
      <section style={{ backgroundColor: '#0B1120', color: '#FFFFFF', padding: '72px 24px', borderBottom: '1px solid #1E293B' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(37,99,235,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#60A5FA', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
            <Sparkles size={14} />
            <span>SecuLayer Enterprise Architecture</span>
          </div>
          <h1 style={{ fontSize: '46px', fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Mission-Critical Security Control Plane <br />
            <span style={{ color: '#38BDF8' }}>for High-Assurance Enterprises</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#94A3B8', maxWidth: '780px', margin: '0 auto 36px', lineHeight: 1.6 }}>
            Enforce deterministic security policies, verify AI agent code generation with cryptographic evidence, and protect distributed multi-cloud architectures.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="#contact-form"
              style={{
                padding: '12px 28px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              }}
            >
              Request Enterprise Briefing
            </a>
            <Link
              href="/pricing"
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Compare All Tiers
            </Link>
          </div>
        </div>
      </section>

      {/* Enterprise Capabilities Grid */}
      <section style={{ maxWidth: '1200px', margin: '64px auto', padding: '0 24px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Engineered for Stringent Regulatory Environments
          </h2>
          <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '600px', margin: '0 auto' }}>
            Complete deterministic control across air-gapped runtimes, sovereign cloud enclaves, and autonomous agent swarms.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {[
            {
              icon: Server,
              title: 'VPC & Air-Gapped Deployments',
              desc: 'Deploy on dedicated AWS GovCloud, Azure Government, or bare-metal Kubernetes without outbound internet dependencies.',
            },
            {
              icon: Lock,
              title: 'SSO, SAML & Granular SCIM',
              desc: 'Seamless federation with Okta, Azure AD, PingIdentity, and Google Workspace with automated just-in-time role provisioning.',
            },
            {
              icon: FileCheck,
              title: 'Certified Compliance Baselines',
              desc: 'Built-in continuous mapping and instant exportable audit evidence for SOC2 Type II, ISO 27001, HIPAA, and NIST CSF.',
            },
            {
              icon: Shield,
              title: 'Hardware-Enforced MCP Gateway',
              desc: 'Intercept every LLM tool invocation through an authorized security gateway with HSM-backed signature verification.',
            },
            {
              icon: Headphones,
              title: '24/7 Dedicated Security SLA',
              desc: '15-minute response SLA for critical security alerts, dedicated Customer Success Engineer, and quarterly penetration retests.',
            },
            {
              icon: Building2,
              title: 'Multi-Tenant Org Hierarchy',
              desc: 'Hierarchical control across global parent organizations, subsidiaries, business units, and isolated workspaces.',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '28px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  <Icon size={22} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px', color: '#0F172A' }}>{item.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Enterprise Contact & Demo Form */}
      <section id="contact-form" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '64px 24px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '36px 40px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', color: '#0F172A' }}>
            Schedule an Enterprise Briefing
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>
            Connect with our security architects to discuss custom deployment topology, policy governance, and pricing.
          </p>

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '13px', marginBottom: '20px' }}>
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Health Corp"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Engineering Team Size
                </label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  <option value="50-100">50 - 100 engineers</option>
                  <option value="100-500">100 - 500 engineers</option>
                  <option value="500-2000">500 - 2,000 engineers</option>
                  <option value="2000+">2,000+ engineers</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Requirements & Project Timeline *
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your compliance standards (SOC2, HIPAA, FedRAMP), deployment environments (AWS, GCP, on-prem), and agent governance needs."
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                padding: '11px 24px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? 'Submitting Inquiry...' : 'Submit Enterprise Request'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
