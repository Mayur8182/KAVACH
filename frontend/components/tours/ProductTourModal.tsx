'use client';

import React, { useEffect, useState } from 'react';
import { TourConfig } from './tourDefinitions';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';

export interface ProductTourModalProps {
  tour: TourConfig;
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

export const ProductTourModal: React.FC<ProductTourModalProps> = ({
  tour,
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}) => {
  const currentStep = tour.steps[currentStepIndex];
  const totalSteps = tour.steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [modalPos, setModalPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number } | null>(null);

  // Position detection and smart placement avoiding element & sidebar overlaps
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const locateTarget = () => {
      const targetSelector = currentStep?.target;
      const fallbackSelector = currentStep?.fallbackTarget;

      let element: Element | null = null;
      if (targetSelector) {
        element = document.querySelector(targetSelector);
      }
      if (!element && fallbackSelector) {
        element = document.querySelector(fallbackSelector);
      }

      const cardWidth = 390;
      const cardHeight = 220;

      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Smooth scroll target into view if outside comfortable viewport area
        const isInViewport =
          rect.top >= 70 &&
          rect.bottom <= window.innerHeight - 70 &&
          rect.left >= 0 &&
          rect.right <= window.innerWidth;

        if (!isInViewport) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const isSidebarTarget = rect.left < 260 && rect.right <= 300;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (isSidebarTarget) {
          // Pointing to a sidebar element: ALWAYS place to the RIGHT of the sidebar to prevent any overlap!
          const computedLeft = Math.min(rect.right + 20, window.innerWidth - cardWidth - 20);
          const computedTop = Math.max(20, Math.min(rect.top - 6, window.innerHeight - cardHeight - 20));
          setModalPos({ top: computedTop, left: computedLeft });
        } else if (spaceBelow > cardHeight + 30) {
          // Ample space below target element
          const computedLeft = Math.max(260, Math.min(rect.left, window.innerWidth - cardWidth - 20));
          setModalPos({ top: rect.bottom + 12, left: computedLeft });
        } else if (spaceAbove > cardHeight + 30) {
          // Ample space above target element
          const computedLeft = Math.max(260, Math.min(rect.left, window.innerWidth - cardWidth - 20));
          setModalPos({ top: Math.max(20, rect.top - cardHeight - 12), left: computedLeft });
        } else {
          // Balanced fallback: place in the main workspace view area
          const computedLeft = Math.max(270, Math.min(window.innerWidth - cardWidth - 40, window.innerWidth / 2 - cardWidth / 2));
          setModalPos({ top: 120, left: computedLeft });
        }
      } else {
        setTargetRect(null);
        // Fallback position in main content area
        const computedLeft = Math.max(270, Math.min(window.innerWidth - cardWidth - 40, window.innerWidth / 2 - cardWidth / 2));
        setModalPos({ top: 120, left: computedLeft });
      }
    };

    locateTarget();
    timer = setTimeout(locateTarget, 280);

    window.addEventListener('resize', locateTarget);
    window.addEventListener('scroll', locateTarget, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', locateTarget);
      window.removeEventListener('scroll', locateTarget, true);
    };
  }, [currentStepIndex, currentStep?.target, currentStep?.fallbackTarget]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) onFinish();
        else onNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, onNext, onPrev, onSkip, onFinish]);

  if (!currentStep) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    >
      {/* ── 1. Semi-transparent backdrop with click-to-dismiss ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(1.5px)',
          pointerEvents: 'auto',
          zIndex: 99990,
          transition: 'all 0.18s ease',
        }}
        onClick={onSkip}
      />

      {/* ── 2. Crisp, Subtle Spotlight Ring around active element ── */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: '7px',
            border: '2px solid #0F172A',
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.35), 0 0 0 2px #FFFFFF, 0 8px 20px rgba(0, 0, 0, 0.25)',
            pointerEvents: 'none',
            zIndex: 99995,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      )}

      {/* ── 3. Ultra-Minimalist White & Black Tour Card ── */}
      <div
        style={{
          position: 'fixed',
          ...(modalPos
            ? {
                top: modalPos.top !== undefined ? `${modalPos.top}px` : undefined,
                bottom: modalPos.bottom !== undefined ? `${modalPos.bottom}px` : undefined,
                left: modalPos.left !== undefined ? `${modalPos.left}px` : undefined,
                right: modalPos.right !== undefined ? `${modalPos.right}px` : undefined,
              }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }),
          width: '100%',
          maxWidth: '390px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.05)',
          overflow: 'hidden',
          zIndex: 99999,
          pointerEvents: 'auto',
          color: '#0F172A',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Top Header */}
        <div
          style={{
            padding: '14px 18px 10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: '#64748B',
              textTransform: 'uppercase',
            }}
          >
            {tour.name}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11.5px',
                color: '#94A3B8',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 500,
              }}
            >
              {currentStepIndex + 1} of {totalSteps}
            </span>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Close tour"
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Ultra-thin Minimalist Progress Indicator */}
        <div
          style={{
            display: 'flex',
            gap: '3px',
            padding: '0 18px 14px 18px',
          }}
        >
          {tour.steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '2px',
                borderRadius: '1px',
                backgroundColor: i <= currentStepIndex ? '#0F172A' : '#E2E8F0',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Content Body */}
        <div style={{ padding: '0 18px 16px 18px' }}>
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#0F172A',
              letterSpacing: '-0.015em',
              margin: '0 0 6px 0',
              lineHeight: 1.35,
            }}
          >
            {currentStep.title}
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: '#475569',
              lineHeight: 1.55,
              margin: '0 0 12px 0',
            }}
          >
            {currentStep.description}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: '#64748B',
            }}
          >
            <span>Focus:</span>
            <span style={{ color: '#0F172A', fontWeight: 500 }}>{currentStep.focusArea}</span>
            {currentStep.route && (
              <>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontSize: '11px',
                    color: '#64748B',
                  }}
                >
                  {currentStep.route}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Minimalist Bottom Actions Bar */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFA',
          }}
        >
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 2px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            Exit tour
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isFirstStep && (
              <button
                type="button"
                onClick={onPrev}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <ArrowLeft size={12} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={isLastStep ? onFinish : onNext}
              style={{
                backgroundColor: '#0F172A',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F172A')}
            >
              <span>{isLastStep ? 'Done' : 'Next'}</span>
              {!isLastStep && <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
