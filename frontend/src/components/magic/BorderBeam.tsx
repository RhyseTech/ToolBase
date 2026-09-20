'use client';

import React from 'react';

/**
 * Magic UI — Border Beam (dependency-free port).
 * Animated champagne beam travelling around the parent's border.
 * Parent must be `relative` with a border-radius (beam inherits it).
 */
export function BorderBeam({
  duration = 6,
  size = 120,
  colorFrom = 'rgba(255,224,157,0)',
  colorTo = 'rgba(229,195,120,0.9)',
  className = '',
}: {
  duration?: number;
  size?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
    >
      <div
        className="beam-ring absolute inset-0 rounded-[inherit]"
        style={
          {
            padding: 1.5,
            background: `conic-gradient(from var(--beam-angle, 0deg), transparent 0deg, ${colorFrom} ${size * 0.4}deg, ${colorTo} ${size}deg, transparent ${size * 1.6}deg)`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            animationDuration: `${duration}s`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
