'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { QABreadcrumb } from '@/components/qa/QABreadcrumb';
import { GeminiAIAssistant } from '@/components/qa/GeminiAIAssistant';
import type { APITestItem } from '@/types/api/qa';
import {
  Plus,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Send,
  Shield,
  Clock,
  Layers,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

export default function QAAPITestingPage() {
  const [tests, setTests] = useState<APITestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState('All');
  const [selectedTest, setSelectedTest] = useState<APITestItem | null>(null);
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // New Request Form
  const [reqName, setReqName] = useState('');
  const [reqCollection, setReqCollection] = useState('Payments API');
  const [reqMethod, setReqMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [reqPath, setReqPath] = useState('/api/v1/payments');
  const [reqBody, setReqBody] = useState('{\n  "amount": 4900,\n  "currency": "USD"\n}');

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await api.qa.listApiTests();
      setTests(res);
      if (res.length > 0 && !selectedTest) {
        setSelectedTest(res[0]);
      }
    } catch (err) {
      console.error('Failed to load API tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleExecute = async (testId: string) => {
    setExecutingId(testId);
    try {
      const updated = await api.qa.executeApiTest(testId);
      setTests((prev) => prev.map((t) => (t.id === testId ? updated : t)));
      if (selectedTest?.id === testId) {
        setSelectedTest(updated);
      }
    } catch (err) {
      console.error('Failed to execute API test:', err);
    } finally {
      setExecutingId(null);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqName.trim()) return;
    try {
      await api.qa.createApiTest({
        collection: reqCollection,
        name: reqName,
        method: reqMethod,
        path: reqPath,
        body: reqBody,
      });
      setIsNewRequestOpen(false);
      setReqName('');
      fetchTests();
    } catch (err) {
      console.error('Failed to create request:', err);
    }
  };

  const collections = ['All', 'Payments API', 'Authentication', 'Orders', 'Refunds', 'Admin'];

  const filteredTests = selectedCollection === 'All'
    ? tests
    : tests.filter((t) => t.collection === selectedCollection);

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'POST': return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
      case 'PUT': return { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5' };
      case 'DELETE': return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      default: return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ padding: '24px 32px', minHeight: '100%', backgroundColor: '#F8FAFC' }}>
      <QABreadcrumb
        items={[
          { label: 'API Testing' },
        ]}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            API Testing
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Test, validate and secure your APIs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsNewRequestOpen(true)}
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
            <span>New Request</span>
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
            <span>AI Generate Tests</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '16px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>API Tests</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>2,342</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>+8%</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '16px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>Pass Rate</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>97.6%</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>+1.5%</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '16px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>Avg Latency</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>248ms</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>-12%</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '16px 20px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>Security Issues</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A' }}>5</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>+67%</span>
          </div>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Pane: Collections */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', padding: '14px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Folder size={15} color="#2563EB" />
            <span>Collections</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {collections.map((col) => {
              const isSelected = selectedCollection === col;
              const count = col === 'All' ? tests.length : tests.filter((t) => t.collection === col).length;

              return (
                <button
                  key={col}
                  onClick={() => setSelectedCollection(col)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                    color: isSelected ? '#2563EB' : '#475569',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span>{col}</span>
                  <span style={{ fontSize: '11px', color: isSelected ? '#2563EB' : '#94A3B8' }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Endpoints & Request Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Endpoints Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Endpoints ({filteredTests.length})
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0', color: '#64748B', fontWeight: 600 }}>
                  <th style={{ padding: '10px 16px' }}>Method</th>
                  <th style={{ padding: '10px 16px' }}>Endpoint</th>
                  <th style={{ padding: '10px 16px' }}>Name</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Latency</th>
                  <th style={{ padding: '10px 16px' }}>Result</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => {
                  const mBadge = getMethodBadge(test.method);
                  const isExecuting = executingId === test.id;
                  const isSelected = selectedTest?.id === test.id;

                  return (
                    <tr
                      key={test.id}
                      onClick={() => setSelectedTest(test)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: mBadge.bg,
                            color: mBadge.text,
                            border: `1px solid ${mBadge.border}`,
                          }}
                        >
                          {test.method}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                        {test.path}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#475569' }}>{test.name}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: test.status_code < 400 ? '#DCFCE7' : '#FEE2E2',
                            color: test.status_code < 400 ? '#15803D' : '#991B1B',
                          }}
                        >
                          {test.status_code}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748B' }}>{test.latency_ms}ms</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: test.result === 'Pass' ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {test.result}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleExecute(test.id)}
                          disabled={isExecuting}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: isExecuting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isExecuting ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} fill="#FFFFFF" />}
                          <span>Test</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Request / Response Inspector */}
          {selectedTest && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #EAECF0',
                padding: '20px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: getMethodBadge(selectedTest.method).bg,
                      color: getMethodBadge(selectedTest.method).text,
                    }}
                  >
                    {selectedTest.method}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                    {selectedTest.path}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Latency: <strong style={{ color: '#0F172A' }}>{selectedTest.latency_ms}ms</strong> • Status: <strong style={{ color: '#16A34A' }}>{selectedTest.status_code}</strong>
                </div>
              </div>

              {/* Security Assertions Checklist */}
              {selectedTest.security_checks?.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} />
                    <span>Security Assertions</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {selectedTest.security_checks.map((sc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#15803D' }}>
                        <CheckCircle2 size={13} color="#16A34A" />
                        <span>{sc.check}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Payload and Response JSON */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Request Body</div>
                  <pre
                    style={{
                      backgroundColor: '#0F172A',
                      color: '#F8FAFC',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'Consolas, monospace',
                      overflowX: 'auto',
                      margin: 0,
                      maxHeight: '180px',
                    }}
                  >
                    <code>{selectedTest.body || '{\n  // No payload for GET request\n}'}</code>
                  </pre>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Response Body</div>
                  <pre
                    style={{
                      backgroundColor: '#0F172A',
                      color: '#4ADE80',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'Consolas, monospace',
                      overflowX: 'auto',
                      margin: 0,
                      maxHeight: '180px',
                    }}
                  >
                    <code>{selectedTest.response_body || '{\n  "status": "success",\n  "code": 200\n}'}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      {isNewRequestOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>New API Request</div>
              <button onClick={() => setIsNewRequestOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#64748B" /></button>
            </div>

            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Request Name *</label>
                <input type="text" required placeholder="e.g. Authorize Stripe Payment" value={reqName} onChange={(e) => setReqName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Method</label>
                  <select value={reqMethod} onChange={(e: any) => setReqMethod(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Path *</label>
                  <input type="text" required placeholder="/api/v1/..." value={reqPath} onChange={(e) => setReqPath(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Collection</label>
                <select value={reqCollection} onChange={(e) => setReqCollection(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}>
                  <option value="Payments API">Payments API</option>
                  <option value="Authentication">Authentication</option>
                  <option value="Orders">Orders</option>
                  <option value="Refunds">Refunds</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsNewRequestOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 600 }}>Save Endpoint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini AI Modal */}
      <GeminiAIAssistant
        mode="api-test-generator"
        initialContext={{ path: selectedTest?.path || '/api/v1/payments', method: selectedTest?.method || 'POST' }}
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        onApply={() => {
          fetchTests();
        }}
      />
    </div>
  );
}
