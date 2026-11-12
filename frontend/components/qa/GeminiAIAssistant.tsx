'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api/client';
import { Sparkles, Bot, Check, Copy, AlertCircle, RefreshCw, X, ArrowRight } from 'lucide-react';

interface GeminiAIAssistantProps {
  mode: 'test-generator' | 'automate' | 'failure-analysis' | 'visual-explain' | 'a11y-remediate' | 'api-test-generator';
  initialContext?: Record<string, any>;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (result: any) => void;
}

export const GeminiAIAssistant: React.FC<GeminiAIAssistantProps> = ({
  mode,
  initialContext = {},
  isOpen,
  onClose,
  onApply,
}) => {
  const [prompt, setPrompt] = useState(initialContext.prompt || initialContext.name || '');
  const [suite, setSuite] = useState(initialContext.suite || 'Authentication');
  const [priority, setPriority] = useState(initialContext.priority || 'High');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'test-generator') {
        const res = await api.qa.generateTestCases({
          prompt: prompt || 'Verify user authentication session tokens and horizontal access controls',
          suite,
          priority,
          count: 3,
        });
        setResult(res);
      } else if (mode === 'automate') {
        const res = await api.qa.automateTest({
          test_case_id: initialContext.id || 'TC-1842',
          target_framework: 'playwright',
        });
        setResult(res);
      } else if (mode === 'failure-analysis') {
        const res = await api.qa.analyzeFailure({
          test_case_id: initialContext.id,
          error_message: initialContext.error_message || 'Assertion failed: expected 403 but got 200 OK',
          stack_trace: initialContext.stack_trace || 'Error: expect(received).toBe(expected)\n    at test_checkout_payment.spec.ts:42:15',
          expected_result: initialContext.expected_result,
          actual_result: initialContext.actual_result,
        });
        setResult(res);
      } else if (mode === 'visual-explain') {
        const res = await api.qa.explainVisualDiff({
          page_name: initialContext.page_name || 'Checkout page',
          differences_count: initialContext.differences_count || 2,
          bounding_boxes: initialContext.diff_regions || [],
        });
        setResult(res);
      } else if (mode === 'a11y-remediate') {
        const res = await api.qa.remediateA11y({
          violation_rule: initialContext.rule || 'color-contrast',
          element_snippet: initialContext.element || '<span class="text-muted">Terms</span>',
          impact: initialContext.impact || 'critical',
        });
        setResult(res);
      } else if (mode === 'api-test-generator') {
        const res = await api.qa.generateApiTests({
          endpoint_path: initialContext.path || '/api/v1/payments',
          method: initialContext.method || 'POST',
        });
        setResult(res);
      }
    } catch (err: any) {
      setError(err?.message || 'Gemini processing failed. Retrying with deterministic engine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTitle = () => {
    switch (mode) {
      case 'test-generator': return 'Generate Test Cases with Gemini';
      case 'automate': return 'Generate Playwright Automation with Gemini';
      case 'failure-analysis': return 'Gemini Root Cause & Bug Diagnostic';
      case 'visual-explain': return 'Gemini Visual Regression Analysis';
      case 'a11y-remediate': return 'Gemini Accessibility Remediation';
      case 'api-test-generator': return 'Gemini API Security & Fuzzing Synthesizer';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #EAECF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                {getTitle()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Powered by Google Gemini 2.5 • Deterministic Verification Guard
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'test-generator' && (
            <>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  What user story or system behavior would you like to test?
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Checkout flow with stripe 3D secure, coupon discount code, and out-of-stock validation..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Target Test Suite
                  </label>
                  <select
                    value={suite}
                    onChange={(e) => setSuite(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="Authentication">Authentication</option>
                    <option value="Payments">Payments</option>
                    <option value="Orders">Orders</option>
                    <option value="Admin">Admin</option>
                    <option value="UI">UI</option>
                    <option value="Search">Search</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {mode === 'failure-analysis' && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '4px' }}>
                Error Diagnostics Input:
              </div>
              <div style={{ fontSize: '12px', color: '#B91C1C', fontFamily: 'monospace' }}>
                {initialContext.error_message || 'Assertion failed: expected 403 but got 200 OK'}
              </div>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={16} color="#DC2626" />
              <span style={{ fontSize: '12px', color: '#991B1B' }}>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>
                  <Check size={16} />
                  <span>{result.ai_engine || 'Gemini Quality Engineering Engine'}</span>
                </div>
                {result.script && (
                  <button
                    onClick={() => handleCopy(result.script)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                )}
              </div>

              {/* Mode Specific Results */}
              {result.test_cases && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    Generated {result.test_cases.length} Production Test Cases:
                  </div>
                  {result.test_cases.map((tc: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{tc.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                          {tc.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{tc.description}</div>
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>
                        Expected: {tc.expected_result}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.script && (
                <pre
                  style={{
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    overflowX: 'auto',
                    maxHeight: '320px',
                    margin: 0,
                  }}
                >
                  <code>{result.script}</code>
                </pre>
              )}

              {result.root_cause && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>Root Cause:</div>
                    <div style={{ fontSize: '13px', color: '#1E293B', marginTop: '2px' }}>{result.root_cause}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>Remediation Recommendation:</div>
                    <div style={{ fontSize: '13px', color: '#1E293B', marginTop: '2px' }}>{result.remediation_suggestion}</div>
                  </div>
                  {result.fix_code_snippet && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>Suggested Code Patch:</div>
                      <pre style={{ backgroundColor: '#0F172A', color: '#4ADE80', padding: '10px', borderRadius: '6px', fontSize: '11px', margin: '4px 0 0 0' }}>
                        <code>{result.fix_code_snippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {result.explanation && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>AI Assessment:</div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: '1.5' }}>
                    {typeof result.explanation === 'object' && result.explanation !== null
                      ? (result.explanation.summary || result.explanation.vulnerability_analysis || String(result.explanation))
                      : result.explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #EAECF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExecute}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Gemini Reasoning...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{result ? 'Re-Generate' : 'Generate with Gemini'}</span>
                </>
              )}
            </button>

            {result && onApply && (
              <button
                onClick={() => {
                  onApply(result);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Apply to Workspace</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
