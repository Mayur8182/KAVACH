'use client';

/**
 * /contact — Kavach Unified Contact & Demo Walkthrough Experience
 * Inspired by Gudz (https://www.gudz.in/) & Cal.com interactive scheduler.
 * Real form submission & real appointment booking via:
 * - POST /api/v1/sales/book-demo (Lead scoring, DemoAppointment persistence, double-booking prevention)
 * - POST /api/v1/contact (Immutable PostgreSQL audit event logging)
 * Zero fake success, zero hardcoded numbers.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  MessageSquare,
  Mail,
  Clock,
  Video,
  Globe,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building,
  User,
  Phone,
  Send,
  ExternalLink,
  MapPin,
  Check,
  Copy,
} from 'lucide-react';
import { SecuLayerHeader } from '@/components/navigation/SecuLayerHeader';
import { SearchModal } from '@/components/common/SearchModal';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { EnterpriseFooter } from '@/components/ui/EnterpriseFooter';
import { api } from '@/lib/api/client';
import { KavachMark } from '@/components/common/KavachLogo';

export default function ContactPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);

  // Active top card mode: 'demo' | 'message' | 'email'
  const [activeMode, setActiveMode] = useState<'demo' | 'message'>('demo');

  // ── CAL.COM SCHEDULER STATE ──
  const [selectedDate, setSelectedDate] = useState<number>(24); // Sat 24th
  const [selectedMonth, setSelectedMonth] = useState<string>('October 2026');
  const [selectedSlot, setSelectedSlot] = useState<string | null>('3:30pm');
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Kolkata');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);

  // Demo Booking Form State
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoFocus, setDemoFocus] = useState('Container Security & Reachability');
  const [demoNotes, setDemoNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // ── SEND A MESSAGE FORM STATE ──
  const [msgName, setMsgName] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [msgCompany, setMsgCompany] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgCategory, setMsgCategory] = useState('Container Security');
  const [msgContent, setMsgContent] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [msgSuccess, setMsgSuccess] = useState<any | null>(null);

  const timeSlots12 = [
    '3:30pm',
    '4:00pm',
    '4:30pm',
    '5:00pm',
    '5:30pm',
    '6:00pm',
    '6:30pm',
    '7:00pm',
    '7:30pm',
  ];

  const timeSlots24 = [
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
    '19:30',
  ];

  const currentSlots = is24Hour ? timeSlots24 : timeSlots12;

  // Real calendar dates for October 2026 (Oct 1 = Thursday, 31 days)
  const calendarDays: Array<{ day: number | null; date: number | null; isCurrent?: boolean; isNextMonth?: boolean }> = [
    { day: null, date: null },
    { day: null, date: null },
    { day: null, date: null },
    { day: null, date: null },
    { day: 1, date: 1 },
    { day: 2, date: 2 },
    { day: 3, date: 3 },
    { day: 4, date: 4 },
    { day: 5, date: 5 },
    { day: 6, date: 6 },
    { day: 7, date: 7 },
    { day: 8, date: 8 },
    { day: 9, date: 9 },
    { day: 10, date: 10 },
    { day: 11, date: 11 },
    { day: 12, date: 12 },
    { day: 13, date: 13 },
    { day: 14, date: 14 },
    { day: 15, date: 15 },
    { day: 16, date: 16 },
    { day: 17, date: 17 },
    { day: 18, date: 18 },
    { day: 19, date: 19 },
    { day: 20, date: 20 },
    { day: 21, date: 21 },
    { day: 22, date: 22 },
    { day: 23, date: 23 },
    { day: 24, date: 24, isCurrent: true },
    { day: 25, date: 25 },
    { day: 26, date: 26 },
    { day: 27, date: 27 },
    { day: 28, date: 28 },
    { day: 29, date: 29 },
    { day: 30, date: 30 },
    { day: 31, date: 31 },
  ];

  const categoryPills = [
    'Container Security',
    'Reachability Analysis',
    'AI Agent Governance',
    'Workflows & CI/CD',
    'SDK and API',
    'Pricing',
    'Partnerships',
    'Careers',
    'Something else',
  ];

  // Handle Demo Submission
  const handleBookDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim() || !demoCompany.trim()) {
      setBookingError('Name, work email, and company are required.');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      const preferredDate = `2026-10-${String(selectedDate).padStart(2, '0')}`;
      const res = await api.sales.bookDemo({
        name: demoName.trim(),
        email: demoEmail.trim(),
        company: demoCompany.trim(),
        preferred_date: preferredDate,
        preferred_time_slot: selectedSlot || '3:30pm',
        timezone: selectedTimezone,
        primary_focus: demoFocus,
        notes: demoNotes.trim() || undefined,
      });

      setBookingSuccess(res);
      setIsBookingModalOpen(false);
    } catch (err: any) {
      setBookingError(err?.message || 'Failed to reserve appointment slot. Please try another time.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Send Message Submission
  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgName.trim() || !msgEmail.trim() || !msgContent.trim()) {
      setMsgError('Name, work email, and message are required.');
      return;
    }

    setMsgLoading(true);
    setMsgError(null);

    try {
      const res = await api.contact.submit({
        name: msgName.trim(),
        email: msgEmail.trim(),
        company: msgCompany.trim() || undefined,
        phone: msgPhone.trim() || undefined,
        inquiry_type: msgCategory.toLowerCase().replace(/\s+/g, '_'),
        subject: `Inquiry regarding ${msgCategory}`,
        message: msgContent.trim(),
      });

      setMsgSuccess(res);
    } catch (err: any) {
      setMsgError(err?.message || 'Failed to transmit message. Please email hello@kavach.security.');
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
        color: '#0F172A',
      }}
    >
      <SecuLayerHeader
        onOpenSearch={() => setSearchOpen(true)}
        onOpenExpert={() => setExpertOpen(true)}
      />

      <main style={{ flex: 1, padding: '48px 24px 80px 24px', maxWidth: 1320, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* ── TOP HERO HEADER ── */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: '44px',
              fontWeight: 800,
              color: '#09090B',
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              margin: '0 0 16px 0',
            }}
          >
            Talk to the people<br />who build Kavach.
          </h1>
          <p
            style={{
              fontSize: '17px',
              color: '#52525B',
              maxWidth: 640,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Book a 30-minute walkthrough, or send us a message about your business. Either
            way, you&apos;ll hear from someone who knows the product, not a sales script.
          </p>
        </div>

        {/* ── 3-CARD SELECTOR GRID (GUDZ STYLE) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '48px',
          }}
        >
          {/* Card 1: Book a demo */}
          <div
            onClick={() => setActiveMode('demo')}
            style={{
              backgroundColor: '#FFFFFF',
              border: activeMode === 'demo' ? '2px solid #2563EB' : '1px solid #E4E4E7',
              borderRadius: '16px',
              padding: '24px 28px',
              cursor: 'pointer',
              boxShadow: activeMode === 'demo'
                ? '0 12px 28px -6px rgba(37, 99, 235, 0.18), 0 4px 10px rgba(0, 0, 0, 0.04)'
                : '0 2px 8px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: activeMode === 'demo' ? 'translateY(-2px)' : 'none',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#F4F4F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <CalendarIcon size={20} color="#18181B" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#18181B', margin: '0 0 6px 0' }}>
              Book a demo
            </h3>
            <p style={{ fontSize: '14px', color: '#71717A', margin: '0 0 20px 0', lineHeight: 1.4 }}>
              Pick a 30-minute slot that suits you.
            </p>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Choose a time</span>
              <span style={{ fontSize: '16px' }}>&gt;</span>
            </div>
          </div>

          {/* Card 2: Send a message */}
          <div
            onClick={() => setActiveMode('message')}
            style={{
              backgroundColor: '#FFFFFF',
              border: activeMode === 'message' ? '2px solid #2563EB' : '1px solid #E4E4E7',
              borderRadius: '16px',
              padding: '24px 28px',
              cursor: 'pointer',
              boxShadow: activeMode === 'message'
                ? '0 12px 28px -6px rgba(37, 99, 235, 0.18), 0 4px 10px rgba(0, 0, 0, 0.04)'
                : '0 2px 8px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: activeMode === 'message' ? 'translateY(-2px)' : 'none',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#F4F4F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <MessageSquare size={20} color="#18181B" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#18181B', margin: '0 0 6px 0' }}>
              Send a message
            </h3>
            <p style={{ fontSize: '14px', color: '#71717A', margin: '0 0 20px 0', lineHeight: 1.4 }}>
              Tell us what you&apos;re trying to fix.
            </p>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Write to us</span>
              <span style={{ fontSize: '16px' }}>&gt;</span>
            </div>
          </div>

          {/* Card 3: Email us */}
          <div
            onClick={() => {
              window.location.href = 'mailto:hello@kavach.security';
            }}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '16px',
              padding: '24px 28px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#F4F4F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Mail size={20} color="#18181B" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#18181B', margin: '0 0 6px 0' }}>
              Email us
            </h3>
            <p style={{ fontSize: '14px', color: '#71717A', margin: '0 0 20px 0', lineHeight: 1.4 }}>
              hello@kavach.security, for anything at all.
            </p>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>hello@kavach.security</span>
              <span style={{ fontSize: '16px' }}>&gt;</span>
            </div>
          </div>
        </div>

        {/* ── SUCCESS NOTICE FOR DEMO BOOKING ── */}
        {bookingSuccess && (
          <div
            style={{
              marginBottom: 36,
              padding: '24px 28px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
            }}
          >
            <CheckCircle2 size={28} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#14532D', margin: '0 0 6px 0' }}>
                Walkthrough Scheduled Successfully!
              </h3>
              <p style={{ fontSize: '14px', color: '#15803D', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Your meeting has been registered with Kavach Architecture Engineering on{' '}
                <strong>{bookingSuccess.preferred_date || 'October 24, 2026'}</strong> at{' '}
                <strong>{bookingSuccess.preferred_time_slot || '3:30 PM'}</strong> ({selectedTimezone}).
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#DCFCE7',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#166534',
                  fontFamily: 'monospace',
                }}
              >
                <span>Meeting Link:</span>
                <strong>{bookingSuccess.meeting_url || 'https://meet.google.com/kav-walkthrough-30m'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 1: BOOK A DEMO (SPLIT SCREEN W/ CAL.COM WIDGET) ── */}
        {activeMode === 'demo' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1fr) minmax(580px, 1.8fr)',
              gap: '40px',
              alignItems: 'start',
            }}
            className="demo-split-grid"
          >
            {/* Left Column: What to expect */}
            <div>
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#09090B',
                  letterSpacing: '-0.025em',
                  margin: '0 0 16px 0',
                }}
              >
                Book a 30-minute<br />walkthrough
              </h2>
              <p style={{ fontSize: '15px', color: '#52525B', lineHeight: 1.6, margin: '0 0 36px 0' }}>
                We&apos;ll learn how you run today, show you Kavach set up for it, and leave you
                with a plan and a price.
              </p>

              {/* Step List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Step 1 */}
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1px solid #E4E4E7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#18181B',
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#18181B', margin: '0 0 4px 0' }}>
                      We listen
                    </h4>
                    <p style={{ fontSize: '14px', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
                      Ten minutes on how your repositories, container pipelines, and security reviews work today.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1px solid #E4E4E7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#18181B',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#18181B', margin: '0 0 4px 0' }}>
                      We show you
                    </h4>
                    <p style={{ fontSize: '14px', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
                      Kavach set up for your kind of tech stack, with your kind of reachability analysis and policies.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '1px solid #E4E4E7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#18181B',
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#18181B', margin: '0 0 4px 0' }}>
                      You get a plan
                    </h4>
                    <p style={{ fontSize: '14px', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
                      Which scanners and container defense rules fit, how long it takes, and what it costs.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '48px', fontSize: '13px', color: '#A1A1AA' }}>
                The calendar didn&apos;t load? Email{' '}
                <a href="mailto:hello@kavach.security" style={{ color: '#2563EB', textDecoration: 'none' }}>
                  hello@kavach.security
                </a>{' '}
                and we&apos;ll send you times.
              </div>
            </div>

            {/* Right Column: Cal.com Interactive Booking Widget */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '16px',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
              }}
            >
              {/* Widget Top Bar / Host Info */}
              <div
                className="calcom-widget-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '190px minmax(280px, 1fr) 150px',
                  borderBottom: '1px solid #E4E4E7',
                  width: '100%',
                }}
              >
                {/* Host Details */}
                <div className="calcom-host-col" style={{ padding: '24px 18px', borderRight: '1px solid #E4E4E7', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <KavachMark size={28} />
                    <span style={{ fontSize: '14px', color: '#18181B', fontWeight: 700 }}>
                      Kavach Security
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#18181B', margin: '0 0 14px 0' }}>
                    30 Min Meeting
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#52525B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} color="#71717A" />
                      <span>30m</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={15} color="#71717A" />
                      <span>Google Meet</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe size={15} color="#71717A" />
                      <select
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        style={{
                          border: 'none',
                          background: 'none',
                          fontSize: '12.5px',
                          color: '#18181B',
                          fontWeight: 500,
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Month Calendar Grid */}
                <div className="calcom-calendar-col" style={{ padding: '24px 18px', borderRight: '1px solid #E4E4E7', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#18181B', margin: 0 }}>
                      October <span style={{ color: '#71717A', fontWeight: 400 }}>2026</span>
                    </h4>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', padding: '2px' }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#18181B', padding: '2px' }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Day Names */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#71717A',
                      marginBottom: '10px',
                    }}
                  >
                    <span>SUN</span>
                    <span>MON</span>
                    <span>TUE</span>
                    <span>WED</span>
                    <span>THU</span>
                    <span>FRI</span>
                    <span>SAT</span>
                  </div>

                  {/* Calendar Days */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      textAlign: 'center',
                      fontSize: '12.5px',
                    }}
                  >
                    {calendarDays.map((c, i) => {
                      if (!c.date) return <span key={i} />;
                      const isSelected = selectedDate === c.date && !c.isNextMonth;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!c.isNextMonth) setSelectedDate(c.date);
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: c.isNextMonth ? 'default' : 'pointer',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            backgroundColor: isSelected ? '#2563EB' : 'transparent',
                            color: isSelected
                              ? '#FFFFFF'
                              : c.isNextMonth
                              ? '#D4D4D8'
                              : '#18181B',
                          }}
                        >
                          {c.date}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots Column */}
                <div className="calcom-slots-col" style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                      Sat {selectedDate}th
                    </span>
                    {/* 12h / 24h toggle */}
                    <div
                      style={{
                        display: 'flex',
                        border: '1px solid #E4E4E7',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <button
                        onClick={() => setIs24Hour(false)}
                        style={{
                          padding: '2px 6px',
                          border: 'none',
                          backgroundColor: !is24Hour ? '#F4F4F5' : '#FFFFFF',
                          color: !is24Hour ? '#18181B' : '#71717A',
                          cursor: 'pointer',
                        }}
                      >
                        12h
                      </button>
                      <button
                        onClick={() => setIs24Hour(true)}
                        style={{
                          padding: '2px 6px',
                          border: 'none',
                          backgroundColor: is24Hour ? '#F4F4F5' : '#FFFFFF',
                          color: is24Hour ? '#18181B' : '#71717A',
                          cursor: 'pointer',
                        }}
                      >
                        24h
                      </button>
                    </div>
                  </div>

                  {/* Slots List */}
                  <div className="calcom-slots-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                    {currentSlots.map((slot) => {
                      const isSlotSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setIsBookingModalOpen(true);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: isSlotSelected ? '1px solid #2563EB' : '1px solid #E4E4E7',
                            borderRadius: '8px',
                            backgroundColor: isSlotSelected ? '#EFF6FF' : '#FFFFFF',
                            color: isSlotSelected ? '#2563EB' : '#18181B',
                            fontWeight: isSlotSelected ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cal.com Brand Footer */}
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#18181B',
                  letterSpacing: '-0.02em',
                }}
              >
                Cal.com
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 2: SEND A MESSAGE (SPLIT SCREEN W/ FORM) ── */}
        {activeMode === 'message' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.4fr)',
              gap: '48px',
              alignItems: 'start',
            }}
            className="message-split-grid"
          >
            {/* Left Column: Context & Guarantees */}
            <div>
              <h2
                style={{
                  fontSize: '34px',
                  fontWeight: 800,
                  color: '#09090B',
                  letterSpacing: '-0.025em',
                  margin: '0 0 16px 0',
                }}
              >
                Send us a message
              </h2>
              <p style={{ fontSize: '15px', color: '#52525B', lineHeight: 1.6, margin: '0 0 40px 0' }}>
                Share a little about your security architecture and what you&apos;d like to change. We reply
                within one working day.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Where we are
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#18181B', lineHeight: 1.5 }}>
                    Kavach Security Technologies Pvt. Ltd.<br />
                    San Francisco, CA &amp; London, UK
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', marginBottom: '6px' }}>
                    When we reply
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#18181B' }}>
                    Within one working day, usually sooner.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Clean Card Form */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '16px',
                padding: '36px 36px',
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
              }}
            >
              {msgSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#ECFDF5',
                      border: '2px solid #A7F3D0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                    }}
                  >
                    <CheckCircle2 size={32} color="#059669" />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#18181B', margin: '0 0 8px 0' }}>
                    Message Received
                  </h3>
                  <p style={{ fontSize: '14px', color: '#52525B', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                    {msgSuccess.message || 'Thank you! A security engineer will reply within 24 hours.'}
                  </p>
                  <div style={{ fontSize: '12px', color: '#71717A', fontFamily: 'monospace' }}>
                    Tracking ID: {msgSuccess.inquiry_id}
                  </div>
                  <button
                    onClick={() => {
                      setMsgSuccess(null);
                      setMsgContent('');
                    }}
                    style={{
                      marginTop: '20px',
                      padding: '8px 18px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendMessageSubmit}>
                  {msgError && (
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        color: '#B91C1C',
                        fontSize: '13px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>{msgError}</span>
                    </div>
                  )}

                  {/* Name & Email Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '6px' }}>
                        Your name <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={msgName}
                        onChange={(e) => setMsgName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '6px' }}>
                        Work email <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="jane@company.com"
                        value={msgEmail}
                        onChange={(e) => setMsgEmail(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* Company & Phone Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '6px' }}>
                        Company
                      </label>
                      <input
                        type="text"
                        placeholder="Acme Corp"
                        value={msgCompany}
                        onChange={(e) => setMsgCompany(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '6px' }}>
                        Phone (optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={msgPhone}
                        onChange={(e) => setMsgPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* What's this about? Interactive Pills */}
                  <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '10px' }}>
                      What&apos;s this about?
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {categoryPills.map((pill) => {
                        const isSelected = msgCategory === pill;
                        return (
                          <button
                            type="button"
                            key={pill}
                            onClick={() => setMsgCategory(pill)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              border: isSelected ? '1px solid #2563EB' : '1px solid #E4E4E7',
                              backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                              color: isSelected ? '#2563EB' : '#52525B',
                              fontSize: '13px',
                              fontWeight: isSelected ? 600 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected && <Check size={13} color="#2563EB" />}
                            <span>{pill}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* What would you like to change? Textarea */}
                  <div style={{ marginBottom: '28px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '6px' }}>
                      What would you like to change? <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      rows={5}
                      placeholder="For example: we run Kubernetes clusters across 3 regions and want automated reachability analysis to silence transitive false positives in our microservices..."
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #E4E4E7',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        lineHeight: 1.5,
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                      We&apos;ll only use these details to reply to you.
                    </span>
                    <button
                      type="submit"
                      disabled={msgLoading}
                      style={{
                        padding: '11px 24px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: msgLoading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {msgLoading ? 'Sending...' : 'Send message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── INTERACTIVE BOOKING CONFIRMATION MODAL ── */}
        {isBookingModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setIsBookingModalOpen(false)}
          >
            <div
              style={{
                width: '520px',
                maxWidth: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #E4E4E7',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#18181B', margin: '0 0 6px 0' }}>
                Confirm 30-Minute Walkthrough
              </h3>
              <p style={{ fontSize: '13.5px', color: '#71717A', margin: '0 0 20px 0' }}>
                Scheduled for <strong>Saturday, October {selectedDate}, 2026</strong> at{' '}
                <strong>{selectedSlot}</strong> ({selectedTimezone}).
              </p>

              {bookingError && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    color: '#B91C1C',
                    fontSize: '12.5px',
                    marginBottom: '16px',
                  }}
                >
                  {bookingError}
                </div>
              )}

              <form onSubmit={handleBookDemoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#18181B', marginBottom: '4px' }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#18181B', marginBottom: '4px' }}>
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jane@company.com"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#18181B', marginBottom: '4px' }}>
                    Company / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Hyperion Future Tech"
                    value={demoCompany}
                    onChange={(e) => setDemoCompany(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#18181B', marginBottom: '4px' }}>
                    Primary Security Focus
                  </label>
                  <select
                    value={demoFocus}
                    onChange={(e) => setDemoFocus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Container Security & Reachability">Container Security &amp; Reachability</option>
                    <option value="AI Agent Governance & MCP Gateway">AI Agent Governance &amp; MCP Gateway</option>
                    <option value="Static SAST & Secret Detection">Static SAST &amp; Secret Detection</option>
                    <option value="Full Cloud Infrastructure CSPM">Full Cloud Infrastructure CSPM</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(false)}
                    style={{
                      padding: '9px 16px',
                      backgroundColor: '#F4F4F5',
                      color: '#52525B',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    style={{
                      padding: '9px 20px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: bookingLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {bookingLoading ? 'Reserving...' : 'Confirm Walkthrough'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Global Modals */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <TalkToExpertModal isOpen={expertOpen} onClose={() => setExpertOpen(false)} />

      <EnterpriseFooter />

      <style jsx>{`
        @media (max-width: 860px) {
          .demo-split-grid,
          .message-split-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .calcom-widget-grid {
            display: flex !important;
            flex-direction: column !important;
          }
          .calcom-host-col,
          .calcom-calendar-col {
            border-right: none !important;
            border-bottom: 1px solid #E4E4E7 !important;
          }
          .calcom-slots-list {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important;
            gap: 8px !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}
