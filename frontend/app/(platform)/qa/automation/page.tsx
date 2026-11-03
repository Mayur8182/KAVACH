'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { AutomationMetricResponse, TestRunItem } from '@/types/api/qa';
import {
  Play,
  Bot,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Layers,
  FileCode2,
  Terminal,
  RefreshCw,
} from 'lucide-react';

export default function QAAutomationPage() {
  const [data, setData] = useState<AutomationMetricResponse | null>(null);
  const [runs, setRuns] = useState<TestRunItem[]>([]);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Tests' | 'Runs' | 'Artifacts' | 'Configuration'>('Overview');
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [metricRes, runsRes] = await Promise.all([
          api.qa.getAutomation(),
          api.qa.listTestRuns(5),
        ]);
        setData(metricRes);
        setRuns(runsRes);
      } catch (err) {
        console.error('Failed to load automation metrics:', err);
      }
    };
    load();
  }, []);

  const handleRunSuite = async () => {
    setIsRunning(true);
    try {
      await api.qa.triggerTestRun({
        suite: 'Playwright E2E Suite',
        environment: 'Staging',
      });
      const updatedRuns = await api.qa.listTestRuns(5);
      setRuns(updatedRuns);
    } catch (err) {
      console.error('Failed to run suite:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const metric = data || {
    framework: 'Playwright',
    total_tests: 4521,
    pass_rate: 95.7,
    failed_tests: 112,
    flaky_tests: 24,
    browsers: {
      Chromium: 98.0,
      Firefox: 94.0,
      WebKit: 91.0,
      Edge: 96.0,
    },
    trend_history: [
      { date: 'Apr 21', passed: 4120, failed: 140, flaky: 35 },
      { date: 'Apr 22', passed: 4200, failed: 130, flaky: 30 },
      { date: 'Apr 23', passed: 4290, failed: 125, flaky: 28 },
      { date: 'Apr 24', passed: 4350, failed: 120, flaky: 26 },
      { date: 'Apr 25', passed: 4410, failed: 115, flaky: 25 },
      { date: 'Apr 26', passed: 4480, failed: 114, flaky: 24 },
      { date: 'Apr 27', passed: 4521, failed: 112, flaky: 24 },
    ],
  };

  const tabs: Array<'Overview' | 'Tests' | 'Runs' | 'Artifacts' | 'Configuration'> = [
    'Overview',
    'Tests',
    'Runs',
    'Artifacts',
    'Configuration',
  ];

  return (
    <div style={{ padding: '24px 32px', minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <QABreadcrumb
        items={[
          { label: 'Automation', href: '/qa/automation' },
          { label: 'Playwright' },
        ]}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Playwright
            </h1>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
              v1.44.0
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Manage Playwright test execution and results
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsGeminiOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} />
            <span>Generate Tests with Gemini</span>
          </button>

          <button
            onClick={handleRunSuite}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="#FFFFFF" />}
            <span>{isRunning ? 'Running Suite...' : 'Run Suite'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
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
                <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', backgroundColor: '#2563EB' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '18px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Total Tests</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>{metric.total_tests.toLocaleString()}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>+12%</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '18px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Pass Rate</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>{metric.pass_rate}%</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>+2.3%</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '18px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Failed Tests</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>{metric.failed_tests}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>-18%</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '18px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Flaky Tests</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>{metric.flaky_tests}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>-32%</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Trend Stacked Bars & Browsers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '24px' }}>
        {/* Test Results Trend (Stacked Bar Chart) */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Test Results Trend</div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#3B82F6' }} />
                <span style={{ color: '#64748B' }}>Passed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} />
                <span style={{ color: '#64748B' }}>Failed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F59E0B' }} />
                <span style={{ color: '#64748B' }}>Flaky</span>
              </div>
            </div>
          </div>

          {/* SVG Stacked Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', padding: '0 10px' }}>
            {metric.trend_history.map((t, idx) => {
              const total = t.passed + t.failed + t.flaky;
              const passedH = Math.round((t.passed / total) * 140);
              const failedH = Math.max(4, Math.round((t.failed / total) * 140));
              const flakyH = Math.max(3, Math.round((t.flaky / total) * 140));

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '40px' }}>
                  <div style={{ width: '24px', height: '140px', display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: `${passedH}px`, backgroundColor: '#3B82F6' }} />
                    <div style={{ height: `${flakyH}px`, backgroundColor: '#F59E0B' }} />
                    <div style={{ height: `${failedH}px`, backgroundColor: '#EF4444' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>{t.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Browsers Breakdown Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '18px' }}>
            Browsers
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(metric.browsers).map(([browser, rate]) => (
              <div key={browser}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{browser}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{rate}%</span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${rate}%`,
                      backgroundColor: rate >= 95 ? '#10B981' : '#3B82F6',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
          Recent Runs
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0', color: '#64748B', fontWeight: 600 }}>
              <th style={{ padding: '10px 16px' }}># Run</th>
              <th style={{ padding: '10px 16px' }}>Suite</th>
              <th style={{ padding: '10px 16px' }}>Tests</th>
              <th style={{ padding: '10px 16px' }}>Pass</th>
              <th style={{ padding: '10px 16px' }}>Fail</th>
              <th style={{ padding: '10px 16px' }}>Flaky</th>
              <th style={{ padding: '10px 16px' }}>Duration</th>
              <th style={{ padding: '10px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2563EB' }}>{r.run_number}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{r.suite}</td>
                <td style={{ padding: '12px 16px', color: '#334155' }}>{r.total_tests}</td>
                <td style={{ padding: '12px 16px', color: '#16A34A', fontWeight: 600 }}>{r.pass_count}</td>
                <td style={{ padding: '12px 16px', color: r.fail_count > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>{r.fail_count}</td>
                <td style={{ padding: '12px 16px', color: r.flaky_count > 0 ? '#D97706' : '#64748B' }}>{r.flaky_count}</td>
                <td style={{ padding: '12px 16px', color: '#64748B' }}>{r.duration_str}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: r.status === 'Passed' ? '#DCFCE7' : '#FEE2E2',
                      color: r.status === 'Passed' ? '#15803D' : '#B91C1C',
                    }}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gemini AI Modal */}
      <GeminiAIAssistant
        mode="test-generator"
        initialContext={{ suite: 'Playwright E2E' }}
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
      />
    </div>
  );
}
