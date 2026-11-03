'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Check,
  Key,
  Shield,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  key_preview: string;
  scopes: string[];
  created_at: string;
  last_used: string;
  status: string;
}

export default function ApiIntegrationPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal State
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [keyNameInput, setKeyNameInput] = useState<string>('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read', 'write']);
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{
    raw_key: string;
    key_preview: string;
    name: string;
  } | null>(null);
  const [copiedRawKey, setCopiedRawKey] = useState<boolean>(false);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.integrations.listApiKeys();
      setKeys(list || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCopyBaseUrl = () => {
    navigator.clipboard.writeText('https://api.seculayer.com/v1');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const getCurlSnippet = () => {
    return `curl -X POST https://api.seculayer.com/v1/scan \\
  -H "Authorization: Bearer sk_live_••••••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repository": "owner/repo",
    "branch": "main",
    "type": "sast"
  }'`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyNameInput) {
      alert('Please enter a key name.');
      return;
    }
    try {
      const res = await api.integrations.generateApiKey({
        name: keyNameInput,
        scopes: selectedScopes,
      });
      setGeneratedKeyResult({
        raw_key: res.raw_key,
        key_preview: res.key_preview,
        name: res.name,
      });
      await fetchKeys();
    } catch (err) {
      console.error('Key generation failed:', err);
      alert('Failed to generate API key.');
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action is permanent.')) return;
    try {
      await api.integrations.revokeApiKey(id);
      await fetchKeys();
      setActionMessage('API key revoked successfully.');
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px' }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
        <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>THING CODE</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>SAST</Link>
        <ChevronRight size={12} />
        <Link href="/sast/integrations" style={{ color: '#64748B', textDecoration: 'none' }}>Integrations</Link>
        <ChevronRight size={12} />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>API</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
            <Code2 size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              API Integration
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Use our REST API to integrate SAST into your tools and workflows.
            </p>
          </div>
        </div>

        {/* Enabled Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: isEnabled ? '#059669' : '#64748B' }}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            style={{
              width: '42px',
              height: '24px',
              borderRadius: '9999px',
              backgroundColor: isEnabled ? '#2563EB' : '#CBD5E1',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: isEnabled ? '20px' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                transition: 'left 200ms ease',
              }}
            />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #EAECF0', marginBottom: '20px' }}>
        {['Overview', 'API Keys', 'Documentation', 'Scopes', 'Rate Limits', 'Webhooks'].map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 0',
                border: 'none',
                borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: active ? '#2563EB' : '#64748B',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* API Details Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px', border: '1px solid #EAECF0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px 0' }}>
          API Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Base URL</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <code style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                https://api.seculayer.com/v1
              </code>
              <button
                onClick={handleCopyBaseUrl}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
              >
                {copiedUrl ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Status</div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#ECFDF5',
                color: '#059669',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              Active
            </span>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Version</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>v1</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Rate Limit</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>1000 requests/hour</div>
          </div>
        </div>
      </div>

      {/* API Keys Table Section */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              API Keys
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Manage your API keys for authentication.
            </p>
          </div>

          <button
            onClick={() => {
              setGeneratedKeyResult(null);
              setKeyNameInput('');
              setShowGenerateModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Generate API Key
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #EAECF0' }}>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Key (Preview)</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Scopes</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Created At</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Last Used</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No API keys created. Click &quot;Generate API Key&quot; to create one.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: '1px solid #EAECF0' }}>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {k.name}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '12px', fontFamily: 'monospace', color: '#475569' }}>
                    {k.key_preview}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {k.scopes.map((s, idx) => (
                        <span key={idx} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748B' }}>
                    {k.created_at}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748B' }}>
                    {k.last_used}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: k.status === 'active' ? '#ECFDF5' : '#FEF2F2',
                        color: k.status === 'active' ? '#059669' : '#DC2626',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: k.status === 'active' ? '#10B981' : '#EF4444' }} />
                      {k.status === 'active' ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {k.status === 'active' && (
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Quick Example */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Quick Example
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                cURL Request to Trigger a Scan
              </p>
            </div>

            <button
              onClick={handleCopyCurl}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copiedCurl ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              {copiedCurl ? 'Copied' : 'Copy'}
            </button>
          </div>

          <pre
            style={{
              backgroundColor: '#0F172A',
              color: '#F8FAFC',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
              overflowX: 'auto',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            <code>{getCurlSnippet()}</code>
          </pre>
        </div>

        {/* Available Endpoints */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '20px 24px', border: '1px solid #EAECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 14px 0' }}>
            Available Endpoints
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {[
              { method: 'POST', path: '/scan', desc: 'Trigger a new scan' },
              { method: 'GET', path: '/findings', desc: 'List findings' },
              { method: 'GET', path: '/scans', desc: 'List scans' },
              { method: 'GET', path: '/reports', desc: 'Get scan report' },
              { method: 'GET', path: '/webhooks', desc: 'List webhooks' },
            ].map((ep, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      backgroundColor: ep.method === 'POST' ? '#EFF6FF' : '#F0FDF4',
                      color: ep.method === 'POST' ? '#2563EB' : '#16A34A',
                    }}
                  >
                    {ep.method}
                  </span>
                  <code style={{ fontSize: '12px', color: '#0F172A', fontWeight: 600 }}>{ep.path}</code>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>{ep.desc}</span>
              </div>
            ))}
          </div>

          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
          >
            View Full Documentation
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Generate API Key Modal */}
      {showGenerateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '520px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            {!generatedKeyResult ? (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Generate New API Key
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
                  Create an authentication key for CI/CD pipelines, automated scripts, or internal tools.
                </p>

                <form onSubmit={handleGenerateKey}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Key Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jenkins CI Scanner"
                      value={keyNameInput}
                      onChange={(e) => setKeyNameInput(e.target.value)}
                      style={{ width: '100%', padding: '7px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Scopes
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { key: 'read', label: 'read (Read Scans & Findings)' },
                        { key: 'write', label: 'write (Trigger Scans)' },
                        { key: 'scans:read', label: 'scans:read' },
                        { key: 'scans:write', label: 'scans:write' },
                      ].map((sc) => (
                        <label key={sc.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedScopes.includes(sc.key)}
                            onChange={() => {
                              if (selectedScopes.includes(sc.key)) {
                                setSelectedScopes(selectedScopes.filter((s) => s !== sc.key));
                              } else {
                                setSelectedScopes([...selectedScopes, sc.key]);
                              }
                            }}
                            style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                          />
                          {sc.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowGenerateModal(false)}
                      style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Generate Key
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  API Key Generated
                </h3>
                <div style={{ padding: '12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', color: '#92400E', fontSize: '12px', margin: '12px 0 16px 0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    Make sure to copy your API key now. For security purposes, we only store a cryptographic hash and <strong>you will not be able to see it again!</strong>
                  </div>
                </div>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedKeyResult.raw_key}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      backgroundColor: '#F8FAFC',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKeyResult.raw_key);
                      setCopiedRawKey(true);
                      setTimeout(() => setCopiedRawKey(false), 2000);
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#2563EB',
                      padding: '4px',
                    }}
                  >
                    {copiedRawKey ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowGenerateModal(false);
                      setGeneratedKeyResult(null);
                    }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
