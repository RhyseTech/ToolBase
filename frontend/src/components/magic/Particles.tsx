'use client';

import { useEffect, useRef } from 'react';
import { useMotionAllowed } from '@/components/magic/useMotion';

type P = { x: number; y: number; r: number; vy: number; vx: number; ph: number; sp: number };

/**
 * Magic UI — Particles, floating gold dust (dependency-free port).
 * Slow drift + twinkle, DPR-aware, pauses off-tab. Keep density low.
 */
export function Particles({
  density = 42,
  className = '',
}: {
  density?: number;
  className?: string;
}) {
  const motion = useMotionAllowed();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!motion) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const parts: P[] = Array.from({ length: density }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.6,
      vy: 0.00012 + Math.random() * 0.0004,
      vx: (Math.random() - 0.5) * 0.0002,
      ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 1.1,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    const t0 = performance.now();
    const frame = (t: number) => {
      if (!document.hidden) {
        const el = (t - t0) / 1000;
        ctx.clearRect(0, 0, w, h);
        for (const p of parts) {
          p.y -= p.vy;
          p.x += p.vx + Math.sin(el * 0.3 + p.ph) * 0.00008;
          if (p.y < -0.02) {
            p.y = 1.02;
            p.x = Math.random();
          }
          if (p.x < -0.02) p.x = 1.02;
          if (p.x > 1.02) p.x = -0.02;
          const tw = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(el * p.sp + p.ph));
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(229,195,120,${tw.toFixed(3)})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [motion, density]);

  if (!motion) return null;

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
