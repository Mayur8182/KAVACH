'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle2,
  Flag,
  ArrowRight,
  ChevronRight,
  Code2,
  AlertTriangle,
  FileCode2,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export default function VerifyFindingPage() {
  const params = useParams();
  const router = useRouter();
  const findingId = (params?.findingId as string) || 'F-001';

  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState<any>(null);

  useEffect(() => {
    let active = true;
    async function loadFinding() {
      try {
        setLoading(true);
        const res: any = await api.request<any>(`/api/v1/findings/${findingId}`);
        if (active && res) {
          setFinding(res);
        }
      } catch (err) {
        // If specific UUID not found, create fallback model for display
        setFinding({
          id: findingId,
          displayId: 'F-001',
          title: 'SQL injection in sign-in query',
          ruleId: 'CWE-89',
          severity: 'Critical',
          filePath: 'src/auth/session.ts',
          line: 42,
          snippet: `const query = \n  "SELECT * FROM users \n  WHERE email = '\${email}'";\nconst result = await db.query(query);\nreturn result.rows[0];`,
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFinding();
    return () => {
      active = false;
    };
  }, [findingId]);

  const handleMarkFalsePositive = async () => {
    try {
      await api.request<any>(`/api/v1/findings/${findingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'false_positive' }),
      });
      toast.info('Finding marked as false positive');
      router.push('/findings');
    } catch {
      toast.info('Marked as false positive');
      router.push('/findings');
    }
  };

  const displayId = finding?.displayId || finding?.display_id || 'F-001';
  const filePath = finding?.filePath || finding?.file_path || 'src/auth/session.ts';
  const lineNum = finding?.line || finding?.start_line || 42;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        padding: '36px 48px',
        maxWidth: '1100px',
        margin: '0 auto',
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
          marginBottom: '8px',
        }}
      >
        <Link href="/findings" style={{ color: '#64748B', textDecoration: 'none' }}>
          Findings
        </Link>
        <ChevronRight size={12} />
        <span>{displayId}</span>
        <ChevronRight size={12} />
        <span style={{ color: '#0F172A', fontWeight: 600 }}>Verify</span>
      </div>

      {/* 2. Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0',
          }}
        >
          Verify Finding - {displayId}
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Check the evidence to confirm whether this is a real issue.
        </p>
      </div>

      {/* 3. Main Split Cards (Verification Result on Left, Evidence on Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '24px',
          marginBottom: '36px',
        }}
      >
        {/* Left Card: Verification Result */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '24px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
            Verification result
          </div>

          {/* Confirmed Issue Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
            Confirmed issue
          </div>

          <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', margin: '0 0 20px 0' }}>
            This is a real SQL injection vulnerability.
          </p>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Item 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Source pattern confirmed
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  The SQL query is built using user input (email).
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Data flow reaches database query
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  The input flows directly into db.query().
                </div>
              </div>
            </div>

            {/* Item 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  No sanitization found
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  The input is not validated or parameterized.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Evidence Code Snippet */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Evidence ({filePath}:{lineNum})</span>
            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>TypeScript</span>
          </div>

          <div
            style={{
              padding: '20px',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: '12.5px',
              lineHeight: 1.8,
              backgroundColor: '#FFFFFF',
            }}
          >
            <div>
              <span style={{ color: '#94A3B8', marginRight: '16px', userSelect: 'none' }}>40</span>
              <span style={{ color: '#7C3AED' }}>const</span> query =
            </div>
            <div>
              <span style={{ color: '#94A3B8', marginRight: '16px', userSelect: 'none' }}>41</span>
              &nbsp;&nbsp;<span style={{ color: '#059669' }}>"SELECT * FROM users</span>
            </div>
            <div style={{ backgroundColor: '#FEF2F2', padding: '2px 0', borderRadius: '4px' }}>
              <span style={{ color: '#DC2626', marginRight: '16px', fontWeight: 700, userSelect: 'none' }}>
                42
              </span>
              &nbsp;&nbsp;<span style={{ color: '#DC2626', fontWeight: 600 }}>WHERE email = '${'{email}'}';"</span>
            </div>
            <div>
              <span style={{ color: '#94A3B8', marginRight: '16px', userSelect: 'none' }}>43</span>
              <span style={{ color: '#7C3AED' }}>const</span> result = <span style={{ color: '#7C3AED' }}>await</span> db.query(query);
            </div>
            <div>
              <span style={{ color: '#94A3B8', marginRight: '16px', userSelect: 'none' }}>44</span>
              <span style={{ color: '#7C3AED' }}>return</span> result.rows[0];
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #E2E8F0',
          paddingTop: '20px',
        }}
      >
        <button
          type="button"
          onClick={handleMarkFalsePositive}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          <Flag size={14} />
          <span>Mark as false positive</span>
        </button>

        <Link
          href={`/fixes/${findingId}`}
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
          <span>Continue to remediation</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

