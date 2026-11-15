'use client';

import React from 'react';

export const KavachHeroSkeleton: React.FC = () => {
  return (
    <section
      className="kavach-home-hero"
      aria-label="Loading security platform..."
      style={{
        maxWidth: '1380px',
        margin: '0 auto',
        padding: 'clamp(36px, 5vw, 64px) clamp(20px, 4vw, 48px) 36px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Left Column Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Eyebrow badge */}
        <div
          className="kavach-skeleton"
          style={{ width: '280px', height: '24px', borderRadius: '99px' }}
        />

        {/* Headline lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            className="kavach-skeleton"
            style={{ width: '92%', height: '52px', borderRadius: '10px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '68%', height: '52px', borderRadius: '10px' }}
          />
        </div>

        {/* Subtitle lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0 12px' }}>
          <div
            className="kavach-skeleton"
            style={{ width: '100%', height: '16px', borderRadius: '6px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '85%', height: '16px', borderRadius: '6px' }}
          />
        </div>

        {/* Form input + button */}
        <div style={{ display: 'flex', gap: '10px', maxWidth: '580px', flexWrap: 'wrap' }}>
          <div
            className="kavach-skeleton"
            style={{ flex: 1, minWidth: '240px', height: '48px', borderRadius: '8px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '190px', height: '48px', borderRadius: '8px' }}
          />
        </div>

        {/* Guarantee items */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
          <div
            className="kavach-skeleton"
            style={{ width: '140px', height: '14px', borderRadius: '4px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '150px', height: '14px', borderRadius: '4px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '130px', height: '14px', borderRadius: '4px' }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <div
            className="kavach-skeleton"
            style={{ width: '190px', height: '42px', borderRadius: '8px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '180px', height: '42px', borderRadius: '8px' }}
          />
        </div>
      </div>

      {/* Right Column Terminal Card Skeleton */}
      <div
        className="kavach-home-preview"
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '16px 20px',
          background: '#FFFFFF',
          minHeight: '390px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Top header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <div
            className="kavach-skeleton"
            style={{ width: '160px', height: '18px', borderRadius: '6px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '130px', height: '22px', borderRadius: '99px' }}
          />
        </div>

        {/* File row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            className="kavach-skeleton"
            style={{ width: '190px', height: '16px', borderRadius: '4px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '70px', height: '14px', borderRadius: '4px' }}
          />
        </div>

        {/* Code diff lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            className="kavach-skeleton"
            style={{ width: '100%', height: '28px', borderRadius: '6px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '92%', height: '28px', borderRadius: '6px' }}
          />
          <div
            className="kavach-skeleton"
            style={{ width: '96%', height: '28px', borderRadius: '6px' }}
          />
        </div>

        {/* Evidence badge box */}
        <div
          className="kavach-skeleton"
          style={{ width: '100%', height: '64px', borderRadius: '8px', marginTop: '6px' }}
        />

        {/* Reviewer bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <div
            className="kavach-skeleton"
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div
              className="kavach-skeleton"
              style={{ width: '120px', height: '14px', borderRadius: '4px' }}
            />
            <div
              className="kavach-skeleton"
              style={{ width: '90px', height: '12px', borderRadius: '4px' }}
            />
          </div>
          <div
            className="kavach-skeleton"
            style={{ width: '100px', height: '24px', borderRadius: '99px', marginLeft: 'auto' }}
          />
        </div>
      </div>
    </section>
  );
};

