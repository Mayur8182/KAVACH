'use client';

/**
 * SecuritySessionVerification — Motion Verification View matching Image 5:
 * - Subtle grid background
 * - 3D wireframe cube with spinning green orbital ring around its base
 * - "kavach" logo title
 * - "Verifying security session"
 * - "Checking workspace permissions"
 * - 3-segment progress indicator (▬▬ ▬▬ ──)
 * - "● Zero-trust policy enforced" pill badge
 */

import React from 'react';

interface SecuritySessionVerificationProps {
  statusMessage?: string;
  subMessage?: string;
}

export const SecuritySessionVerification: React.FC<SecuritySessionVerificationProps> = ({
  statusMessage = 'Verifying security session',
  subMessage = 'Checking workspace permissions',
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FBFBFA',
        backgroundImage: `
          linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes orbitRotate {
          0% {
            transform: rotateX(72deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(72deg) rotateZ(360deg);
          }
        }
        @keyframes cubeFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes pulseBar {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      {/* Center 3D Cube with Orbital Ring */}
      <div
        style={{
          position: 'relative',
          width: '160px',
          height: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '28px',
        }}
      >
        {/* Subtle background circular glow */}
        <div
          style={{
            position: 'absolute',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            border: '1px solid #E2E8F0',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
        />

        {/* 3D Wireframe Cube SVG (animated floating) */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            animation: 'cubeFloat 3s ease-in-out infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none">
            {/* 3D Isometric Cube wireframe */}
            <path
              d="M12 2L3 7L12 12L21 7L12 2Z"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="#FFFFFF"
            />
            <path
              d="M3 7V17L12 22V12L3 7Z"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="#F8FAFC"
            />
            <path
              d="M21 7V17L12 22V12L21 7Z"
              stroke="#0F172A"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="#F1F5F9"
            />
          </svg>
        </div>

        {/* Spinning green orbital ring at the base of the cube */}
        <div
          style={{
            position: 'absolute',
            bottom: '18px',
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#16A34A',
            borderRightColor: '#16A34A',
            opacity: 0.85,
            animation: 'orbitRotate 2s linear infinite',
            zIndex: 1,
          }}
        />
      </div>

      {/* Brand Label */}
      <div
        style={{
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#0F172A',
          marginBottom: '10px',
        }}
      >
        kavach
      </div>

      {/* Heading & Subheading */}
      <h1
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#0F172A',
          margin: '0 0 6px 0',
          letterSpacing: '-0.01em',
        }}
      >
        {statusMessage}
      </h1>
      <p
        style={{
          fontSize: '13px',
          color: '#64748B',
          margin: '0 0 24px 0',
        }}
      >
        {subMessage}
      </p>

      {/* 3-segment progress indicator (▬▬ ▬▬ ──) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}>
        <div style={{ width: '28px', height: '3px', borderRadius: '2px', backgroundColor: '#0F172A' }} />
        <div style={{ width: '28px', height: '3px', borderRadius: '2px', backgroundColor: '#0F172A' }} />
        <div
          style={{
            width: '28px',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: '#CBD5E1',
            animation: 'pulseBar 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Zero-trust badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 500,
          color: '#475569',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
        <span>Zero-trust policy enforced</span>
      </div>
    </div>
  );
};

