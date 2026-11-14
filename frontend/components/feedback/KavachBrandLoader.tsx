'use client';

import React from 'react';

export interface KavachBrandLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  submessage?: string;
  showBadge?: boolean;
  badgeText?: string;
  showWordmark?: boolean;
  fullscreen?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Official Kavach Animated Brand Loader.
 * Features the signature 3D Isometric Cube Emblem levitating smoothly
 * above an interactive, pulsating 3D perspective radar circle pedestal,
 * with the authentic Kavach wordmark, laser sweep bar, and zero-trust verification badge.
 */
export const KavachBrandLoader: React.FC<KavachBrandLoaderProps> = ({
  size = 'md',
  message = 'Verifying Security Session',
  submessage = 'Authorizing cryptographic identity & workspace permissions…',
  showBadge = true,
  badgeText = 'Zero-Trust Policy Enforced',
  showWordmark = true,
  fullscreen = false,
  theme = 'light',
  className = '',
  style,
}) => {
  const isDark = theme === 'dark';

  // Sizing definitions
  const dimensions = {
    sm: { cube: 38, circle: 60, text: 13, sub: 11.5, wordmark: 16 },
    md: { cube: 54, circle: 84, text: 14.5, sub: 12, wordmark: 22 },
    lg: { cube: 68, circle: 104, text: 16, sub: 13, wordmark: 26 },
    xl: { cube: 86, circle: 128, text: 17.5, sub: 14, wordmark: 30 },
  }[size];

  const content = (
    <div
      className={`kavach-brand-loader ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        padding: fullscreen ? '40px' : '20px',
        textAlign: 'center',
        userSelect: 'none',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
        position: 'relative',
        ...style,
      }}
    >
      <style>{`
        @keyframes kavach-cube-float {
          0%, 100% {
            transform: translateY(0px) scale(1);
            filter: drop-shadow(0 6px 14px rgba(15, 23, 42, 0.12));
          }
          50% {
            transform: translateY(-8px) scale(1.02);
            filter: drop-shadow(0 14px 22px rgba(37, 99, 235, 0.22));
          }
        }

        @keyframes kavach-radar-spin {
          0% {
            transform: perspective(280px) rotateX(68deg) rotate(0deg);
          }
          100% {
            transform: perspective(280px) rotateX(68deg) rotate(360deg);
          }
        }

        @keyframes kavach-radar-rev {
          0% {
            transform: perspective(280px) rotateX(68deg) rotate(360deg);
          }
          100% {
            transform: perspective(280px) rotateX(68deg) rotate(0deg);
          }
        }

        @keyframes kavach-beam-sweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes kavach-shimmer {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* ── 3D Stage with Levitating Cube & Perspective Radar Pedestal ── */}
      <div
        style={{
          position: 'relative',
          width: `${dimensions.circle + 16}px`,
          height: `${dimensions.circle + 26}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer Perspective Radar Pedestal Ring */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            width: `${dimensions.circle}px`,
            height: `${dimensions.circle}px`,
            borderRadius: '50%',
            border: isDark ? '1.5px dashed rgba(148, 163, 184, 0.25)' : '1.5px dashed rgba(15, 23, 42, 0.22)',
            animation: 'kavach-radar-spin 7s linear infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Inner Glowing Active Concentric Ring */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            width: `${Math.round(dimensions.circle * 0.76)}px`,
            height: `${Math.round(dimensions.circle * 0.76)}px`,
            borderRadius: '50%',
            border: isDark ? '2px solid rgba(59, 130, 246, 0.4)' : '2px solid rgba(37, 99, 235, 0.25)',
            borderTopColor: isDark ? '#60A5FA' : '#2563EB',
            borderRightColor: 'transparent',
            animation: 'kavach-radar-rev 2.2s linear infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Soft Blue Center Ground Glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            width: `${Math.round(dimensions.circle * 0.65)}px`,
            height: '18px',
            borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.16)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />

        {/* Soft Ground Shadow Under Cube */}
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            width: `${Math.round(dimensions.cube * 0.65)}px`,
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(15, 23, 42, 0.08)',
            filter: 'blur(3px)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Levitating Official 3D Isometric Cube Emblem ── */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            animation: 'kavach-cube-float 2.4s ease-in-out infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <img
            src={isDark ? '/kavach-cube-white.png' : '/kavach-cube.png'}
            alt="Kavach Emblem"
            width={dimensions.cube}
            height={Math.round(dimensions.cube * 1.07)}
            style={{
              width: `${dimensions.cube}px`,
              height: `${Math.round(dimensions.cube * 1.07)}px`,
              objectFit: 'contain',
              display: 'block',
            }}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.indexOf('kavach-emblem.png') === -1) {
                target.src = '/kavach-emblem.png';
              }
            }}
          />
        </div>
      </div>

      {/* ── Official Kavach Brand Logo Wordmark ── */}
      {showWordmark && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={isDark ? '/kavach-logo-white.png' : '/kavach-logo.png'}
            alt="Kavach"
            height={dimensions.wordmark}
            style={{
              height: `${dimensions.wordmark}px`,
              width: 'auto',
              objectFit: 'contain',
              opacity: 0.95,
              display: 'block',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* ── Dynamic Title & Status Feedback ── */}
      {(message || submessage) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            maxWidth: '380px',
            marginTop: '2px',
          }}
        >
          {message && (
            <span
              style={{
                fontSize: `${dimensions.text}px`,
                fontWeight: 700,
                color: isDark ? '#F8FAFC' : '#0F172A',
                letterSpacing: '-0.01em',
                animation: 'kavach-shimmer 2.2s ease-in-out infinite',
              }}
            >
              {message}
            </span>
          )}
          {submessage && (
            <span
              style={{
                fontSize: `${dimensions.sub}px`,
                fontWeight: 500,
                color: isDark ? '#94A3B8' : '#64748B',
                lineHeight: 1.45,
              }}
            >
              {submessage}
            </span>
          )}
        </div>
      )}

      {/* ── Indeterminate Laser Shimmer Bar ── */}
      <div
        style={{
          width: '160px',
          height: '3px',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
          marginTop: '2px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '70%',
            background: isDark
              ? 'linear-gradient(90deg, transparent, #3B82F6, #60A5FA, transparent)'
              : 'linear-gradient(90deg, transparent, #3B82F6, #2563EB, transparent)',
            animation: 'kavach-beam-sweep 1.4s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Subtle Security Badge: Zero-Trust Policy Enforced ── */}
      {showBadge && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: isDark ? '#94A3B8' : '#475569',
            padding: '4px 11px',
            borderRadius: '9999px',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.03)',
            marginTop: '4px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'inline-block',
            }}
          />
          <span>{badgeText}</span>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: isDark ? '#080B10' : '#FAF9F6',
          backgroundImage: isDark
            ? 'radial-gradient(circle at 50% 45%, rgba(37, 99, 235, 0.12) 0%, rgba(8, 11, 16, 0.98) 70%)'
            : 'radial-gradient(circle at 50% 45%, rgba(37, 99, 235, 0.06) 0%, rgba(250, 249, 246, 0.98) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {/* Subtle Background Grid Pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: isDark
              ? 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)'
              : 'linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />
        {content}
      </div>
    );
  }

  return content;
};

export default KavachBrandLoader;
