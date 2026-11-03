'use client';

/**
 * /sales/quote — SecuLayer Enterprise Proposal & Quote (CPQ) Engine
 * Real implementation for:
 * - Interactive CPQ (Configure, Price, Quote)
 * - Dynamic Annual Recurring Revenue (ARR) and Total Contract Value (TCV) calculation
 * - Commitment discounts (1, 2, 3 years) & payment terms (Net 30, Net 60, Prepay)
 * - Official Quote Document generation with Quote ID & line-item itemization
 * - Direct hand-off to Contract / Agreement Legal Signing
 *
 * Strict Production Engineering:
 * - Persisted in PostgreSQL/SQLite sales_proposals_quotes table
 * - Real API integration with /api/v1/sales/proposal/*
 * - Verifiable arithmetic formulas
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  DollarSign,
  FileText,
  Shield,
  Layers,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calculator,
  Download,
  Building,
  Mail,
  Lock,
  Server,
  Code2,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

function ProposalQuoteContent() {
  const searchParams = useSearchParams();
  const initialPocId = searchParams?.get('poc_id') || '';
  const initialCompany = searchParams?.get('company') || 'Acme Defense Corp';
  const initialEmail = searchParams?.get('email') || 'procurement@acmedefense.com';

  const [companyName, setCompanyName] = useState(initialCompany);
  const [customerEmail, setCustomerEmail] = useState(initialEmail);
  const [tier, setTier] = useState('ENTERPRISE_PRO');

  // Configurable Units
  const [seats, setSeats] = useState(50);
  const [agents, setAgents] = useState(20);
  const [clouds, setClouds] = useState(4);

  // Add-ons
  const [airgap, setAirgap] = useState(false);
  const [dedicatedSoc, setDedicatedSoc] = useState(true);
  const [customOpa, setCustomOpa] = useState(true);
  const [hsmSigning, setHsmSigning] = useState(true);

  // Term & Payment
  const [commitmentYears, setCommitmentYears] = useState(2);
  const [billingTerms, setBillingTerms] = useState('NET_30');
  const [notes, setNotes] = useState('');

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculations
  const calculations = useMemo(() => {
    const baseRates: Record<string, number> = {
      ENTERPRISE_STARTER: 36000,
      ENTERPRISE_PRO: 72000,
      SOVEREIGN_ENCLAVE: 144000,
    };
    const basePrice = baseRates[tier] || 72000;

    const seatsCost = seats * 600;
    const agentsCost = agents * 1200;
    const cloudsCost = clouds * 2400;

    let addonsCost = seatsCost + agentsCost + cloudsCost;
    if (airgap) addonsCost += 30000;
    if (dedicatedSoc) addonsCost += 24000;
    if (customOpa) addonsCost += 15000;
    if (hsmSigning) addonsCost += 18000;

    let discountPct = 0;
    if (commitmentYears === 2) discountPct = 15;
    else if (commitmentYears >= 3) discountPct = 25;
    if (billingTerms === 'ANNUAL_PREPAY') discountPct += 5;

    const subtotalAnnual = basePrice + addonsCost;
    const arr = Math.round(subtotalAnnual * (1 - discountPct / 100));
    const tcv = Math.round(arr * commitmentYears);

    return {
      basePrice,
      seatsCost,
      agentsCost,
      cloudsCost,
      addonsCost,
      discountPct,
      subtotalAnnual,
      arr,
      tcv,
    };
  }, [tier, seats, agents, clouds, airgap, dedicatedSoc, customOpa, hsmSigning, commitmentYears, billingTerms]);

  const handleGenerateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !customerEmail) {
      setError('Company name and customer email are required.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await api.sales.createProposal({
        poc_id: initialPocId || undefined,
        company_name: companyName.trim(),
        customer_email: customerEmail.trim(),
        tier,
        seats_count: seats,
        agent_runtimes_count: agents,
        cloud_connectors_count: clouds,
        airgap_deployment: airgap,
        dedicated_soc_support: dedicatedSoc,
        custom_opa_authoring: customOpa,
        hsm_agent_signing: hsmSigning,
        commitment_years: commitmentYears,
        billing_terms: billingTerms,
        notes: notes || undefined,
      });
      setGeneratedQuote(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate proposal quote');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="CPQ Pricing &amp; Quotation Engine" activeStepKey="proposal" />

      <main style={{ flex: 1, maxWidth: '1380px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              <Calculator size={16} />
              <span>CONFIGURE, PRICE, QUOTE (CPQ) ENGINE</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0F172A' }}>
              Enterprise Proposal & Quote Generator
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
              Real-time contract valuation engine with volume discounting, multi-year commitments, and compliance add-ons.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/poc"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                textDecoration: 'none',
              }}
            >
              <span>&larr; Back to POC Workspace</span>
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* 2-Column Layout: Left CPQ Configurator / Right Live Summary & Official Quote */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)', gap: '36px' }}>
          
          {/* Left Column: Configurator Controls */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <form onSubmit={handleGenerateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Customer Identifiers */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>1. Customer & Account Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Legal Entity / Company Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Customer Procurement Email *</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Tier Selection */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>2. Platform Deployment Tier</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { id: 'ENTERPRISE_STARTER', name: 'Starter', price: '$36,000 / yr', desc: 'Core SAST & Cloud CSPM' },
                    { id: 'ENTERPRISE_PRO', name: 'Enterprise Pro', price: '$72,000 / yr', desc: 'Full AI Agent & OPA Gate' },
                    { id: 'SOVEREIGN_ENCLAVE', name: 'Sovereign Enclave', price: '$144,000 / yr', desc: 'Air-Gapped & FedRAMP' },
                  ].map((t) => {
                    const active = tier === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTier(t.id)}
                        style={{
                          padding: '16px',
                          borderRadius: '10px',
                          backgroundColor: active ? '#EFF6FF' : '#F8FAFC',
                          border: active ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', margin: '4px 0' }}>{t.price}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{t.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Units Sliders */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>3. Capacity & Resource Allocation</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>Developer Seats ($600 / seat / yr)</span>
                      <strong style={{ color: '#2563EB' }}>{seats} seats (${(seats * 600).toLocaleString()})</strong>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={500}
                      step={5}
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>Autonomous Agent Fleets ($1,200 / agent / yr)</span>
                      <strong style={{ color: '#2563EB' }}>{agents} agents (${(agents * 1200).toLocaleString()})</strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={agents}
                      onChange={(e) => setAgents(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>Multi-Cloud Infrastructure Connectors ($2,400 / cloud / yr)</span>
                      <strong style={{ color: '#2563EB' }}>{clouds} connectors (${(clouds * 2400).toLocaleString()})</strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={clouds}
                      onChange={(e) => setClouds(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Add-ons Checkboxes */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>4. Enterprise Add-Ons & Governance Packages</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={airgap} onChange={(e) => setAirgap(e.target.checked)} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>Air-Gapped Enclave</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>+$30,000 / yr</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={dedicatedSoc} onChange={(e) => setDedicatedSoc(e.target.checked)} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>24/7 Dedicated SOC</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>+$24,000 / yr</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={customOpa} onChange={(e) => setCustomOpa(e.target.checked)} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>Custom OPA Authoring</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>+$15,000 / yr</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={hsmSigning} onChange={(e) => setHsmSigning(e.target.checked)} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>HSM Agent Signing</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>+$18,000 / yr</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Term Commitment & Terms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Commitment Term</label>
                  <select
                    value={commitmentYears}
                    onChange={(e) => setCommitmentYears(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value={1}>1 Year (Standard, 0% discount)</option>
                    <option value={2}>2 Years (15% Multi-Year Discount)</option>
                    <option value={3}>3 Years (25% Strategic Commitment Discount)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Payment Terms</label>
                  <select
                    value={billingTerms}
                    onChange={(e) => setBillingTerms(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="NET_30">Net 30 Invoicing</option>
                    <option value="NET_60">Net 60 Enterprise Procurement</option>
                    <option value="ANNUAL_PREPAY">Annual Prepayment (+5% Discount)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)',
                }}
              >
                {generating ? 'Calculating & Registering Quote...' : 'Generate Official Enterprise Quote'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Right Column: Dynamic Pricing Summary & Official Generated Quote */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Live Pricing Breakdown Card */}
            <div style={{ backgroundColor: '#0B1120', color: '#FFFFFF', borderRadius: '16px', border: '1px solid #1E293B', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em' }}>CONTRACT VALUATION</span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{tier}</span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>Annual Recurring Revenue (ARR)</div>
                <div style={{ fontSize: '38px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginTop: '4px' }}>
                  ${calculations.arr.toLocaleString()}{' '}
                  <span style={{ fontSize: '16px', fontWeight: 500, color: '#94A3B8' }}>/ year</span>
                </div>
                <div style={{ fontSize: '13px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
                  Total Contract Value ({commitmentYears} yr commitment): ${calculations.tcv.toLocaleString()} USD
                </div>
              </div>

              <div style={{ borderTop: '1px solid #1E293B', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#94A3B8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base Platform Fee:</span>
                  <span style={{ color: '#F1F5F9' }}>${calculations.basePrice.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Capacity & Add-ons:</span>
                  <span style={{ color: '#F1F5F9' }}>${calculations.addonsCost.toLocaleString()}</span>
                </div>
                {calculations.discountPct > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                    <span>Commitment & Term Discount:</span>
                    <span>-{calculations.discountPct}%</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1E293B', paddingTop: '8px', fontWeight: 700, color: '#FFFFFF' }}>
                  <span>Effective Annual Fee:</span>
                  <span style={{ color: '#38BDF8' }}>${calculations.arr.toLocaleString()} USD</span>
                </div>
              </div>
            </div>

            {/* Official Generated Quote Document Card */}
            {generatedQuote ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #BBF7D0', padding: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span>Official Quote Issued: {generatedQuote.quote_number}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 16px', lineHeight: 1.5 }}>
                  This proposal has been recorded in the Kavach contract register and is valid until{' '}
                  <strong>{new Date(generatedQuote.valid_until).toLocaleDateString()}</strong>.
                </p>

                <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div><strong>Account:</strong> {generatedQuote.company_name}</div>
                  <div><strong>Quote Reference:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{generatedQuote.quote_number}</span></div>
                  <div><strong>Annual Commitment:</strong> ${generatedQuote.arr?.toLocaleString()} USD</div>
                  <div><strong>TCV ({generatedQuote.commitment_years} years):</strong> ${generatedQuote.tcv?.toLocaleString()} USD</div>
                  <div><strong>Payment Terms:</strong> {generatedQuote.billing_terms}</div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link
                    href={`/sales/contract?quote_id=${encodeURIComponent(generatedQuote.quote_id)}&quote_number=${encodeURIComponent(generatedQuote.quote_number)}&company=${encodeURIComponent(generatedQuote.company_name)}&arr=${encodeURIComponent(generatedQuote.arr)}`}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Proceed to Contract Agreement</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ padding: '32px 24px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px dashed #CBD5E1', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div>No Quote Generated Yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Click &quot;Generate Official Enterprise Quote&quot; to issue a quote reference.</div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default function ProposalQuotePage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>Loading CPQ Configurator...</div>}>
      <ProposalQuoteContent />
    </Suspense>
  );
}
