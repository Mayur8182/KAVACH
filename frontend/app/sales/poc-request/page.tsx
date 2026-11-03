'use client';

/**
 * /sales/poc-request — Page 27: Customer POC Request
 * Production implementation:
 * - Enterprise Proof of Concept provisioning form
 * - Scopes repositories, cloud accounts, agent runtimes, and success criteria
 * - Persists real CustomerPOC in PostgreSQL / SQLite database via /api/v1/sales/poc/request
 * - Seamless hand-off to dedicated POC Workspace
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Server,
  Cloud,
  Layers,
  Calendar,
  Building,
  Mail,
  User,
  Sparkles,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

export default function POCRequestPage() {
  const router = useRouter();

  const [company, setCompany] = useState('ADIT Technologies');
  const [useCase, setUseCase] = useState('Cloud Security');
  const [startDate, setStartDate] = useState('2026-10-20');
  const [duration, setDuration] = useState('30 Days');
  const [cloudProvider, setCloudProvider] = useState<'AWS' | 'Azure' | 'GCP'>('AWS');
  const [environment, setEnvironment] = useState('Production (Masked)');
  const [successCriteria, setSuccessCriteria] = useState('Automated detection of IAM misconfigurations, zero false-positive pull request blocks, and SOC2 evidence verification.');
  const [contactName, setContactName] = useState('Mayur Bharvad');
  const [contactEmail, setContactEmail] = useState('mayur@company.com');
  const [repos, setRepos] = useState('adit-org/core-agent-backend, adit-org/cloud-infrastructure');
  const [agentsCount, setAgentsCount] = useState(10);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pocCreated, setPocCreated] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !contactName || !contactEmail) {
      setError('Please provide company name, contact name, and business email.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const durationDays = parseInt(duration) || 30;
      const repoList = repos.split(',').map((r) => r.trim()).filter(Boolean);

      const res = await api.sales.requestPOC({
        company_name: company.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        duration_days: durationDays,
        environment_tier: environment.includes('Production') ? 'PRODUCTION_MASKED' : 'DEDICATED_SANDBOX',
        scope_repositories: repoList.length > 0 ? repoList : ['org/core-backend', 'org/infrastructure'],
        scope_cloud_accounts: [`${cloudProvider} Account (Primary Enclave)`],
        scope_agents_count: agentsCount,
      });

      setPocCreated(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit POC request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Customer POC Request" activeStepKey="poc" />

      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        {/* Top Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            <Link href="/sales" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Sales</Link>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>POC Request</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                <CheckSquare size={15} />
                <span>PAGE 27 &bull; CUSTOMER PROOF OF CONCEPT (POC) INTAKE</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Customer POC Request
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                Evaluate Kavach with your own repositories, cloud accounts, and success criteria in an isolated sandbox.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {pocCreated ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #BBF7D0', padding: '36px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#166534', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={28} color="#16A34A" />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#14532D' }}>POC Environment Provisioned!</h2>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>Your customer POC workspace is ready in the database.</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>POC ID:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{pocCreated.poc_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Account:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{pocCreated.company_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Evaluation Period:</span>
                <span style={{ fontWeight: 600 }}>{pocCreated.duration_days} Days ({new Date(pocCreated.start_date).toLocaleDateString()} - {new Date(pocCreated.end_date).toLocaleDateString()})</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                href={`/sales/poc-workspace?poc_id=${encodeURIComponent(pocCreated.poc_id)}`}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>Enter POC Workspace</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          /* POC Intake Form (Page 27 Layout) */
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Row 1: Company & Use Case */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Use Case *</label>
                  <select
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="Cloud Security">Cloud Security</option>
                    <option value="Agent MCP Governance">Agent MCP Governance</option>
                    <option value="Code SAST & Supply Chain">Code SAST & Supply Chain</option>
                    <option value="Full Unified Platform">Full Unified Platform</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Target Start Date & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Target Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="30 Days">30 Days (Standard Enterprise POC)</option>
                    <option value="45 Days">45 Days</option>
                    <option value="60 Days">60 Days (Complex Multi-Cloud)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Cloud Provider & Environment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Cloud Provider</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {(['AWS', 'Azure', 'GCP'] as const).map((cp) => (
                      <label key={cp} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="cloudProvider"
                          checked={cloudProvider === cp}
                          onChange={() => setCloudProvider(cp)}
                        />
                        <span>{cp}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Environment</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {['Production (Masked)', 'Staging', 'Demo Data', 'Other'].map((env) => (
                      <label key={env} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="envOption"
                          checked={environment === env}
                          onChange={() => setEnvironment(env)}
                        />
                        <span>{env}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>POC Lead Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>POC Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Scope Repositories */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>In-Scope Repositories (comma-separated)</label>
                <input
                  type="text"
                  value={repos}
                  onChange={(e) => setRepos(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Success Criteria */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Success Criteria</label>
                <textarea
                  rows={3}
                  placeholder="Tell us what you want to achieve in this POC..."
                  value={successCriteria}
                  onChange={(e) => setSuccessCriteria(e.target.value)}
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
                {submitting ? 'Initializing POC Enclave...' : 'Submit POC Request'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
