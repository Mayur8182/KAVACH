'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { QAOverviewMetricsResponse, TestRunItem, FailureItem } from '@/types/api/qa';
import {
  Play,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Shield,
  Bug,
  AlertOctagon,
  Star,
  ListChecks,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react';

export default function QAOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<QAOverviewMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [selectedEnv, setSelectedEnv] = useState('Production');
  const [selectedRange, setSelectedRange] = useState('Last 30 days');

  // New Test Case Form State
  const [newTcName, setNewTcName] = useState('');
  const [newTcSuite, setNewTcSuite] = useState('Authentication');
  const [newTcPriority, setNewTcPriority] = useState('High');
  const [newTcType, setNewTcType] = useState('Functional');
  const [newTcDesc, setNewTcDesc] = useState('');

  // Run Test State
  const [runSuite, setRunSuite] = useState('Checkout Regression');
  const [runEnv, setRunEnv] = useState('Staging');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.qa.overview();
      setData(res);
    } catch (err) {
      console.error('Failed to load QA overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTcName.trim()) return;
    try {
      await api.qa.createTestCase({
        name: newTcName,
        suite: newTcSuite,
        priority: newTcPriority,
        type: newTcType,
        description: newTcDesc,
        steps: [
          { step_number: 1, action: 'Initialize user session', expected: 'Session active', status: 'Pending' },
          { step_number: 2, action: 'Perform action under test', expected: 'Action completes with 200 OK', status: 'Pending' },
        ],
      });
      setIsCreateModalOpen(false);
      setNewTcName('');
      setNewTcDesc('');
      fetchData();
    } catch (err) {
      console.error('Failed to create test case:', err);
    }
  };

  const handleTriggerRun = async () => {
    try {
      await api.qa.triggerTestRun({
        suite: runSuite,
        environment: runEnv,
      });
      setIsRunModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to trigger run:', err);
    }
  };

  // Default fallback if loading or offline
  const overview = data || {
    total_tests: 12842,
    total_tests_change: 4.2,
    pass_rate: 96.8,
    pass_rate_change: 1.1,
    flaky_tests: 143,
    flaky_tests_change: -32.0,
    automation_rate: 82.4,
    automation_rate_change: 5.1,
    coverage: 87.3,
    coverage_change: 2.1,
    defects: 238,
    defects_change: -8.6,
    critical_bugs: 7,
    critical_bugs_change: 41.7,
    quality_score: 91,
    quality_score_change: 3.2,
    execution_health: {
      total: 12642,
      passed: 12431,
      passed_pct: 96.8,
      failed: 271,
      failed_pct: 2.1,
      flaky: 86,
      flaky_pct: 0.7,
      skipped: 54,
      skipped_pct: 0.4,
    },
    execution_trends: [
      { date: 'Apr 20', pass_rate: 94.2, automation_rate: 78.0 },
      { date: 'Apr 21', pass_rate: 95.0, automation_rate: 79.2 },
      { date: 'Apr 22', pass_rate: 95.8, automation_rate: 80.1 },
      { date: 'Apr 23', pass_rate: 96.1, automation_rate: 81.0 },
      { date: 'Apr 24', pass_rate: 95.5, automation_rate: 81.5 },
      { date: 'Apr 25', pass_rate: 96.4, automation_rate: 82.0 },
      { date: 'Apr 26', pass_rate: 96.6, automation_rate: 82.2 },
      { date: 'Apr 27', pass_rate: 96.8, automation_rate: 82.4 },
    ],
    quality_hotspots: [
      { component: 'Checkout', risk_pct: 10.4, color: '#EF4444' },
      { component: 'Authentication', risk_pct: 8.9, color: '#F97316' },
      { component: 'User Management', risk_pct: 6.2, color: '#EAB308' },
      { component: 'API Gateway', risk_pct: 4.8, color: '#3B82F6' },
      { component: 'Payments', risk_pct: 4.7, color: '#10B981' },
    ],
    recent_runs: [
      { id: 'RUN-241', run_number: '#241', suite: 'Checkout Regression', environment: 'Staging', total_tests: 431, pass_count: 421, fail_count: 7, duration_str: '18m', status: 'Failed' },
      { id: 'RUN-240', run_number: '#240', suite: 'API Smoke', environment: 'Production', total_tests: 82, pass_count: 82, fail_count: 0, duration_str: '4m', status: 'Passed' },
      { id: 'RUN-239', run_number: '#239', suite: 'Auth-E2E', environment: 'Staging', total_tests: 146, pass_count: 142, fail_count: 4, duration_str: '9m', status: 'Failed' },
      { id: 'RUN-238', run_number: '#238', suite: 'Performance/Load', environment: 'Production', total_tests: 1200, pass_count: 1163, fail_count: 37, duration_str: '42m', status: 'Failed' },
      { id: 'RUN-237', run_number: '#237', suite: 'Regression Suite', environment: 'Staging', total_tests: 612, pass_count: 598, fail_count: 14, duration_str: '24m', status: 'Passed' },
    ],
    recent_failures: [
      { id: '1', file_name: 'test_checkout_payment.spec.ts', suite: 'Checkout', component: 'Payments', error_message: 'Timeout 10000ms', time_ago: '2m ago' },
      { id: '2', file_name: 'test_user_login_utf8.spec.ts', suite: 'Authentication', component: 'Login', error_message: 'Expected 403 got 200', time_ago: '1h ago' },
      { id: '3', file_name: 'test_api_orders.ts', suite: 'Orders', component: 'API', error_message: 'Rate limit error', time_ago: '3h ago' },
      { id: '4', file_name: 'test_admin_user_creation.spec.ts', suite: 'Admin', component: 'Users', error_message: 'Missing permissions', time_ago: '5h ago' },
      { id: '5', file_name: 'test_mobile_checkout.spec.ts', suite: 'Checkout', component: 'Mobile', error_message: 'Button offscreen', time_ago: '6h ago' },
    ],
  };

  const metricCards = [
    {
      title: 'Total Tests',
      value: overview.total_tests.toLocaleString(),
      change: `${overview.total_tests_change > 0 ? '+' : ''}${overview.total_tests_change}%`,
      isPositive: true,
      icon: ListChecks,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
    },
    {
      title: 'Pass Rate',
      value: `${overview.pass_rate}%`,
      change: `${overview.pass_rate_change > 0 ? '+' : ''}${overview.pass_rate_change}%`,
      isPositive: true,
      icon: CheckCircle2,
      iconColor: '#16A34A',
      iconBg: '#F0FDF4',
    },
    {
      title: 'Flaky Tests',
      value: overview.flaky_tests.toString(),
      change: `${overview.flaky_tests_change}%`,
      isPositive: overview.flaky_tests_change < 0,
      icon: AlertTriangle,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
    },
    {
      title: 'Automation',
      value: `${overview.automation_rate}%`,
      change: `+${overview.automation_rate_change}%`,
      isPositive: true,
      icon: Bot,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
    },
    {
      title: 'Coverage',
      value: `${overview.coverage}%`,
      change: `+${overview.coverage_change}%`,
      isPositive: true,
      icon: Shield,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
    },
    {
      title: 'Defects',
      value: overview.defects.toString(),
      change: `${overview.defects_change}%`,
      isPositive: true,
      icon: Bug,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
    },
    {
      title: 'Critical Bugs',
      value: overview.critical_bugs.toString(),
      change: `+${overview.critical_bugs_change}%`,
      isPositive: false,
      icon: AlertOctagon,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
    },
    {
      title: 'Quality Score',
      value: overview.quality_score.toString(),
      change: `+${overview.quality_score_change}%`,
      isPositive: true,
      icon: Star,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
    },
  ];

  const quickAccessItems = [
    { title: 'Test Cases', desc: 'Manage test cases repository', href: '/qa/test-cases', icon: ListChecks, color: '#2563EB' },
    { title: 'Test Runs', desc: 'Track and execute runs', href: '/qa/test-runs', icon: Play, color: '#16A34A' },
    { title: 'Defects', desc: 'Triage and resolve bugs', href: '/qa/defects', icon: Bug, color: '#DC2626' },
    { title: 'Test Suites', desc: 'Organized test suites', href: '/qa/test-suites', icon: Layers, color: '#7C3AED' },
    { title: 'Test Plans', desc: 'Plan and schedule milestones', href: '/qa/test-plans', icon: FileText, color: '#EA580C' },
    { title: 'API Testing', desc: 'Validate contracts & fuzzing', href: '/qa/api-testing', icon: ExternalLink, color: '#0284C7' },
  ];

  return (
    <div style={{ padding: '24px 32px', minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <QABreadcrumb items={[{ label: 'Overview' }]} />

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Quality Engineering
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Ensure quality at every stage of the software lifecycle
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
          >
            <Play size={14} fill="#FFFFFF" />
            <span>Run Test</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
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
            onMouseOver={(e) => (e.currentTarget.style.borderColor = '#94A3B8')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
          >
            <Plus size={15} />
            <span>Create Test</span>
          </button>

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
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#DBEAFE')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
          >
            <Sparkles size={14} color="#2563EB" />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>

      {/* Filter Selectors Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{
              appearance: 'none',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 32px 6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="All Projects">All Projects</option>
            <option value="Storefront Web">Storefront Web</option>
            <option value="Backend Core API">Backend Core API</option>
          </select>
          <ChevronDown size={14} color="#64748B" style={{ position: 'absolute', right: '10px', top: '9px', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            style={{
              appearance: 'none',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 32px 6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
            <option value="Development">Development</option>
          </select>
          <ChevronDown size={14} color="#64748B" style={{ position: 'absolute', right: '10px', top: '9px', pointerEvents: 'none' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            style={{
              appearance: 'none',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 32px 6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="Last 30 days">Last 30 days</option>
            <option value="Last 14 days">Last 14 days</option>
            <option value="Last 7 days">Last 7 days</option>
          </select>
          <ChevronDown size={14} color="#64748B" style={{ position: 'absolute', right: '10px', top: '9px', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* 8 KPI Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #EAECF0',
                padding: '16px 20px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                  {card.title}
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: card.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} color={card.iconColor} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  {card.value}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: card.isPositive ? '#16A34A' : '#DC2626',
                  }}
                >
                  {card.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Execution Health Donut, Execution Trend, and Hotspots */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 280px',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* 1. Test Execution Health (Donut Chart) */}
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
            Test Execution Health
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {/* SVG Donut Chart */}
            <div style={{ position: 'relative', width: '150px', height: '150px' }}>
              <svg width="150" height="150" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E2E8F0" strokeWidth="12" />
                {/* Passed segment (96.8%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray={`${96.8 * 2.51} 251.2`}
                  strokeDashoffset="62.8"
                  strokeLinecap="round"
                />
                {/* Failed segment (2.1%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#EF4444"
                  strokeWidth="12"
                  strokeDasharray={`${2.1 * 2.51} 251.2`}
                  strokeDashoffset={`${62.8 - 96.8 * 2.51}`}
                  strokeLinecap="round"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
                  {overview.execution_health.total.toLocaleString()}
                </span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Total Tests</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ color: '#475569' }}>Passed</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{overview.execution_health.passed.toLocaleString()}</span>
                  <span style={{ color: '#64748B' }}>{overview.execution_health.passed_pct}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <span style={{ color: '#475569' }}>Failed</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{overview.execution_health.failed}</span>
                  <span style={{ color: '#64748B' }}>{overview.execution_health.failed_pct}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <span style={{ color: '#475569' }}>Flaky</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{overview.execution_health.flaky}</span>
                  <span style={{ color: '#64748B' }}>{overview.execution_health.flaky_pct}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                  <span style={{ color: '#475569' }}>Skipped</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{overview.execution_health.skipped}</span>
                  <span style={{ color: '#64748B' }}>{overview.execution_health.skipped_pct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Test Execution Trend (SVG Chart) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            padding: '20px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              Test Execution Trend
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '3px', backgroundColor: '#2563EB', borderRadius: '2px' }} />
                <span style={{ color: '#64748B' }}>Pass Rate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '3px', backgroundColor: '#10B981', borderRadius: '2px' }} />
                <span style={{ color: '#64748B' }}>Automation Rate</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Area Curve */}
          <div style={{ flexGrow: 1, minHeight: '160px', position: 'relative' }}>
            <svg width="100%" height="160" viewBox="0 0 500 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#E2E8F0" strokeWidth="1" />

              {/* Pass Rate Area & Line */}
              <path
                d="M 0 60 Q 70 50, 140 40 T 280 35 T 420 28 L 500 24 L 500 140 L 0 140 Z"
                fill="url(#blueGrad)"
              />
              <path
                d="M 0 60 Q 70 50, 140 40 T 280 35 T 420 28 L 500 24"
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
              />

              {/* Automation Rate Line */}
              <path
                d="M 0 110 Q 70 102, 140 95 T 280 88 T 420 84 L 500 80"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
              />

              {/* Points */}
              <circle cx="500" cy="24" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="500" cy="80" r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
            </svg>

            {/* Date labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
              {overview.execution_trends.map((t, idx) => (
                <span key={idx}>{t.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Quality Hotspots */}
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
            Quality Hotspots
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {overview.quality_hotspots.map((h, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{h.component}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{h.risk_pct}%</span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${h.risk_pct * 4}%`,
                      backgroundColor: h.color,
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Runs, Recent Failures, and Quick Access */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Recent Test Runs Table */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #EAECF0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Recent Test Runs</span>
            <Link href="/qa/test-runs" style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
              View all
            </Link>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '10px 16px' }}># Run</th>
                <th style={{ padding: '10px 16px' }}>Suite</th>
                <th style={{ padding: '10px 16px' }}>Environment</th>
                <th style={{ padding: '10px 16px' }}>Tests</th>
                <th style={{ padding: '10px 16px' }}>Pass</th>
                <th style={{ padding: '10px 16px' }}>Fail</th>
                <th style={{ padding: '10px 16px' }}>Duration</th>
                <th style={{ padding: '10px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {overview.recent_runs.map((run, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2563EB' }}>
                    <Link href={`/qa/test-runs`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                      {run.run_number}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                    {run.suite}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '11px', fontWeight: 500 }}>
                      {run.environment}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>{run.total_tests}</td>
                  <td style={{ padding: '12px 16px', color: '#16A34A', fontWeight: 600 }}>{run.pass_count}</td>
                  <td style={{ padding: '12px 16px', color: run.fail_count > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>{run.fail_count}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{run.duration_str}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: run.status === 'Passed' ? '#DCFCE7' : '#FEE2E2',
                        color: run.status === 'Passed' ? '#15803D' : '#B91C1C',
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

        {/* Recent Failures Card */}
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
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Recent Failures</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '999px' }}>
              {overview.recent_failures.length} active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {overview.recent_failures.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FEE2E2',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626', marginTop: '5px', flexShrink: 0 }} />
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', wordBreak: 'break-all' }}>
                    {f.file_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#7F1D1D', marginTop: '2px' }}>
                    {f.suite} • {f.component}
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: '#991B1B', whiteSpace: 'nowrap' }}>{f.time_ago}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
          Quick Access
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '12px',
          }}
        >
          {quickAccessItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #EAECF0',
                  padding: '14px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#BFDBFE';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#EAECF0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: `${item.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={15} color={item.color} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{item.title}</span>
                <span style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.2' }}>{item.desc}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 1. Modal: Run Test Suite */}
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
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Trigger Test Run</div>
              <button onClick={() => setIsRunModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748B" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Select Test Suite
                </label>
                <select
                  value={runSuite}
                  onChange={(e) => setRunSuite(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="Checkout Regression">Checkout Regression (431 tests)</option>
                  <option value="API Smoke">API Smoke (82 tests)</option>
                  <option value="Auth-E2E">Auth-E2E (146 tests)</option>
                  <option value="Performance/Load">Performance/Load (1,200 tests)</option>
                  <option value="Full Regression Suite">Full Regression Suite (2,450 tests)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Target Environment
                </label>
                <select
                  value={runEnv}
                  onChange={(e) => setRunEnv(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                >
                  <option value="Staging">Staging (k8s-stage-us-east-1)</option>
                  <option value="Production">Production (k8s-prod-us-east-1)</option>
                  <option value="Development">Development (Localhost)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsRunModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerRun}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
              >
                Launch Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Create Test Case */}
      {isCreateModalOpen && (
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
              maxWidth: '560px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Create New Test Case</div>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748B" />
              </button>
            </div>

            <form onSubmit={handleCreateTestCase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Test Case Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify user cannot access another user's invoice"
                  value={newTcName}
                  onChange={(e) => setNewTcName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Suite</label>
                  <select value={newTcSuite} onChange={(e) => setNewTcSuite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <option value="Authentication">Authentication</option>
                    <option value="Payments">Payments</option>
                    <option value="Orders">Orders</option>
                    <option value="Admin">Admin</option>
                    <option value="UI">UI</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Priority</label>
                  <select value={newTcPriority} onChange={(e) => setNewTcPriority(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Type</label>
                  <select value={newTcType} onChange={(e) => setNewTcType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <option value="Functional">Functional</option>
                    <option value="API">API</option>
                    <option value="UI">UI</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Description & Scope
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the expected system behavior and boundaries..."
                  value={newTcDesc}
                  onChange={(e) => setNewTcDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
                >
                  Create Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Gemini AI Modal */}
      <GeminiAIAssistant
        mode="test-generator"
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        onApply={() => {
          fetchData();
        }}
      />
    </div>
  );
}
