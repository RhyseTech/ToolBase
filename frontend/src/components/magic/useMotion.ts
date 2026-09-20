'use client';

import { useEffect, useState } from 'react';

function computeAllowed(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  if (document.body.classList.contains('no-animations')) return false;
  return true;
}

/**
 * False when the user disabled motion (OS reduced-motion or the app's
 * Animations toggle). Canvas/timer effects should render a static
 * fallback or nothing when this is false.
 */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState<boolean>(() => computeAllowed());

  useEffect(() => {
    setAllowed(computeAllowed());
    const mo = new MutationObserver(() => setAllowed(computeAllowed()));
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  return allowed;
}
