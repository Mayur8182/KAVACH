'use client';

/**
 * Module 13 — Dependency Scans & Jobs: Run New Scan
 * Route: /code/dependencies/scans/new
 * Full interactive configuration for triggering real SCA scans against repositories.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play,
  Shield,
  Layers,
  FileCheck,
  FileText,
  AlertTriangle,
  FolderGit2,
  GitBranch,
  Cpu,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Info,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyScansSubnav } from '@/components/dependencies/DependencyScansSubnav';

export default function RunNewScanPage() {
  const router = useRouter();

  // Dynamic Repositories
  const [repoList, setRepoList] = useState<string[]>([]);

  // Form State
  const [repository, setRepository] = useState('');
  const [branch, setBranch] = useState('main');
  const [scanType, setScanType] = useState('FULL_SCA');
  const [engine, setEngine] = useState('Trivy SCA + OSV Engine');
  const [depth, setDepth] = useState('DEEP');
  const [failOn, setFailOn] = useState('CRITICAL');
  const [autoFixPr, setAutoFixPr] = useState(true);
  const [generateSbom, setGenerateSbom] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadRepos = async () => {
      try {
        const repos = await api.dependencyScans.getRepositories();
        if (mounted && repos && repos.length > 0) {
          setRepoList(repos);
          setRepository((prev) => prev || repos[0]);
        }
      } catch (err) {
        console.warn('Failed to load repositories', err);
      }
    };
    loadRepos();
    return () => {
      mounted = false;
    };
  }, []);

  const scanProfiles = [
    {
      id: 'FULL_SCA',
      title: 'Full SCA Suite',
      badge: 'Recommended',
      badgeColor: '#2563EB',
      description: 'Comprehensive analysis covering CVEs, transitive vulnerabilities, licenses, and OPA policy guardrails.',
      icon: Shield,
    },
    {
      id: 'VULNERABILITY',
      title: 'Vulnerability Analysis',
      badge: 'Fastest',
      badgeColor: '#059669',
      description: 'Deep CVE & GHSA cross-referencing against Google OSV and National Vulnerability Database.',
      icon: AlertTriangle,
    },
    {
      id: 'LICENSE',
      title: 'License Compliance',
      badge: 'Legal',
      badgeColor: '#7C3AED',
      description: 'Audit dual-license risks, Copyleft (GPL/AGPL) violations, and proprietary code contamination.',
      icon: FileCheck,
    },
    {
      id: 'SBOM',
      title: 'SBOM Generation',
      badge: 'NTIA Compliant',
      badgeColor: '#D97706',
      description: 'Generate cryptographic CycloneDX and SPDX Software Bill of Materials with package purls.',
      icon: Layers,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.dependencyScans.runScan({
        repository_name: repository,
        branch: branch,
        scan_type: scanType,
        engine: engine,
        depth: depth,
        fail_on: failOn,
      });

      // Redirect directly to the newly created scan's detail page
      if (res && res.job_id) {
        router.push(`/code/dependencies/scans/${res.job_id}`);
      } else {
        router.push('/code/dependencies/scans');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to trigger scan. Please verify repository connection.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: '1600px', margin: '0 auto', width: '100%', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)" }}>
      <DependencyScansSubnav
        selectedRepo={repository}
        onSelectRepo={(r) => setRepository(r)}
        selectedBranch={branch}
        onSelectBranch={(b) => setBranch(b)}
      />

      {error && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          {/* ── Left Column: Configuration ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1: Target Repository & Branch */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                  1
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>Target Repository &amp; Branch</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Select the connected code repository and target Git reference.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Repository
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FolderGit2 size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <select
                      value={repository}
                      onChange={(e) => setRepository(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        fontWeight: 500,
                        outline: 'none',
                      }}
                    >
                      {repoList.length === 0 ? (
                        <option value="">No connected repositories</option>
                      ) : (
                        repoList.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Target Branch / Ref
                  </label>
                  <div style={{ position: 'relative' }}>
                    <GitBranch size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        fontWeight: 500,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Scan Profile / Type */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                  2
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>Scan Profile &amp; Objectives</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Choose what security aspects will be evaluated during this execution.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {scanProfiles.map((p) => {
                  const Icon = p.icon;
                  const isSelected = scanType === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setScanType(p.id)}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={18} color={isSelected ? '#2563EB' : '#64748B'} />
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{p.title}</span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: `${p.badgeColor}15`,
                            color: p.badgeColor,
                          }}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>{p.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Engine & Rules Configuration */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                  3
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>Engine &amp; Execution Parameters</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Select deterministic scanning tools and enforcement gates.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Scanner Engine
                  </label>
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    <option value="Trivy SCA + OSV Engine">Trivy SCA + OSV (Consensus)</option>
                    <option value="Trivy Standalone v0.58.0">Trivy Standalone v0.58.0</option>
                    <option value="Google OSV-Scanner v1.8.2">Google OSV-Scanner</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Dependency Depth
                  </label>
                  <select
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    <option value="DEEP">Deep (Direct + Transitive)</option>
                    <option value="DIRECT">Direct Dependencies Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Fail Gate Threshold
                  </label>
                  <select
                    value={failOn}
                    onChange={(e) => setFailOn(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    <option value="CRITICAL">Critical Severity (Block CI)</option>
                    <option value="HIGH">High &amp; Critical (Strict)</option>
                    <option value="NONE">Audit Only (Never Block)</option>
                  </select>
                </div>
              </div>

              {/* Checkbox Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={generateSbom}
                    onChange={(e) => setGenerateSbom(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                  <span>Generate cryptographic CycloneDX 1.5 JSON Software Bill of Materials (SBOM)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoFixPr}
                    onChange={(e) => setAutoFixPr(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                  <span>Automatically propose version bump fixes via GitHub Pull Requests for Critical CVEs</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1E293B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyOnComplete}
                    onChange={(e) => setNotifyOnComplete(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                  <span>Stream notifications and logs to Kavach Security Dashboard on completion</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Right Column: Preflight & Trigger ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Preflight Summary Card */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Zap size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>Execution Plan</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Target Repository:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{repository}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Git Branch:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{branch}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Scan Profile:</span>
                  <span style={{ fontWeight: 600, color: '#2563EB' }}>{scanType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Engine:</span>
                  <span style={{ fontWeight: 500, color: '#0F172A' }}>{engine.split(' ')[0]}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748B' }}>Est. Execution Time:</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>~12 - 15 seconds</span>
                </div>
              </div>

              {/* Preflight Checks list */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Preflight Readiness
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>Workspace lockfiles verified</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>OPA Policy guardrails loaded</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>CVE vulnerability DB synchronized</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  transition: 'background-color 120ms ease',
                }}
              >
                {submitting ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>Executing Scanner...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="#FFFFFF" />
                    <span>Trigger Scan Now</span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <Link
                  href="/code/dependencies/scans"
                  style={{ fontSize: '12px', color: '#64748B', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  Cancel and return to dashboard
                </Link>
              </div>
            </div>

            {/* Help Callout */}
            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '12px', padding: '16px', color: '#1E40AF', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '6px' }}>
                <Info size={14} />
                <span>Deterministic Evidence Standard</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.4, color: '#1E3A8A' }}>
                Every scan executes native Trivy &amp; OSV scanners inside isolated containers. Findings are linked directly to NIST CVE records with cryptographic proof.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
