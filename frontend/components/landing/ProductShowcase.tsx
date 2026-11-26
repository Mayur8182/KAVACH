'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  X,
  ScanSearch,
  ShieldAlert,
  Wrench,
  GitPullRequest,
} from 'lucide-react';

interface ProcessStep {
  id: string;
  num: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'scan',
    num: '01',
    title: 'Scan',
    description: 'Find code, secret, and cloud bugs.',
    startTime: 0,
    endTime: 16,
    icon: ScanSearch,
  },
  {
    id: 'findings',
    num: '02',
    title: 'Findings',
    description: 'Ranked by risk, file, and exact line.',
    startTime: 16,
    endTime: 21,
    icon: ShieldAlert,
  },
  {
    id: 'autofix',
    num: '03',
    title: 'Auto Fix',
    description: 'Patched and re-tested automatically.',
    startTime: 21,
    endTime: 31,
    icon: Wrench,
  },
  {
    id: 'pr',
    num: '04',
    title: 'Pull Request',
    description: 'Safe fix PR, ready to merge.',
    startTime: 31,
    endTime: 39.9,
    icon: GitPullRequest,
  },
];

function formatTime(sec: number): string {
  const safe = Number.isFinite(sec) && sec >= 0 ? sec : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function ProductShowcase({ embeddedHero = false }: { embeddedHero?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(39.9);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [theaterOpen, setTheaterOpen] = useState(false);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;
    setCurrentTime(time);

    const stepIndex = PROCESS_STEPS.findIndex(
      (s, i) =>
        time >= s.startTime &&
        (i === PROCESS_STEPS.length - 1 ? true : time < s.endTime)
    );
    if (stepIndex !== -1 && stepIndex !== activeStepIndex) {
      setActiveStepIndex(stepIndex);
    }
  }, [activeStepIndex]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const handleSelectStep = (idx: number) => {
    const video = videoRef.current;
    if (!video) return;
    const step = PROCESS_STEPS[idx];
    if (!step) return;

    setActiveStepIndex(idx);
    video.currentTime = step.startTime + 0.05;
    setCurrentTime(step.startTime + 0.05);

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setCurrentTime(0);
    setActiveStepIndex(0);
    video.play().catch(() => {});
    setIsPlaying(true);
  };

  const activeStep = PROCESS_STEPS[activeStepIndex] ?? PROCESS_STEPS[0];

  const playbackControls = (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-[#EA580C] hover:text-white text-slate-800 transition-colors cursor-pointer"
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </button>
      <button
        type="button"
        onClick={handleRestart}
        aria-label="Restart video"
        title="Restart"
        className="inline-flex items-center justify-center p-1 rounded-full hover:bg-[#EA580C] hover:text-white text-slate-700 transition-colors cursor-pointer"
      >
        <RotateCcw size={12} />
      </button>
      <button
        type="button"
        onClick={() => setTheaterOpen(true)}
        aria-label="View HD theater mode"
        title="View HD fullscreen preview"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-[#EA580C] hover:text-white text-slate-700 transition-colors cursor-pointer"
      >
        <Maximize2 size={11} />
        <span className="font-mono text-[10.5px] font-bold">HD</span>
      </button>
      <span className="font-mono text-[11px] text-slate-600 tabular-nums pl-1 pr-0.5">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );

  return (
    <div
      className={
        embeddedHero
          ? 'w-full mt-9 sm:mt-11 text-left'
          : 'w-full max-w-[1160px] mx-auto px-5 sm:px-8 py-10 text-left'
      }
    >
      {embeddedHero ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 px-0.5">
          <div className="inline-flex items-center gap-2.5 text-[13px] font-medium">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Product Walkthrough
            </span>
            <span className="text-slate-400" aria-hidden="true">/</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={activeStep.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-1.5 text-slate-700 font-medium"
              >
                <span className="font-mono text-[11.5px] text-slate-600">{activeStep.num}</span>
                <span>{activeStep.title}</span>
              </motion.span>
            </AnimatePresence>
          </div>
          {playbackControls}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl sm:text-[36px] font-bold tracking-[-0.03em] text-slate-900 leading-[1.15]">
              See Kavach in action
            </h2>
          </div>
          <div className="self-start sm:self-end">{playbackControls}</div>
        </div>
      )}

      {/* Atmospheric Scenic Stage — Single Crisp Frosted Glass Panel Over Meadow Backdrop */}
      <motion.div
        initial={{ opacity: 0.96, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="group relative w-full rounded-[22px] overflow-hidden border border-black/[0.08] p-4 sm:p-7 lg:p-8 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.16)]"
        style={{ backgroundColor: '#DDD6C7' }}
      >
        <img
          src="/images/stage-backdrop.webp"
          alt="Warm golden coastal meadow atmospheric stage backdrop"
          width={1376}
          height={768}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover select-none"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/[0.06]"
        />

        {/* Single Frosted Glass Window Over Real Backdrop (Exact 1124px Max Width Keeps 1104px Video 1:1 HD) */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative z-10 w-full max-w-[1124px] mx-auto rounded-[18px] border border-white/75 bg-white/58 backdrop-blur-xl p-2 sm:p-2.5 shadow-[0_24px_58px_-16px_rgba(15,23,42,0.22)]"
        >
          <div className="flex items-center justify-between px-2 pb-2 text-[12px] font-medium text-slate-900 select-none">
            <span className="inline-flex items-center gap-2">
              <ScanSearch size={13} className="text-slate-800" />
              <span>Kavach Code &amp; Cloud Engine</span>
            </span>
            <span className="font-mono text-[10.5px] tracking-wide uppercase px-2 py-0.5 rounded-md bg-white/85 border border-slate-200/80 text-slate-800">
              {activeStep.num} · {activeStep.title}
            </span>
          </div>

          <div
            onClick={togglePlay}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                togglePlay();
              }
            }}
            aria-label={isPlaying ? 'Pause product demo video' : 'Play product demo video'}
            className="relative overflow-hidden rounded-[12px] border border-black/[0.08] bg-white aspect-[1104/692] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.14)] cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
          >
            <video
              ref={videoRef}
              src="/videos/code-security-demo.mp4"
              poster="/images/video-poster.webp"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="block w-full h-full object-contain bg-white"
              style={{ transform: 'translateZ(0)' }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Interactive 4-Column Kinetic Chapter Strip (Orange Hover Accent) */}
      <div
        role="tablist"
        aria-label="Kavach Code Security workflow steps"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-5"
      >
        {PROCESS_STEPS.map((step, idx) => {
          const isActive = idx === activeStepIndex;
          const StepIcon = step.icon;
          const span = step.endTime - step.startTime;

          let progressPercent = 0;
          if (currentTime >= step.startTime && currentTime <= step.endTime) {
            progressPercent = Math.min(100, Math.max(0, ((currentTime - step.startTime) / span) * 100));
          } else if (currentTime > step.endTime) {
            progressPercent = 100;
          }

          return (
            <motion.button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              initial={{ opacity: 0.9, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2 }}
              onClick={() => handleSelectStep(idx)}
              className="group relative text-left pt-3.5 pb-3.5 px-3.5 bg-transparent border border-transparent hover:border-orange-300/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="showcaseActiveStepGlow"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-xl bg-slate-900/[0.035] border border-slate-200/90"
                />
              )}

              <div className="relative z-10 h-[2px] bg-slate-200 overflow-hidden rounded-full mb-3">
                <div
                  className="h-full bg-slate-900 group-hover:bg-[#EA580C] transition-all duration-200 ease-linear origin-left"
                  style={{ transform: `scaleX(${isActive ? progressPercent / 100 : 0})` }}
                />
              </div>

              <div className="relative z-10 flex items-center gap-2 mb-1">
                <StepIcon
                  size={15}
                  strokeWidth={2}
                  className={
                    isActive
                      ? 'text-slate-900 group-hover:text-[#EA580C] transition-colors'
                      : 'text-slate-600 group-hover:text-[#EA580C] transition-colors'
                  }
                />
                <span
                  className={`text-[14.5px] font-bold tracking-[-0.015em] transition-colors ${
                    isActive
                      ? 'text-slate-900 group-hover:text-[#EA580C]'
                      : 'text-slate-600 group-hover:text-[#EA580C]'
                  }`}
                >
                  {step.title}
                </span>
              </div>

              <p className="relative z-10 text-[13px] leading-[1.45] text-slate-600">
                {step.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* HD Theater Modal Preview */}
      <AnimatePresence>
        {theaterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTheaterOpen(false)}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[1104px] rounded-2xl overflow-hidden bg-white shadow-2xl border border-white/20"
            >
              <button
                type="button"
                onClick={() => setTheaterOpen(false)}
                aria-label="Close HD preview"
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-slate-900/85 text-white flex items-center justify-center hover:bg-[#EA580C] cursor-pointer transition-colors"
              >
                <X size={15} />
              </button>
              <video
                src="/videos/code-security-demo.mp4"
                autoPlay
                loop
                muted
                controls
                playsInline
                className="block w-full aspect-[1104/692] bg-white object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProductShowcase;
