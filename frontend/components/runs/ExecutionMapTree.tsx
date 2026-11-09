'use client';

import React, { useState } from 'react';
import {
  FolderGit2,
  Folder,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Shield,
  Layers,
  Box,
  Key,
  Network,
  Clock,
  ArrowRight,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';

interface ExecutionMapTreeProps {
  repositoryName?: string;
  filesCount?: number;
  branchName?: string;
  elapsedTime?: string;
  progressPercentage?: number;
  onSelectAgent?: (agentId: string) => void;
  onSelectFinding?: (findingId: string) => void;
  onSelectFile?: (filePath: string) => void;
}

export const ExecutionMapTree: React.FC<ExecutionMapTreeProps> = ({
  repositoryName = 'JOB-FINDER-NEW',
  filesCount = 1284,
  branchName = 'main',
  elapsedTime = '03:53',
  progressPercentage = 42,
  onSelectAgent,
  onSelectFinding,
  onSelectFile,
}) => {
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Canvas Area: Left Tree + Right Live Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          minHeight: '520px',
          position: 'relative',
        }}
      >
        {/* Left Tree Area */}
        <div
          style={{
            padding: '40px 32px',
            position: 'relative',
            overflowX: 'auto',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FCFDFD',
          }}
        >
          {/* SVG Connection Lines */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {/* Root to api/ */}
            <path
              d="M 195 260 C 235 260, 235 150, 275 150"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
            {/* Root to infra/ */}
            <path
              d="M 195 260 C 235 260, 235 320, 275 320"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
            {/* Root to docker/ */}
            <path
              d="M 195 260 C 235 260, 235 380, 275 380"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
            {/* Root to package.json */}
            <path
              d="M 195 260 C 235 260, 235 435, 275 435"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />

            {/* api/ to src/ */}
            <path
              d="M 370 150 C 400 150, 400 110, 430 110"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
            {/* api/ to services/ */}
            <path
              d="M 370 150 C 400 150, 400 230, 430 230"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />

            {/* src/ to src/auth/session.ts */}
            <path
              d="M 525 110 C 555 110, 555 75, 585 75"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
            {/* src/ to src/api/salary/calculate.js */}
            <path
              d="M 525 110 C 555 110, 555 145, 585 145"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />

            {/* services/ to infra/cluster.tf */}
            <path
              d="M 545 230 C 565 230, 565 230, 585 230"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />

            {/* docker/ to Dockerfile */}
            <path
              d="M 370 380 C 470 380, 470 340, 585 340"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />

            {/* package.json to openapi.yaml */}
            <path
              d="M 370 435 C 470 435, 470 415, 585 415"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2"
            />
          </svg>

          {/* Tree Nodes Container */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              width: '880px',
              height: '460px',
            }}
          >
            {/* 1. ROOT NODE */}
            <div
              style={{
                position: 'absolute',
                left: '20px',
                top: '232px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: '24px',
                padding: '10px 18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <FolderGit2 size={18} color="#0F172A" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  {repositoryName}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {filesCount.toLocaleString()} files - {branchName}
                </div>
              </div>
            </div>

            {/* 2. DIRECTORY LEVEL 1 */}
            {/* api/ (482 files) */}
            <div
              style={{
                position: 'absolute',
                left: '275px',
                top: '132px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <Folder size={14} color="#64748B" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>api/</span>
                <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px' }}>482 files</span>
              </div>
            </div>

            {/* infra/ (13 files) */}
            <div
              style={{
                position: 'absolute',
                left: '275px',
                top: '305px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <Folder size={14} color="#64748B" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>infra/</span>
                <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px' }}>13 files</span>
              </div>
            </div>

            {/* docker/ (4 files) */}
            <div
              style={{
                position: 'absolute',
                left: '275px',
                top: '365px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <Folder size={14} color="#64748B" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>docker/</span>
                <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px' }}>4 files</span>
              </div>
            </div>

            {/* package.json */}
            <div
              style={{
                position: 'absolute',
                left: '275px',
                top: '420px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <FileCode2 size={14} color="#64748B" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>package.json</span>
            </div>

            {/* 3. DIRECTORY LEVEL 2 */}
            {/* src/ (27 files) */}
            <div
              style={{
                position: 'absolute',
                left: '430px',
                top: '95px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <Folder size={14} color="#64748B" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>src/</span>
                <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px' }}>27 files</span>
              </div>
            </div>

            {/* services/ (36 files) */}
            <div
              style={{
                position: 'absolute',
                left: '430px',
                top: '215px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <Folder size={14} color="#64748B" />
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>services/</span>
                <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px' }}>36 files</span>
              </div>
            </div>

            {/* 4. LEAF NODES (Files with Findings & Agent Badges) */}

            {/* Leaf 1: src/auth/session.ts -> SQL Injection - 1 Critical | SAST */}
            <div
              onClick={() => {
                setSelectedNode({
                  path: 'src/auth/session.ts',
                  title: 'SQL injection in sign-in query',
                  agent: 'SAST Agent (Semgrep 1.178)',
                  agentBadge: 'SAST',
                  severity: 'Critical',
                  ruleId: 'CWE-89',
                  line: 42,
                  findingId: 'F-001',
                  codeSnippet: `const query = \`SELECT * FROM users WHERE email = '\${email}'\`;\nconst res = await db.query(query);\nreturn res.rows[0];`,
                  remediation: 'Use parameterized queries ($1) with parameter array [email] to safely escape user input.',
                  status: 'Vulnerable',
                });
                if (onSelectAgent) onSelectAgent('sast');
                if (onSelectFile) onSelectFile('src/auth/session.ts');
                if (onSelectFinding) onSelectFinding('F-001');
              }}
              style={{
                position: 'absolute',
                left: '585px',
                top: '55px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #F87171',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.12)',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A' }}>
                  src/auth/session.ts
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>
                  SQL Injection - 1 Critical
                </span>
              </div>

              {/* Agent Badge */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Shield size={12} color="#16A34A" />
                <span>SAST</span>
              </div>
            </div>

            {/* Leaf 2: src/api/salary/calculate.js -> Input Validation - 1 Medium | DAST */}
            <div
              onClick={() => {
                setSelectedNode({
                  path: 'src/api/salary/calculate.js',
                  title: 'Missing input validation on salary calculation endpoint',
                  agent: 'DAST Agent (OWASP API Security)',
                  agentBadge: 'DAST',
                  severity: 'Medium',
                  ruleId: 'CWE-20',
                  line: 27,
                  findingId: 'F-005',
                  codeSnippet: `function calculateBonus(base, multiplier) {\n  return base * multiplier;\n}`,
                  remediation: 'Add schema validation enforcing positive numerical limits on multiplier parameter.',
                  status: 'Vulnerable',
                });
                if (onSelectAgent) onSelectAgent('dast');
                if (onSelectFile) onSelectFile('src/api/salary/calculate.js');
              }}
              style={{
                position: 'absolute',
                left: '585px',
                top: '125px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1.5px solid #FBBF24',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A' }}>
                  src/api/salary/calculate.js
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706' }}>
                  Input Validation - 1 Medium
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Network size={12} color="#9333EA" />
                <span>DAST</span>
              </div>
            </div>

            {/* Leaf 3: infra/cluster.tf -> Public endpoint - Medium | IaC */}
            <div
              onClick={() => {
                setSelectedNode({
                  path: 'infra/cluster.tf',
                  title: 'Public endpoint and unrestricted security group',
                  agent: 'IaC Security Agent (Checkov 3.3)',
                  agentBadge: 'IaC',
                  severity: 'Medium',
                  ruleId: 'CKV_AWS_260',
                  line: 18,
                  findingId: 'F-003',
                  codeSnippet: `resource "aws_security_group_rule" "ingress" {\n  cidr_blocks = ["0.0.0.0/0"]\n  from_port = 22\n}`,
                  remediation: 'Restrict ingress CIDR block to company VPN subnet.',
                  status: 'Vulnerable',
                });
                if (onSelectAgent) onSelectAgent('iac');
                if (onSelectFile) onSelectFile('infra/cluster.tf');
              }}
              style={{
                position: 'absolute',
                left: '585px',
                top: '210px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  border: '1.5px solid #FBBF24',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A' }}>
                  infra/cluster.tf
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706' }}>
                  Public endpoint - Medium
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Layers size={12} color="#2563EB" />
                <span>IaC</span>
              </div>
            </div>

            {/* Leaf 4: Dockerfile -> Scanned - No issues | Container */}
            <div
              onClick={() => {
                setSelectedNode({
                  path: 'Dockerfile',
                  title: 'Container configuration analysis',
                  agent: 'Container Agent (Trivy Linter)',
                  agentBadge: 'Container',
                  severity: 'Clean',
                  ruleId: 'TRIVY_OK',
                  line: 1,
                  findingId: null,
                  codeSnippet: `FROM node:20-alpine\nUSER node\nWORKDIR /app`,
                  remediation: 'No vulnerabilities or elevated permissions detected.',
                  status: 'Clean',
                });
                if (onSelectAgent) onSelectAgent('container');
                if (onSelectFile) onSelectFile('Dockerfile');
              }}
              style={{
                position: 'absolute',
                left: '585px',
                top: '320px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A' }}>
                  Dockerfile
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A' }}>
                  Scanned - No issues
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Box size={12} color="#D97706" />
                <span>Container</span>
              </div>
            </div>

            {/* Leaf 5: openapi.yaml -> Sensitive data exposure - High | SCM */}
            <div
              onClick={() => {
                setSelectedNode({
                  path: 'openapi.yaml',
                  title: 'Sensitive data exposure in API response schema',
                  agent: 'SCM Security Agent',
                  agentBadge: 'SCM',
                  severity: 'High',
                  ruleId: 'CWE-200',
                  line: 54,
                  findingId: 'F-004',
                  codeSnippet: `UserResponse:\n  properties:\n    passwordHash:\n      type: string`,
                  remediation: 'Omit passwordHash from public user serialization DTO.',
                  status: 'Vulnerable',
                });
                if (onSelectAgent) onSelectAgent('scm');
                if (onSelectFile) onSelectFile('openapi.yaml');
              }}
              style={{
                position: 'absolute',
                left: '585px',
                top: '395px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFF1F2',
                  border: '1.5px solid #FDA4AF',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0F172A' }}>
                  openapi.yaml
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#E11D48' }}>
                  Sensitive data exposure - High
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Shield size={12} color="#0284C7" />
                <span>SCM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Live Activity OR Contextual File Inspection Drawer */}
        <div
          style={{
            borderLeft: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {selectedNode ? (
            /* CONTEXTUAL FILE INSPECTION DRAWER */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileCode2 size={15} color="#0F172A" />
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                    File Context
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Close file inspection"
                >
                  <X size={15} />
                </button>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  File Path
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', marginTop: '2px' }}>
                  {selectedNode.path}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: selectedNode.severity === 'Critical' ? '#DC2626' : selectedNode.severity === 'High' ? '#E11D48' : selectedNode.severity === 'Clean' ? '#16A34A' : '#D97706',
                    backgroundColor: selectedNode.severity === 'Critical' ? '#FEF2F2' : selectedNode.severity === 'Clean' ? '#F0FDF4' : '#FFFBEB',
                    border: `1px solid ${selectedNode.severity === 'Critical' ? '#FCA5A5' : selectedNode.severity === 'Clean' ? '#BBF7D0' : '#FDE68A'}`,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {selectedNode.severity}
                </span>

                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  {selectedNode.agentBadge}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  {selectedNode.title}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  {selectedNode.ruleId} • Line {selectedNode.line}
                </div>
              </div>

              {/* Code Evidence snippet */}
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '6px',
                  padding: '10px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#86EFAC',
                  lineHeight: 1.5,
                  overflowX: 'auto',
                }}
              >
                <pre style={{ margin: 0 }}>{selectedNode.codeSnippet}</pre>
              </div>

              <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
                <strong>Remediation:</strong> {selectedNode.remediation}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectAgent) onSelectAgent(selectedNode.agentBadge.toLowerCase());
                    if (onSelectFile) onSelectFile(selectedNode.path);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Inspect in Code Editor</span>
                  <ArrowRight size={12} />
                </button>

                {selectedNode.findingId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectFinding) onSelectFinding(selectedNode.findingId);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Remediate &amp; Fix</span>
                    <Sparkles size={12} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* LIVE ACTIVITY FEED */
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Live Activity
                </span>
              </div>

              {/* Activity items */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '11.5px',
                  fontFamily: "'JetBrains Mono', monospace",
                  overflowY: 'auto',
                  maxHeight: '440px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#64748B' }}>03:53</span>
                  <span style={{ color: '#16A34A' }}>●</span>
                  <span style={{ color: '#0F172A' }}>SAST: Analyzing session.ts</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#64748B' }}>03:51</span>
                  <span style={{ color: '#D97706' }}>●</span>
                  <span style={{ color: '#0F172A' }}>IaC: Scanning cluster.tf</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#64748B' }}>03:49</span>
                  <span style={{ color: '#D97706' }}>●</span>
                  <span style={{ color: '#0F172A' }}>Container: Scanning Dockerfile</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#64748B' }}>03:47</span>
                  <span style={{ color: '#D97706' }}>●</span>
                  <span style={{ color: '#0F172A' }}>SCM: Checking openapi.yaml</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#64748B' }}>03:46</span>
                  <span style={{ color: '#16A34A' }}>●</span>
                  <span style={{ color: '#0F172A' }}>SCA: Analyzing dependencies</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#64748B' }}>03:42</span>
                  <span style={{ color: '#16A34A' }}>●</span>
                  <span style={{ color: '#0F172A' }}>Investigation: Mapping taint sinks</span>
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748B',
                    textAlign: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  + 18 more events
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Phase Stepper (Matching Image 3) */}
      <div
        style={{
          borderTop: '1px solid #E2E8F0',
          padding: '12px 24px',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
        }}
      >
        {/* Phase 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={15} color="#16A34A" />
          <span style={{ fontWeight: 600, color: '#0F172A' }}>Repository Checkout</span>
          <span style={{ color: '#64748B', fontSize: '11px' }}>00:00</span>
        </div>

        {/* Phase 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={15} color="#16A34A" />
          <span style={{ fontWeight: 600, color: '#0F172A' }}>Indexing</span>
          <span style={{ color: '#64748B', fontSize: '11px' }}>00:16</span>
        </div>

        {/* Phase 3: Active */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FEF9C3',
            padding: '4px 10px',
            borderRadius: '16px',
            border: '1px solid #FDE047',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#CA8A04',
            }}
          />
          <span style={{ fontWeight: 700, color: '#854D0E' }}>Security Analysis</span>
          <span style={{ color: '#A16207', fontSize: '11px', fontWeight: 600 }}>
            {elapsedTime} ({progressPercentage}%)
          </span>
        </div>

        {/* Phase 4 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '1.5px solid #CBD5E1',
            }}
          />
          <span>Investigation</span>
        </div>

        {/* Phase 5 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '1.5px solid #CBD5E1',
            }}
          />
          <span>Remediation</span>
        </div>

        {/* Phase 6 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '1.5px solid #CBD5E1',
            }}
          />
          <span>Verification</span>
        </div>
      </div>
    </div>
  );
};

