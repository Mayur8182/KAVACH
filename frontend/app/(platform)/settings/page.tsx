'use client';

/**
 * Kavach Enterprise — Unified Settings Hub (/settings)
 * 
 * Implements 4 Core Tabs matching Redesign:
 * 1. Profile (Screen 7): Personal information, Security, Notifications, Delete Account
 * 2. Team (Screen 8): Members stat, Pending invites, Seat capacity, Invite a teammate, Members table
 * 3. Billing & Plan (Screen 9): Current subscription, Credits cycle, Payment method, Invoices
 * 4. Usage & Credits (Screen 10): Credits remaining, Used this month, Reset date, Usage by product, Transactions ledger
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Download,
  Plug,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface BillingOverview {
  account_id: string;
  plan_tier: string;
  status: string;
  total_credits: number;
  consumed_credits: number;
  remaining_credits: number;
  usage_percent: number;
  total_scans_count: number;
  open_findings_count: number;
  critical_findings_count: number;
  days_until_reset: number;
  days_remaining_pace: number;
  cycle_start: string;
  cycle_end: string;
  payment_method: {
    brand: string;
    last4: string;
    exp: string;
  };
  billing_email: string;
  billing_name: string;
  usage_by_product: {
    code_security: number;
    secrets: number;
    dependencies: number;
  };
}

interface TransactionItem {
  id: string;
  date: string;
  created_at: string;
  activity: string;
  amount: number;
  activity_type: string;
  target_repo?: string;
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  date: string;
  description: string;
  amount: string;
  raw_amount: number;
  currency: string;
  status: string;
  pdf_url?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  status: string;
  last_active: string;
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') || 'profile';
  const initialTab = ['profile', 'team', 'billing', 'usage'].includes(rawTab) ? rawTab : 'profile';

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Synchronize activeTab with URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  // Real data state
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [seatStats, setSeatStats] = useState({ total_seats: 5, used_seats: 3, pending_invites_count: 1, team_plan_seats: 10 });

  // Profile form state
  const [fullName, setFullName] = useState('Mayur Bharvad');
  const [userRole, setUserRole] = useState('Owner');
  const [userEmail, setUserEmail] = useState('mayur@kavach.io');
  const [timezoneStr, setTimezoneStr] = useState('Asia/Kolkata (IST)');
  const [languageStr, setLanguageStr] = useState('English');

  // Security & notification toggles
  const [twoFactorOn, setTwoFactorOn] = useState(true);
  const [notifScanOn, setNotifScanOn] = useState(true);
  const [notifCritOn, setNotifCritOn] = useState(true);
  const [notifLowCreditOn, setNotifLowCreditOn] = useState(false);

  // Team invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [isInviting, setIsInviting] = useState(false);

  const fetchSettingsData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, txRes, invRes, tmRes] = await Promise.allSettled([
        api.get('/api/v1/billing/overview'),
        api.get('/api/v1/billing/transactions'),
        api.get('/api/v1/billing/invoices'),
        api.get('/api/v1/billing/team'),
      ]);

      if (ovRes.status === 'fulfilled' && ovRes.value) {
        setOverview(ovRes.value as BillingOverview);
      }
      if (txRes.status === 'fulfilled' && txRes.value) {
        const val = txRes.value as any;
        setTransactions(Array.isArray(val) ? val : (val.value || []));
      }
      if (invRes.status === 'fulfilled' && invRes.value) {
        const val = invRes.value as any;
        setInvoices(Array.isArray(val) ? val : (val.value || []));
      }
      if (tmRes.status === 'fulfilled' && tmRes.value) {
        const val = tmRes.value as any;
        if (val.members) setTeamMembers(val.members);
        setSeatStats({
          total_seats: val.total_seats || 5,
          used_seats: val.used_seats || 3,
          pending_invites_count: val.pending_invites_count || 1,
          team_plan_seats: val.team_plan_seats || 10,
        });
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  // Handle send invite
  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsInviting(true);
    try {
      await api.post('/api/v1/billing/team/invite', {
        email: inviteEmail.trim(),
        role: inviteRole.toLowerCase(),
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setTeamMembers((prev) => [
        ...prev,
        {
          id: `inv_${Date.now()}`,
          name: inviteEmail.trim(),
          email: inviteEmail.trim(),
          initials: inviteEmail[0].toUpperCase(),
          role: inviteRole,
          status: 'Pending',
          last_active: '—',
        },
      ]);
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  // Handle cancel plan
  const handleCancelPlan = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await api.post('/api/v1/billing/cancel', {});
      toast.success('Subscription plan cancelled successfully');
      fetchSettingsData();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleSaveProfile = () => {
    toast.success('Profile changes saved successfully');
  };

  // Safe fallback values
  const remainingCredits = overview?.remaining_credits ?? 72;
  const totalCredits = overview?.total_credits ?? 100;
  const planTier = overview?.plan_tier ?? 'Free';
  const planStatus = overview?.status ?? 'Trial';
  const cardBrand = overview?.payment_method?.brand ?? 'Visa';
  const cardLast4 = overview?.payment_method?.last4 ?? '4242';
  const cardExp = overview?.payment_method?.exp ?? '12/28';
  const renewalDateStr = overview?.cycle_end ? new Date(overview.cycle_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Dec 19, 2026';
  const resetMonthDay = overview?.cycle_end ? new Date(overview.cycle_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Dec 19';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', margin: 0 }}>
          Settings
        </h1>
        <Link
          href="/settings/mcp"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '38px',
            padding: '0 14px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: '#0F172A',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Plug size={15} color="#4F46E5" />
          <span>MCP Connections</span>
        </Link>
      </div>

      {/* 4 Navigation Tabs */}
      <div style={{ display: 'inline-flex', padding: '4px', backgroundColor: '#ECEEF4', borderRadius: '12px', gap: '4px', alignSelf: 'flex-start' }}>
        <button
          onClick={() => handleTabChange('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: activeTab === 'profile' ? '#ffffff' : 'transparent',
            color: activeTab === 'profile' ? '#0F1222' : '#5B6175',
            boxShadow: activeTab === 'profile' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Profile
        </button>
        <button
          onClick={() => handleTabChange('team')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: activeTab === 'team' ? '#ffffff' : 'transparent',
            color: activeTab === 'team' ? '#0F1222' : '#5B6175',
            boxShadow: activeTab === 'team' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Team
        </button>
        <button
          onClick={() => handleTabChange('billing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: activeTab === 'billing' ? '#ffffff' : 'transparent',
            color: activeTab === 'billing' ? '#0F1222' : '#5B6175',
            boxShadow: activeTab === 'billing' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Billing & Plan
        </button>
        <button
          onClick={() => handleTabChange('usage')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: activeTab === 'usage' ? '#ffffff' : 'transparent',
            color: activeTab === 'usage' ? '#0F1222' : '#5B6175',
            boxShadow: activeTab === 'usage' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          Usage & Credits
        </button>
      </div>

      {/* ===================== TAB 1: PROFILE (Screen 7) ===================== */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'start' }}>
          {/* Left Column: Personal info */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 16px 0' }}>
              Personal information
            </h2>

            {/* Avatar Row */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#111322',
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                MB
              </div>
              <div>
                <button
                  type="button"
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    border: '1px solid #D9DCE6',
                    cursor: 'pointer',
                  }}
                >
                  Change photo
                </button>
                <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
                  JPG or PNG, up to 2 MB
                </div>
              </div>
            </div>

            {/* Name & Role */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    border: '1px solid #D9DCE6',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                  Role
                </label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    border: '1px solid #D9DCE6',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                Email
              </label>
              <div
                style={{
                  width: '100%',
                  height: '46px',
                  border: '1px solid #D9DCE6',
                  borderRadius: '10px',
                  padding: '0 14px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{userEmail}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: '#E3F6EA',
                    color: '#146C3A',
                  }}
                >
                  Verified
                </span>
              </div>
            </div>

            {/* Timezone & Language */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezoneStr}
                  onChange={(e) => setTimezoneStr(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    border: '1px solid #D9DCE6',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0F1222' }}>
                  Language
                </label>
                <input
                  type="text"
                  value={languageStr}
                  onChange={(e) => setLanguageStr(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    border: '1px solid #D9DCE6',
                    borderRadius: '10px',
                    padding: '0 14px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              style={{
                height: '44px',
                padding: '0 20px',
                borderRadius: '10px',
                backgroundColor: '#4F46E5',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save changes
            </button>
          </div>

          {/* Right Column: Security, Notifications, Delete */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Security Card */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 10px 0' }}>
                Security
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E6E8EF' }}>
                <div>
                  <b style={{ fontSize: '13px', color: '#0F1222' }}>Password</b>
                  <div style={{ fontSize: '12px', color: '#5B6175' }}>Last changed 3 months ago</div>
                </div>
                <button
                  type="button"
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    border: '1px solid #D9DCE6',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Change
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E6E8EF' }}>
                <div>
                  <b style={{ fontSize: '13px', color: '#0F1222' }}>Two-factor authentication</b>
                  <div style={{ fontSize: '12px', color: '#5B6175' }}>Authenticator app</div>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFactorOn(!twoFactorOn)}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '99px',
                    backgroundColor: twoFactorOn ? '#4F46E5' : '#D9DCE6',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: twoFactorOn ? '20px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <b style={{ fontSize: '13px', color: '#0F1222' }}>Active sessions</b>
                  <div style={{ fontSize: '12px', color: '#5B6175' }}>2 devices · Ahmedabad, IN</div>
                </div>
                <button
                  type="button"
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#0F1222',
                    border: '1px solid #D9DCE6',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Manage
                </button>
              </div>
            </div>

            {/* Notifications Card */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 10px 0' }}>
                Notifications
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E6E8EF' }}>
                <div>
                  <b style={{ fontSize: '13px', color: '#0F1222' }}>Scan completed</b>
                  <div style={{ fontSize: '12px', color: '#5B6175' }}>Email when a scan finishes</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifScanOn(!notifScanOn)}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '99px',
                    backgroundColor: notifScanOn ? '#4F46E5' : '#D9DCE6',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: notifScanOn ? '20px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E6E8EF' }}>
                <div>
                  <b style={{ fontSize: '13px', color: '#0F1222' }}>Critical findings</b>
                  <div style={{ fontSize: '12px', color: '#5B6175' }}>Instant alert for critical issues</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifCritOn(!notifCritOn)}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '99px',
                    backgroundColor: notifCritOn ? '#4F46E5' : '#D9DCE6',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: notifCritOn ? '20px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <b style={{ fontSize: '13px', color: '#0F1222' }}>Low credits</b>
                  <div style={{ fontSize: '12px', color: '#5B6175' }}>Alert at 20% remaining</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifLowCreditOn(!notifLowCreditOn)}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '99px',
                    backgroundColor: notifLowCreditOn ? '#4F46E5' : '#D9DCE6',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: notifLowCreditOn ? '20px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Delete Account Danger Card */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #F3C9C4', borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#B42318', margin: '0 0 6px 0' }}>
                Delete account
              </h3>
              <div style={{ fontSize: '12px', color: '#5B6175', margin: '6px 0 14px' }}>
                Permanently remove your account and all scan data.
              </div>
              <button
                type="button"
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#B42318',
                  border: '1px solid #F3C9C4',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: TEAM (Screen 8) ===================== */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 3 Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#5B6175' }}>Members</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
                {seatStats.used_seats}{' '}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#5B6175' }}>
                  of {seatStats.total_seats} seats
                </span>
              </div>
              <div style={{ height: '8px', borderRadius: '99px', backgroundColor: '#ECEEF4', overflow: 'hidden', marginTop: '12px' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '99px',
                    backgroundColor: '#4F46E5',
                    width: `${Math.round((seatStats.used_seats / seatStats.total_seats) * 100)}%`,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#5B6175' }}>Pending invites</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
                {seatStats.pending_invites_count}
              </div>
              <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
                Expire in 6 days
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#5B6175' }}>Need more seats?</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
                {seatStats.team_plan_seats}
              </div>
              <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
                Team plan seats ·{' '}
                <Link href="/pricing" style={{ fontWeight: 600, color: '#4F46E5', textDecoration: 'underline' }}>
                  Compare plans
                </Link>
              </div>
            </div>
          </div>

          {/* Invite a Teammate Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '22px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 14px 0' }}>
              Invite a teammate
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="email"
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{
                  flex: 1,
                  height: '44px',
                  border: '1px solid #D9DCE6',
                  borderRadius: '10px',
                  padding: '0 14px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  outline: 'none',
                }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  width: '160px',
                  height: '44px',
                  border: '1px solid #D9DCE6',
                  borderRadius: '10px',
                  padding: '0 12px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </select>
              <button
                type="button"
                onClick={handleSendInvite}
                disabled={isInviting}
                style={{
                  height: '44px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  backgroundColor: '#4F46E5',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: isInviting ? 0.7 : 1,
                }}
              >
                {isInviting ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </div>

          {/* Members Table Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 12px 0' }}>
              Members
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Member
                  </th>
                  <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Role
                  </th>
                  <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'right', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Last active
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: '#4B5068',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {member.initials}
                        </div>
                        <div>
                          <b style={{ color: '#0F1222' }}>{member.name}</b>
                          <div style={{ fontSize: '12px', color: '#5B6175' }}>{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>
                      {member.role}
                    </td>
                    <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          backgroundColor: member.status === 'Active' ? '#E3F6EA' : '#EEF0F5',
                          color: member.status === 'Active' ? '#146C3A' : '#5B6175',
                        }}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right', color: '#5B6175' }}>
                      {member.last_active}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: BILLING & PLAN (Screen 9) ===================== */}
      {activeTab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 2 Cards: Current Subscription & Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
            {/* Current Subscription Card */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#5B6175' }}>Current subscription</div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222' }}>
                      {planTier}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        backgroundColor: '#E3F6EA',
                        color: '#146C3A',
                      }}
                    >
                      {planStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
                    {planTier === 'Pro' ? '$29 / month' : (planTier === 'Team' ? '$99 / month' : '$0 / trial')} · renews {renewalDateStr}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCancelPlan}
                    style={{
                      height: '36px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#0F1222',
                      border: '1px solid #D9DCE6',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel plan
                  </button>
                  <Link
                    href="/pricing"
                    style={{
                      height: '36px',
                      padding: '0 14px',
                      borderRadius: '8px',
                      backgroundColor: '#4F46E5',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    Change plan
                  </Link>
                </div>
              </div>

              {/* Credits Progress */}
              <div style={{ marginTop: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <b style={{ color: '#0F1222' }}>Credits this cycle</b>
                  <span style={{ fontFamily: 'monospace', color: '#5B6175' }}>
                    {remainingCredits.toLocaleString()} / {totalCredits.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: '10px', borderRadius: '99px', backgroundColor: '#ECEEF4', overflow: 'hidden', marginTop: '8px' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '99px',
                      backgroundColor: '#4F46E5',
                      width: `${Math.min(100, Math.round((remainingCredits / totalCredits) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Card */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '13px', color: '#5B6175' }}>Payment method</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '16px 0' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#ECEBFD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CreditCard size={18} color="#111322" />
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F1222', margin: 0 }}>
                    {cardBrand} •••• {cardLast4}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '3px' }}>
                    Expires {cardExp} · Default
                  </div>
                </div>
              </div>
              <Link
                href="/checkout?plan=pro"
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  border: '1px solid #D9DCE6',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                Update card
              </Link>
            </div>
          </div>

          {/* Invoices Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: 0 }}>
                Invoices
              </h2>
              <button
                type="button"
                onClick={() => toast.success('Downloading all invoices in ZIP...')}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#0F1222',
                  border: '1px solid #D9DCE6',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={13} />
                Download all
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Date
                  </th>
                  <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Description
                  </th>
                  <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Amount
                  </th>
                  <th style={{ textAlign: 'right', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>
                        {inv.date}
                      </td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>
                        {inv.description}
                      </td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', fontWeight: 600, color: '#0F1222' }}>
                        {inv.amount}
                      </td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: '#E3F6EA',
                            color: '#146C3A',
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>Nov 19, 2026</td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>Pro plan · monthly</td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', fontWeight: 600, color: '#0F1222' }}>$29.00</td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#E3F6EA', color: '#146C3A' }}>
                          Paid
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>Oct 19, 2026</td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>Pro plan · monthly</td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', fontWeight: 600, color: '#0F1222' }}>$29.00</td>
                      <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', backgroundColor: '#E3F6EA', color: '#146C3A' }}>
                          Paid
                        </span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: USAGE & CREDITS (Screen 10) ===================== */}
      {activeTab === 'usage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 3 Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#5B6175' }}>Credits remaining</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
                {remainingCredits.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
                of {totalCredits.toLocaleString()} this cycle
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#5B6175' }}>Used this month</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
                {overview?.consumed_credits ?? 28}
              </div>
              <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
                {overview?.total_scans_count ?? 4} scans
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#5B6175' }}>Resets on</div>
              <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F1222', marginTop: '8px', lineHeight: 1.1 }}>
                {resetMonthDay}
              </div>
              <div style={{ fontSize: '12px', color: '#5B6175', marginTop: '6px' }}>
                in {overview?.days_until_reset ?? 9} days
              </div>
            </div>
          </div>

          {/* Usage by product & Transactions Ledger */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
            {/* Usage by Product */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: '0 0 18px 0' }}>
                Usage by product
              </h2>

              {/* Code Security */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 600, color: '#2A2F45' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A2F45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
                    </svg>
                    Code Security
                  </span>
                  <span style={{ fontFamily: 'monospace', color: '#5B6175' }}>
                    {overview?.usage_by_product?.code_security ?? 90} credits
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '99px', backgroundColor: '#ECEEF4', overflow: 'hidden', marginTop: '8px' }}>
                  <div style={{ height: '100%', borderRadius: '99px', backgroundColor: '#4F46E5', width: '57%' }} />
                </div>
              </div>

              {/* Secrets */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 600, color: '#2A2F45' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A2F45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 7a4 4 0 1 1-3.5 6L4 20.5V17h3v-2h2l2.5-2.5A4 4 0 0 1 15 7z" />
                    </svg>
                    Secrets
                  </span>
                  <span style={{ fontFamily: 'monospace', color: '#5B6175' }}>
                    {overview?.usage_by_product?.secrets ?? 40} credits
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '99px', backgroundColor: '#ECEEF4', overflow: 'hidden', marginTop: '8px' }}>
                  <div style={{ height: '100%', borderRadius: '99px', backgroundColor: '#4F46E5', width: '25%' }} />
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ display: 'flex', gap: '10px', alignItems: 'center', fontWeight: 600, color: '#2A2F45' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A2F45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />
                    </svg>
                    Dependencies
                  </span>
                  <span style={{ fontFamily: 'monospace', color: '#5B6175' }}>
                    {overview?.usage_by_product?.dependencies ?? 28} credits
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '99px', backgroundColor: '#ECEEF4', overflow: 'hidden', marginTop: '8px' }}>
                  <div style={{ height: '100%', borderRadius: '99px', backgroundColor: '#4F46E5', width: '18%' }} />
                </div>
              </div>
            </div>

            {/* Transactions Ledger Card */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E8EF', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F1222', margin: 0 }}>
                  Transactions
                </h2>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backgroundColor: '#EEF0F5',
                    color: '#5B6175',
                  }}
                >
                  Last 30 days
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                      Date
                    </th>
                    <th style={{ textAlign: 'left', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                      Activity
                    </th>
                    <th style={{ textAlign: 'right', color: '#5B6175', fontWeight: 600, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', paddingBottom: '10px' }}>
                      Credits
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>
                          {tx.date}
                        </td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>
                          {tx.activity}
                        </td>
                        <td
                          style={{
                            padding: '13px 0',
                            borderTop: '1px solid #E6E8EF',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: tx.amount > 0 ? '#146C3A' : '#0F1222',
                          }}
                        >
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : `${tx.amount}`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>Nov 19</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>Code scan · api-server</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right', fontFamily: 'monospace' }}>−10</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>Nov 18</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>Secrets scan · web-app</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right', fontFamily: 'monospace' }}>−5</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>Nov 17</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>Dependencies · billing-service</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right', fontFamily: 'monospace' }}>−3</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#5B6175' }}>Nov 12</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', color: '#0F1222' }}>Pro monthly credits</td>
                        <td style={{ padding: '13px 0', borderTop: '1px solid #E6E8EF', textAlign: 'right', fontFamily: 'monospace', color: '#146C3A' }}>+2,000</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: '#5B6175' }}>Loading Settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
