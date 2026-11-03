'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { TestCaseItem } from '@/types/api/qa';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Save,
  ArrowRight,
  Search,
  Sparkles,
  Check,
  Bug,
  Upload,
} from 'lucide-react';

export default function QAManualTestingPage() {
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actualResultInput, setActualResultInput] = useState('');
  const [activeStepIndex, setActiveStepIndex] = useState(2); // Step 3 active as shown in screenshot
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Gemini Defect Modal
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);
        const res = await api.qa.listTestCases();
        setTestCases(res);
        const tc1742 = res.find((t) => t.id === 'TC-1742') || res[0];
        if (tc1742) {
          setSelectedCase(tc1742);
          setActualResultInput(tc1742.actual_result || '');
        }
      } catch (err) {
        console.error('Failed to load manual test cases:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCases();
  }, []);

  const handleSelectCase = (tc: TestCaseItem) => {
    setSelectedCase(tc);
    setActualResultInput(tc.actual_result || '');
    setActiveStepIndex(0);
    setCompletedSteps({});
  };

  const handleToggleStep = (index: number) => {
    setCompletedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
    setActiveStepIndex(index);
  };

  const handleSetResult = async (status: 'Pass' | 'Fail' | 'Blocked' | 'Skip') => {
    if (!selectedCase) return;
    try {
      await api.qa.updateStep(
        selectedCase.id,
        activeStepIndex + 1,
        actualResultInput || `Marked ${status} during manual execution session`,
        status === 'Pass' ? 'Passed' : status === 'Fail' ? 'Failed' : status === 'Blocked' ? 'Blocked' : 'Skipped'
      );
      setStatusNotification(`Recorded status: ${status}`);
      setTimeout(() => setStatusNotification(null), 3000);
      setCompletedSteps((prev) => ({ ...prev, [activeStepIndex]: status === 'Pass' }));
      if (activeStepIndex < (selectedCase.steps?.length || 1) - 1) {
        setActiveStepIndex(activeStepIndex + 1);
      }
    } catch (err) {
      console.error('Failed to record manual result:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedCase) return;
    try {
      await api.qa.updateTestCase(selectedCase.id, {
        actual_result: actualResultInput,
      });
      setStatusNotification('Progress saved successfully.');
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err) {
      console.error('Failed to save manual testing progress:', err);
    }
  };

  const filteredCases = testCases.filter((tc) =>
    tc.name.toLowerCase().includes(search.toLowerCase()) ||
    tc.id.toLowerCase().includes(search.toLowerCase())
  );

  const currentCase = selectedCase || {
    id: 'TC-1742',
    name: 'Mobile responsiveness results',
    suite: 'UI',
    priority: 'Medium',
    status: 'In Progress',
    expected_result: 'Menu should be accessible and all features should work on mobile devices.',
    actual_result: actualResultInput,
    steps: [
      { step_number: 1, action: 'Open application', expected: 'App loads on mobile viewport' },
      { step_number: 2, action: 'Navigate to homepage', expected: 'Header & menu icon render' },
      { step_number: 3, action: 'Test on mobile viewport', expected: 'No horizontal overflow detected' },
      { step_number: 4, action: 'Verify menu functionality', expected: 'Menu slides open smoothly' },
      { step_number: 5, action: 'Test checkout flow', expected: 'Payment button accessible' },
      { step_number: 6, action: "Tap on 'User account' icon", expected: 'Account drawer opens' },
    ],
  };

  return (
    <div style={{ padding: '24px 32px', minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <QABreadcrumb
        items={[
          { label: 'Test Execution', href: '/qa/test-runs' },
          { label: 'Manual Testing' },
        ]}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Manual Testing
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Execute manual test cases and record results
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {statusNotification && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A', padding: '6px 12px', borderRadius: '6px', backgroundColor: '#DCFCE7' }}>
              {statusNotification}
            </span>
          )}

          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Save size={14} />
            <span>Save</span>
          </button>

          <button
            onClick={() => {
              const curIdx = filteredCases.findIndex((c) => c.id === currentCase.id);
              if (curIdx !== -1 && curIdx < filteredCases.length - 1) {
                handleSelectCase(filteredCases[curIdx + 1]);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>Next</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 2-Panel Master-Detail Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Pane: Test Cases Queue */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #EAECF0' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
              Test Cases ({filteredCases.length})
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredCases.map((tc) => {
              const isSelected = tc.id === currentCase.id;
              return (
                <div
                  key={tc.id}
                  onClick={() => handleSelectCase(tc)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#2563EB' : '#0F172A' }}>
                      {tc.id}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#64748B' }}>
                      {tc.suite}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: isSelected ? '#1E40AF' : '#475569',
                      marginTop: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tc.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Active Execution Workspace */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Active Test Case Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EAECF0', paddingBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {currentCase.id} {currentCase.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                Suite: {currentCase.suite} • Priority: {currentCase.priority}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  border: '1px solid #BFDBFE',
                }}
              >
                In Progress
              </span>

              <button
                onClick={() => setIsGeminiOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F5F3FF',
                  border: '1px solid #DDD6FE',
                  color: '#7C3AED',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={14} />
                <span>File Defect with Gemini</span>
              </button>
            </div>
          </div>

          {/* Checklist of Test Steps */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
              Test Steps Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(currentCase.steps || []).map((step: any, index: number) => {
                const isCompleted = completedSteps[index] || false;
                const isActive = activeStepIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => handleToggleStep(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: isActive ? '#EFF6FF' : isCompleted ? '#F0FDF4' : '#F8FAFC',
                      border: `1px solid ${isActive ? '#93C5FD' : isCompleted ? '#BBF7D0' : '#E2E8F0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: isCompleted ? '#16A34A' : isActive ? '#2563EB' : '#E2E8F0',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {isCompleted ? <Check size={12} strokeWidth={3} /> : index + 1}
                      </div>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#1E40AF' : '#334155',
                        }}
                      >
                        {step.action}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      {isCompleted ? 'Done' : isActive ? 'Active Step' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expected Result Box */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
              Expected Result
            </div>
            <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>
              {currentCase.expected_result || 'Menu should be accessible and all features should work on mobile devices.'}
            </div>
          </div>

          {/* Actual Result Input */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
              Actual Result
            </div>
            <textarea
              rows={3}
              value={actualResultInput}
              onChange={(e) => setActualResultInput(e.target.value)}
              placeholder="Record actual test observation, console error, or discrepancy..."
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

          {/* Action Bar (Blocked, Fail, Pass, Skip) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid #EAECF0',
            }}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleSetResult('Blocked')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <AlertCircle size={14} />
                <span>Blocked</span>
              </button>

              <button
                onClick={() => handleSetResult('Fail')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <XCircle size={14} />
                <span>Fail</span>
              </button>

              <button
                onClick={() => handleSetResult('Pass')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Pass</span>
              </button>

              <button
                onClick={() => handleSetResult('Skip')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#64748B',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <SkipForward size={14} />
                <span>Skip</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gemini Defect Generator Modal */}
      <GeminiAIAssistant
        mode="failure-analysis"
        initialContext={{
          id: currentCase.id,
          error_message: actualResultInput || 'Manual observation discrepancy on step 3',
          expected_result: currentCase.expected_result,
          actual_result: actualResultInput,
        }}
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
      />
    </div>
  );
}
