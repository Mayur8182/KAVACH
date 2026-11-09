'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Building,
  Layers,
  Cpu,
  Lock,
  ExternalLink,
  LayoutGrid,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export interface OnboardingCelebrationProps {
  userName?: string;
  organizationName?: string;
  workspaceName?: string;
  region?: string;
  selectedProducts?: string[];
  onFinish?: () => void;
}

export const OnboardingCelebrationScreen: React.FC<OnboardingCelebrationProps> = ({
  userName = 'Security Engineer',
  organizationName = 'Acme Corp',
  workspaceName = 'Production',
  region = 'Asia Pacific (Mumbai)',
  selectedProducts = ['thing_code'],
  onFinish,
}) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // High-performance canvas confetti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#4F46E5', '#10B981', '#0284C7', '#F59E0B', '#6366F1'];
    const particleCount = 100;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: width * 0.5 + (Math.random() - 0.5) * 200,
      y: height * 0.35 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -16 - 6,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.42,
      friction: 0.98,
      opacity: 1,
    }));

    let animationFrameId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.vx *= p.friction;
        p.vy = p.vy * p.friction + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        if (frame > 65) {
          p.opacity -= 0.015;
        }

        if (p.opacity > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      });

      if (particles.some((p) => p.opacity > 0)) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleLaunchOverview = async () => {
    setSubmitting(true);
    try {
      await api.onboarding.complete();
      toast.success('Workspace Activated!', {
        description: 'Welcome to Kavach Autonomous Security Platform.',
      });
    } catch (err: any) {
      console.warn('Onboarding completion note:', err);
    } finally {
      if (onFinish) {
        onFinish();
      } else {
        router.push('/overview');
      }
    }
  };

  const handleLaunchAssistant = async () => {
    setSubmitting(true);
    try {
      await api.onboarding.complete();
    } catch (err: any) {
      console.warn('Onboarding completion note:', err);
    } finally {
      router.push('/assistant');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '620px',
        margin: '0 auto',
        padding: '24px 0',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Background Canvas for Confetti */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 50,
          width: '100%',
          height: '100%',
        }}
      />

      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Top Celebration Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '9999px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#059669',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '20px',
          }}
        >
          <Sparkles size={14} />
          <span>Setup Complete</span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            margin: '0 0 10px 0',
          }}
        >
          Congratulations, {userName}! 🎉
        </h1>
        <p
          style={{
            fontSize: '13.5px',
            color: '#64748B',
            lineHeight: 1.6,
            maxWidth: '480px',
            margin: '0 auto 28px',
          }}
        >
          Your Kavach security workspace is live, zero-trust policies are active, and deterministic scanner engines are primed to protect your repositories.
        </p>

        {/* Workspace Summary Card */}
        <div
          style={{
            textAlign: 'left',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#94A3B8',
              paddingBottom: '10px',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: '14px',
            }}
          >
            Active Workspace Configuration
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12.5px' }}>
            <div>
              <div style={{ color: '#64748B', fontSize: '11.5px', marginBottom: '2px' }}>Organization</div>
              <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="#64748B" />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {organizationName}
                </span>
              </div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: '11.5px', marginBottom: '2px' }}>Primary Workspace</div>
              <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} color="#64748B" />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {workspaceName}
                </span>
              </div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: '11.5px', marginBottom: '2px' }}>Security Engines</div>
              <div style={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={14} color="#059669" />
                <span>SAST, Secrets, SCA Active</span>
              </div>
            </div>

            <div>
              <div style={{ color: '#64748B', fontSize: '11.5px', marginBottom: '2px' }}>Policy Enforcement</div>
              <div style={{ fontWeight: 700, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} color="#4F46E5" />
                <span>OPA Zero-Trust Gate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleLaunchOverview}
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutGrid size={16} />
            <span>Open Overview Dashboard</span>
            <ArrowRight size={15} />
          </button>

          <button
            type="button"
            onClick={handleLaunchAssistant}
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Bot size={16} color="#4F46E5" />
            <span>Launch Security Copilot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
