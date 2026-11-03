'use client';

import React, { useState } from 'react';
import { Onee, type AnimationName } from './Onee';
import { Shield, ChevronDown, ChevronUp, X } from 'lucide-react';

const QUICK_ANIMATIONS: { label: string; anim: AnimationName; desc: string }[] = [
  { label: 'Idle', anim: 'idle', desc: 'Neutral monitoring state' },
  { label: 'Scanning', anim: 'searching', desc: 'Active security scan' },
  { label: 'Working', anim: 'working', desc: 'Analyzing code & dependencies' },
  { label: 'Celebrate', anim: 'celebrate', desc: 'Zero findings & passed audit' },
  { label: 'Alert', anim: 'suspicious', desc: 'Threat detected or policy breach' },
  { label: 'Thinking', anim: 'thinking', desc: 'Evaluating remediation fix' },
  { label: 'Sleep', anim: 'sleeping', desc: 'Standby mode' },
];

export function OneeSecurityCompanion() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAnim, setCurrentAnim] = useState<AnimationName>('idle');
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div
      className="onee-floating-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '80px',
        zIndex: 9990,
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', -apple-system, sans-serif)",
      }}
    >
      {/* Expanded Control Card */}
      {isOpen && (
        <div
          style={{
            marginBottom: '12px',
            width: '280px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F1F5F9',
              paddingBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} color="#2563EB" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Onee Copilot
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '4px',
              }}
              title="Close panel"
            >
              <X size={15} />
            </button>
          </div>

          {/* Large Avatar Preview */}
          <div
            style={{
              position: 'relative',
              width: '160px',
              height: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '50%',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <Onee
              animation={currentAnim}
              playing={isPlaying}
              loop={true}
              size={150}
            />
          </div>

          {/* Active Status Badge */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#F1F5F9',
              padding: '3px 10px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {currentAnim}
          </div>

          {/* Animation Presets */}
          <div
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px',
            }}
          >
            {QUICK_ANIMATIONS.map(({ label, anim }) => {
              const active = currentAnim === anim;
              return (
                <button
                  key={anim}
                  onClick={() => {
                    setCurrentAnim(anim);
                    setIsPlaying(true);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                    backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                    color: active ? '#1D4ED8' : '#334155',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '100%',
              padding: '7px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#0F172A',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isPlaying ? 'Pause Animation' : 'Resume Animation'}
          </button>
        </div>
      )}

      {/* Floating Minimized Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px 6px 6px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          border: '1px solid #334155',
          borderRadius: '999px',
          cursor: 'pointer',
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.25)',
          transition: 'all 0.2s ease',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Onee animation={currentAnim} playing={true} loop={true} size={30} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Onee Avatar</span>
          <span style={{ fontSize: '9.5px', color: '#94A3B8', textTransform: 'capitalize' }}>
            {currentAnim}
          </span>
        </div>
        {isOpen ? <ChevronDown size={14} color="#94A3B8" /> : <ChevronUp size={14} color="#94A3B8" />}
      </button>
    </div>
  );
}

export default OneeSecurityCompanion;
