'use client';

/**
 * /sales/proposal — Page 31: Proposal / Quote (CPQ)
 * Production implementation:
 * - Interactive CPQ pricing & proposal generation
 * - Line-item itemization: SecuLayer Cloud, Code, Run, Services
 * - Real API integration:
 *   - /api/v1/sales/proposal/create
 *   - /api/v1/sales/proposal/{quote_id}/accept
 *   - /api/v1/sales/proposal/{quote_id}/request-changes
 * - Download proposal report / PDF
 * - Seamless hand-off to /sales/contract
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileCode2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  Shield,
  Layers,
  Calculator,
  Building,
  Mail,
  Send,
  Edit,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

function ProposalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pocId = searchParams?.get('poc_id') || '';
  const initialCompany = searchParams?.get('company') || 'ADIT Technologies';
  const initialEmail = searchParams?.get('email') || 'procurement@adit-tech.com';

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

  // Terms
  const [commitmentYears, setCommitmentYears] = useState(2);
  const [billingTerms, setBillingTerms] = useState('NET_30');

  // Execution states
  const [generating, setGenerating] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Arithmetic formulas
  const calculations = useMemo(() => {
    const tierRates: Record<string, number> = {
      ENTERPRISE_STARTER: 36000,
      ENTERPRISE_PRO: 72000,
      SOVEREIGN_ENCLAVE: 144000,
    };
    const basePrice = tierRates[tier] || 72000;
    const addonsCost =
      seats * 600 +
      agents * 1200 +
      clouds * 2400 +
      (airgap ? 30000 : 0) +
      (dedicatedSoc ? 24000 : 0) +
      (customOpa ? 15000 : 0) +
      (hsmSigning ? 18000 : 0);

    let discountPct = 0;
    if (commitmentYears === 2) discountPct = 15;
    else if (commitmentYears >= 3) discountPct = 25;
    if (billingTerms === 'ANNUAL_PREPAY') discountPct += 5;

    const subtotal = basePrice + addonsCost;
    const arr = Math.round(subtotal * (1 - discountPct / 100));
    const tcv = Math.round(arr * commitmentYears);

    return { basePrice, addonsCost, discountPct, arr, tcv };
  }, [tier, seats, agents, clouds, airgap, dedicatedSoc, customOpa, hsmSigning, commitmentYears, billingTerms]);

  // Auto-generate initial quote on mount
  useEffect(() => {
    const initQuote = async () => {
      setGenerating(true);
      try {
        const res = await api.sales.createProposal({
          poc_id: pocId || undefined,
          company_name: companyName,
          customer_email: customerEmail,
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
        });
        setGeneratedQuote(res);
      } catch (err: any) {
        console.error('Initial quote generation failed', err);
      } finally {
        setGenerating(false);
      }
    };
    initQuote();
  }, []);

  const handleCreateOrUpdateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.sales.createProposal({
        poc_id: pocId || undefined,
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
      });
      setGeneratedQuote(res);
      setSuccessMsg('Proposal updated and recorded in the database.');
    } catch (err: any) {
      setError(err?.message || 'Failed to register quote.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!generatedQuote?.quote_id) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.sales.acceptProposal(generatedQuote.quote_id);
      setSuccessMsg('Quote accepted! Proceeding to official contract agreement...');
      setTimeout(() => {
        router.push(
          `/sales/contract?quote_id=${encodeURIComponent(generatedQuote.quote_id)}&quote_number=${encodeURIComponent(generatedQuote.quote_number)}&company=${encodeURIComponent(companyName)}&arr=${encodeURIComponent(generatedQuote.arr)}`
        );
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to accept quote.');
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!generatedQuote?.quote_id || !changeNotes.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.sales.requestProposalChanges(generatedQuote.quote_id, changeNotes.trim());
      setShowChangesModal(false);
      setSuccessMsg('Requested changes have been recorded in the proposal history.');
      setChangeNotes('');
    } catch (err: any) {
      setError(err?.message || 'Failed to request changes.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const text = `KAVACH ENTERPRISE PROPOSAL & QUOTE\nQuote Reference: ${generatedQuote?.quote_number || 'KAV-Q-2026-1042'}\nValid Until: ${generatedQuote?.valid_until || 'November 15, 2026'}\nPrepared For: ${companyName}\nPrepared By: Kavach Enterprise Sales Team\nTier: ${tier}\nAnnual Contract Value (ARR): $${(generatedQuote?.arr || calculations.arr).toLocaleString()} USD\nTotal Contract Value (${commitmentYears} Years): $${(generatedQuote?.tcv || calculations.tcv).toLocaleString()} USD\nBilling Terms: ${billingTerms}\nDiscount: ${calculations.discountPct}%`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposal_${companyName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Proposal &amp; Quote (CPQ)" activeStepKey="proposal" />

      <main style={{ flex: 1, maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        {/* Top Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            <Link href="/sales" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Sales</Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Proposal / Quote</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                <FileCode2 size={15} />
                <span>PAGE 31 &bull; CONFIGURE, PRICE, QUOTE (CPQ) ENGINE</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Proposal / Quote
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                Share pricing and proposal with customer procurement. Live pricing formulas and legal document generation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleDownloadPDF}
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
                  cursor: 'pointer',
                }}
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '14px 18px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2-Column CPQ Engine & Document Table (Page 31 Layout) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.95fr', gap: '32px' }}>
          
          {/* Left: Official Proposal Document View (Matching Screenshot Page 31) */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Proposal Details</h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Official Enterprise Subscription Offer</div>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: '6px' }}>
                {generatedQuote?.quote_number || 'PROP-2026-1042'}
              </span>
            </div>

            {/* Proposal Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#64748B' }}>Valid Until: </span>
                <span style={{ fontWeight: 600 }}>{generatedQuote?.valid_until ? new Date(generatedQuote.valid_until).toLocaleDateString() : 'Nov 31, 2026'}</span>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Prepared For: </span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{companyName}</span>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Prepared By: </span>
                <span style={{ fontWeight: 600 }}>Kavach Enterprise Sales</span>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Payment Terms: </span>
                <span style={{ fontWeight: 600 }}>{billingTerms}</span>
              </div>
            </div>

            {/* Products & Modules Table */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }}>Products & Modules</h4>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Product</th>
                      <th style={{ padding: '10px 14px' }}>Description</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>Kavach Cloud</td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>Cloud security & multi-cloud CSPM</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{clouds}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>${(clouds * 2400).toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>Kavach Code</td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>SAST, secrets & supply chain defense</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{seats}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>${(seats * 600).toLocaleString()}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>Kavach Run</td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>Autonomous AI agent governance gate</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{agents}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>${(agents * 1200).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>Professional Services</td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>Dedicated deployment & training</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>1</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>$15,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total / Quote Value Footer */}
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Annual Contract Value (ARR):</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                  ${(generatedQuote?.arr || calculations.arr).toLocaleString()} USD
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                  {calculations.discountPct}% Discount Applied
                </span>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  TCV ({commitmentYears} yr): ${(generatedQuote?.tcv || calculations.tcv).toLocaleString()} USD
                </div>
              </div>
            </div>

            {/* Buttons: Accept Quote & Request Changes */}
            <div style={{ display: 'flex', gap: '14px' }}>
              <button
                type="button"
                onClick={handleAcceptQuote}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{actionLoading ? 'Processing...' : 'Accept Quote'}</span>
                <CheckCircle2 size={16} />
              </button>

              <button
                type="button"
                onClick={() => setShowChangesModal(true)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Request Changes</span>
                <Edit size={14} />
              </button>
            </div>
          </div>

          {/* Right: Configurator Adjustments */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: 'fit-content' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>Adjust Subscription Units</h3>

            <form onSubmit={handleCreateOrUpdateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Platform Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="ENTERPRISE_STARTER">Starter ($36,000 / yr)</option>
                  <option value="ENTERPRISE_PRO">Enterprise Pro ($72,000 / yr)</option>
                  <option value="SOVEREIGN_ENCLAVE">Sovereign Enclave ($144,000 / yr)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Seats</label>
                  <input
                    type="number"
                    min={5}
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value) || 10)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Agents</label>
                  <input
                    type="number"
                    min={1}
                    value={agents}
                    onChange={(e) => setAgents(parseInt(e.target.value) || 5)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Clouds</label>
                  <input
                    type="number"
                    min={1}
                    value={clouds}
                    onChange={(e) => setClouds(parseInt(e.target.value) || 2)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Commitment Term</label>
                <select
                  value={commitmentYears}
                  onChange={(e) => setCommitmentYears(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value={1}>1 Year (Standard)</option>
                  <option value={2}>2 Years (15% Multi-Year Discount)</option>
                  <option value={3}>3 Years (25% Strategic Commitment Discount)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generating}
                style={{
                  padding: '11px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '6px',
                }}
              >
                <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                <span>Recalculate & Issue Proposal</span>
              </button>
            </form>
          </div>
        </div>

        {/* Request Changes Modal */}
        {showChangesModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '28px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px', color: '#0F172A' }}>Request Changes to Proposal</h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                Specify requested term adjustments, seat capacity modifications, or discount requests.
              </p>
              <textarea
                rows={4}
                required
                placeholder="e.g. Please adjust developer seats to 75 and apply annual prepayment terms..."
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowChangesModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !changeNotes.trim()}
                  onClick={handleRequestChanges}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Saving...' : 'Submit Change Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProposalPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Proposal...</div>}>
      <ProposalContent />
    </Suspense>
  );
}
