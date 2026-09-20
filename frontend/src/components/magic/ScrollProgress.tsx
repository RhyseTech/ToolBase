'use client';

import { useEffect, useState } from 'react';

/**
 * Magic UI — Scroll Progress (dependency-free port).
 * Hairline gold bar; render inside the fixed header. Hidden on
 * pages with nothing to scroll.
 */
export function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        setP(max > 40 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (p <= 0) return null;

  return (
    <span
      aria-hidden
      className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r from-primary-container via-secondary to-primary-container shadow-[0_0_12px_rgba(229,195,120,0.55)]"
      style={{ transform: `scaleX(${p})` }}
    />
  );
}
