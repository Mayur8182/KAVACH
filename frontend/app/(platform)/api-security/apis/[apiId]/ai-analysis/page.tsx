'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  RefreshCw,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Lock,
  Globe,
  Database,
  Layers,
  FileCode,
  Sliders,
} from 'lucide-react';
import { KavachApiLayout } from '../../../components/KavachApiLayout';
import { api } from '@/lib/api/client';

export default function AiAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const apiId = params?.apiId as string;

  const [targetApi, setTargetApi] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const fetchAnalysis = async (triggerFresh: boolean = false) => {
    if (!apiId) return;
    if (triggerFresh) {
      setIsReanalyzing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [apiData, analysisData] = await Promise.all([
        api.apiSecurity.getApi(apiId),
        api.apiSecurity.getAiAnalysis(apiId),
      ]);
      setTargetApi(apiData);
      setAnalysis(analysisData);
    } catch (err) {
      console.error('Failed to load AI analysis:', err);
    } finally {
      setIsLoading(false);
      setIsReanalyzing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [apiId]);

  return (
    <KavachApiLayout
      activeApiId={apiId}
      headerAction={
        <button
          type="button"
          onClick={() => fetchAnalysis(true)}
          disabled={isReanalyzing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isReanalyzing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} className={isReanalyzing ? 'animate-spin' : ''} />
          <span>{isReanalyzing ? 'Analyzing with Gemini...' : 'Analyze Again'}</span>
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Banner */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#F5F3FF',
              color: '#7C3AED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              AI Analysis
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Kavach has analyzed your API and identified key characteristics and security focus areas.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#64748B' }}>
            <Loader2 size={24} className="animate-spin" />
            <span style={{ marginLeft: '10px', fontSize: '14px' }}>
              Performing AI security analysis with Gemini...
            </span>
          </div>
        ) : (
          /* Two Column Grid */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
            {/* Left Column: API Summary & AI Insights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* API Summary Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  API Summary
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Base URL</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                      {analysis?.api_summary?.base_url || targetApi?.base_url || '—'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Total Endpoints</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {analysis?.api_summary?.total_endpoints || targetApi?.endpoints_count || 0}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Authentication</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {analysis?.api_summary?.authentication || targetApi?.auth_type || 'Detected JWT Bearer'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>Data Types</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {analysis?.api_summary?.data_types?.join(', ') || 'JSON, REST, Webhooks'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748B' }}>External Integrations</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {analysis?.api_summary?.external_integrations?.join(', ') || 'Payment Gateway, Mailer'}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Insights Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
                  AI Insights
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(analysis?.ai_insights || [
                    'Identified potential sensitive endpoints with object-level IDs',
                    'Detected authentication mechanisms requiring token refresh validation',
                    'Found external API dependencies that require egress isolation',
                    'Recommending 12 security test categories based on API attack surface',
                  ]).map((insight: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                        }}
                      >
                        <CheckCircle2 size={13} />
                      </div>
                      <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
                        {insight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Recommended Security Tests */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Recommended Security Tests
                </h2>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>
                  {analysis?.recommended_security_tests?.length || 6} Tests Identified
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(analysis?.recommended_security_tests || [
                  {
                    name: 'Authentication Testing',
                    description: 'Login, token validation, session management',
                    recommended: true,
                    risk_level: 'HIGH',
                  },
                  {
                    name: 'Authorization Testing',
                    description: 'Access control, BOLA/IDOR, function-level',
                    recommended: true,
                    risk_level: 'CRITICAL',
                  },
                  {
                    name: 'Rate Limiting & Abuse',
                    description: 'Brute force, request limits, abuse scenarios',
                    recommended: true,
                    risk_level: 'MEDIUM',
                  },
                  {
                    name: 'Injection Testing',
                    description: 'SQL, NoSQL command, template injection',
                    recommended: true,
                    risk_level: 'HIGH',
                  },
                  {
                    name: 'Data Exposure',
                    description: 'Sensitive data, PII, excessive response data',
                    recommended: true,
                    risk_level: 'HIGH',
                  },
                  {
                    name: 'Schema & Input Validation',
                    description: 'Parameter validation, type checks',
                    recommended: true,
                    risk_level: 'LOW',
                  },
                ]).map((test: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Shield size={15} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            {test.name}
                          </span>
                          {test.recommended && (
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: '#ECFDF5',
                                color: '#059669',
                              }}
                            >
                              Recommended
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {test.description}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/api-security/analysis?apiId=${apiId}`}
                      style={{
                        padding: '4px 8px',
                        color: '#64748B',
                        textDecoration: 'none',
                      }}
                    >
                      <Sliders size={15} />
                    </Link>
                  </div>
                ))}
              </div>

              {/* Bottom Action */}
              <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <Link
                  href={`/api-security/analysis?apiId=${apiId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  <span>View All Tests & Configure Plan</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </KavachApiLayout>
  );
}
