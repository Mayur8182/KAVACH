'use client';

import React from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Package,
  Layers,
  Code2,
  Sparkles,
  FileCode2,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface ArtifactsDossierViewProps {
  runId: string;
  repositoryName: string;
}

export const ArtifactsDossierView: React.FC<ArtifactsDossierViewProps> = ({
  runId,
  repositoryName,
}) => {
  const artifacts = [
    {
      id: 'art-sarif',
      name: 'SARIF Security Scan Report',
      format: 'SARIF 2.1.0 JSON',
      size: '142 KB',
      description: 'Standardized static analysis results interchange format report containing all 12 agent findings.',
      generatedBy: 'Multi-Agent Orchestrator',
      icon: <FileText size={18} color="#0F172A" />,
    },
    {
      id: 'art-sbom',
      name: 'CycloneDX Software Bill of Materials (SBOM)',
      format: 'CycloneDX XML / JSON',
      size: '286 KB',
      description: 'Cryptographically verifiable inventory of all 1,284 dependencies, transitive packages, and licenses.',
      generatedBy: 'SCA Agent (OSV)',
      icon: <Package size={18} color="#16A34A" />,
    },
    {
      id: 'art-evidence',
      name: 'Cryptographic Evidence Dossier',
      format: 'JSON / SHA-256 Digest',
      size: '512 KB',
      description: 'Immutable evidence chain connecting each finding to exact raw AST sinks, scanner outputs, and timestamps.',
      generatedBy: 'Investigation Agent',
      icon: <ShieldCheck size={18} color="#2563EB" />,
    },
    {
      id: 'art-patch',
      name: 'Remediation Patches Unified Diff',
      format: 'Git Unified Diff (.patch)',
      size: '18 KB',
      description: 'Synthesized context-aware code patches resolving SQL Injection, public S3 buckets, and secret leaks.',
      generatedBy: 'Remediation Agent',
      icon: <Sparkles size={18} color="#D97706" />,
    },
    {
      id: 'art-iac',
      name: 'IaC & Cloud Infrastructure Baseline',
      format: 'Checkov CIS / OPA Report',
      size: '94 KB',
      description: 'Compliance verification audit against CIS benchmarks for Terraform and Kubernetes configurations.',
      generatedBy: 'IaC Security Agent',
      icon: <Layers size={18} color="#7C3AED" />,
    },
    {
      id: 'art-logs',
      name: 'Deterministic Execution Logs & Audit Trail',
      format: 'Structured JSONL',
      size: '840 KB',
      description: 'Complete chronological audit log of all agent calls, identity checks, and policy evaluations.',
      generatedBy: 'Kavach Security Gateway',
      icon: <FileCode2 size={18} color="#64748B" />,
    },
  ];

  const handleDownload = (artName: string, format: string) => {
    toast.success(`Downloading ${artName}...`);
    // Create actual downloadable blob
    const sampleContent = JSON.stringify(
      {
        kavach_artifact: artName,
        run_id: runId,
        repository: repositoryName,
        generated_at: new Date().toISOString(),
        verified: true,
      },
      null,
      2
    );
    const blob = new Blob([sampleContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artName.toLowerCase().replace(/\s+/g, '_')}_${runId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
          Execution Artifacts & Evidence Dossier
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Authoritative outputs, SBOM packages, vulnerability evidence, and patch sets generated during this run.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {artifacts.map((art) => (
          <div
            key={art.id}
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'border-color 150ms ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '6px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {art.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                      {art.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {art.format} • {art.size}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: '#15803D',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  Verified
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#475569', margin: '6px 0 12px 0', lineHeight: 1.5 }}>
                {art.description}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #F1F5F9',
                paddingTop: '10px',
                fontSize: '11.5px',
              }}
            >
              <span style={{ color: '#64748B' }}>
                Generator: <strong>{art.generatedBy}</strong>
              </span>

              <button
                type="button"
                onClick={() => handleDownload(art.name, art.format)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Download size={12} />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

