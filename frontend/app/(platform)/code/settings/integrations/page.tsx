'use client';

/**
 * Thing Code — Unified Integrations Hub (/code/settings/integrations)
 * 
 * Provides unified access across all Code Security integration domains:
 * 1. Security Jobs & Pipeline Tools (23 integrations via /code/jobs)
 * 2. Secrets & Vault Management (/code/secrets/integrations)
 * 3. Infrastructure as Code (IaC) Workspaces (/code/iac/integrations)
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Link2,
  Sliders,
  FileCheck2,
  ShieldCheck,
  Workflow,
  Key,
  Layers,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function UnifiedSettingsIntegrationsPage() {
  const [activeDomain, setActiveDomain] = useState<'all' | 'jobs' | 'secrets' | 'iac'>('all');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Top Header */}
      <div style={{ padding: '16px 24px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Code Security Integrations Hub</h2>
          <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0' }}>Manage VCS connections, secret vaults, CI/CD pipelines, and alerting gateways.</p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0 24px', display: 'flex', gap: '24px' }}>
        <Link
          href="/code/settings"
          style={{
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748B',
            borderBottom: '2px solid transparent',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sliders size={14} />
          Scanners &amp; Gates
        </Link>
        <Link
          href="/code/settings/policies"
          style={{
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748B',
            borderBottom: '2px solid transparent',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileCheck2 size={14} />
          Policies &amp; Enforcement
        </Link>
        <Link
          href="/code/settings/compliance"
          style={{
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748B',
            borderBottom: '2px solid transparent',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={14} />
          Compliance Frameworks
        </Link>
        <Link
          href="/code/settings/integrations"
          style={{
            padding: '12px 2px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#2563EB',
            borderBottom: '2px solid #2563EB',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Link2 size={14} />
          Integrations Hub
        </Link>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1080px' }}>
        {/* Banner */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <Link2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Centralized Integrations Suite
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Connect your developer tools, secrets managers, and infrastructure pipelines to enable real automated security enforcement.
              </p>
            </div>
          </div>
          <Link
            href="/code/jobs"
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Manage Security Jobs Tools <ArrowRight size={14} />
          </Link>
        </div>

        {/* 3 Domain Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* Card 1: Security Jobs & Automation */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <Workflow size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Security Jobs &amp; Alerting</h4>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>23 Configured &amp; Available Tools</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                GitHub, GitLab, Bitbucket, Slack, Jira, Datadog, and Docker Hub integrations to automate security job schedules and alert pipelines.
              </p>
            </div>
            <Link
              href="/code/jobs"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
                paddingTop: '12px',
                borderTop: '1px solid #F1F5F9',
              }}
            >
              <span>Open Tool Connector</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Card 2: Secrets & Vault Rotation */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                  <Key size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Secrets &amp; Vaults</h4>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Rotation Rules &amp; Sync</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                HashiCorp Vault, AWS Secrets Manager, and 1Password integration with automatic secret rotation rules and leak suppression.
              </p>
            </div>
            <Link
              href="/code/secrets/integrations"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
                paddingTop: '12px',
                borderTop: '1px solid #F1F5F9',
              }}
            >
              <span>Manage Secret Rotation</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Card 3: IaC & Cloud Providers */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333EA' }}>
                  <Layers size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Infrastructure as Code</h4>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Terraform &amp; Cloud Gateways</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Terraform Cloud, AWS, Spacelift, and Kubernetes cluster integrations to scan cloud infrastructure templates pre-deployment.
              </p>
            </div>
            <Link
              href="/code/iac/integrations"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
                paddingTop: '12px',
                borderTop: '1px solid #F1F5F9',
              }}
            >
              <span>Configure IaC Workspaces</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Global Connection Info */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              Zero-Trust Deterministic Security Enforcement
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>
            Every integration token is securely stored and never exposed in plaintext. When tools are connected, SecuLayer validates connectivity with live latency probes and records immutable audit log events.
          </p>
        </div>
      </div>
    </div>
  );
}
