'use client';

import React, { useEffect, useRef } from 'react';

interface PulseWave {
  worldX: number;
  worldZ: number;
  startedAt: number;
}

/**
 * Pure-black 3D perspective circular dot-matrix wave floor for the unified Kavach footer.
 * Zero green — renders a dense tilted 3D perspective carpet of crisp white circular dots
 * with true concentric 3D circular ripple rings, Z-axis wave elevation, smooth camera parallax,
 * interactive cursor circular wave rings, and click shockwaves.
 */
export function KitaFooterDotCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0.5,
    y: 0.52,
    active: false,
  });
  const smoothFocusRef = useRef<{ x: number; y: number; weight: number }>({
    x: 0.5,
    y: 0.54,
    weight: 0.9,
  });
  const smoothParallaxRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pulsesRef = useRef<PulseWave[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.closest('[data-kita-floor="true"]') as HTMLElement | null;
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionMedia.matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId: number | null = null;
    let visible = true;

    // 3D tilted ground-plane perspective geometry (dense Kira carpet proportions)
    const Z_FAR = 2.95;
    const Z_NEAR = 1.22;
    const INV_Z_MIN = 1 / Z_FAR;
    const INV_Z_MAX = 1 / Z_NEAR;
    const INV_Z_SPAN = INV_Z_MAX - INV_Z_MIN;
    const TOP_HORIZON_RATIO = 0.02;

    const getHorizScale = (w: number) => Math.max(320, w * 0.62);

    const screenToWorld = (clientNormX: number, clientNormY: number, panX = 0) => {
      const clampedY = Math.max(0.05, Math.min(0.98, clientNormY));
      const invZ = INV_Z_MIN + clampedY * INV_Z_SPAN;
      const worldZ = 1 / invZ;
      const horizScale = getHorizScale(width);
      const worldX = (clientNormX * width - (width * 0.5 + panX)) / (invZ * horizScale);
      return { worldX, worldZ };
    };

    const resize = () => {
      const target = parent || canvas;
      const rect = target.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerRef.current.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      pointerRef.current.y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      pointerRef.current.active = true;
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!parent || reducedMotion) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const { worldX, worldZ } = screenToWorld(nx, ny, smoothParallaxRef.current.x);
      pulsesRef.current.push({
        worldX,
        worldZ,
        startedAt: performance.now(),
      });
      if (pulsesRef.current.length > 6) {
        pulsesRef.current.shift();
      }
    };

    const handleMotionChange = () => {
      reducedMotion = motionMedia.matches;
      if (reducedMotion) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        drawFrame(performance.now());
      } else if (visible && rafId === null) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const drawFrame = (timeMs: number) => {
      if (width <= 0 || height <= 0) return;
      ctx.clearRect(0, 0, width, height);

      const t = timeMs * 0.0014;

      // Smooth 3D camera pan following pointer
      const targetPanX = pointerRef.current.active ? (pointerRef.current.x - 0.5) * -28 : 0;
      const targetPanY = pointerRef.current.active ? (pointerRef.current.y - 0.5) * -6 : 0;
      smoothParallaxRef.current.x += (targetPanX - smoothParallaxRef.current.x) * 0.09;
      smoothParallaxRef.current.y += (targetPanY - smoothParallaxRef.current.y) * 0.09;

      // Primary 3D circular ripple center: cursor when active, else smooth ambient figure-8 glide
      const targetFocusX = pointerRef.current.active
        ? pointerRef.current.x
        : 0.5 + Math.sin(t * 0.55) * 0.2;
      const targetFocusY = pointerRef.current.active
        ? pointerRef.current.y
        : 0.54 + Math.cos(t * 0.42) * 0.1;
      const targetWeight = pointerRef.current.active ? 1.15 : 0.92;

      smoothFocusRef.current.x += (targetFocusX - smoothFocusRef.current.x) * 0.14;
      smoothFocusRef.current.y += (targetFocusY - smoothFocusRef.current.y) * 0.14;
      smoothFocusRef.current.weight += (targetWeight - smoothFocusRef.current.weight) * 0.1;

      const horizonX = width * 0.5 + smoothParallaxRef.current.x;
      const topHorizonY = height * TOP_HORIZON_RATIO + smoothParallaxRef.current.y;
      const bottomY = height + 10;
      const horizScale = getHorizScale(width);

      const primaryCenter = screenToWorld(
        smoothFocusRef.current.x,
        smoothFocusRef.current.y,
        smoothParallaxRef.current.x,
      );
      const primaryWeight = smoothFocusRef.current.weight;

      // Secondary opposing circular wave center so 3D circular wave interference stays alive across floor
      const secondaryCenter = screenToWorld(
        0.5 - Math.sin(t * 0.42) * 0.24,
        0.48 + Math.sin(t * 0.31) * 0.08,
        smoothParallaxRef.current.x,
      );

      // Clean up completed click shockwaves
      const activePulses = pulsesRef.current.filter((p) => timeMs - p.startedAt < 2400);
      pulsesRef.current = activePulses;

      const isMobile = width < 640;
      const rows = isMobile ? 24 : 32;
      const colStepWorld = isMobile ? 0.044 : 0.031;
      const maxHalfWorldX = (width * 0.58) / (INV_Z_MIN * horizScale);
      const colsHalf = Math.ceil(maxHalfWorldX / colStepWorld);
      const twoPi = Math.PI * 2;

      // Draw back-to-front in 3D depth order
      for (let r = 0; r < rows; r++) {
        const rNorm = r / Math.max(1, rows - 1);
        const worldZ = Z_FAR - rNorm * (Z_FAR - Z_NEAR);
        const invZ = 1 / worldZ;
        const pNorm = (invZ - INV_Z_MIN) / INV_Z_SPAN;

        const yBase = topHorizonY + pNorm * (bottomY - topHorizonY);
        const depthFade = 0.22 + 0.78 * Math.pow(pNorm, 0.72);
        const zLiftScale = height * 0.145 * invZ;
        const baseRadius = 0.85 + 1.45 * Math.pow(pNorm, 0.8);

        for (let ci = -colsHalf; ci <= colsHalf; ci++) {
          const worldX = ci * colStepWorld;
          const xScreen = horizonX + worldX * invZ * horizScale;
          if (xScreen < -8 || xScreen > width + 8) continue;

          // 1. Subtle large 3D ocean base swell
          const ambientSwell =
            Math.sin(worldX * 2.1 - worldZ * 2.3 + t * 1.1) * 0.14 +
            Math.cos(worldX * 1.4 + worldZ * 1.9 - t * 0.85) * 0.1;

          // 2. Crisp Kira-style concentric 3D circular ripple rings around primary center (cursor / ambient)
          const dx1 = worldX - primaryCenter.worldX;
          const dz1 = worldZ - primaryCenter.worldZ;
          const dist1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
          const ringEnvelope1 = Math.exp(-dist1 * dist1 * 2.2);
          const ringCore1 = Math.exp(-dist1 * dist1 * 18.0) * 0.65;
          const ringWave1 = Math.cos(dist1 * 17.5 - t * 4.8);
          const circularRipple1 =
            (ringEnvelope1 * (0.28 + Math.max(-0.25, ringWave1) * 0.82) + ringCore1) *
            primaryWeight;

          // 3. Soft secondary concentric 3D circular ripple across the other side of the floor
          const dx2 = worldX - secondaryCenter.worldX;
          const dz2 = worldZ - secondaryCenter.worldZ;
          const dist2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
          const ringEnvelope2 = Math.exp(-dist2 * dist2 * 2.8);
          const ringWave2 = Math.cos(dist2 * 15.0 - t * 3.6);
          const circularRipple2 = ringEnvelope2 * (0.14 + Math.max(0, ringWave2) * 0.45);

          // 4. Interactive expanding 3D circular click shockwaves
          let clickBurst = 0;
          for (let i = 0; i < activePulses.length; i++) {
            const pulse = activePulses[i];
            const age = (timeMs - pulse.startedAt) * 0.001;
            const pdx = worldX - pulse.worldX;
            const pdz = worldZ - pulse.worldZ;
            const pDist = Math.sqrt(pdx * pdx + pdz * pdz);
            const ringRadius = age * 1.15;
            const ringDelta = Math.abs(pDist - ringRadius);
            if (ringDelta < 0.34) {
              const env = Math.exp(-ringDelta * 11.5) * Math.max(0, 1 - age / 2.4);
              clickBurst += env * 1.05;
            }
          }

          // Net 3D vertical Z-lift projecting dots upward off tilted perspective plane
          const elevation = ambientSwell + circularRipple1 + circularRipple2 + clickBurst;
          const yScreen = yBase - elevation * zLiftScale;
          if (yScreen < -6 || yScreen > height + 6) continue;

          // Monochrome circular dot intensity & radius from 3D crest elevation (zero green)
          const ringEnergy = Math.max(0, circularRipple1 + circularRipple2 * 0.7 + clickBurst);
          const crest = Math.max(0, Math.min(1.4, 0.18 + elevation * 0.78 + ringEnergy * 0.45));
          const dotRadius = Math.max(
            0.75,
            Math.min(3.35, baseRadius * (0.68 + crest * 0.72)),
          );

          // Dim troughs cleanly so concentric 3D circular rings stand out in crisp relief
          const troughDamp = ringWave1 < -0.25 && dist1 < 0.9 ? 0.65 : 1.0;
          const alpha = Math.max(
            0.08,
            Math.min(0.98, depthFade * troughDamp * (0.22 + crest * 0.7)),
          );

          // Subtle soft circular bloom halo on bright elevated 3D ring crests
          if (ringEnergy > 0.46 && pNorm > 0.16) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.16).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(xScreen, yScreen, dotRadius * 2.15, 0, twoPi);
            ctx.fill();
          }

          if (crest > 0.68 || ringEnergy > 0.45) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          } else if (crest > 0.38) {
            ctx.fillStyle = `rgba(228, 228, 231, ${(alpha * 0.9).toFixed(3)})`;
          } else if (crest > 0.2) {
            ctx.fillStyle = `rgba(212, 212, 216, ${(alpha * 0.78).toFixed(3)})`;
          } else {
            ctx.fillStyle = `rgba(161, 161, 170, ${(alpha * 0.56).toFixed(3)})`;
          }

          ctx.beginPath();
          ctx.arc(xScreen, yScreen, dotRadius, 0, twoPi);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      if (!visible || reducedMotion) {
        rafId = null;
        return;
      }
      drawFrame(now);
      rafId = requestAnimationFrame(loop);
    };

    resize();
    drawFrame(performance.now());

    if (!reducedMotion) {
      rafId = requestAnimationFrame(loop);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        visible = Boolean(entry?.isIntersecting);
        if (visible && !reducedMotion && rafId === null) {
          rafId = requestAnimationFrame(loop);
        }
      },
      { threshold: 0.01 },
    );
    observer.observe(parent || canvas);

    window.addEventListener('resize', resize, { passive: true });
    motionMedia.addEventListener('change', handleMotionChange);
    if (parent) {
      parent.addEventListener('pointermove', handlePointerMove, { passive: true });
      parent.addEventListener('pointerleave', handlePointerLeave, { passive: true });
      parent.addEventListener('pointerdown', handlePointerDown, { passive: true });
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      motionMedia.removeEventListener('change', handleMotionChange);
      if (parent) {
        parent.removeEventListener('pointermove', handlePointerMove);
        parent.removeEventListener('pointerleave', handlePointerLeave);
        parent.removeEventListener('pointerdown', handlePointerDown);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
