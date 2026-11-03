'use client';

import React from 'react';

export interface KavachLogoProps {
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  showText?: boolean;
  textSize?: number;
  textColor?: string;
  color?: string;
  invert?: boolean;
  style?: React.CSSProperties;
}

/**
 * Official Kavach 3D Geometric Isometric Wireframe Cube Emblem.
 * Sourced directly from the official brand identity vector blueprint.
 */
export const KavachMark: React.FC<{
  size?: number;
  color?: string;
  invert?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ size = 26, invert = false, className, style }) => {
  const cubeSrc = invert ? '/kavach-cube-white.png' : '/kavach-cube.png';

  return (
    <img
      src={cubeSrc}
      alt="Kavach Emblem"
      width={size}
      height={Math.round(size * 1.06)}
      className={className}
      style={{
        width: `${size}px`,
        height: `${Math.round(size * 1.06)}px`,
        display: 'inline-block',
        flexShrink: 0,
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style,
      }}
      loading="eager"
      decoding="async"
    />
  );
};

/**
 * Full Official Kavach Brand Logo.
 * Displays the 3D isometric cube emblem in front of the authentic Kavach brand wordmark.
 */
export const KavachLogo: React.FC<KavachLogoProps> = ({
  size = 28,
  width,
  height,
  className,
  showText = true,
  textSize,
  textColor,
  color,
  invert = false,
  style,
}) => {
  const effectiveSize = height || size;
  const brandLogoSrc = invert ? '/kavach-logo-white.png' : '/kavach-logo.png';
  // Compute height for the kavach wordmark: proportionate to the cube size
  const wordmarkHeight = Math.round(effectiveSize * 0.78);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        textDecoration: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 3D Isometric Cube in front */}
      <KavachMark size={effectiveSize} invert={invert} />

      {/* Official Kavach Wordmark Brand Logo */}
      {showText && (
        <img
          src={brandLogoSrc}
          alt="Kavach"
          height={wordmarkHeight}
          style={{
            height: `${wordmarkHeight}px`,
            width: 'auto',
            objectFit: 'contain',
            display: 'inline-block',
            verticalAlign: 'middle',
          }}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
};

export default KavachLogo;
