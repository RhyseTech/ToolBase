'use client';

import React, { useEffect, useRef, useState } from 'react';

export type ModernOption = {
  value: string;
  label: string;
  hint?: string;
};

export function ModernSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
  size = 'md',
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ModernOption[];
  ariaLabel?: string;
  className?: string;
  size?: 'md' | 'sm';
  mono?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-30' : ''} ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full ${size === 'sm' ? 'h-9' : 'h-11'} pl-space-sm pr-9 rounded-lg bg-surface-container-highest/50 border text-left text-on-surface ${mono ? 'font-mono text-xs' : 'font-body-md text-body-md'} truncate transition-colors focus:outline-none ${
          open ? 'border-primary/60 shadow-[0_0_16px_rgba(229,195,120,0.15)]' : 'border-surface-container-highest hover:border-outline/60'
        }`}
      >
        <span className="block truncate" title={current?.label || value}>{current?.label || value || 'Select…'}</span>
        <span className={`material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 min-w-full w-max max-w-[min(22rem,80vw)] rounded-xl bg-surface-container-lowest/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-1.5 max-h-64 overflow-y-auto">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-primary-container/15 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high/70 hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-base shrink-0 ${active ? 'text-primary' : 'text-transparent'}`}>
                  check
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate font-body-md text-body-md ${active ? 'font-medium' : ''}`} title={o.label}>{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-outline" title={o.hint}>{o.hint}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
