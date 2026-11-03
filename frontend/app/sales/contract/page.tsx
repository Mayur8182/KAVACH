'use client';

/**
 * /sales/contract — SecuLayer Contract / Agreement Legal Signing Suite
 * Real implementation for:
 * - Master Services Agreement (MSA) generation & terms review
 * - Enterprise 99.99% SLA & Security Exhibit verification
 * - Cryptographic digital signature execution ceremony (SHA-256 hash)
 * - Seamless hand-off to Enterprise Onboarding
 *
 * Strict Production Engineering:
 * - Persisted in PostgreSQL / SQLite sales_agreements table
 * - Real API integration with /api/v1/sales/contract/*
 * - Real audit event logged upon digital signature execution
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileCheck,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Calendar,
  Building,
  User,
  Key,
  Award,
  RefreshCw,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

function ContractAgreementContent() {
  const searchParams = useSearchParams();
  const quoteId = searchParams?.get('quote_id') || '';
  const initialCompany = searchParams?.get('company') || 'Acme Global Defense Systems';
  const initialArr = parseFloat(searchParams?.get('arr') || '94350');

  // Contract Generation State
  const [contractId, setContractId] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Digital Signature State
  const [signatoryName, setSignatoryName] = useState('Jordan Belfort');
  const [signatoryTitle, setSignatoryTitle] = useState('Chief Information Security Officer (CISO)');
  const [legalEntity, setLegalEntity] = useState(initialCompany);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState<any | null>(null);

  const initContract = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.sales.generateContract({
        quote_id: quoteId || undefined,
        company_name: initialCompany,
        legal_entity_name: initialCompany,
        customer_signatory_name: signatoryName,
        customer_signatory_title: signatoryTitle,
        customer_signatory_email: 'signatory@' + (initialCompany.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company') + '.com',
        agreement_type: 'MASTER_SERVICES_AGREEMENT',
        arr_amount: initialArr,
      });
      setContractId(res.contract_id);
      setContractData(res);
    } catch (err: any) {
      console.error('Failed to generate contract', err);
      setError(err?.message || 'Failed to prepare contract agreement.');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    initContract();
  }, []);

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId) return;
    if (!consentAcknowledged) {
      setError('Please acknowledge legal consent before signing.');
      return;
    }

    setSigning(true);
    setError(null);
    try {
      const res = await api.sales.signContract(contractId, {
        legal_entity_name: legalEntity.trim(),
        customer_signatory_name: signatoryName.trim(),
        customer_signatory_title: signatoryTitle.trim(),
        consent_acknowledged: true,
      });
      setSignSuccess(res);
    } catch (err: any) {
      setError(err?.message || 'Digital signature failed');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Contract Agreement &amp; Legal Sign" activeStepKey="contract" />

      <main style={{ flex: 1, maxWidth: '1240px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
              <FileCheck size={16} />
              <span>LEGAL EXECUTION & DIGITAL SIGNATURE CEREMONY</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0F172A' }}>
              Master Services Agreement & SLA Exhibit
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
              Official legally-binding enterprise agreement with cryptographic proof of digital signature.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/sales/quote"
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
              <span>&larr; Back to Proposal Quote</span>
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div>Generating Enterprise Contract Agreement...</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)', gap: '36px' }}>
            
            {/* Left Column: Full Legal Contract Text Preview */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxHeight: '720px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>CONTRACT SPECIFICATION</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                    {contractData?.contract_number || 'SEC-MSA-2026-PENDING'}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: signSuccess ? '#DCFCE7' : '#EFF6FF', color: signSuccess ? '#15803D' : '#2563EB' }}>
                  {signSuccess ? 'EXECUTED & ACTIVE' : 'PENDING SIGNATURE'}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)' }}>
                {contractData?.terms_preview}
              </div>
            </div>

            {/* Right Column: Digital Signature Execution Ceremony */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  <Key size={16} />
                  <span>AUTHORIZED DIGITAL SIGNATURE CEREMONY</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', color: '#0F172A' }}>
                  Execute Legal Agreement
                </h3>

                {signSuccess ? (
                  <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
                      <CheckCircle2 size={20} />
                      <span>Contract Digitally Executed!</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#15803D', lineHeight: 1.5, margin: '0 0 14px' }}>
                      Signed by {signSuccess.signer} on {new Date(signSuccess.signed_at).toLocaleString()}.
                    </p>

                    <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #DCFCE7', fontSize: '11px', color: '#334155', marginBottom: '20px' }}>
                      <div><strong>Cryptographic Evidence SHA-256:</strong></div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: '#059669', wordBreak: 'break-all', marginTop: '4px' }}>
                        {signSuccess.signature_evidence_hash}
                      </div>
                    </div>

                    <Link
                      href={`/sales/enterprise-onboarding?contract_id=${encodeURIComponent(contractId || '')}&company=${encodeURIComponent(legalEntity)}&admin=${encodeURIComponent(signatoryName)}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <span>Launch Enterprise Onboarding</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSignContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Legal Entity Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={legalEntity}
                        onChange={(e) => setLegalEntity(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Signatory Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={signatoryName}
                          onChange={(e) => setSignatoryName(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Title / Role *
                        </label>
                        <input
                          type="text"
                          required
                          value={signatoryTitle}
                          onChange={(e) => setSignatoryTitle(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          required
                          checked={consentAcknowledged}
                          onChange={(e) => setConsentAcknowledged(e.target.checked)}
                          style={{ marginTop: '2px' }}
                        />
                        <span>
                          I warrant that I am an authorized signatory for <strong>{legalEntity}</strong> and agree to execute this Master Services Agreement and SLA Exhibit with Kavach Security Inc.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={signing || !consentAcknowledged}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: consentAcknowledged ? '#2563EB' : '#94A3B8',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: consentAcknowledged && !signing ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      {signing ? 'Computing Signature Evidence...' : 'Digitally Execute Agreement'}
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function ContractAgreementPage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>Loading Contract Agreement...</div>}>
      <ContractAgreementContent />
    </Suspense>
  );
}
