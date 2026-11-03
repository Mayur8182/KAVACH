'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import type { TestRunItem } from '@/types/api/qa';
import {
  Play,
  Search,
  ChevronDown,
  Clock,
  GitCommit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Terminal,
} from 'lucide-react';

export default function QATestRunsPage() {
  const [runs, setRuns] = useState<TestRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSuite, setSelectedSuite] = useState('All');
  const [selectedEnv, setSelectedEnv] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRun, setSelectedRun] = useState<TestRunItem | null>(null);

  // Run Modal
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runSuite, setRunSuite] = useState('Checkout Regression');
  const [runEnv, setRunEnv] = useState('Staging');

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listTestRuns(50);
      setRuns(res);
    } catch (err) {
      console.error('Failed to load test runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleTriggerRun = async () => {
    try {
      await api.qa.triggerTestRun({
        suite: runSuite,
        environment: runEnv,
      });
      setIsRunModalOpen(false);
      fetchRuns();
    } catch (err) {
      console.error('Failed to trigger run:', err);
    }
  };

  const filteredRuns = runs.filter((r) => {
    if (search && !r.suite.toLowerCase().includes(search.toLowerCase()) && !r.run_number.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedSuite !== 'All' && r.suite !== selectedSuite) return false;
    if (selectedEnv !== 'All' && r.environment !== selectedEnv) return false;
    if (selectedStatus !== 'All' && r.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div style={{ padding: '24px 32px', minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <QABreadcrumb
        items={[
          { label: 'Test Execution', href: '/qa/test-runs' },
          { label: 'Test Runs' },
        ]}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Test Runs
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            View and manage all test executions
          </p>
        </div>

        <button
          onClick={() => setIsRunModalOpen(true)}
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
          <Play size={14} fill="#FFFFFF" />
          <span>Run Test</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EAECF0',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search runs by number or suite..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedSuite}
            onChange={(e) => setSelectedSuite(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}
          >
            <option value="All">Suite: All</option>
            <option value="Checkout Regression">Checkout Regression</option>
            <option value="Smoke Tests">Smoke Tests</option>
            <option value="Auth-E2E">Auth-E2E</option>
            <option value="Performance/Load">Performance/Load</option>
            <option value="Regression Suite">Regression Suite</option>
          </select>

          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}
          >
            <option value="All">Environment: All</option>
            <option value="Staging">Staging</option>
            <option value="Production">Production</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}
          >
            <option value="All">Status: All</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
            <option value="Running">Running</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EAECF0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0', color: '#64748B', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px', width: '40px' }}>
                <input type="checkbox" />
              </th>
              <th style={{ padding: '12px 16px' }}># Run</th>
              <th style={{ padding: '12px 16px' }}>Commit</th>
              <th style={{ padding: '12px 16px' }}>Suite</th>
              <th style={{ padding: '12px 16px' }}>Environment</th>
              <th style={{ padding: '12px 16px' }}>Tests</th>
              <th style={{ padding: '12px 16px' }}>Pass</th>
              <th style={{ padding: '12px 16px' }}>Fail</th>
              <th style={{ padding: '12px 16px' }}>Flaky</th>
              <th style={{ padding: '12px 16px' }}>Duration</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr
                key={run.id}
                onClick={() => setSelectedRun(run)}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" />
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2563EB' }}>
                  {run.run_number}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GitCommit size={13} />
                    <span>{run.commit_hash?.slice(0, 7) || 'a1b2c3'}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                  {run.suite}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '11px', fontWeight: 500, color: '#475569' }}>
                    {run.environment}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#334155' }}>{run.total_tests}</td>
                <td style={{ padding: '12px 16px', color: '#16A34A', fontWeight: 600 }}>{run.pass_count}</td>
                <td style={{ padding: '12px 16px', color: run.fail_count > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>
                  {run.fail_count}
                </td>
                <td style={{ padding: '12px 16px', color: run.flaky_count > 0 ? '#D97706' : '#64748B' }}>
                  {run.flaky_count}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748B' }}>{run.duration_str}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: run.status === 'Passed' ? '#DCFCE7' : run.status === 'Running' ? '#EFF6FF' : '#FEE2E2',
                      color: run.status === 'Passed' ? '#15803D' : run.status === 'Running' ? '#2563EB' : '#B91C1C',
                    }}
                  >
                    {run.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-over Drawer for Run Execution Details */}
      {selectedRun && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#FFFFFF',
              height: '100%',
              boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  Run {selectedRun.run_number} — {selectedRun.suite}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Environment: {selectedRun.environment} • Branch: {selectedRun.branch}
                </div>
              </div>
              <button onClick={() => setSelectedRun(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748B" />
              </button>
            </div>

            {/* Run Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{selectedRun.total_tests}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Total</div>
              </div>
              <div style={{ backgroundColor: '#F0FDF4', padding: '10px', borderRadius: '8px', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#16A34A' }}>{selectedRun.pass_count}</div>
                <div style={{ fontSize: '11px', color: '#15803D' }}>Passed</div>
              </div>
              <div style={{ backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626' }}>{selectedRun.fail_count}</div>
                <div style={{ fontSize: '11px', color: '#B91C1C' }}>Failed</div>
              </div>
              <div style={{ backgroundColor: '#FFFBEB', padding: '10px', borderRadius: '8px', border: '1px solid #FDE68A', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#D97706' }}>{selectedRun.duration_str}</div>
                <div style={{ fontSize: '11px', color: '#B45309' }}>Duration</div>
              </div>
            </div>

            {/* Execution Console Logs */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>
                <Terminal size={15} />
                <span>Console Output</span>
              </div>
              <pre
                style={{
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  overflowY: 'auto',
                  flexGrow: 1,
                  lineHeight: '1.6',
                }}
              >
                <code>
                  {selectedRun.execution_logs?.length
                    ? selectedRun.execution_logs.join('\n')
                    : `[CI/CD] Starting runner on container pod-runner-01\n[EXEC] git checkout ${selectedRun.commit_hash}\n[EXEC] npm run test:${selectedRun.suite.toLowerCase().replace(' ', '-')}\n[INFO] Running tests...\n[OK] Test suite complete.`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Run Modal */}
      {isRunModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
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
              maxWidth: '460px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Launch Test Run</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Suite</label>
                <select value={runSuite} onChange={(e) => setRunSuite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}>
                  <option value="Checkout Regression">Checkout Regression</option>
                  <option value="Smoke Tests">Smoke Tests</option>
                  <option value="Auth-E2E">Auth-E2E</option>
                  <option value="Performance/Load">Performance/Load</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Environment</label>
                <select value={runEnv} onChange={(e) => setRunEnv(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}>
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsRunModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}>Cancel</button>
              <button onClick={handleTriggerRun} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600 }}>Execute Run</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
