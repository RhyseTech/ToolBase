'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Magic UI — Blur Fade (dependency-free port).
 * IntersectionObserver-driven blur + rise reveal, once.
 */
export function BlurFade({
  children,
  delay = 0,
  y = 14,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`blur-fade${visible ? ' is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ['--blur-y' as string]: `${y}px` }}
    >
      {children}
    </div>
  );
}
