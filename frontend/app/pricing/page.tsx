'use client';

/**
 * Kavach / SecuLayer — Enterprise Pricing & Plans (/pricing)
 * Typography-led, minimalist enterprise design with zero AI visual clutter.
 * Transparent tiered pricing for Code Security, Cloud CSPM, and Runtime Invariants.
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Check,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Building2,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { trackPricingView, trackBeginCheckout, trackDemoRequest } from '@/lib/analytics/gtag';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<string>('Business');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDot, setActiveDot] = useState<number>(1);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

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

  const scrollCards = (direction: 'left' | 'right') => {
    if (!cardsContainerRef.current) return;
    const container = cardsContainerRef.current;
    const scrollAmount = 320;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!cardsContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = cardsContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) return;
    const progress = scrollLeft / maxScroll;
    if (progress < 0.3) {
      setActiveDot(0);
    } else if (progress > 0.7) {
      setActiveDot(2);
    } else {
      setActiveDot(1);
    }
  };

  const scrollToDot = (dotIndex: number) => {
    if (!cardsContainerRef.current) return;
    const { scrollWidth, clientWidth } = cardsContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    let target = 0;
    if (dotIndex === 1) target = maxScroll * 0.5;
    if (dotIndex === 2) target = maxScroll;
    cardsContainerRef.current.scrollTo({ left: target, behavior: 'smooth' });
    setActiveDot(dotIndex);
  };

  const plans = [
    {
      name: 'Developer',
      subtitle: 'For individual use.',
      icon: User,
      priceMonthly: 0,
      priceAnnual: 0,
      ctaText: 'Start Free',
      ctaHref: '/signup',
      highlighted: false,
    },
    {
      name: 'Team',
      subtitle: 'For small teams.',
      icon: Users,
      priceMonthly: 9,
      priceAnnual: 7,
      ctaText: 'Start Trial',
      ctaHref: '/signup?plan=team',
      highlighted: false,
    },
    {
      name: 'Business',
      subtitle: 'For growing teams.',
      icon: Building2,
      badge: 'Most Popular',
      priceMonthly: 29,
      priceAnnual: 24,
      ctaText: 'Get Started',
      ctaHref: '/signup?plan=business',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      subtitle: 'For large organizations.',
      icon: Layers,
      priceMonthly: 'Custom',
      priceAnnual: 'Custom',
      ctaText: 'Contact Sales',
      onCtaClick: () => handleContactSales('Enterprise'),
      highlighted: false,
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
      <style>{`
        @keyframes cardFadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {/* Top Navigation */}
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      <main style={{ flex: 1, width: '100%', maxWidth: '1240px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 800, color: '#09090B', letterSpacing: '-0.035em', margin: '0 0 10px', lineHeight: 1.15 }}>
            Simple Pricing
          </h1>
          <p style={{ fontSize: '16px', color: '#71717A', margin: '0 auto 28px', maxWidth: '600px', fontWeight: 400 }}>
            Choose a plan that fits your team.
          </p>

          {/* Billing Switcher */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '9999px',
              padding: '4px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 24px',
                fontSize: '13.5px',
                fontWeight: billingCycle === 'monthly' ? 600 : 500,
                color: billingCycle === 'monthly' ? '#FFFFFF' : '#71717A',
                backgroundColor: billingCycle === 'monthly' ? '#09090B' : 'transparent',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 24px',
                fontSize: '13.5px',
                fontWeight: billingCycle === 'annual' ? 600 : 500,
                color: billingCycle === 'annual' ? '#FFFFFF' : '#71717A',
                backgroundColor: billingCycle === 'annual' ? '#09090B' : 'transparent',
                border: 'none',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <span>Annual</span>
              {billingCycle !== 'annual' && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#047857',
                    backgroundColor: '#ECFDF5',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  Save 20%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Cards Carousel / Grid */}
        <div style={{ position: 'relative', maxWidth: '1240px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => scrollCards('left')}
            aria-label="Previous plans"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#09090B',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              zIndex: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F4F4F5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Cards Container with Smooth Scroll & Staggered Animation */}
          <div
            ref={cardsContainerRef}
            onScroll={handleScroll}
            className="hide-scrollbar"
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(240px, 1fr))',
              gap: '18px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              padding: '6px 2px 14px',
            }}
          >
            {plans.map((p, idx) => {
              const isCustom = typeof p.priceAnnual === 'string';
              const price = isCustom ? 'Custom' : billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;
              const IconComp = p.icon;
              const isPopular = p.highlighted;

              return (
                <div
                  key={p.name}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    border: isPopular ? '2px solid #09090B' : '1px solid #E4E4E7',
                    boxShadow: isPopular ? '0 10px 25px -4px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.02)',
                    padding: '30px 24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxSizing: 'border-box',
                    scrollSnapAlign: 'start',
                    animation: `cardFadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both`,
                    animationDelay: `${idx * 90}ms`,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = isPopular ? '0 16px 36px -6px rgba(0, 0, 0, 0.14)' : '0 12px 28px -6px rgba(0, 0, 0, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isPopular ? '0 10px 25px -4px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.02)';
                  }}
                >
                  {/* Top Row: Icon + Most Popular Badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: '#F4F4F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComp size={22} color="#09090B" strokeWidth={1.8} />
                    </div>

                    {p.badge && (
                      <div
                        style={{
                          backgroundColor: '#09090B',
                          color: '#FFFFFF',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {p.badge}
                      </div>
                    )}
                  </div>

                  {/* Plan Name */}
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#09090B', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    {p.name}
                  </h2>

                  {/* Plan Subtitle */}
                  <p style={{ fontSize: '13.5px', color: '#71717A', margin: '0 0 28px', minHeight: '20px' }}>
                    {p.subtitle}
                  </p>

                  {/* Price */}
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '42px', fontWeight: 850, color: '#09090B', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {typeof price === 'number' ? `$${price}` : price}
                    </span>
                  </div>

                  {/* Cadence */}
                  <div style={{ fontSize: '13.5px', color: '#71717A', marginBottom: '32px' }}>
                    / month
                  </div>

                  {/* CTA Button */}
                  <div style={{ marginTop: 'auto' }}>
                    {p.onCtaClick ? (
                      <button
                        type="button"
                        onClick={p.onCtaClick}
                        style={{
                          width: '100%',
                          padding: '13px 20px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: 600,
                          letterSpacing: '-0.01em',
                          backgroundColor: isPopular ? '#09090B' : '#FFFFFF',
                          color: isPopular ? '#FFFFFF' : '#09090B',
                          border: isPopular ? 'none' : '1px solid #E4E4E7',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isPopular ? '#27272A' : '#F4F4F5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isPopular ? '#09090B' : '#FFFFFF';
                        }}
                      >
                        {p.ctaText}
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
                          padding: '13px 20px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: 600,
                          letterSpacing: '-0.01em',
                          backgroundColor: isPopular ? '#09090B' : '#FFFFFF',
                          color: isPopular ? '#FFFFFF' : '#09090B',
                          border: isPopular ? 'none' : '1px solid #E4E4E7',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isPopular ? '#27272A' : '#F4F4F5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isPopular ? '#09090B' : '#FFFFFF';
                        }}
                      >
                        {p.ctaText}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => scrollCards('right')}
            aria-label="Next plans"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#09090B',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              zIndex: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F4F4F5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 3 Pagination Dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '64px' }}>
          {[0, 1, 2].map((dot) => {
            const isActive = activeDot === dot;
            return (
              <button
                key={dot}
                type="button"
                onClick={() => scrollToDot(dot)}
                aria-label={`View page ${dot + 1}`}
                style={{
                  width: isActive ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? '#09090B' : '#D4D4D8',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
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
