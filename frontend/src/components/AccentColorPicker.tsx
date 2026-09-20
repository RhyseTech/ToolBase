'use client';

import { useMemo, useRef, useState } from 'react';
import {
  hexToHsv,
  hsvToHex,
  normalizeHex,
  tokensFromBaseColor,
} from '@/lib/themes';

type EyeDropperAPI = new () => { open: () => Promise<{ sRGBHex: string }> };

/**
 * Modern rich accent picker: SV pad + hue slider + hex field +
 * eyedropper + live generated theme ramp.
 */
export function AccentColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const { h, s, v } = useMemo(() => hexToHsv(value), [value]);
  const ramp = useMemo(() => tokensFromBaseColor(value), [value]);
  const [eyeSupported] = useState(
    () => typeof window !== 'undefined' && 'EyeDropper' in window
  );

  const setFromPad = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ns = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    const nv = Math.min(
      100,
      Math.max(0, 100 - ((clientY - r.top) / r.height) * 100)
    );
    onChange(hsvToHex(h, Math.round(ns), Math.round(nv)));
  };

  const setHue = (nh: number) => {
    // keep the hue change visible when current color is grey/black/white
    const ns = s < 12 ? 65 : s;
    const nv = v < 10 ? 88 : v;
    onChange(hsvToHex(nh, ns, nv));
  };

  const commitHex = (raw: string) => {
    const n = normalizeHex(raw);
    if (n) onChange(n);
  };

  const pickFromScreen = async () => {
    try {
      const ED = (window as unknown as { EyeDropper?: EyeDropperAPI })
        .EyeDropper;
      if (!ED) return;
      const res = await new ED().open();
      const n = normalizeHex(res.sRGBHex);
      if (n) onChange(n);
    } catch {
      // user cancelled — ignore
    }
  };

  const rampChips: { key: string; label: string }[] = [
    { key: '--color-primary', label: 'Primary' },
    { key: '--color-primary-container', label: 'Container' },
    { key: '--color-secondary', label: 'Secondary' },
    { key: '--color-secondary-container', label: 'Secondary C.' },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid sm:grid-cols-[1fr_220px] gap-space-md">
        {/* SV pad */}
        <div
          ref={padRef}
          role="slider"
          aria-label="Saturation and brightness"
          aria-valuetext={`hue ${h}°, saturation ${s}%, value ${v}%`}
          tabIndex={0}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 2;
            if (e.key === 'ArrowLeft') onChange(hsvToHex(h, s - step, v));
            else if (e.key === 'ArrowRight') onChange(hsvToHex(h, s + step, v));
            else if (e.key === 'ArrowUp') onChange(hsvToHex(h, s, v + step));
            else if (e.key === 'ArrowDown') onChange(hsvToHex(h, s, v - step));
            else return;
            e.preventDefault();
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setFromPad(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) setFromPad(e.clientX, e.clientY);
          }}
          className="sv-pad relative w-full h-48 rounded-xl cursor-crosshair overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] focus:outline-none focus:ring-2 focus:ring-primary/60"
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
          }}
        >
          <span
            className="absolute w-5 h-5 rounded-full border-[3px] border-white shadow-[0_1px_8px_rgba(0,0,0,0.6)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s}%`, top: `${100 - v}%`, background: value }}
          />
        </div>

        {/* Side column: preview + hex + eyedropper */}
        <div className="flex sm:flex-col flex-row gap-space-sm items-stretch">
          <div
            className="flex-1 sm:h-20 min-h-[3.5rem] rounded-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-colors duration-150"
            style={{ background: value }}
          />
          <div className="flex gap-space-sm">
            <input
              value={hexDraft ?? value}
              onChange={(e) => {
                setHexDraft(e.target.value);
                commitHex(e.target.value);
              }}
              onBlur={() => setHexDraft(null)}
              spellCheck={false}
              maxLength={7}
              aria-label="Hex color"
              className="flex-1 min-w-0 h-11 px-space-sm rounded-lg bg-surface-container-lowest/90 text-on-surface font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 uppercase"
            />
            {eyeSupported && (
              <button
                onClick={pickFromScreen}
                title="Pick color from screen"
                className="w-11 h-11 shrink-0 rounded-lg bg-surface-container-high/70 text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">colorize</span>
              </button>
            )}
          </div>
          <span className="font-body-sm text-body-sm text-outline text-xs">
            H {h}° · S {s}% · V {v}%
          </span>
        </div>
      </div>

      {/* Hue slider */}
      <input
        type="range"
        min={0}
        max={360}
        value={h}
        onChange={(e) => setHue(Number(e.target.value))}
        aria-label="Hue"
        className="hue-slider w-full"
      />

      {/* Generated theme ramp preview */}
      <div className="flex flex-col gap-2">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
          Generated theme ramp
        </span>
        <div className="grid grid-cols-4 gap-space-sm">
          {rampChips.map((c) => (
            <div key={c.key} className="flex flex-col gap-1 min-w-0">
              <span
                className="h-10 rounded-lg border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-colors duration-150"
                style={{ background: ramp[c.key] }}
              />
              <span className="font-body-sm text-body-sm text-outline text-[11px] truncate">{c.label}</span>
              <span className="font-mono text-[11px] text-on-surface-variant/70 uppercase">{ramp[c.key]}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-1 px-space-lg py-space-sm rounded-full font-label-lg text-label-lg w-fit transition-colors duration-150"
          style={{ background: ramp['--color-primary-container'], color: ramp['--color-on-primary-container'] }}
        >
          Button preview · Aa
        </div>
      </div>
    </div>
  );
}
