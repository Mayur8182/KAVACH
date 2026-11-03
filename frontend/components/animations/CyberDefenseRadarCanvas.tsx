'use client';

import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  label: string;
  type: 'code' | 'cloud' | 'agent' | 'protect' | 'policy';
  color: string;
  pulse: number;
  pulseSpeed: number;
}

export const CyberDefenseRadarCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 650);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 650;
    };

    window.addEventListener('resize', handleResize);

    // Mouse coordinates for interactive reticle
    const mouse = { x: -1000, y: -1000, isHovering: false };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.isHovering = true;
    };
    const onMouseLeave = () => {
      mouse.isHovering = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    // Create tactical security nodes
    const nodeTypes = [
      { type: 'code', label: 'Git Repo: frontend-app', color: '#38BDF8' },
      { type: 'cloud', label: 'AWS: S3 prod-bucket', color: '#0284C7' },
      { type: 'agent', label: 'MCP AI Agent: Gateway', color: '#A855F7' },
      { type: 'protect', label: 'eBPF Kernel Defense', color: '#10B981' },
      { type: 'policy', label: 'OPA Rego Policy Gate', color: '#F59E0B' },
      { type: 'code', label: 'API Microservice', color: '#38BDF8' },
      { type: 'cloud', label: 'K8s: Ingress Cluster', color: '#0284C7' },
      { type: 'protect', label: 'SLSA Cryptographic Ledger', color: '#10B981' },
    ];

    const nodes: Node[] = nodeTypes.map((nt, idx) => {
      const angle = (idx / nodeTypes.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3 + (idx % 2 === 0 ? 30 : -20);
      const cx = width / 2 + Math.cos(angle) * radius;
      const cy = height / 2 + Math.sin(angle) * radius;
      return {
        x: cx,
        y: cy,
        baseX: cx,
        baseY: cy,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        label: nt.label,
        type: nt.type as any,
        color: nt.color,
        pulse: 0,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      };
    });

    let radarAngle = 0;
    const radarSpeed = 0.015;

    // Packets traveling along edges
    const packets: Array<{
      fromIdx: number;
      toIdx: number;
      progress: number;
      speed: number;
      color: string;
    }> = [
      { fromIdx: 0, toIdx: 2, progress: 0.1, speed: 0.008, color: '#38BDF8' },
      { fromIdx: 2, toIdx: 4, progress: 0.4, speed: 0.007, color: '#A855F7' },
      { fromIdx: 1, toIdx: 6, progress: 0.7, speed: 0.009, color: '#0284C7' },
      { fromIdx: 3, toIdx: 7, progress: 0.3, speed: 0.006, color: '#10B981' },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.max(20, Math.min(width, height) * 0.42);

      // 1. Draw subtle background coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw Concentric Radar Rings
      const ringCount = 4;
      for (let i = 1; i <= ringCount; i++) {
        const r = Math.max(1, (maxRadius / ringCount) * i);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = i === ringCount ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Distance markers
        if (i === 2 || i === 4) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
          ctx.font = '9px monospace';
          ctx.fillText(`R-${i * 25}k`, centerX + r + 4, centerY - 4);
        }
      }

      // Crosshairs
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius - 20, centerY);
      ctx.lineTo(centerX + maxRadius + 20, centerY);
      ctx.moveTo(centerX, centerY - maxRadius - 20);
      ctx.lineTo(centerX, centerY + maxRadius + 20);
      ctx.stroke();

      // 3. Draw Radar Sweep Beam (Pie wedge gradient)
      radarAngle += radarSpeed;
      const sweepLength = 0.55; // Angle spread of the fading tail

      const sweepGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      sweepGradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      sweepGradient.addColorStop(0.8, 'rgba(37, 99, 235, 0.08)');
      sweepGradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, Math.max(1, maxRadius), radarAngle - sweepLength, radarAngle, false);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Leading edge scan line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(radarAngle) * maxRadius, centerY + Math.sin(radarAngle) * maxRadius);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 4. Update & Draw Nodes
      nodes.forEach((node, idx) => {
        // Subtle drift
        node.x += node.vx;
        node.y += node.vy;
        if (Math.abs(node.x - node.baseX) > 25) node.vx *= -1;
        if (Math.abs(node.y - node.baseY) > 25) node.vy *= -1;

        // Check if radar beam just crossed this node
        const nodeAngle = Math.atan2(node.y - centerY, node.x - centerX);
        const normNodeAngle = (nodeAngle + Math.PI * 2) % (Math.PI * 2);
        const normRadarAngle = (radarAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const angleDiff = Math.abs(normRadarAngle - normNodeAngle);

        if (angleDiff < 0.1) {
          node.pulse = 1.0; // Trigger glow shockwave
        } else {
          node.pulse = Math.max(0, node.pulse - 0.015);
        }

        // Draw connections to adjacent nodes
        const nextIdx = (idx + 1) % nodes.length;
        const nextNode = nodes[nextIdx];
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(nextNode.x, nextNode.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw node pulse wave if active
        if (node.pulse > 0) {
          const clampedPulse = Math.max(0, Math.min(1, node.pulse));
          const waveRadius = Math.max(0.1, 6 + (1 - clampedPulse) * 20);
          ctx.beginPath();
          ctx.arc(node.x, node.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `${node.color}${Math.floor(clampedPulse * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Core Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
        ctx.font = '10px monospace';
        ctx.fillText(node.label, node.x + 8, node.y + 3);
      });

      // 5. Draw Traveling Data Packets along Edges
      packets.forEach((pkt) => {
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) pkt.progress = 0;

        const from = nodes[pkt.fromIdx];
        const to = nodes[pkt.toIdx];
        if (from && to) {
          const px = from.x + (to.x - from.x) * pkt.progress;
          const py = from.y + (to.y - from.y) * pkt.progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = pkt.color;
          ctx.shadowColor = pkt.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 6. Interactive Mouse Reticle
      if (mouse.isHovering) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Reticle circles
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 24, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mouse.x - 30, mouse.y);
        ctx.lineTo(mouse.x - 10, mouse.y);
        ctx.moveTo(mouse.x + 10, mouse.y);
        ctx.lineTo(mouse.x + 30, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 30);
        ctx.lineTo(mouse.x, mouse.y - 10);
        ctx.moveTo(mouse.x, mouse.y + 10);
        ctx.lineTo(mouse.x, mouse.y + 30);
        ctx.stroke();

        // Coordinates tag
        ctx.fillStyle = '#38BDF8';
        ctx.font = '9px monospace';
        ctx.fillText(`LOC [${Math.floor(mouse.x)}, ${Math.floor(mouse.y)}]`, mouse.x + 28, mouse.y - 12);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'auto',
        zIndex: 0,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};
