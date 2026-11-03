'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface HeroProductVideoProps {
  videoSrc?: string;
  autoPlay?: boolean;
  compact?: boolean;
  onExpand?: () => void;
  style?: React.CSSProperties;
}

export const HeroProductVideo: React.FC<HeroProductVideoProps> = ({
  videoSrc = '/export-1792834178028.mp4',
  autoPlay = true,
  compact = false,
  onExpand,
  style,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chapters = [
    { label: '01 · Connect & AST', timePct: 0 },
    { label: '02 · Scanner Invariants', timePct: 0.25 },
    { label: '03 · AI Synthesis', timePct: 0.5 },
    { label: '04 · Signed OPA Verdict', timePct: 0.75 },
  ];

  // Auto-play muted on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoPlay) {
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [autoPlay]);

  // Video time tracking
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    const dur = video.duration || 1;
    const pct = video.currentTime / dur;

    if (pct < 0.25) setActiveChapter(0);
    else if (pct < 0.5) setActiveChapter(1);
    else if (pct < 0.75) setActiveChapter(2);
    else setActiveChapter(3);

    // Buffer tracking
    if (video.buffered.length > 0) {
      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  // Fullscreen / Expand action
  const handleExpandOrFullscreen = useCallback(() => {
    if (onExpand) {
      onExpand();
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, [onExpand]);

  // Scrubbing
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPct = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = newPct * duration;
  };

  // Jump to chapter
  const jumpToChapter = (pct: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = pct * duration;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    }
  };

  // Mouse move to show controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2800);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: compact ? '12px' : '16px',
        backgroundColor: '#090D16',
        border: '1px solid rgba(226, 232, 240, 0.16)',
        boxShadow: compact
          ? '0 16px 36px -10px rgba(15, 23, 42, 0.16), 0 0 1px 1px rgba(255, 255, 255, 0.06)'
          : '0 25px 60px -15px rgba(15, 23, 42, 0.22), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, sans-serif',
        ...style,
      }}
    >
      {/* ── macOS Window Chrome Header ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          backgroundColor: '#0F172A',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: compact ? '7px 12px' : '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Window Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px' }}>
          <span
            style={{
              width: compact ? '9px' : '11px',
              height: compact ? '9px' : '11px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              width: compact ? '9px' : '11px',
              height: compact ? '9px' : '11px',
              borderRadius: '50%',
              backgroundColor: '#F59E0B',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              width: compact ? '9px' : '11px',
              height: compact ? '9px' : '11px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'inline-block',
            }}
          />
        </div>

        {/* Address / Title Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: compact ? '3px 10px' : '5px 16px',
            borderRadius: '20px',
            fontSize: compact ? '11px' : '12px',
            fontFamily: 'monospace',
            color: '#94A3B8',
            maxWidth: compact ? '260px' : '480px',
            width: '100%',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <ShieldCheck size={compact ? 11 : 13} color="#38BDF8" style={{ flexShrink: 0 }} />
          <span style={{ color: '#E2E8F0', fontWeight: 600 }}>kavach.sec</span>
          <span style={{ color: '#64748B' }}>/</span>
          <span>{compact ? 'demo-walkthrough' : 'demo / autonomous-remediation'}</span>
        </div>

        {/* Right Corner Indicator / Expand Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {compact ? (
            <button
              onClick={handleExpandOrFullscreen}
              title="Expand walkthrough modal"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#E2E8F0',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Maximize2 size={11} />
              <span>Full View</span>
            </button>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#34D399',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 6px #10B981',
                }}
              />
              Live Walkthrough
            </span>
          )}
        </div>
      </div>

      {/* ── Main Video Player Canvas ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#000000',
          aspectRatio: '16 / 9',
          maxHeight: compact ? '320px' : 'none',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay={autoPlay}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Center Big Play Button (shown when paused) */}
        {!isPlaying && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: compact ? '10px' : '16px',
              zIndex: 20,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div
              style={{
                width: compact ? '50px' : '72px',
                height: compact ? '50px' : '72px',
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                border: '2.5px solid rgba(255, 255, 255, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.5)',
              }}
            >
              <Play size={compact ? 22 : 32} style={{ marginLeft: compact ? '2px' : '4px' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: compact ? '13px' : '15px', fontWeight: 700, color: '#FFFFFF' }}>
                {compact ? 'Resume Product Walkthrough' : 'Watch Autonomous Security Remediation'}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                Click anywhere to play real platform demo
              </div>
            </div>
          </div>
        )}

        {/* Floating Chapter Pills (Only in full mode, hidden in compact) */}
        {!compact && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 15,
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {chapters.map((ch, idx) => {
              const isActive = activeChapter === idx;
              return (
                <button
                  key={ch.label}
                  onClick={() => jumpToChapter(ch.timePct)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? 'rgba(37, 99, 235, 0.9)' : 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    color: isActive ? '#FFFFFF' : '#CBD5E1',
                    border: isActive ? '1px solid #60A5FA' : '1px solid rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.4)' : 'none',
                  }}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom Interactive Control Bar ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 25,
          backgroundColor: '#0F172A',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: compact ? '6px 12px' : '10px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? '4px' : '8px',
        }}
      >
        {/* Timeline Scrubber */}
        <div
          onClick={handleSeek}
          style={{
            position: 'relative',
            width: '100%',
            height: compact ? '4px' : '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '3px',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          {/* Buffer Bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${bufferPercent}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '3px',
              transition: 'width 0.2s ease',
            }}
          />
          {/* Progress Bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)',
              borderRadius: '3px',
              boxShadow: '0 0 8px rgba(56, 189, 248, 0.6)',
            }}
          />
        </div>

        {/* Bottom Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Controls: Play/Pause, Replay, Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '10px' : '14px' }}>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause demo' : 'Play demo'}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              {isPlaying ? <Pause size={compact ? 14 : 17} /> : <Play size={compact ? 14 : 17} />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play();
                  setIsPlaying(true);
                }
              }}
              aria-label="Replay from start"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <RotateCcw size={compact ? 13 : 15} />
            </button>

            <div style={{ fontSize: compact ? '11px' : '12px', fontFamily: 'monospace', color: '#94A3B8' }}>
              <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{formatTime(currentTime)}</span>
              <span style={{ margin: '0 3px', color: '#64748B' }}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Center Callout Badge (Only in full mode) */}
          {!compact && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#94A3B8',
              }}
            >
              <Sparkles size={12} color="#F59E0B" />
              <span>Deterministic AST · Semgrep OSS · OPA Engine</span>
            </div>
          )}

          {/* Right Controls: Sound, Fullscreen / Expand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '8px' : '12px' }}>
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              style={{
                background: 'none',
                border: 'none',
                color: isMuted ? '#94A3B8' : '#38BDF8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {isMuted ? <VolumeX size={compact ? 14 : 16} /> : <Volume2 size={compact ? 14 : 16} />}
              {!compact && <span>{isMuted ? 'Muted' : 'Sound On'}</span>}
            </button>

            <button
              onClick={handleExpandOrFullscreen}
              aria-label="Expand demo walkthrough"
              title="Expand walkthrough modal"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              {isFullscreen ? <Minimize2 size={compact ? 14 : 16} /> : <Maximize2 size={compact ? 14 : 16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
