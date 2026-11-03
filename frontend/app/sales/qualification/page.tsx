'use client';

/**
 * /sales/qualification — Page 24: Sales Qualification
 * Production implementation:
 * - 4-stage qualification stepper:
 *   1. Company (Name, Industry, Size, Annual Revenue, Country, Deployment Preference)
 *   2. Requirements (Security problems, Current tools, Repositories, Cloud, Team size)
 *   3. Use Case (Primary use case, Budget range, Timeline, Compliance, Technical requirements)
 *   4. Review & MEDDIC Scorecard (Economic buyer, Decision criteria, Champion, Pain points, Final score)
 * - Pulls real leads from /api/v1/sales/leads
 * - Persists authoritative SalesQualification and marks Lead as QUALIFIED in PostgreSQL / SQLite
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Award,
  Layers,
  Users,
  DollarSign,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

export default function SalesQualificationPage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Stage 1: Company
  const [companyName, setCompanyName] = useState('ADIT Technologies');
  const [industry, setIndustry] = useState('Technology');
  const [companySize, setCompanySize] = useState('201 - 500');
  const [annualRevenue, setAnnualRevenue] = useState('$10M - $50M');
  const [country, setCountry] = useState('United States');
  const [deploymentPreference, setDeploymentPreference] = useState('Cloud (SaaS)');

  // Stage 2: Requirements
  const [securityProblems, setSecurityProblems] = useState('Lack of visibility into AI agent tool invocations, vulnerable IaC terraform modules, CI secrets leakage.');
  const [currentTools, setCurrentTools] = useState('GitHub Advanced Security, Snyk, Prisma Cloud');
  const [reposCount, setReposCount] = useState('150');
  const [cloudInfra, setCloudInfra] = useState('AWS (3 accounts) + GCP (2 sovereign enclaves)');
  const [securityTeamSize, setSecurityTeamSize] = useState('8 engineers');

  // Stage 3: Use Case & Budget
  const [useCase, setUseCase] = useState('Unified Code SAST, Multi-Cloud CSPM & MCP AI Agent Defense Gate');
  const [budgetRange, setBudgetRange] = useState('$50,000 - $120,000 / yr');
  const [expectedTimeline, setExpectedTimeline] = useState('CURRENT_QUARTER');
  const [complianceFrameworks, setComplianceFrameworks] = useState('SOC2 Type II, ISO 27001');
  const [technicalRequirements, setTechnicalRequirements] = useState('Deterministic OPA policy enforcement, sub-minute PR scans, cryptographic evidence export.');

  // Stage 4: Review / MEDDIC
  const [economicBuyer, setEconomicBuyer] = useState('VP of Engineering / CISO');
  const [decisionCriteria, setDecisionCriteria] = useState('Zero runtime bypass of security policy, automated PR autofix, audit-ready compliance reporting');
  const [decisionProcess, setDecisionProcess] = useState('30-day POC -> SecOps validation -> Procurement & Legal MSA');
  const [champion, setChampion] = useState('Director of AppSec');
  const [budgetConfirmed, setBudgetConfirmed] = useState(true);
  const [authorityConfirmed, setAuthorityConfirmed] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualResult, setQualResult] = useState<any | null>(null);

  // Load leads on mount
  useEffect(() => {
    let active = true;
    const fetchLeads = async () => {
      try {
        const data = await api.sales.listLeads();
        if (active && data && data.length > 0) {
          setLeads(data);
          // If first lead available, prefill
          const l = data[0];
          setSelectedLeadId(l.id);
          if (l.company) setCompanyName(l.company);
          if (l.industry) setIndustry(l.industry);
          if (l.company_size) setCompanySize(l.company_size);
        }
      } catch (err) {
        console.error('Failed to load leads', err);
      } finally {
        if (active) setLoadingLeads(false);
      }
    };
    fetchLeads();
    return () => { active = false; };
  }, []);

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const l = leads.find((item) => item.id === leadId);
    if (l) {
      if (l.company) setCompanyName(l.company);
      if (l.industry) setIndustry(l.industry);
      if (l.company_size) setCompanySize(l.company_size);
      if (l.use_case) setUseCase(l.use_case);
    }
  };

  const handleCompleteQualification = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.sales.qualifyLead({
        demo_request_id: selectedLeadId || undefined,
        company_name: companyName,
        stage: 'QUALIFIED',
        metrics: `Expected ${budgetRange} ARR. Requirements: ${technicalRequirements}`,
        economic_buyer: economicBuyer,
        decision_criteria: decisionCriteria,
        decision_process: decisionProcess,
        identify_pain: securityProblems,
        champion: champion,
        budget_confirmed: budgetConfirmed,
        authority_confirmed: authorityConfirmed,
        need_urgency: 'IMMEDIATE',
        timeline: expectedTimeline,
        notes: `Deployment: ${deploymentPreference}. Team: ${securityTeamSize}. Repos: ${reposCount}. Tools: ${currentTools}`,
      });

      // Also update lead status to QUALIFIED
      if (selectedLeadId) {
        await api.sales.updateLead(selectedLeadId, { status: 'QUALIFIED' });
      }

      setQualResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to persist qualification.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Company' },
    { num: 2, title: 'Requirements' },
    { num: 3, title: 'Use Case' },
    { num: 4, title: 'Review' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Sales Qualification &amp; MEDDIC" activeStepKey="qual" />

      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        {/* Top Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            <Link href="/sales" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Sales</Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Sales Qualification</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                <Target size={15} />
                <span>PAGE 24 &bull; INTERNAL SALES QUALIFICATION (MEDDIC / BANT)</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Sales Qualification
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                Understand customer needs, pain points, budget, and timeline to transition leads to QUALIFIED.
              </p>
            </div>

            {/* Quick Lead Selector */}
            {leads.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Active Lead:</span>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleSelectLead(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company || l.name} ({l.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Stepper Header (Page 24 Visual Match) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginBottom: '32px' }}>
          {steps.map((s, idx) => {
            const isCurrent = activeStep === s.num;
            const isCompleted = activeStep > s.num;
            return (
              <React.Fragment key={s.num}>
                <div
                  onClick={() => setActiveStep(s.num)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? '#16A34A' : isCurrent ? '#2563EB' : '#E2E8F0',
                      color: isCompleted || isCurrent ? '#FFFFFF' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={16} /> : s.num}
                  </div>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#0F172A' : '#64748B',
                    }}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div style={{ width: '48px', height: '2px', backgroundColor: activeStep > s.num ? '#16A34A' : '#E2E8F0' }} />
                )}
              </React.Fragment>
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
        {qualResult ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #BBF7D0', padding: '36px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#166534', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={28} color="#16A34A" />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#14532D' }}>Lead Successfully Qualified!</h2>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>Database record marked as QUALIFIED with authoritative MEDDIC score.</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Account:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{qualResult.company_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>MEDDIC Qualification Score:</span>
                <span style={{ fontWeight: 800, color: '#2563EB', fontSize: '15px' }}>{qualResult.qualification_score} / 100 ({qualResult.meddic_status})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>New Status:</span>
                <span style={{ fontWeight: 700, color: '#16A34A' }}>QUALIFIED</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setQualResult(null); setActiveStep(1); }}
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
                Qualify Another Account
              </button>
              <Link
                href="/sales/demo-workspace"
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
                <span>Open Demo Workspace</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* Step Forms Container */
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            {/* Step 1: Company */}
            {activeStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>Step 1: Company Profile</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Industry *</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Company Size</label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                    >
                      <option value="1 - 50">1 - 50</option>
                      <option value="51 - 200">51 - 200</option>
                      <option value="201 - 500">201 - 500</option>
                      <option value="500 - 1000">500 - 1,000</option>
                      <option value="1000+">1,000+ (Enterprise)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Annual Revenue (ARR Estimate)</label>
                    <select
                      value={annualRevenue}
                      onChange={(e) => setAnnualRevenue(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                    >
                      <option value="< $1M">&lt; $1M</option>
                      <option value="$1M - $10M">$1M - $10M</option>
                      <option value="$10M - $50M">$10M - $50M</option>
                      <option value="$50M - $250M">$50M - $250M</option>
                      <option value="$250M+">$250M+</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Deployment Preference</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      {['Cloud (SaaS)', 'On-Premise / Air-gapped', 'Hybrid'].map((opt) => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="deployPref"
                            checked={deploymentPreference === opt}
                            onChange={() => setDeploymentPreference(opt)}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    style={{
                      padding: '11px 22px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Next: Requirements</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Requirements */}
            {activeStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>Step 2: Technical Environment & Pain Points</h3>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Core Security Problems / Identified Pains *</label>
                  <textarea
                    rows={3}
                    value={securityProblems}
                    onChange={(e) => setSecurityProblems(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Current Security Tools in Use</label>
                  <input
                    type="text"
                    value={currentTools}
                    onChange={(e) => setCurrentTools(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Active Repositories</label>
                    <input
                      type="text"
                      value={reposCount}
                      onChange={(e) => setReposCount(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Cloud Infrastructure</label>
                    <input
                      type="text"
                      value={cloudInfra}
                      onChange={(e) => setCloudInfra(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Security Team Size</label>
                    <input
                      type="text"
                      value={securityTeamSize}
                      onChange={(e) => setSecurityTeamSize(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    style={{ padding: '11px 18px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    style={{ padding: '11px 22px', backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Next: Use Case</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Use Case */}
            {activeStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>Step 3: Primary Use Case & Commercial Bounds</h3>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Primary Platform Objective</label>
                  <input
                    type="text"
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Estimated Annual Budget Range</label>
                    <input
                      type="text"
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Procurement Timeline</label>
                    <select
                      value={expectedTimeline}
                      onChange={(e) => setExpectedTimeline(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                    >
                      <option value="IMMEDIATE_30_DAYS">Immediate (Next 30 Days)</option>
                      <option value="CURRENT_QUARTER">Current Quarter (Q4 2026)</option>
                      <option value="NEXT_QUARTER">Next Quarter (Q1 2027)</option>
                      <option value="NEXT_FISCAL_YEAR">Next Fiscal Year</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Required Compliance Frameworks</label>
                    <input
                      type="text"
                      value={complianceFrameworks}
                      onChange={(e) => setComplianceFrameworks(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Technical Gate Requirements</label>
                    <input
                      type="text"
                      value={technicalRequirements}
                      onChange={(e) => setTechnicalRequirements(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    style={{ padding: '11px 18px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(4)}
                    style={{ padding: '11px 22px', backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Next: Review & MEDDIC</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Final MEDDIC Submission */}
            {activeStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>Step 4: MEDDIC & BANT Qualification Review</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Economic Buyer</label>
                    <input
                      type="text"
                      value={economicBuyer}
                      onChange={(e) => setEconomicBuyer(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Internal Champion</label>
                    <input
                      type="text"
                      value={champion}
                      onChange={(e) => setChampion(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Decision Criteria</label>
                    <input
                      type="text"
                      value={decisionCriteria}
                      onChange={(e) => setDecisionCriteria(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Decision Process</label>
                    <input
                      type="text"
                      value={decisionProcess}
                      onChange={(e) => setDecisionProcess(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={budgetConfirmed}
                      onChange={(e) => setBudgetConfirmed(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Budget Confirmed & Allocated</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={authorityConfirmed}
                      onChange={(e) => setAuthorityConfirmed(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Procurement Authority Verified</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    style={{ padding: '11px 18px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCompleteQualification}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {submitting ? 'Persisting Qualification...' : 'Complete & Qualify Lead'}
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
