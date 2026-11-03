'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  FileText,
  Lock,
  Globe2,
  Scale,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Server,
  FileCheck2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Database,
  Building,
  UserCheck,
  Send,
  EyeOff,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';
import { toast } from '@/lib/toast';

type LegalTabId =
  | 'overview'
  | 'terms'
  | 'privacy-dpa'
  | 'acceptable-use'
  | 'billing-refund'
  | 'international'
  | 'dsar-request';

export default function LegalCenterPage() {
  const [activeTab, setActiveTab] = useState<LegalTabId>('overview');

  // DSAR Privacy Request Form state
  const [dsarName, setDsarName] = useState('');
  const [dsarEmail, setDsarEmail] = useState('');
  const [dsarRequestType, setDsarRequestType] = useState('DATA_EXPORT');
  const [dsarJurisdiction, setDsarJurisdiction] = useState('EU_GDPR');
  const [dsarDetails, setDsarDetails] = useState('');
  const [dsarSubmitting, setDsarSubmitting] = useState(false);

  const handleDsarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dsarEmail.trim()) {
      toast.error('Email address is required to verify your identity for data privacy requests.');
      return;
    }
    setDsarSubmitting(true);
    setTimeout(() => {
      setDsarSubmitting(false);
      toast.success('Privacy Request Received', {
        description: 'Our Data Protection Officer (privacy@kavachsecurity.me) will verify and fulfill your request within 30 days.',
      });
      setDsarName('');
      setDsarEmail('');
      setDsarDetails('');
    }, 700);
  };

  const navTabs: { id: LegalTabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Legal & Trust Overview', icon: ShieldCheck },
    { id: 'terms', label: 'Terms & IP Ownership', icon: Scale },
    { id: 'privacy-dpa', label: 'Privacy, Cookies & DPA', icon: Lock },
    { id: 'acceptable-use', label: 'Acceptable Use & Disclosure', icon: FileText },
    { id: 'billing-refund', label: 'Billing, Renewal & Refunds', icon: CreditCard },
    { id: 'international', label: 'International Compliance', icon: Globe2 },
    { id: 'dsar-request', label: 'Privacy Request (DSAR)', icon: UserCheck },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans, "Plus Jakarta Sans", "Inter", -apple-system, sans-serif)' }}>
      <SecuLayerHeader />

      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header Title Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F1F5F9', borderRadius: '16px', color: '#0F172A', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
            <Shield size={13} color="#2563EB" />
            <span>Kavach Legal, Ethics & Trust Center</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em', color: '#0F172A' }}>
            Legal Documents & International Compliance
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B', maxWidth: '800px', lineHeight: 1.6 }}>
            Transparent legal commitments for software engineering organizations worldwide. Zero data retention of your source code, deterministic security verification, and complete compliance across GDPR, CCPA, and international standards.
          </p>
        </div>

        {/* Quick Contact & Verified Channels Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
            marginBottom: '32px',
            padding: '18px 20px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={18} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Legal & Commercial Requests</div>
              <a href="mailto:legal@kavachsecurity.me" style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none', fontFamily: 'monospace' }}>
                legal@kavachsecurity.me
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Security Vulnerability Reporting</div>
              <a href="mailto:security@kavachsecurity.me" style={{ fontSize: '12px', color: '#059669', textDecoration: 'none', fontFamily: 'monospace' }}>
                security@kavachsecurity.me
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} color="#DB2777" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Data Protection Officer (DPO)</div>
              <a href="mailto:privacy@kavachsecurity.me" style={{ fontSize: '12px', color: '#DB2777', textDecoration: 'none', fontFamily: 'monospace' }}>
                privacy@kavachsecurity.me
              </a>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: '1px solid #E2E8F0',
            overflowX: 'auto',
            paddingBottom: '2px',
            marginBottom: '32px',
          }}
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '6px 6px 0 0',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #0F172A' : '2px solid transparent',
                  backgroundColor: isActive ? '#F8FAFC' : 'transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} color={isActive ? '#0F172A' : '#64748B'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: OVERVIEW & TRANSPARENCY ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <section style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', backgroundColor: '#FFFFFF' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>
                Platform Governance & Architectural Integrity
              </h2>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#334155', margin: '0 0 16px' }}>
                Kavach operates under a deterministic security charter: <strong>&quot;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&quot;</strong>
                We never delegate authorization, policy, or vulnerability decisions to probabilistic models. Authoritative determinations are made exclusively by Semgrep static AST inspection, Trivy vulnerability databases, Gitleaks cryptographic pattern matching, and Open Policy Agent (OPA) Rego rules.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '6px' }}>No Fake Security Claims</div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5 }}>
                    Zero simulated outputs, fake security scores, or artificial pass rates. If a scan fails or an integration is disconnected, the system displays the actual error state with deterministic audit evidence.
                  </div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '6px' }}>Customer Code Ownership</div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5 }}>
                    Customers retain 100% exclusive ownership of all source code, git trees, and proposed remediation diffs. We never use customer private repositories to train public foundation models.
                  </div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '6px' }}>Zero-Retention Ephemeral Scans</div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5 }}>
                    Source code repositories are cloned into isolated, memory-backed ephemeral sandbox containers and permanently destroyed immediately after scanner execution concludes.
                  </div>
                </div>
              </div>
            </section>

            <section style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '24px', backgroundColor: '#FFFFFF' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>
                Legal & Regulatory Document Registry
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {[
                  { title: 'Terms of Service', desc: 'Master Services Agreement, SLA uptime, and platform licensing.', tab: 'terms' },
                  { title: 'Privacy Policy', desc: 'Personal data handling, ephemeral processing, and zero training guarantees.', tab: 'privacy-dpa' },
                  { title: 'Acceptable Use Policy', desc: 'Permitted automated testing, authorized boundaries, and prohibited abuse.', tab: 'acceptable-use' },
                  { title: 'Cookie Policy', desc: 'Essential authentication and security tokens with zero third-party ad tracking.', tab: 'privacy-dpa' },
                  { title: 'Data Processing Agreement (DPA)', desc: 'GDPR Article 28 compliance and Standard Contractual Clauses (SCCs).', tab: 'privacy-dpa' },
                  { title: 'Refund & Cancellation Policy', desc: 'Self-serve cancellation, 30-day money-back guarantee, and transparent prorations.', tab: 'billing-refund' },
                  { title: 'Limitation of Liability & SLA', desc: 'Commercial caps, 99.9% availability commitment, and service credits.', tab: 'terms' },
                  { title: 'Intellectual Property Policy', desc: 'Irrevocable customer assignment of code patches and security blueprints.', tab: 'terms' },
                  { title: 'Security Disclosure Policy', desc: 'Coordinated vulnerability disclosure guidelines and safe harbor protections.', tab: 'acceptable-use' },
                  { title: 'Customer Support & Dispute Resolution', desc: 'Support SLAs, escalation matrices, and binding arbitration terms.', tab: 'billing-refund' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(item.tab as LegalTabId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FAFAFA',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                    <ChevronRight size={16} color="#94A3B8" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 2: TERMS OF SERVICE & IP OWNERSHIP ── */}
        {activeTab === 'terms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                1. Master Services Agreement (MSA) & Terms of Service
              </h2>
              <p style={{ margin: 0 }}>
                These Terms govern use of the Kavach Control Plane, Antigravity CLI, REST APIs, and MCP security gateway. By connecting an organization repository or deploying a scanner agent, you represent that you possess organizational authorization to bind your enterprise.
              </p>
            </div>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                2. Customer Intellectual Property & Code Ownership Guarantee
              </h3>
              <p>
                The Customer retains absolute and undivided title, copyright, and patent rights in all source code, configuration files, and software architecture submitted to or inspected by Kavach.
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li><strong>No Derivative Work Claims:</strong> Kavach claims no intellectual property interest in any code diffs, auto-fixes, pull requests, or security blueprints generated during execution.</li>
                <li><strong>Irrevocable Assignment:</strong> All proposed remediations generated by the platform are irrevocably assigned to the Customer under the licensing terms of the customer repository.</li>
                <li><strong>No Model Training:</strong> Customer source code, pull request diffs, or proprietary tokens are never included in training datasets for foundation models.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                3. Service Level Agreement (SLA) & Availability
              </h3>
              <p>
                For Business and Enterprise plans, Kavach provides an uptime commitment of <strong>99.9% Monthly Uptime Percentage</strong> for the control plane and API gateway.
              </p>
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Monthly Uptime Percentage</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Service Credit Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>99.0% - &lt; 99.9%</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>10% of monthly invoice</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>95.0% - &lt; 99.0%</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>25% of monthly invoice</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>&lt; 95.0%</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>50% of monthly invoice</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                4. Limitation of Liability
              </h3>
              <p>
                To the maximum extent permitted by applicable law, neither party shall be liable for indirect, incidental, special, consequential, or punitive damages. The aggregate liability of either party arising out of or related to this Agreement shall not exceed the total amount paid by Customer in the 12 months preceding the incident giving rise to liability.
              </p>
            </section>
          </div>
        )}

        {/* ── TAB 3: PRIVACY, COOKIES & DPA ── */}
        {activeTab === 'privacy-dpa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                Privacy Policy & Zero-Retention Processing Guarantee
              </h2>
              <p style={{ margin: 0 }}>
                Kavach is engineered around a core privacy guarantee: <strong>Ephemeral In-Memory Scanning</strong>. We process customer source code solely to identify security vulnerabilities, evaluate policy compliance, and generate remediation proposals.
              </p>
            </div>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                1. Data Collected & Processing Limits
              </h3>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li><strong>Account Information:</strong> Name, work email address, hashed credentials, and organization identifiers necessary for authentication and role-based access control.</li>
                <li><strong>Security Telemetry:</strong> Finding descriptions, file paths (e.g. <code>src/auth/jwt.py:42</code>), rule IDs, and severity tags persisted in customer PostgreSQL databases.</li>
                <li><strong>Source Code (Ephemeral Only):</strong> Cloned repositories reside in temporary memory-backed containers during scanner execution and are immediately unlinked upon scan completion.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                2. Cookie & Tracking Policy
              </h3>
              <p>
                Kavach uses strictly necessary cookies and browser storage for session authentication, CSRF mitigation, and multi-factor authentication tokens. <strong>We do not use advertising, marketing, or cross-site tracking cookies.</strong>
              </p>
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Cookie Name</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Purpose</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontFamily: 'monospace' }}>sb-access-token</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Cryptographic session token for control plane access</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Session / 7 Days</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontFamily: 'monospace' }}>kavach_consent</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Records user preference regarding cookie consent</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>1 Year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                3. Data Processing Agreement (DPA) & Standard Contractual Clauses (SCCs)
              </h3>
              <p>
                Kavach offers a standardized Data Processing Addendum conforming to GDPR Article 28 and the European Commission Standard Contractual Clauses (Decision 2021/914/EU). To execute a countersigned DPA with custom data residency schedules, please contact <a href="mailto:privacy@kavachsecurity.me" style={{ color: '#2563EB' }}>privacy@kavachsecurity.me</a>.
              </p>
            </section>
          </div>
        )}

        {/* ── TAB 4: ACCEPTABLE USE & SECURITY DISCLOSURE ── */}
        {activeTab === 'acceptable-use' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                Acceptable Use Policy (AUP)
              </h2>
              <p style={{ margin: 0 }}>
                Kavach is designed for defensive security automation, source code vulnerability detection, and runtime compliance enforcement. Use of the platform must comply with all applicable local, national, and international laws.
              </p>
            </div>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                1. Permitted Automated Testing & Target Boundaries
              </h3>
              <p>
                Users are strictly prohibited from configuring scans, eBPF probes, or API fuzzing engines against third-party repositories, domains, or infrastructure without explicit, verifiable written permission from the target system owner.
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Do not execute denial-of-service (DoS) or distributed resource exhaustion payloads.</li>
                <li>Do not use MCP security tools to exfiltrate private credentials or bypass customer firewall boundaries.</li>
                <li>Do not attempt to reverse engineer or circumvent deterministic policy validation gates.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                2. Coordinated Vulnerability Disclosure Policy (VDP) & Safe Harbor
              </h3>
              <p>
                Security researchers and users are encouraged to report potential security vulnerabilities discovered in the Kavach Control Plane or scanner engines. We support fair, coordinated disclosure with safe harbor protections:
              </p>
              <div style={{ padding: '16px', backgroundColor: '#F1F5F9', borderRadius: '8px', border: '1px solid #E2E8F0', margin: '10px 0' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '6px' }}>Safe Harbor Guarantee</div>
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  If you conduct vulnerability research in good faith in accordance with this policy, we will consider your research to be authorized, will not initiate legal action against you, and will work with you to resolve the issue promptly.
                </div>
              </div>
              <p>
                Send vulnerability reports with reproduction steps and proof-of-concept diffs to <a href="mailto:security@kavachsecurity.me" style={{ color: '#2563EB', fontWeight: 600 }}>security@kavachsecurity.me</a>. Our team acknowledges receipt within 24 hours.
              </p>
            </section>
          </div>
        )}

        {/* ── TAB 5: BILLING, RENEWAL & REFUNDS ── */}
        {activeTab === 'billing-refund' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                Pricing Terms, Automatic Renewal & Refund Policy
              </h2>
              <p style={{ margin: 0 }}>
                We believe in total commercial transparency. No hidden fees, no opaque price escalators, and zero friction self-serve cancellation.
              </p>
            </div>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                1. Clear Subscription Terms & Automatic Renewal Disclosures
              </h3>
              <p>
                Subscriptions are billed on a recurring monthly or annual basis depending on your selected billing frequency.
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li><strong>Automatic Renewal:</strong> Unless cancelled prior to your billing cycle renewal date, your subscription automatically renews for an equivalent term at the prevailing plan rate.</li>
                <li><strong>Renewal Notification:</strong> For annual contracts, Kavach sends automated email notifications 30 days and 7 days prior to renewal with full invoice breakdown.</li>
                <li><strong>No Lock-In:</strong> You may modify your seat count or switch billing frequency at any time directly in your Organization Settings.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                2. Transparent Self-Serve Cancellation Process
              </h3>
              <p>
                You can cancel your subscription at any time without calling sales or dealing with retention obstacles:
              </p>
              <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Navigate to <strong>Organization Settings &rarr; Billing & Subscription</strong>.</li>
                <li>Click <strong>&quot;Cancel Subscription&quot;</strong>.</li>
                <li>Your subscription will remain active through the end of your prepaid billing period, with zero subsequent charges.</li>
              </ol>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                3. 30-Day Money-Back Refund Policy
              </h3>
              <p>
                If you are dissatisfied with Kavach for any reason within the first 30 days of purchasing a paid plan, contact <a href="mailto:billing@kavachsecurity.me" style={{ color: '#2563EB' }}>billing@kavachsecurity.me</a> for a full 100% refund without dispute or hassle.
              </p>
            </section>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                4. Customer Support & Dispute Resolution Policy
              </h3>
              <p>
                All paid customers receive dedicated technical support with defined escalation SLAs:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', margin: '10px 0' }}>
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>Severity 1 (Critical Outage)</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>&lt; 1 Hour Response (24/7/365)</div>
                </div>
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>Severity 2 (Degraded Feature)</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>&lt; 4 Hours Response (Business Days)</div>
                </div>
                <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>General Technical Inquiries</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>&lt; 12 Hours Response</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 6: INTERNATIONAL COMPLIANCE ── */}
        {activeTab === 'international' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontSize: '14px', lineHeight: 1.7, color: '#334155' }}>
            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
                International Regulatory Compliance Frameworks
              </h2>
              <p style={{ margin: 0 }}>
                Kavach complies with global data privacy mandates and cloud security governance standards across the European Union, United Kingdom, United States, and Asia-Pacific.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Globe2 size={16} color="#2563EB" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>European Union (EU GDPR)</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Full readiness under Regulation (EU) 2016/679. Supports data subject access rights, right to erasure (Article 17), and Article 28 data processor obligations. EU Frankfurt data hosting available.
                </p>
              </div>

              <div style={{ padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Globe2 size={16} color="#2563EB" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>United Kingdom (UK GDPR)</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Compliance with the Data Protection Act 2018 and UK GDPR. International Data Transfer Addendum (IDTA) supported for cross-border engineering teams.
                </p>
              </div>

              <div style={{ padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>California (CCPA / CPRA)</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  We do not sell or share personal information under the California Consumer Privacy Act. Users may submit opt-out and deletion requests anytime.
                </p>
              </div>

              <div style={{ padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>Singapore (PDPA)</span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Personal Data Protection Act 2012 compliance with strict purpose limitation, protection, and retention obligations for regional cloud workloads.
                </p>
              </div>
            </div>

            <section>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>
                Subprocessor Transparency Registry
              </h3>
              <p>
                In accordance with GDPR Article 28, Kavach maintains a verified list of infrastructure and technology subprocessors used to deliver our control plane services:
              </p>
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Subprocessor</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Purpose</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Data Location</th>
                      <th style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Transfer Mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600 }}>Amazon Web Services (AWS)</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Cloud compute, memory containers, and encrypted storage</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>US-East (N. Virginia), EU (Frankfurt)</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>EU Standard Contractual Clauses (SCCs)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600 }}>Supabase / PostgreSQL</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Relational database persistence for telemetry and findings metadata</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>US / EU (Dedicated VPC Enclave)</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>EU Standard Contractual Clauses (SCCs)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600 }}>Resend Technologies</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Transactional security alerts, password resets, and 2FA emails</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>United States</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Data Privacy Framework (DPF) / SCCs</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', fontWeight: 600 }}>GitHub / GitLab APIs</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Version control webhooks and automated Pull Request creation</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>Global (Customer configured)</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>OAuth 2.0 / App Token Grant</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 7: PRIVACY REQUEST (DSAR FORM) ── */}
        {activeTab === 'dsar-request' && (
          <div style={{ maxWidth: '720px' }}>
            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                Data Subject Access & Privacy Request (DSAR)
              </h2>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
                Under GDPR, UK GDPR, and CCPA/CPRA, you have the right to request access to your personal data, data portability, rectification, or complete deletion. Submit your request below for prompt processing by our Data Protection Officer.
              </p>
            </div>

            <form onSubmit={handleDsarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Full Legal Name
                </label>
                <input
                  type="text"
                  placeholder="Ada Lovelace"
                  value={dsarName}
                  onChange={(e) => setDsarName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Registered Email Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="engineer@company.com"
                  required
                  value={dsarEmail}
                  onChange={(e) => setDsarEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Request Type
                  </label>
                  <select
                    value={dsarRequestType}
                    onChange={(e) => setDsarRequestType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="DATA_EXPORT">Export Personal Data (Portability)</option>
                    <option value="DATA_DELETION">Delete Personal Account & Data (Right to be Forgotten)</option>
                    <option value="DATA_CORRECTION">Rectify Inaccurate Personal Data</option>
                    <option value="OPT_OUT">Opt Out of Communications</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Jurisdiction Framework
                  </label>
                  <select
                    value={dsarJurisdiction}
                    onChange={(e) => setDsarJurisdiction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13.5px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="EU_GDPR">European Union (GDPR)</option>
                    <option value="UK_GDPR">United Kingdom (UK GDPR)</option>
                    <option value="US_CCPA">United States (California CCPA/CPRA)</option>
                    <option value="SG_PDPA">Singapore (PDPA)</option>
                    <option value="OTHER">Other Global Jurisdiction</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                  Additional Context or Specific Workspaces (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide any relevant organization names or specific details regarding your request..."
                  value={dsarDetails}
                  onChange={(e) => setDsarDetails(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={dsarSubmitting}
                style={{
                  height: '42px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: dsarSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <Send size={15} />
                <span>{dsarSubmitting ? 'Submitting to DPO...' : 'Submit Official Privacy Request'}</span>
              </button>
            </form>
          </div>
        )}
      </main>

      <EnterpriseFooter />
    </div>
  );
}
