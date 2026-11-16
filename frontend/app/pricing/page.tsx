'use client';

/**
 * Kavach / SecuLayer — Enterprise Pricing & Plans (/pricing)
 * Typography-led, minimalist enterprise design with zero AI visual clutter.
 * Transparent tiered pricing for Code Security, Cloud CSPM, and Runtime Invariants.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { trackPricingView, trackBeginCheckout, trackDemoRequest } from '@/lib/analytics/gtag';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<string>('Business');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    trackPricingView({ billing_cycle: billingCycle, source: 'pricing_page' });
  }, [billingCycle]);

  const handleContactSales = (planName: string) => {
    trackDemoRequest({ method: 'pricing_enterprise_cta', plan: planName });
    setSelectedPlanForModal(planName);
    setExpertOpen(true);
  };

  const plans = [
    {
      name: 'Developer',
      tagline: 'Essential security for individual developers and open-source contributors.',
      priceMonthly: 0,
      priceAnnual: 0,
      ctaText: 'Start Free',
      ctaHref: '/signup',
      highlighted: false,
      features: [
        'Up to 3 active repositories',
        'Built-in AST static analysis & secret scanning',
        'Automated PR security checks',
        'Standard CVE vulnerability alerts',
        'Community documentation & support',
        '100 scan minutes per month',
      ],
    },
    {
      name: 'Team',
      tagline: 'Deterministic security enforcement for growing engineering teams.',
      priceMonthly: 49,
      priceAnnual: 39,
      ctaText: 'Start 14-Day Trial',
      ctaHref: '/signup?plan=team',
      highlighted: false,
      features: [
        'Up to 25 repositories & 15 developers',
        'Semgrep SAST, Gitleaks, & Trivy engines',
        'Blocking CI/CD merge gates',
        'Automated dependency auto-fix PRs',
        'Secrets remediation & historical audit',
        'Standard email support (12-hour SLA)',
        'Unlimited automated scan runs',
      ],
    },
    {
      name: 'Business',
      badge: 'Most Popular',
      tagline: 'Complete DevSecOps governance, cloud posture, and compliance assurance.',
      priceMonthly: 199,
      priceAnnual: 159,
      ctaText: 'Upgrade to Business',
      ctaHref: '/signup?plan=business',
      highlighted: true,
      features: [
        'Unlimited repositories & workspaces',
        'Deterministic OPA Rego policy enforcement',
        'SLSA Level 3 aligned cryptographic build provenance',
        'Multi-cloud CSPM & container vulnerability audit',
        'Framework mapping (SOC 2, ISO 27001, HIPAA & PCI readiness)',
        'Role-based access control (RBAC) & SSO (SAML/OIDC)',
        'Priority support (4-hour response SLA)',
      ],
    },
    {
      name: 'Enterprise',
      tagline: 'Custom architectures, dedicated tenancy, and mission-critical SLAs.',
      priceMonthly: 'Custom',
      priceAnnual: 'Custom',
      ctaText: 'Contact Security Team',
      onCtaClick: () => handleContactSales('Enterprise'),
      highlighted: false,
      features: [
        'Dedicated single-tenant VPC or on-prem deployment',
        'Self-hosted scanner runner clusters',
        'Custom OPA Rego invariants and compliance rules',
        'Air-gapped deployment support',
        'Dedicated Technical Account Manager',
        'Custom enterprise security SLA (99.99%)',
        'Custom vendor security assessments & SOC report',
      ],
    },
  ];

  const comparisonRows = [
    {
      category: 'Code Security & SAST',
      items: [
        { feature: 'Static Code Analysis (SAST)', dev: 'Basic (Built-in)', team: 'Full (Semgrep)', biz: 'Full + Custom Rules', ent: 'Enterprise Custom' },
        { feature: 'Secret Entropy & Leak Detection', dev: 'Standard', team: 'Gitleaks CLI', biz: 'Real-time + Pre-commit', ent: 'Real-time + Enterprise' },
        { feature: 'Software Composition Analysis (SCA)', dev: 'Top 100 CVEs', team: 'Full NVD + OSV', biz: 'Full + Reachability', ent: 'Full + Custom DB' },
        { feature: 'Automated AutoFix Pull Requests', dev: 'Manual', team: 'Automated PRs', biz: 'Automated PRs + Review', ent: 'Custom CI/CD Pipelines' },
      ],
    },
    {
      category: 'Cloud & Infrastructure (CSPM)',
      items: [
        { feature: 'Cloud Assets Discovered', dev: '—', team: 'Up to 500', biz: 'Unlimited', ent: 'Unlimited Multi-Cloud' },
        { feature: 'IaC Misconfigurations (Checkov)', dev: '—', team: 'Standard', biz: 'Advanced Guardrails', ent: 'Custom Policies' },
        { feature: 'Attack Path Analysis & Blast Radius', dev: '—', team: '—', biz: 'Included', ent: 'Continuous Real-time' },
        { feature: 'Kubernetes Workload Audit', dev: '—', team: 'Basic', biz: 'Deep Runtime + eBPF', ent: 'Dedicated Enclaves' },
      ],
    },
    {
      category: 'Policy Enforcement & Governance',
      items: [
        { feature: 'OPA Rego Policy Engine', dev: '—', team: 'Standard Rules', biz: 'Full Rego Editor', ent: 'Custom Invariants' },
        { feature: 'Deterministic CI/CD Merge Blocking', dev: '—', team: 'Critical/High', biz: 'Configurable Gates', ent: 'Zero-Tolerance Policy' },
        { feature: 'Compliance Framework Mapping (SOC2, ISO, HIPAA, PCI, NIST, CIS, OWASP)', dev: '—', team: 'Core Controls', biz: 'All 7 Frameworks', ent: 'Custom Frameworks' },
        { feature: 'Audit Log Retention', dev: '7 Days', team: '90 Days', biz: '1 Year', ent: '7 Years (Immutable)' },
      ],
    },
    {
      category: 'Support & Security SLA',
      items: [
        { feature: 'Authentication & SSO', dev: 'Password / GitHub', team: 'GitHub / Google', biz: 'SAML / Okta / Azure AD', bizIcon: true, ent: 'Custom IdP & SCIM' },
        { feature: 'Guaranteed Response SLA', dev: 'Community', team: '12 Hours', biz: '4 Hours', ent: '1 Hour (24/7/365)' },
        { feature: 'Dedicated Technical Account Manager', dev: '—', team: '—', biz: 'Optional Add-on', ent: 'Included' },
      ],
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      <main style={{ flex: 1, width: '100%', maxWidth: '1240px', margin: '0 auto', padding: '48px 24px 96px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', color: '#18181B', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
            <ShieldCheck size={14} color="#18181B" />
            <span>Deterministic Security Pricing</span>
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Predictable Pricing for High-Velocity Teams
          </h1>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '600px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            Every plan includes real deterministic scanning with zero simulated metrics. Choose the governance tier that fits your engineering pipeline.
          </p>

          {/* Billing Switcher */}
          <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: billingCycle === 'monthly' ? 600 : 500,
                color: billingCycle === 'monthly' ? '#0F172A' : '#64748B',
                backgroundColor: billingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
              }}
            >
              Monthly Billing
            </button>

            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: billingCycle === 'annual' ? 600 : 500,
                color: billingCycle === 'annual' ? '#0F172A' : '#64748B',
                backgroundColor: billingCycle === 'annual' ? '#FFFFFF' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                boxShadow: billingCycle === 'annual' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
              }}
            >
              <span>Annual Billing</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1px 6px', borderRadius: '10px' }}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid with Staggered Cascading Animation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pricingCardFadeUp {
            0% {
              opacity: 0;
              transform: translateY(32px) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .pricing-card-hover {
            transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
          }
          .pricing-card-hover:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.12) !important;
            border-color: #0F172A !important;
          }
        ` }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '22px', marginBottom: '64px', alignItems: 'stretch' }}>
          {plans.map((p, index) => {
            const isCustom = typeof p.priceAnnual === 'string';
            const price = isCustom ? 'Custom' : billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;

            return (
              <div
                key={p.name}
                className="pricing-card-hover"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  border: p.highlighted ? '2px solid #09090B' : '1px solid #E2E8F0',
                  boxShadow: p.highlighted ? '0 16px 36px -8px rgba(0, 0, 0, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  padding: '36px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: 0,
                  animation: `pricingCardFadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${index * 130}ms forwards`,
                  boxSizing: 'border-box',
                }}
              >
                {p.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-13px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#09090B',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 16px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {p.badge}
                  </div>
                )}

                <div style={{ marginBottom: '22px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    {p.name}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0, minHeight: '38px', lineHeight: 1.5 }}>
                    {p.tagline}
                  </p>
                </div>

                <div style={{ marginBottom: '24px', paddingBottom: '22px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '38px', fontWeight: 850, color: '#0F172A', letterSpacing: '-0.035em' }}>
                      {typeof price === 'number' ? `$${price}` : price}
                    </span>
                    {typeof price === 'number' && (
                      <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 500 }}>
                        / seat / month
                      </span>
                    )}
                  </div>
                  {typeof price === 'number' && billingCycle === 'annual' && price > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#047857', marginTop: '6px', fontWeight: 600, backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                      Billed annually (Save ${(((p.priceMonthly as number) - (p.priceAnnual as number)) * 12)}/seat/yr)
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, marginBottom: '30px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                    What&apos;s Included:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {p.features.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: '#334155', lineHeight: 1.45 }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: p.highlighted ? '#F1F5F9' : '#ECFDF5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <Check size={12} color={p.highlighted ? '#09090B' : '#059669'} strokeWidth={2.8} />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {p.onCtaClick ? (
                  <button
                    onClick={p.onCtaClick}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      backgroundColor: p.highlighted ? '#09090B' : '#FFFFFF',
                      color: p.highlighted ? '#FFFFFF' : '#18181B',
                      border: p.highlighted ? 'none' : '1px solid #E4E4E7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (p.highlighted) {
                        e.currentTarget.style.backgroundColor = '#27272A';
                      } else {
                        e.currentTarget.style.backgroundColor = '#F4F4F5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (p.highlighted) {
                        e.currentTarget.style.backgroundColor = '#09090B';
                      } else {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    <span>{p.ctaText}</span>
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <Link
                    href={p.ctaHref || '/signup'}
                    onClick={() => {
                      if (p.priceMonthly > 0 || p.priceAnnual > 0) {
                        trackBeginCheckout({
                          plan_name: p.name,
                          price: typeof p.priceAnnual === 'number' ? (billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly) : 0,
                          billing_cycle: billingCycle,
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      backgroundColor: p.highlighted ? '#09090B' : '#FFFFFF',
                      color: p.highlighted ? '#FFFFFF' : '#18181B',
                      border: p.highlighted ? 'none' : '1px solid #E4E4E7',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (p.highlighted) {
                        e.currentTarget.style.backgroundColor = '#27272A';
                      } else {
                        e.currentTarget.style.backgroundColor = '#F4F4F5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (p.highlighted) {
                        e.currentTarget.style.backgroundColor = '#09090B';
                      } else {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    <span>{p.ctaText}</span>
                    <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Full Feature Comparison
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              Deterministic capabilities mapped across security modules and enterprise tiers.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '14px 20px', width: '36%' }}>Feature</th>
                    <th style={{ padding: '14px 16px', width: '16%' }}>Developer</th>
                    <th style={{ padding: '14px 16px', width: '16%' }}>Team</th>
                    <th style={{ padding: '14px 16px', width: '16%', color: '#0F172A', backgroundColor: '#F4F4F5' }}>Business</th>
                    <th style={{ padding: '14px 16px', width: '16%' }}>Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((cat) => (
                    <React.Fragment key={cat.category}>
                      <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                        <td colSpan={5} style={{ padding: '10px 20px', fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                          {cat.category}
                        </td>
                      </tr>
                      {cat.items.map((row) => (
                        <tr key={row.feature} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 20px', color: '#334155', fontWeight: 500 }}>
                            {row.feature}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748B' }}>
                            {row.dev}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                            {row.team}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600, backgroundColor: '#F4F4F5' }}>
                            {row.biz}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 600 }}>
                            {row.ent}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              Got questions about our deterministic security models, seats, or deployment options?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                q: 'What makes Kavach deterministic instead of an AI wrapper?',
                a: 'LLMs propose remediations, but deterministic security engines (Semgrep AST, Gitleaks regex/entropy, Trivy CVE databases, and OPA Rego rules) make all authoritative security decisions. No scan findings or policy passes are ever fabricated by an LLM.',
              },
              {
                q: 'Can I switch from monthly to annual billing anytime?',
                a: 'Yes. You can upgrade from monthly to annual billing at any point in your organization settings to instantly apply the 20% annual discount across all active seats.',
              },
              {
                q: 'How does seat licensing work for software teams?',
                a: 'Seats are only required for active code committers and security dashboard administrators. Non-engineering stakeholders or read-only viewers can be granted free audit access.',
              },
              {
                q: 'Do you offer self-hosted or GovCloud deployments?',
                a: 'Yes. Our Enterprise tier includes self-hosted Helm charts for Kubernetes, AWS GovCloud, and fully isolated on-premises enclaves with custom data residency guarantees.',
              },
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 20px 16px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Commercial Transparency & Cancellation Guarantee */}
        <div
          style={{
            maxWidth: '840px',
            margin: '40px auto 0',
            padding: '24px',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={18} color="#059669" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Subscription Transparency, Renewal & Cancellation Guarantee
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 14px' }}>
            All plans feature transparent billing with zero surprise price hikes. Annual subscriptions renew automatically at standard contracted rates with email notifications sent 30 days prior. You can self-cancel your plan at any time in Organization Settings. If you are not completely satisfied within your first 14 calendar days, we provide a 100% full money-back evaluation guarantee.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px' }}>
            <Link href="/legal" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'none' }}>
              Full Refund & Cancellation Policy &rarr;
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <Link href="/legal" style={{ color: '#09090B', fontWeight: 600, textDecoration: 'none' }}>
              Data Processing Agreement (DPA) &rarr;
            </Link>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <a href="mailto:billing@kavachsecurity.me" style={{ color: '#64748B', textDecoration: 'none' }}>
              billing@kavachsecurity.me
            </a>
          </div>
        </div>
      </main>

      <EnterpriseFooter />

      {/* Global Modals */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <TalkToExpertModal
        isOpen={expertOpen}
        onClose={() => setExpertOpen(false)}
        productName={selectedPlanForModal}
      />
    </div>
  );
}
