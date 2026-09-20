'use client';

import { useId } from 'react';

/** Original triple-sparkle AI mark — golden gradient + staggered twinkle.
 *  Use tone="dark" on gold backgrounds (e.g. selected nav item). */
export function AiSparkIcon({ size = 20, className = '', tone = 'gold' }: { size?: number; className?: string; tone?: 'gold' | 'dark' }) {
  const gid = `ai-spark-gold-${useId().replace(/:/g, '')}`;
  const stops =
    tone === 'dark'
      ? [
          { offset: '0%', color: '#4a3605' },
          { offset: '55%', color: '#684f0f' },
          { offset: '100%', color: '#3f2e00' },
        ]
      : [
          { offset: '0%', color: '#ffe09d' },
          { offset: '45%', color: '#e9c349' },
          { offset: '100%', color: '#af8d11' },
        ];
  const spark = (d: string, delay: string, opacity: number) => (
    <path
      d={d}
      fill={`url(#${gid})`}
      opacity={opacity}
      className={`ai-spark ${delay}`}
    />
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`ai-spark-glow shrink-0 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffe09d" />
          <stop offset="45%" stopColor="#e9c349" />
          <stop offset="100%" stopColor="#af8d11" />
        </linearGradient>
      </defs>
      {/* large sparkle, lower-left */}
      {spark('M10 3 C10.8 7.5 12.5 9.2 17 10 C12.5 10.8 10.8 12.5 10 17 C9.2 12.5 7.5 10.8 3 10 C7.5 9.2 9.2 7.5 10 3 Z', 'ai-spark-d1', 1)}
      {/* small sparkle, upper-right */}
      {spark('M18.5 2.5 C18.9 4.6 19.9 5.6 22 6 C19.9 6.4 18.9 7.4 18.5 9.5 C18.1 7.4 17.1 6.4 15 6 C17.1 5.6 18.1 4.6 18.5 2.5 Z', 'ai-spark-d2', 0.95)}
      {/* tiny sparkle, bottom-right */}
      {spark('M18 14.5 C18.3 16.2 19.1 17 20.8 17.3 C19.1 17.6 18.3 18.4 18 20.1 C17.7 18.4 16.9 17.6 15.2 17.3 C16.9 17 17.7 16.2 18 14.5 Z', 'ai-spark-d3', 0.9)}
    </svg>
  );
}
