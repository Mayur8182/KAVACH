'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { TestCaseItem, TestCaseStep } from '@/types/api/qa';
import {
  Edit3,
  Play,
  Bot,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Tag,
  User,
  Shield,
  FileCode2,
  Copy,
  Check,
  Bug,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function TestCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tcId = (params?.id as string) || 'TC-1842';

  const [testCase, setTestCase] = useState<TestCaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Steps' | 'Automation' | 'Runs' | 'Defects' | 'AI Analysis'>('Overview');
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [geminiMode, setGeminiMode] = useState<'automate' | 'failure-analysis'>('automate');
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const fetchTestCase = async () => {
    try {
      setLoading(true);
      const res = await api.qa.getTestCase(tcId);
      setTestCase(res);
    } catch (err) {
      console.error('Failed to load test case:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestCase();
  }, [tcId]);

  const handleStepStatusToggle = async (stepNum: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Passed' ? 'Failed' : 'Passed';
    try {
      await api.qa.updateStep(
        tcId,
        stepNum,
        nextStatus === 'Passed' ? 'Verified successfully' : 'Assertion failed: expected HTTP 403 but got HTTP 200',
        nextStatus
      );
      fetchTestCase();
    } catch (err) {
      console.error('Failed to update step:', err);
    }
  };

  const handleRunTest = async () => {
    setIsRunning(true);
    try {
      await api.qa.runTestCase(tcId);
      fetchTestCase();
    } catch (err) {
      console.error('Failed to run test:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback defaults matching screenshot
  const tc = testCase || {
    id: 'TC-1842',
    name: "Verify user cannot access another user's invoice",
    suite: 'Authentication',
    priority: 'High' as const,
    type: 'API' as const,
    status: 'Active' as const,
    automation: 'Playwright' as const,
    owner: 'Alice Johnson',
    last_run: 'Apr 27, 2026, 10:24 AM',
    pass_rate: 98.0,
    description: "Verify that a user cannot access another user's invoice through the API. The endpoint should return 403 Forbidden when accessing a different user's data.",
    expected_result: 'HTTP 403 Forbidden',
    actual_result: 'HTTP 200 OK (Vulnerable to IDOR)',
    tags: ['security', 'api', 'auth', 'idor'],
    steps: [
      { step_number: 1, action: 'Login as User 1 and obtain bearer token', expected: 'Valid JWT auth token returned', actual: 'Valid token received', status: 'Passed' as const },
      { step_number: 2, action: 'Request invoice for User 2 via GET /api/v1/invoices/inv-user2', expected: 'HTTP 403 Forbidden', actual: 'HTTP 200 OK (returned invoice data)', status: 'Failed' as const },
    ],
    automation_script: `import { test, expect } from '@playwright/test';

test.describe('TC-1842: IDOR Prevention on Invoices API', () => {
  test('User 1 should be forbidden from accessing User 2 invoice', async ({ request }) => {
    // 1. Authenticate as User 1
    const authRes = await request.post('/api/v1/auth/token', {
      data: { username: 'user1@example.com', password: 'ValidPassword123!' }
    });
    expect(authRes.status()).toBe(200);
    const { access_token } = await authRes.json();

    // 2. Attempt fetching User 2's invoice
    const invRes = await request.get('/api/v1/invoices/inv-user2-9082', {
      headers: { Authorization: \`Bearer \${access_token}\` }
    });

    // Strict security assertion: Must be 403 Forbidden
    expect(invRes.status()).toBe(403);
  });
});`,
  };

  const tabs: Array<'Overview' | 'Steps' | 'Automation' | 'Runs' | 'Defects' | 'AI Analysis'> = [
    'Overview',
    'Steps',
    'Automation',
    'Runs',
    'Defects',
    'AI Analysis',
  ];

  return (
    <div style={{ padding: '24px 32px', minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <QABreadcrumb
        items={[
          { label: 'Test Management', href: '/qa/test-cases' },
          { label: 'Test Cases', href: '/qa/test-cases' },
          { label: tc.id },
        ]}
      />

      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              {tc.id} {tc.name}
            </h1>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            {tc.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  border: '1px solid #DBEAFE',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => alert('Edit mode active. Change fields in place.')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Edit3 size={14} />
            <span>Edit</span>
          </button>

          <button
            onClick={handleRunTest}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="#FFFFFF" />}
            <span>{isRunning ? 'Executing...' : 'Run Test'}</span>
          </button>

          <button
            onClick={() => {
              setGeminiMode('automate');
              setIsGeminiOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} />
            <span>Automate</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 0',
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563EB' : '#64748B',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {tab}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#2563EB',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview Tab */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
          {/* Left Column: Test Case Details Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EAECF0',
              padding: '20px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
              Test Case Details
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Name
                </span>
                <span style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                  {tc.name}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Suite
                </span>
                <span style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                  {tc.suite}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Priority
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                  }}
                >
                  {tc.priority}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Type
                </span>
                <span style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                  {tc.type}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Status
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                  }}
                >
                  {tc.status}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Owner
                </span>
                <span style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                  {tc.owner}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Last updated
                </span>
                <span style={{ color: '#64748B', marginTop: '2px', display: 'block' }}>
                  {tc.last_run}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Description, Expected, Actual & Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Description Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #EAECF0',
                padding: '20px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Description
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                {tc.description}
              </p>
            </div>

            {/* Expected vs Actual Result Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #EAECF0',
                  padding: '16px 20px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Expected Result
                </div>
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {tc.expected_result}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #EAECF0',
                  padding: '16px 20px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Actual Result
                </div>
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#B91C1C',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {tc.actual_result}
                </div>
              </div>
            </div>

            {/* Steps Table Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #EAECF0',
                padding: '20px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Execution Steps ({tc.steps?.length || 0})
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Click step status icon to toggle Pass / Fail
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(tc.steps || []).map((step, idx) => {
                  const isPassed = step.status === 'Passed';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#E2E8F0',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {step.step_number}
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            {step.action}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Expected: {step.expected}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {step.actual && (
                          <span style={{ fontSize: '11px', color: isPassed ? '#15803D' : '#B91C1C', fontWeight: 500 }}>
                            {step.actual}
                          </span>
                        )}
                        <button
                          onClick={() => handleStepStatusToggle(step.step_number, step.status)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {isPassed ? (
                            <CheckCircle2 size={18} color="#16A34A" />
                          ) : (
                            <XCircle size={18} color="#DC2626" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Automation Tab */}
      {activeTab === 'Automation' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Playwright TypeScript Automation Script
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Automated end-to-end test specification bound to {tc.id}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleCopyCode(tc.automation_script || '')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy Script'}</span>
              </button>

              <button
                onClick={() => {
                  setGeminiMode('automate');
                  setIsGeminiOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={14} />
                <span>Re-Synthesize with Gemini</span>
              </button>
            </div>
          </div>

          <pre
            style={{
              backgroundColor: '#0F172A',
              color: '#F8FAFC',
              padding: '18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: 'Consolas, Monaco, monospace',
              overflowX: 'auto',
              lineHeight: '1.5',
            }}
          >
            <code>{tc.automation_script}</code>
          </pre>
        </div>
      )}

      {/* Tab 3: AI Analysis Tab */}
      {activeTab === 'AI Analysis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EAECF0',
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Gemini Root Cause & Security Failure Diagnosis
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Diagnosed using Google Gemini 2.5 context reasoning
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
                  Detected Vulnerability: Broken Object Level Authorization (BOLA / IDOR)
                </div>
                <p style={{ fontSize: '12.5px', color: '#B91C1C', marginTop: '4px', margin: 0, lineHeight: '1.5' }}>
                  The endpoint <code>GET /api/v1/invoices/:id</code> queries the database solely by invoice primary key without asserting that <code>invoice.organization_id === req.user.organization_id</code>. An authenticated attacker can access any customer invoice by sequential ID enumeration.
                </p>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Suggested Remediation Code Patch:
                </div>
                <pre
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#4ADE80',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontFamily: 'Consolas, Monaco, monospace',
                  }}
                >
                  <code>{`// In backend/app/api/invoices.py
query = select(Invoice).where(
    Invoice.id == invoice_id,
    Invoice.organization_id == current_user.organization_id  # <--- Tenancy check enforced
)
invoice = (await db.execute(query)).scalar_one_or_none()
if not invoice:
    raise HTTPException(status_code=403, detail="Forbidden: Resource belongs to another organization.")`}</code>
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => {
                    setGeminiMode('failure-analysis');
                    setIsGeminiOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Re-analyze with Gemini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Defects Tab */}
      {activeTab === 'Defects' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            padding: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Linked Defects (1)
            </div>
            <Link
              href="/qa/defects"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Bug size={14} />
              <span>View in Defects Tracker</span>
            </Link>
          </div>

          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#991B1B' }}>
                DEF-101: IDOR vulnerability allows viewing another user invoice via direct URL
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                Critical
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '6px', margin: 0 }}>
              Reproduction: Send GET request to /api/v1/invoices/inv-user2 with User 1 token. Server returns 200 OK with sensitive invoice metadata.
            </p>
          </div>
        </div>
      )}

      {/* Gemini Modal */}
      <GeminiAIAssistant
        mode={geminiMode}
        initialContext={tc}
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        onApply={() => {
          fetchTestCase();
        }}
      />
    </div>
  );
}
