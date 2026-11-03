'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Code2,
  Cloud,
  Crosshair,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Zap,
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle,
  Database,
  FileCode,
  FileCheck,
  Layers,
  Cpu,
  Shield,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import { api } from '@/lib/api/client';

interface CapabilityModule {
  key: string;
  name: string;
  category: 'code' | 'cloud' | 'offensive' | 'runtime' | 'data' | 'compliance';
  categoryLabel: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  engines: string[];
  primaryRoute: string;
  accentColor: string;
  capabilities: string[];
}

export default function PlatformProductsCatalogPage() {
  const { entitlements, subscription, isProductEnabled, upgradeProduct, refreshEntitlements } =
    useEntitlements();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [upgradingKey, setUpgradingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    async function loadAudit() {
      try {
        setAuditLoading(true);
        const logs = await api.entitlements.getAuditLog();
        setAuditLogs(logs || []);
      } catch (err) {
        // Non-blocking
      } finally {
        setAuditLoading(false);
      }
    }
    loadAudit();
  }, [entitlements]);

  const handleUpgrade = async (productKey: string, productName: string) => {
    setUpgradingKey(productKey);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await upgradeProduct(productKey, `${productName} Enterprise Trial`);
      setSuccessMsg(`Successfully activated ${productName}! The module is now live and accessible in your workspace.`);
      await refreshEntitlements();
    } catch (err: any) {
      setErrorMsg(err?.message || `Failed to activate ${productName}. Verify administrator permissions.`);
    } finally {
      setUpgradingKey(null);
    }
  };

  const capabilityModules: CapabilityModule[] = [
    {
      key: 'thing_code',
      name: 'Code Security (SAST & SCA)',
      category: 'code',
      categoryLabel: 'Application Security',
      tagline: 'Deterministic static analysis, secrets detection & dependency risk',
      description: 'Continuous static application security testing using official Semgrep OSS, Gitleaks token scanner, OSV vulnerability tracking, and automated GitHub PR security policies.',
      icon: Code2,
      engines: ['Semgrep OSS', 'Gitleaks', 'OSV SCA', 'CycloneDX'],
      primaryRoute: '/code',
      accentColor: '#2563EB',
      capabilities: [
        'Deterministic SAST Scanner with zero false-positive tuning',
        'High-entropy secret & API token detection (Gitleaks engine)',
        'Open-Source dependency vulnerability analysis (OSV database)',
        'Automated Software Bill of Materials (SBOM CycloneDX/SPDX)',
        'GitHub Pull Request policy review gates & status checks',
        'Deterministic AutoFix diff generation with validation rescan',
      ],
    },
    {
      key: 'thing_cloud',
      name: 'Cloud Security (CSPM / CNAPP)',
      category: 'cloud',
      categoryLabel: 'Cloud Infrastructure',
      tagline: 'Multi-cloud posture management, Kubernetes & container hardening',
      description: 'Agentless cloud security posture management across AWS, Azure, GCP, and self-hosted Kubernetes clusters with real-time CIS benchmark enforcement.',
      icon: Cloud,
      engines: ['Cloud Posture Engine', 'Kube-Bench', 'Docker CIS', 'IaC Engine'],
      primaryRoute: '/cloud',
      accentColor: '#0284C7',
      capabilities: [
        'Multi-Cloud Security Posture Management (AWS, Azure, GCP)',
        'Kubernetes cluster security auditing & CIS benchmark validation',
        'Docker host daemon & container runtime configuration checks',
        'Infrastructure-as-Code (Terraform / CloudFormation) drift detection',
        'Cloud IAM role privilege escalation & blast radius analysis',
        'Public attack surface & exposed cloud asset discovery',
      ],
    },
    {
      key: 'thing_attack',
      name: 'Attack Surface Management (DAST)',
      category: 'offensive',
      categoryLabel: 'Offensive Security',
      tagline: 'Dynamic application security testing, API fuzzing & pentest traversal',
      description: 'Continuous offensive security validation featuring headless browser DAST crawls, automated REST/GraphQL fuzzing, and attack path traversal verification.',
      icon: Crosshair,
      engines: ['OWASP ZAP', 'Nuclei', 'API Fuzzer', 'Graph Traversal'],
      primaryRoute: '/attack',
      accentColor: '#E11D48',
      capabilities: [
        'Dynamic Application Security Testing (DAST crawler & active fuzzer)',
        'Automated API schema discovery, parameter fuzzing & broken auth checks',
        'External attack surface discovery (subdomains, open ports, DNS)',
        'Automated penetration testing scenarios & exploitability validation',
        'Continuous re-testing engine with empirical verification evidence',
        'Auditor-grade offensive security reports & executive summaries',
      ],
    },
    {
      key: 'thing_protect',
      name: 'Runtime Defense & MCP Gateway',
      category: 'runtime',
      categoryLabel: 'Zero-Trust Runtime',
      tagline: 'eBPF-driven runtime threat mitigation & autonomous agent guardrails',
      description: 'Zero-trust runtime defense providing official Model Context Protocol (MCP) gateway proxying, strict tool authorization, and autonomous AI guardrails.',
      icon: ShieldCheck,
      engines: ['eBPF Kernel Probes', 'MCP Gateway', 'OPA Policy Engine'],
      primaryRoute: '/protect',
      accentColor: '#059669',
      capabilities: [
        'eBPF kernel-level process, network & filesystem telemetry',
        'Official MCP security gateway with strict identity & tool authorization',
        'Autonomous AI agent guardrails, tool inspection & policy enforcement',
        'Emergency break-glass dual-sign authorization workflow',
        'Instant cryptographic session revocation & blast radius isolation',
        'Real-time SOC triage and deterministic policy-driven containment',
      ],
    },
    {
      key: 'thing_data',
      name: 'Data Security Posture (DSPM)',
      category: 'data',
      categoryLabel: 'Data Governance',
      tagline: 'Automated sensitive data discovery, PII classification & DLP',
      description: 'Continuous discovery and classification of sensitive records (PII, credentials, access tokens) across S3 buckets, RDS databases, PostgreSQL, and Snowflake data warehouses.',
      icon: Database,
      engines: ['DSPM Classifier', 'PII Regex Engine', 'S3/RDS Inspector'],
      primaryRoute: '/data',
      accentColor: '#7C3AED',
      capabilities: [
        'Automated PII, financial & credential pattern classification',
        'Cloud storage (AWS S3, GCS) unencrypted bucket discovery',
        'Relational database (PostgreSQL, MySQL, RDS) sensitive column scanning',
        'Data access governance & excessive IAM privilege detection',
        'Data loss prevention (DLP) policy enforcement and alerts',
        'Data lineage tracking and regulatory exposure mapping',
      ],
    },
    {
      key: 'thing_compliance',
      name: 'Continuous Compliance Ledger',
      category: 'compliance',
      categoryLabel: 'Governance & Audit',
      tagline: 'SOC2, ISO 27001, HIPAA & PCI-DSS automated control evidence',
      description: 'Immutable compliance evidence ledger providing continuous verification against major cybersecurity frameworks with cryptographically verifiable audit trails.',
      icon: FileCheck,
      engines: ['Compliance Mapping', 'PostgreSQL Ledger', 'Auditor Export'],
      primaryRoute: '/compliance',
      accentColor: '#D97706',
      capabilities: [
        'SOC2 Type II, ISO 27001:2022, HIPAA, and PCI-DSS 4.0 control mappings',
        'Continuous automated evidence collection from runtime & scanners',
        'Cryptographically signed audit records with tamper detection',
        'Gap analysis and actionable compliance remediation blueprints',
        'One-click auditor export packages with verifiable proof manifests',
        'Executive readiness scoring and continuous posture dashboard',
      ],
    },
  ];

  const filteredModules = useMemo(() => {
    return capabilityModules.filter((mod) => {
      if (activeCategory !== 'all' && mod.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          mod.name.toLowerCase().includes(q) ||
          mod.tagline.toLowerCase().includes(q) ||
          mod.description.toLowerCase().includes(q) ||
          mod.categoryLabel.toLowerCase().includes(q) ||
          mod.engines.some((e) => e.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  const enabledCount = capabilityModules.filter((m) => isProductEnabled(m.key)).length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* ── Breadcrumbs & Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
          <Link href="/home" style={{ color: '#64748B', textDecoration: 'none' }}>
            Workspace
          </Link>
          <span>/</span>
          <span style={{ color: '#0F172A', fontWeight: 600 }}>Capability Catalog & Subscriptions</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Enterprise Security Capabilities
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 0 0', maxWidth: '640px' }}>
              Govern and monitor modular security capabilities for <strong>{entitlements?.organization_name || 'your workspace'}</strong>.
              Active subscriptions enable deterministic scanning, policy gates, and runtime zero-trust controls.
            </p>
          </div>

          {/* Active Plan Overview Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Workspace Plan
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{subscription?.plan || 'Enterprise Tier'}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    padding: '2px 7px',
                    borderRadius: '10px',
                  }}
                >
                  Active
                </span>
              </div>
            </div>

            <div style={{ width: '1px', height: '28px', backgroundColor: '#E2E8F0' }} />

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Modules
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>
                {enabledCount} of {capabilityModules.length} Enabled
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Messages ── */}
      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
            color: '#065F46',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '24px',
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '24px',
          }}
        >
          <AlertCircle size={16} color="#DC2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Filters & Category Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Capabilities' },
            { id: 'code', label: 'AppSec & Code' },
            { id: 'cloud', label: 'Cloud & Infrastructure' },
            { id: 'offensive', label: 'Offensive & DAST' },
            { id: 'runtime', label: 'Zero-Trust Runtime' },
            { id: 'data', label: 'Data & DSPM' },
            { id: 'compliance', label: 'Compliance' },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                  color: isActive ? '#2563EB' : '#64748B',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter capabilities or engines..."
            style={{
              padding: '6px 12px 6px 30px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '12px',
              outline: 'none',
              width: '230px',
            }}
          />
        </div>
      </div>

      {/* ── Capability Cards Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        {filteredModules.map((mod) => {
          const Icon = mod.icon;
          const isEnabled = isProductEnabled(mod.key);
          const isUpgrading = upgradingKey === mod.key;

          return (
            <div
              key={mod.key}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: isEnabled ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: '20px 22px',
                  borderBottom: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: isEnabled ? '#EFF6FF' : '#F8FAFC',
                      border: `1px solid ${isEnabled ? '#DBEAFE' : '#E2E8F0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isEnabled ? mod.accentColor : '#64748B',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        {mod.name}
                      </h2>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#64748B',
                        display: 'inline-block',
                        marginTop: '2px',
                      }}
                    >
                      {mod.categoryLabel}
                    </span>
                  </div>
                </div>

                {/* Status Pill */}
                {isEnabled ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={11} color="#059669" />
                    Active
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      border: '1px solid #FDE68A',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={10} color="#92400E" />
                    Trial Available
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  {mod.description}
                </p>

                {/* Engine Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {mod.engines.map((eng, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        backgroundColor: '#F8FAFC',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        padding: '2px 7px',
                        borderRadius: '4px',
                      }}
                    >
                      {eng}
                    </span>
                  ))}
                </div>

                {/* Capability Bullet Points */}
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Core Capabilities
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {mod.capabilities.map((cap, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>
                      <Check size={13} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Action */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '16px',
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Enterprise Blueprint
                  </span>

                  {isEnabled ? (
                    <Link
                      href={mod.primaryRoute}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 14px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <span>Open Console</span>
                      <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(mod.key, mod.name)}
                      disabled={isUpgrading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isUpgrading ? 'wait' : 'pointer',
                        boxShadow: '0 1px 3px rgba(37, 99, 235, 0.15)',
                      }}
                    >
                      {isUpgrading ? (
                        <>
                          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={13} />
                          <span>Enable 14-Day Trial</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Immutable Entitlement Audit Trail ── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Immutable Entitlement Audit Trail
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              Cryptographically verified history of module grants, license activations, and workspace tier upgrades.
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            {auditLogs.length} audit records
          </span>
        </div>

        {auditLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
            Loading audit records...
          </div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
            No recent entitlement changes recorded.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Event</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Module Key</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Actor</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {log.event_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                      {log.product_key || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>
                      {log.actor_id}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
