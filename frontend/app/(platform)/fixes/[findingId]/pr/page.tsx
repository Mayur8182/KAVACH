'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderGit2,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  GitPullRequest,
  Check,
} from 'lucide-react';

export default function PullRequestCreatedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const findingId = (params?.findingId as string) || 'F-001';
  const prUrl = searchParams?.get('url') || 'https://github.com/Mayur8182/KAVACH/pulls';
  const prNumber = searchParams?.get('number') || '1';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        padding: '24px 32px',
        maxWidth: '100%',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Breadcrumbs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#64748B',
          marginBottom: '24px',
        }}
      >
        <Link
          href="/fixes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#64748B',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={13} />
          <span>Fixes</span>
        </Link>
        <ChevronRight size={12} />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Pull Request</span>
      </div>

      {/* 2. Top Hero Banner (Matching Image 1 & 5) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <Check size={24} strokeWidth={2.6} />
        </div>

        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Your fix is ready for review on GitHub
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
            A pull request has been created with the remediation for {findingId}.
          </p>
        </div>
      </div>

      {/* 3. Pull Request Detail Card (Matching Image 1 & 5) */}
      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          marginBottom: '32px',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderGit2 size={18} color="#0F172A" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Pull Request #{prNumber}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#F0FDF4',
                color: '#16A34A',
                border: '1px solid #BBF7D0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
              Created
            </span>
          </div>

          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#0F172A',
              textDecoration: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #CBD5E1',
            }}
          >
            <span>View on GitHub</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Card Details Table */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Branch */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              padding: '14px 24px',
              borderBottom: '1px solid #F8FAFC',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#64748B', fontWeight: 500 }}>Branch</span>
            <span style={{ color: '#0F172A', fontWeight: 600, fontFamily: 'monospace' }}>
              kavach/fix/sql-injection-{findingId.toLowerCase()}
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              padding: '14px 24px',
              borderBottom: '1px solid #F8FAFC',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#64748B', fontWeight: 500 }}>Title</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>
              Fix: prevent SQL injection in sign-in query
            </span>
          </div>

          {/* Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              padding: '14px 24px',
              borderBottom: '1px solid #F8FAFC',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#64748B', fontWeight: 500 }}>Summary</span>
            <span style={{ color: '#475569' }}>
              Use a parameterized query to safely handle user input.
            </span>
          </div>

          {/* Linked finding */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              padding: '14px 24px',
              borderBottom: '1px solid #F8FAFC',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#64748B', fontWeight: 500 }}>Linked finding</span>
            <span style={{ color: '#0F172A', fontWeight: 500 }}>
              {findingId} - SQL injection in sign-in query (Confirmed)
            </span>
          </div>

          {/* Verification */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              padding: '14px 24px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#64748B', fontWeight: 500 }}>Verification</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#16A34A" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>Build passed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#16A34A" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>Tests passed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#16A34A" />
                <span style={{ color: '#0F172A', fontWeight: 600 }}>Rescan: no longer detected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Buttons (Matching Image 1 & 5) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
        <Link
          href="/findings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            color: '#0F172A',
            fontSize: '13px',
            fontWeight: 600,
            padding: '9px 18px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            textDecoration: 'none',
          }}
        >
          <span>Back to findings</span>
        </Link>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#16A34A',
            color: '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 600,
            padding: '10px 22px',
            borderRadius: '7px',
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803D')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16A34A')}
        >
          <span>View pull request on GitHub</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

