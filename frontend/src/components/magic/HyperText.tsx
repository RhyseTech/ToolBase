'use client';

import { useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&';

/**
 * Magic UI — Hyper Text (dependency-free port).
 * Scramble-decodes the label on hover. Desktop delight only —
 * touch devices simply never trigger it.
 */
export function HyperText({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const [out, setOut] = useState(text);
  const running = useRef(false);

  const run = () => {
    if (running.current) return;
    running.current = true;
    let iter = 0;
    const iv = setInterval(() => {
      setOut(
        text
          .split('')
          .map((c, i) => {
            if (c === ' ') return ' ';
            if (i < iter) return c;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('')
      );
      iter += 1 / 2.5;
      if (iter >= text.length) {
        clearInterval(iv);
        setOut(text);
        running.current = false;
      }
    }, 32);
  };

  return (
    <span className={className} onMouseEnter={run}>
      {out}
    </span>
  );
}
