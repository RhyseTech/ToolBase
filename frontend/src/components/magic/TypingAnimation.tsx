'use client';

import { useEffect, useState } from 'react';
import { useMotionAllowed } from '@/components/magic/useMotion';

/**
 * Magic UI — Typing Animation (dependency-free port).
 * Loops through phrases with type → hold → delete rhythm + caret.
 */
export function TypingHint({
  phrases,
  className = '',
  typeMs = 42,
  holdMs = 1700,
  deleteMs = 20,
}: {
  phrases: string[];
  className?: string;
  typeMs?: number;
  holdMs?: number;
  deleteMs?: number;
}) {
  const motion = useMotionAllowed();
  const [text, setText] = useState('');

  useEffect(() => {
    if (!motion || phrases.length === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const wait = (ms: number) => new Promise<void>((r) => { timer = setTimeout(r, ms); });

    (async () => {
      let i = 0;
      while (!cancelled) {
        const phrase = phrases[i % phrases.length] ?? '';
        for (let c = 1; c <= phrase.length && !cancelled; c++) {
          setText(phrase.slice(0, c));
          await wait(typeMs);
        }
        await wait(holdMs);
        for (let c = phrase.length - 1; c >= 0 && !cancelled; c--) {
          setText(phrase.slice(0, c));
          await wait(deleteMs);
        }
        await wait(420);
        i += 1;
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [motion, phrases, typeMs, holdMs, deleteMs]);

  if (!motion) {
    return <span className={className}>{phrases[0] ?? ''}</span>;
  }

  return (
    <span className={className}>
      {text}
      <span className="typing-caret" aria-hidden />
    </span>
  );
}
