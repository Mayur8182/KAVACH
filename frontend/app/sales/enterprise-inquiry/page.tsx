'use client';

/**
 * /sales/enterprise-inquiry — Page 22: Enterprise Inquiry
 * Production implementation:
 * - High-assurance compliance & architecture questionnaire for large enterprises
 * - Captures developer seats, cloud providers, deployment targets, compliance frameworks, SSO/SCIM
 * - Persists real Lead and EnterpriseInquiry records in PostgreSQL/SQLite database
 * - Assigns dedicated Principal Security Architect
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Server,
  Lock,
  FileCheck,
  Building,
  Mail,
  Phone,
  Layers,
  Award,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

export default function EnterpriseInquiryPage() {
  const [company, setCompany] = useState('');
  const [companySize, setCompanySize] = useState('1000+');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('Technology & SaaS');
  const [developerSeats, setDeveloperSeats] = useState(250);
  const [deploymentTarget, setDeploymentTarget] = useState('Air-gapped Sovereign Enclave');
  
  // Frameworks
  const [soc2, setSoc2] = useState(true);
  const [fedramp, setFedramp] = useState(true);
  const [iso27001, setIso27001] = useState(true);
  const [hipaa, setHipaa] = useState(false);

  // Requirements
  const [sso, setSso] = useState(true);
  const [scim, setScim] = useState(true);
  const [hsm, setHsm] = useState(true);
  const [customSla, setCustomSla] = useState(true);

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !name || !email || !message) {
      setError('Please provide company name, contact name, email, and requirements overview.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const frameworks = [];
      if (soc2) frameworks.push('SOC2 Type II');
      if (fedramp) frameworks.push('FedRAMP High');
      if (iso27001) frameworks.push('ISO 27001');
      if (hipaa) frameworks.push('HIPAA');

      const res = await api.sales.enterpriseInquiry({
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        team_size: companySize,
        compliance_frameworks: frameworks,
        deployment_target: deploymentTarget,
        estimated_developer_seats: Number(developerSeats),
        hsm_agent_signing_required: hsm,
        custom_sla_required: customSla,
        requirements_overview: message.trim(),
      });
      setSuccessData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit enterprise inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Enterprise Inquiry" activeStepKey="lead" />

      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>

        {/* Breadcrumb / Top Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            <Link href="/sales" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Sales</Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Enterprise Inquiry</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                <Briefcase size={15} />
                <span>PAGE 22 &bull; HIGH-ASSURANCE ENTERPRISE</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Enterprise Inquiry
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                For enterprise and large organizations with strict sovereign enclave, compliance, and governance requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Enterprise Highlights Pill Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {[
            { icon: Server, title: 'Customized Deployment', desc: 'Air-gapped VPC or GovCloud' },
            { icon: Lock, title: 'Advanced Controls', desc: 'HSM KMS agent key signing' },
            { icon: FileCheck, title: 'Compliance & Gov', desc: 'SOC2, FedRAMP, ISO 27001' },
            { icon: Award, title: 'SLA Guarantee', desc: '99.99% contract uptime SLA' },
            { icon: Shield, title: 'Dedicated Support', desc: 'Named Security Architect & 24/7' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <Icon size={16} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>{item.desc}</div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Card */}
        {successData ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #BBF7D0', padding: '36px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#166534', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={28} color="#16A34A" />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#14532D' }}>Enterprise Briefing Registered!</h2>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>Your enterprise record has been registered and assigned.</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Inquiry Reference:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{successData.inquiry_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Assigned Lead Architect:</span>
                <span style={{ fontWeight: 700, color: '#2563EB' }}>{successData.assigned_architect}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Executive Briefing SLA:</span>
                <span style={{ fontWeight: 700, color: '#16A34A' }}>Within {successData.estimated_response_sla}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setSuccessData(null)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Submit Additional Requirements
              </button>
              <Link
                href="/sales/poc-request"
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>Request Dedicated Customer POC</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* Form Card */
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Row 1: Company & Size */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="ADIT Technologies"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="500 - 1000">500 - 1,000</option>
                    <option value="1000+">1,000+ (Large Enterprise)</option>
                    <option value="5000+">5,000+ (Global Enterprise)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Contact Name, Email, Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Executive / Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mayur Bharvad"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Business Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="mayur@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Row 3: Industry & Developer Seats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="Technology & SaaS">Technology & SaaS</option>
                    <option value="Financial Services & FinTech">Financial Services & FinTech</option>
                    <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                    <option value="Defense & Public Sector">Defense & Public Sector</option>
                    <option value="Telecommunications">Telecommunications</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Estimated Developer / Engineer Seats</label>
                  <input
                    type="number"
                    min={10}
                    value={developerSeats}
                    onChange={(e) => setDeveloperSeats(parseInt(e.target.value) || 50)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Deployment Preference */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Target Deployment Architecture</label>
                <select
                  value={deploymentTarget}
                  onChange={(e) => setDeploymentTarget(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="Air-gapped Sovereign Enclave">Air-gapped Sovereign Enclave (Zero external telemetry)</option>
                  <option value="Dedicated VPC / GovCloud">Dedicated Customer VPC (AWS GovCloud / Azure Sovereign)</option>
                  <option value="Hybrid On-Premise + Cloud">Hybrid On-Premise + Multi-Cloud Control Plane</option>
                  <option value="Kavach Managed SaaS">Kavach Multi-Tenant SaaS (Isolated Schema)</option>
                </select>
              </div>

              {/* Compliance Frameworks Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Mandatory Compliance Frameworks</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'SOC2 Type II', checked: soc2, setter: setSoc2 },
                    { label: 'FedRAMP High', checked: fedramp, setter: setFedramp },
                    { label: 'ISO 27001', checked: iso27001, setter: setIso27001 },
                    { label: 'HIPAA', checked: hipaa, setter: setHipaa },
                  ].map((fw, fIdx) => (
                    <label
                      key={fIdx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: fw.checked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        backgroundColor: fw.checked ? '#EFF6FF' : '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: fw.checked ? '#1E40AF' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={fw.checked}
                        onChange={(e) => fw.setter(e.target.checked)}
                      />
                      <span>{fw.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Advanced Enterprise Controls */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Advanced Enterprise Controls</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sso} onChange={(e) => setSso(e.target.checked)} />
                    <span>SAML 2.0 / Okta / Azure AD Enterprise SSO</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" checked={scim} onChange={(e) => setScim(e.target.checked)} />
                    <span>SCIM 2.0 Automated User Provisioning</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" checked={hsm} onChange={(e) => setHsm(e.target.checked)} />
                    <span>HSM Customer-Managed KMS Key Enrollment</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                    <input type="checkbox" checked={customSla} onChange={(e) => setCustomSla(e.target.checked)} />
                    <span>99.99% Financial Backed Uptime SLA</span>
                  </label>
                </div>
              </div>

              {/* Message */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Requirements Overview *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us about your enterprise security requirements, internal audit timeline, and procurement review criteria..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '13px 24px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                }}
              >
                {submitting ? 'Submitting Enterprise Dossier...' : 'Submit Enterprise Inquiry'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
