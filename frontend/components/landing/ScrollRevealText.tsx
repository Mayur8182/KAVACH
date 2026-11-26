'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ScrollRevealSegment {
  text: string;
  className?: string;
}

interface ScrollRevealTextProps {
  segments: ScrollRevealSegment[];
  as?: 'h2' | 'h3' | 'p';
  className?: string;
  style?: React.CSSProperties;
  delayBase?: number;
  staggerSec?: number;
}

/**
 * ScrollRevealText — Word-by-word scroll-triggered reveal with subtle upward blur fade.
 * Preserves semantic heading hierarchy while delivering 21st.dev-style kinetic typography.
 */
export const ScrollRevealText: React.FC<ScrollRevealTextProps> = ({
  segments,
  as = 'h2',
  className = '',
  style,
  delayBase = 0,
  staggerSec = 0.045,
}) => {
  const prefersReduced = useReducedMotion();

  let runningWordIdx = 0;
  const content = segments.map((seg, segIdx) => {
    const words = seg.text.trim().split(/\s+/).filter(Boolean);
    return (
      <span key={`${segIdx}-${seg.text.slice(0, 12)}`} className={seg.className}>
        {words.map((word) => {
          const idx = runningWordIdx++;
          if (prefersReduced) {
            return (
              <span key={idx} className="inline-block mr-[0.26em] last:mr-0">
                {word}
              </span>
            );
          }
          return (
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.42,
                delay: delayBase + idx * staggerSec,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block mr-[0.26em] will-change-transform"
            >
              {word}
            </motion.span>
          );
        })}
        {segIdx < segments.length - 1 ? ' ' : null}
      </span>
    );
  });

  if (as === 'h3') {
    return (
      <h3 className={className} style={style}>
        {content}
      </h3>
    );
  }
  if (as === 'p') {
    return (
      <p className={className} style={style}>
        {content}
      </p>
    );
  }
  return (
    <h2 className={className} style={style}>
      {content}
    </h2>
  );
};

