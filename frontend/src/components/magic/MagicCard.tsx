'use client';

import React from 'react';

/**
 * Magic UI — Magic Card spotlight (dependency-free port).
 * Attach `onMouseMove={setSpotlight}` to the card and render
 * `<Spotlight />` as its first child. Card must be `relative`
 * (works with the existing `group` hover pattern).
 */
export function setSpotlight(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export function Spotlight({ color = '229,195,120' }: { color?: string }) {
  return (
    <div
      aria-hidden
      className="spotlight pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
      style={{
        background: `radial-gradient(480px circle at var(--mx, 50%) var(--my, 50%), rgba(${color},0.13), transparent 65%)`,
      }}
    />
  );
}
