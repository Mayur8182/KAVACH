'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { TestCaseItem } from '@/types/api/qa';
import {
  Plus,
  Upload,
  Download,
  Sparkles,
  Search,
  Filter,
  ChevronDown,
  Check,
  Play,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export default function QATestCasesPage() {
  const router = useRouter();
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSuite, setSelectedSuite] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAutomation, setSelectedAutomation] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New TC Form
  const [tcName, setTcName] = useState('');
  const [tcSuite, setTcSuite] = useState('Authentication');
  const [tcPriority, setTcPriority] = useState('High');
  const [tcType, setTcType] = useState('Functional');
  const [tcAutomation, setTcAutomation] = useState('Playwright');
  const [tcDesc, setTcDesc] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listTestCases({
        search: search || undefined,
        suite: selectedSuite !== 'All' ? selectedSuite : undefined,
        priority: selectedPriority !== 'All' ? selectedPriority : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
        automation: selectedAutomation !== 'All' ? selectedAutomation : undefined,
      });
      setTestCases(res);
    } catch (err) {
      console.error('Failed to fetch test cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [search, selectedSuite, selectedPriority, selectedStatus, selectedAutomation]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(testCases.map((tc) => tc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcName.trim()) return;
    try {
      await api.qa.createTestCase({
        name: tcName,
        suite: tcSuite,
        priority: tcPriority,
        type: tcType,
        automation: tcAutomation,
        description: tcDesc,
        steps: [
          { step_number: 1, action: 'Authenticate API client', expected: 'Token generated', status: 'Pending' },
          { step_number: 2, action: 'Execute target action', expected: 'Outcome verified', status: 'Pending' },
        ],
      });
      setIsCreateModalOpen(false);
      setTcName('');
      setTcDesc('');
      fetchCases();
    } catch (err) {
      console.error('Failed to create test case:', err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      case 'high':
        return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' };
      case 'medium':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getPassRateColor = (rate: number) => {
    if (rate >= 90) return '#16A34A';
    if (rate >= 75) return '#D97706';
    return '#DC2626';
  };

  return (
    <div style={{ padding: '24px 32px', minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <QABreadcrumb
        items={[
          { label: 'Test Management', href: '/qa/test-cases' },
          { label: 'Test Cases' },
        ]}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Test Cases
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Manage and maintain your test cases
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
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
            <Plus size={15} />
            <span>Create Test Case</span>
          </button>

          <button
            onClick={() => alert('Importing test cases via CSV / JSON / Jira format supported.')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Upload size={14} />
            <span>Import</span>
          </button>

          <button
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(testCases, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', 'test_cases_export.json');
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>Export</span>
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
          >
            <Sparkles size={14} />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
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
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search test cases..."
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

        {/* Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedSuite}
            onChange={(e) => setSelectedSuite(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}
          >
            <option value="All">Suite: All</option>
            <option value="Authentication">Authentication</option>
            <option value="Payments">Payments</option>
            <option value="Orders">Orders</option>
            <option value="Admin">Admin</option>
            <option value="UI">UI</option>
            <option value="Search">Search</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}
          >
            <option value="All">Priority: All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Deprecated">Deprecated</option>
          </select>

          <select
            value={selectedAutomation}
            onChange={(e) => setSelectedAutomation(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}
          >
            <option value="All">Automation: All</option>
            <option value="Playwright">Playwright</option>
            <option value="Cypress">Cypress</option>
            <option value="Postman">Postman</option>
            <option value="Selenium">Selenium</option>
            <option value="Manual">Manual</option>
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
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedIds.length === testCases.length && testCases.length > 0}
                />
              </th>
              <th style={{ padding: '12px 16px' }}>ID</th>
              <th style={{ padding: '12px 16px' }}>Name</th>
              <th style={{ padding: '12px 16px' }}>Suite</th>
              <th style={{ padding: '12px 16px' }}>Priority</th>
              <th style={{ padding: '12px 16px' }}>Type</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Automation</th>
              <th style={{ padding: '12px 16px' }}>Owner</th>
              <th style={{ padding: '12px 16px' }}>Last Run</th>
              <th style={{ padding: '12px 16px' }}>Pass Rate</th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((tc) => {
              const priorityBadge = getPriorityBadge(tc.priority);
              const isSelected = selectedIds.includes(tc.id);

              return (
                <tr
                  key={tc.id}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(tc.id)}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2563EB' }}>
                    <Link
                      href={`/qa/test-cases/${tc.id}`}
                      style={{ color: '#2563EB', textDecoration: 'none' }}
                    >
                      {tc.id}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A', maxWidth: '280px' }}>
                    <Link
                      href={`/qa/test-cases/${tc.id}`}
                      style={{ color: '#0F172A', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                    >
                      {tc.name}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '11px', fontWeight: 500 }}>
                      {tc.suite}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: priorityBadge.bg,
                        color: priorityBadge.text,
                        border: `1px solid ${priorityBadge.border}`,
                      }}
                    >
                      {tc.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{tc.type}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: tc.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                        color: tc.status === 'Active' ? '#15803D' : '#64748B',
                      }}
                    >
                      {tc.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#F5F3FF',
                        color: '#7C3AED',
                        border: '1px solid #DDD6FE',
                      }}
                    >
                      {tc.automation}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>{tc.owner}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{tc.last_run || 'Never'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: getPassRateColor(tc.pass_rate) }}>
                    {tc.pass_rate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #EAECF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
            fontSize: '12px',
            color: '#64748B',
          }}
        >
          <div>
            Showing 1-{testCases.length} of {testCases.length} test cases
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              disabled
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#94A3B8',
                cursor: 'not-allowed',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
              }}
            >
              1
            </span>
            <button
              disabled
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#94A3B8',
                cursor: 'not-allowed',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Create Test Case Modal */}
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
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Create Test Case</div>
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
                  value={tcName}
                  onChange={(e) => setTcName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Suite</label>
                  <select value={tcSuite} onChange={(e) => setTcSuite(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <option value="Authentication">Authentication</option>
                    <option value="Payments">Payments</option>
                    <option value="Orders">Orders</option>
                    <option value="Admin">Admin</option>
                    <option value="UI">UI</option>
                    <option value="Search">Search</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Priority</label>
                  <select value={tcPriority} onChange={(e) => setTcPriority(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Type</label>
                  <select value={tcType} onChange={(e) => setTcType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <option value="Functional">Functional</option>
                    <option value="API">API</option>
                    <option value="UI">UI</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Automation Framework</label>
                  <select value={tcAutomation} onChange={(e) => setTcAutomation(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}>
                    <option value="Playwright">Playwright</option>
                    <option value="Cypress">Cypress</option>
                    <option value="Postman">Postman</option>
                    <option value="Selenium">Selenium</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed test objective and preconditions..."
                  value={tcDesc}
                  onChange={(e) => setTcDesc(e.target.value)}
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
                  Save Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini AI Modal */}
      <GeminiAIAssistant
        mode="test-generator"
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        onApply={() => {
          fetchCases();
        }}
      />
    </div>
  );
}
