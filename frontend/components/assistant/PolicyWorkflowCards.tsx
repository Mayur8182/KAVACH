'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  Check,
  CheckCircle2,
  Loader2,
  FileText,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/lib/toast';

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 06: Policy Proposal Preview Card
// ─────────────────────────────────────────────────────────────────────────────
interface PolicyProposalCardProps {
  policyTitle: string;
  rules: string[];
  onCreateAndEnforce: () => void;
  onEdit?: () => void;
}

export function PolicyProposalCard({
  policyTitle,
  rules,
  onCreateAndEnforce,
  onEdit,
}: PolicyProposalCardProps) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: '#FFF7ED',
            border: '1px solid #FFEDD5',
            color: '#EA580C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Shield size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {policyTitle}
          </h3>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rules.map((rule, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#64748B' }} />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
        <button
          type="button"
          onClick={() => {
            if (onEdit) onEdit();
            else toast.info('Opening policy configuration editor');
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          Edit before creation
        </button>

        <button
          type="button"
          id="create-and-enforce-policy-btn"
          onClick={onCreateAndEnforce}
          style={{
            padding: '8px 18px',
            backgroundColor: '#0F172A',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>Create and Enforce</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 07: Policy Creation & Enforcement Progress Timeline
// ─────────────────────────────────────────────────────────────────────────────
interface PolicyEnforcementProgressCardProps {
  currentStepIndex: number; // 0..4
}

export function PolicyEnforcementProgressCard({ currentStepIndex }: PolicyEnforcementProgressCardProps) {
  const steps = [
    'Generating policy (Terraform / IAM)',
    'Validating policy syntax',
    'Applying policy to AWS accounts',
    'Verifying enforcement',
    'Sending notification to Slack',
  ];

  return (
    <div
      style={{
        marginTop: 14,
        padding: '20px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Creating and enforcing policy...
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          Kavach agents are configuring the policy across your AWS accounts.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {steps.map((label, idx) => {
          const isDone = idx < currentStepIndex;
          const isInProgress = idx === currentStepIndex;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isDone ? (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </div>
                ) : isInProgress ? (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#F97316',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Loader2 size={13} className="animate-spin" />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: '2px solid #CBD5E1',
                    }}
                  />
                )}
                <span
                  style={{
                    color: isDone || isInProgress ? '#0F172A' : '#94A3B8',
                    fontWeight: isInProgress ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDone ? '#16A34A' : isInProgress ? '#F97316' : '#94A3B8',
                }}
              >
                {isDone ? 'Completed' : isInProgress ? 'In progress...' : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 08: Policy Created and Enforced Card
// ─────────────────────────────────────────────────────────────────────────────
interface PolicySuccessCardProps {
  policyTitle: string;
  appliedTo: string;
  enforcedVia: string;
  createdAt: string;
  createdBy: string;
  statusBadge?: string;
  policyId?: string;
}

export function PolicySuccessCard({
  policyTitle,
  appliedTo,
  enforcedVia,
  createdAt,
  createdBy,
  statusBadge = 'Active',
  policyId,
}: PolicySuccessCardProps) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: '24px 28px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        textAlign: 'center',
      }}
    >
      {/* Big Green Check Circle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={28} strokeWidth={3} />
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
        Policy created and enforced successfully!
      </h2>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
        The policy is now active across all connected AWS accounts.
      </p>

      {/* Policy Details Inner Box */}
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto 20px',
          padding: '16px 20px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: '#FFF7ED',
              border: '1px solid #FFEDD5',
              color: '#EA580C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={22} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              {policyTitle}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              Applied to: <span style={{ fontWeight: 600, color: '#334155' }}>{appliedTo}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Enforced via: <span style={{ fontWeight: 600, color: '#334155' }}>{enforcedVia}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Created at: {createdAt}
            </div>
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Created by: {createdBy}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 9999,
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
          }}
        >
          {statusBadge}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <Link
          href="/policies"
          style={{
            padding: '9px 18px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          View policy
        </Link>

        <Link
          href="/policies"
          style={{
            padding: '9px 18px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Edit policy
        </Link>
      </div>
    </div>
  );
}
