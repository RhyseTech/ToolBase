'use client';

import { useMemo } from 'react';
import { useMotionAllowed } from '@/components/magic/useMotion';

type MeteorSpec = {
  top: string;
  left: string;
  duration: string;
  delay: string;
  scale: number;
};

/**
 * Magic UI — Meteors (dependency-free port).
 * Slow champagne streaks. Keep counts low (5–8) for taste.
 */
export function Meteors({
  count = 6,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  const motion = useMotionAllowed();

  const meteors = useMemo<MeteorSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        top: `${(i * 37 + 11) % 70}%`,
        left: `${(i * 53 + 20) % 90}%`,
        duration: `${7 + ((i * 1.7) % 5)}s`,
        delay: `${(i * 1.3) % 6}s`,
        scale: 0.7 + ((i * 0.23) % 0.8),
      })),
    [count]
  );

  if (!motion) return null;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {meteors.map((m, i) => (
        <span
          key={i}
          className="absolute"
          style={{ top: m.top, left: m.left, transform: `scale(${m.scale})` }}
        >
          <span
            className="meteor"
            style={{
              animationDuration: m.duration,
              animationDelay: m.delay,
            } as React.CSSProperties}
          />
        </span>
      ))}
    </div>
  );
}
