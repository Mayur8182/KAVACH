'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Globe,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { KavachLogo } from '@/components/common/KavachLogo';

export interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFocus?: string;
  productName?: string;
}

export const BookDemoModal: React.FC<BookDemoModalProps> = ({
  isOpen,
  onClose,
  initialFocus,
  productName,
}) => {
  // Calendar & Slot Selection State
  const [selectedDate, setSelectedDate] = useState<number>(24);
  const [selectedSlot, setSelectedSlot] = useState<string>('3:30pm');
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Kolkata');
  const [step, setStep] = useState<'picker' | 'details' | 'success'>('picker');

  // Booking Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [focus, setFocus] = useState(
    initialFocus || productName || 'Container Security & Reachability'
  );
  const [notes, setNotes] = useState('');

  // Status & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  // Real calendar dates for October 2026 (Oct 1 = Thursday, 4 leading null slots)
  const calendarDays = [
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

  const handleSelectSlot = (slot: string) => {
    setSelectedSlot(slot);
    setStep('details');
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !company.trim()) {
      setError('Please provide your name, work email, and company.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const preferredDate = `2026-10-${String(selectedDate).padStart(2, '0')}`;
      const res = await api.sales.bookDemo({
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        preferred_date: preferredDate,
        preferred_time_slot: selectedSlot,
        timezone: selectedTimezone,
        primary_focus: focus,
        notes: notes.trim() || undefined,
      });

      setSuccessData(res);
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Failed to reserve appointment slot. Please try another time.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('picker');
    setError(null);
    setSuccessData(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(9, 9, 11, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: step === 'picker' ? '820px' : '560px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E4E4E7',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          transition: 'max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #E4E4E7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KavachLogo size={22} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#18181B', margin: 0 }}>
                {step === 'success'
                  ? 'Walkthrough Confirmed'
                  : step === 'details'
                  ? 'Confirm Your 30-Minute Walkthrough'
                  : 'Book a 30-Minute Walkthrough'}
              </h3>
              <p style={{ fontSize: '12px', color: '#71717A', margin: '2px 0 0' }}>
                {step === 'picker'
                  ? 'Select your preferred time slot with Kavach Architecture Engineering'
                  : `Saturday, Oct ${selectedDate}, 2026 at ${selectedSlot} (${selectedTimezone})`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {step === 'details' && (
              <button
                type="button"
                onClick={() => setStep('picker')}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563EB',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                &larr; Change time
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                color: '#71717A',
                backgroundColor: 'transparent',
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── STEP 1: CAL.COM 3-COLUMN SCHEDULER WIDGET ── */}
          {step === 'picker' && (
            <div
              className="calcom-modal-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr 160px',
                width: '100%',
                minHeight: '380px',
              }}
            >
              {/* Host Column */}
              <div
                className="calcom-host-col"
                style={{
                  padding: '24px 20px',
                  borderRight: '1px solid #E4E4E7',
                  backgroundColor: '#FAFAFA',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                    <KavachLogo size={22} />
                  </div>

                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#18181B', margin: '0 0 16px 0' }}>
                    30 Min Meeting
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#52525B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} color="#71717A" />
                      <span>30m walkthrough</span>
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
                          fontSize: '12px',
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

                <div style={{ paddingTop: '16px', borderTop: '1px solid #E4E4E7', fontSize: '11px', color: '#71717A' }}>
                  <span>We evaluate your tech stack, scanners &amp; reachability policies.</span>
                </div>
              </div>

              {/* Month Calendar Grid */}
              <div
                className="calcom-calendar-col"
                style={{
                  padding: '22px 18px',
                  borderRight: '1px solid #E4E4E7',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#18181B', margin: 0 }}>
                    October <span style={{ color: '#71717A', fontWeight: 400 }}>2026</span>
                  </h4>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', padding: '2px' }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
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
                    marginBottom: '8px',
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
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: '4px',
                    textAlign: 'center',
                    fontSize: '12px',
                  }}
                >
                  {calendarDays.map((c, i) => {
                    if (!c.date) return <span key={i} />;
                    const isSelected = selectedDate === c.date;
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setSelectedDate(c.date)}
                        style={{
                          width: '32px',
                          height: '32px',
                          margin: '0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: isSelected ? 700 : 500,
                          backgroundColor: isSelected ? '#2563EB' : 'transparent',
                          color: isSelected ? '#FFFFFF' : '#18181B',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {c.date}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Column */}
              <div
                className="calcom-slots-col"
                style={{
                  padding: '20px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#18181B' }}>
                    Sat {selectedDate}th
                  </span>
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
                      type="button"
                      onClick={() => setIs24Hour(false)}
                      style={{
                        padding: '2px 5px',
                        border: 'none',
                        backgroundColor: !is24Hour ? '#F4F4F5' : '#FFFFFF',
                        color: !is24Hour ? '#18181B' : '#71717A',
                        cursor: 'pointer',
                      }}
                    >
                      12h
                    </button>
                    <button
                      type="button"
                      onClick={() => setIs24Hour(true)}
                      style={{
                        padding: '2px 5px',
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

                <div
                  className="calcom-slots-list"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    maxHeight: '320px',
                    overflowY: 'auto',
                  }}
                >
                  {currentSlots.map((slot) => {
                    const isSlotSelected = selectedSlot === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => handleSelectSlot(slot)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          border: isSlotSelected ? '1px solid #2563EB' : '1px solid #E4E4E7',
                          borderRadius: '8px',
                          backgroundColor: isSlotSelected ? '#EFF6FF' : '#FFFFFF',
                          color: isSlotSelected ? '#2563EB' : '#18181B',
                          fontWeight: isSlotSelected ? 700 : 500,
                          fontSize: '12.5px',
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
          )}

          {/* ── STEP 2: CONFIRMATION DETAILS FORM ── */}
          {step === 'details' && (
            <div style={{ padding: '28px 32px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '10px',
                  border: '1px solid #BFDBFE',
                  marginBottom: '20px',
                  fontSize: '13px',
                  color: '#1E40AF',
                }}
              >
                <CalendarIcon size={18} color="#2563EB" />
                <span>
                  <strong>Saturday, October {selectedDate}, 2026</strong> at <strong>{selectedSlot}</strong> ({selectedTimezone})
                </span>
              </div>

              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    color: '#B91C1C',
                    fontSize: '13px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitBooking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#18181B', marginBottom: '6px' }}>
                    Your Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    Work Email <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    Company / Organization <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Hyperion Future Tech"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
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
                    Primary Security Focus
                  </label>
                  <select
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Container Security & Reachability">Container Security &amp; Reachability</option>
                    <option value="AI Agent Governance & MCP Gateway">AI Agent Governance &amp; MCP Gateway</option>
                    <option value="Static SAST & Secret Detection">Static SAST &amp; Secret Detection</option>
                    <option value="Full Cloud Infrastructure CSPM">Full Cloud Infrastructure CSPM</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setStep('picker')}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#F4F4F5',
                      color: '#52525B',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '10px 22px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {loading ? 'Reserving...' : 'Confirm Walkthrough'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 3: SUCCESS STATE ── */}
          {step === 'success' && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#F0FDF4',
                    border: '1.5px solid #86EFAC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={22} color="#16A34A" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Walkthrough Confirmed
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>
                    Calendar invite dispatched to <strong>{email}</strong>
                  </p>
                </div>
              </div>

              {/* Event Details Box */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <CalendarIcon size={16} color="#64748B" style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      {successData?.preferred_date || `October ${selectedDate}, 2026`} · {successData?.preferred_time_slot || selectedSlot}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      30-Minute Architecture Review ({selectedTimezone})
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Video size={16} color="#2563EB" style={{ marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                      Google Meet Video Conference
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={successData?.meeting_url || 'https://meet.google.com/kav-arch-demo'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: '#2563EB',
                          textDecoration: 'none',
                          fontWeight: 600,
                          backgroundColor: '#EFF6FF',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        {successData?.meeting_url || 'https://meet.google.com/kav-arch-demo'}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const url = successData?.meeting_url || 'https://meet.google.com/kav-arch-demo';
                          navigator.clipboard.writeText(url);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedLink ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <a
                  href={successData?.meeting_url || 'https://meet.google.com/kav-arch-demo'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Video size={14} />
                  <span>Join Google Meet</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#0F172A',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Link to Full Company / Contact Page */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E4E4E7',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#71717A',
          }}
        >
          <span>Kavach Security</span>
          <Link
            href="/contact"
            onClick={onClose}
            style={{
              color: '#2563EB',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Open full scheduling page</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
};
