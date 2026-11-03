'use client';

/**
 * /sales/contact — Page 21: Contact Sales
 * Production implementation:
 * - Direct enterprise communication channels (Email, Call, Chat)
 * - Message inquiry form creating real Lead and Audit records in database
 * - Dynamic assignment to Enterprise Account Executive
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MessageSquare,
  Send,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  User,
  Building,
  Headphones,
  Check,
} from 'lucide-react';
import { KavachHeader } from '@/components/navigation/SecuLayerHeader';
import { SalesSubNav } from '@/components/sales/SalesSubNav';
import { api } from '@/lib/api/client';

export default function ContactSalesPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [subject, setSubject] = useState('Enterprise Licensing & Deployment Inquiry');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !company || !message) {
      setError('Please fill in name, email, company, and your message.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.sales.contactSales({
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        team_size: '100-500',
        deployment_target: 'Dedicated VPC',
        message: `[Subject: ${subject}]\n${message.trim()}`,
      });
      setSuccessData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to deliver message. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A', display: 'flex', flexDirection: 'column', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)" }}>
      <KavachHeader />
      <SalesSubNav currentModuleTitle="Contact Sales" activeStepKey="lead" />

      <main style={{ flex: 1, maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '36px 24px 80px', boxSizing: 'border-box' }}>
        {/* Breadcrumb / Top Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
                <Headphones size={15} />
                <span>PAGE 21 &bull; DIRECT SALES CHANNELS</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 0', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Contact Sales
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                Direct contact options for sales, enterprise contracts, and architectural consultations.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Channels Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
          {/* Email Us */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', marginBottom: '4px' }}>
              <Mail size={20} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Email Us</div>
            <a href="mailto:sales@kavachsecurity.me" style={{ fontSize: '14px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
              sales@kavachsecurity.me
            </a>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: 'auto' }}>We typically reply within 1 business day.</div>
          </div>

          {/* Call Us */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', marginBottom: '4px' }}>
              <Phone size={20} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Call Us</div>
            <a href="tel:+19876543210" style={{ fontSize: '14px', fontWeight: 600, color: '#16A34A', textDecoration: 'none' }}>
              +1 98765 43210
            </a>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: 'auto' }}>Mon - Fri, 9AM - 6PM EST</div>
          </div>

          {/* Chat with Sales */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', marginBottom: '4px' }}>
              <MessageSquare size={20} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Chat with Sales</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>Available now</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: 'auto' }}>Live chat directly with an enterprise solutions architect.</div>
          </div>
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
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#14532D' }}>Inquiry Received!</h2>
                <div style={{ fontSize: '13px', color: '#166534', marginTop: '2px' }}>Your message has been assigned to an enterprise director.</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Inquiry ID:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{successData.inquiry_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Assigned Executive:</span>
                <span style={{ fontWeight: 700, color: '#2563EB' }}>{successData.assigned_executive}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>SLA Target:</span>
                <span style={{ fontWeight: 600, color: '#16A34A' }}>Within {successData.estimated_response_sla}</span>
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
                Send Another Message
              </button>
              <Link
                href="/sales/security-expert"
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
                <span>Talk to Security Expert 1:1</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          /* Form Card */
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>Send us a Message</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px' }}>
              Provide your details and requirements; our sales engineers will respond with architecture proposals.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Name *</label>
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Company *</label>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="Enterprise Licensing & Deployment Inquiry">Enterprise Licensing & Deployment Inquiry</option>
                    <option value="Proof of Concept (POC) Consultation">Proof of Concept (POC) Consultation</option>
                    <option value="Air-gapped & FedRAMP Sovereign Enclave">Air-gapped & FedRAMP Sovereign Enclave</option>
                    <option value="Pricing & Quote Request">Pricing & Quote Request</option>
                    <option value="Other Security Needs">Other Security Needs</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we help you? Describe your tech stack, cloud providers, and agent architecture..."
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
                {submitting ? 'Sending...' : 'Send Message'}
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
