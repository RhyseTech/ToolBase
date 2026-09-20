'use client';

/**
 * Color-theme presets for Settings → Appearance.
 *
 * Source of truth for the default theme: `/color.md` ("Velvet Aurum").
 * The gold preset below mirrors its `colors:` frontmatter exactly; the
 * remaining presets keep the Velvet Aurum obsidian surfaces and swap only
 * the accent (primary / secondary) family so the atelier look stays intact.
 *
 * Applied at runtime by overriding the Tailwind v4 `@theme` CSS variables
 * (`--color-*`) on `<html>` — see `applyAccentToDom`. Removing the inline
 * overrides restores the compiled `globals.css` defaults (Velvet Aurum).
 */

import type { SettingsState } from './settings';

export type Accent = 'gold' | 'blue' | 'green' | 'purple';

/** Full accent value stored in settings (presets + user-built custom color). */
export type ThemeAccent = Accent | 'custom';

export type AccentPreset = {
  id: Accent;
  label: string;
  desc: string;
  /** gradient stops for the settings swatch dot */
  swatch: [string, string];
  /** CSS variable overrides, e.g. { '--color-primary': '#…' } */
  tokens: Record<string, string>;
};

export const ACCENT_TOKEN_KEYS = [
  '--color-primary',
  '--color-on-primary',
  '--color-primary-container',
  '--color-on-primary-container',
  '--color-secondary',
  '--color-on-secondary',
  '--color-secondary-container',
  '--color-on-secondary-container',
  '--color-surface-tint',
  '--color-inverse-primary',
  '--color-primary-fixed',
  '--color-primary-fixed-dim',
  '--color-secondary-fixed',
  '--color-secondary-fixed-dim',
] as const;

export const ACCENT_PRESETS: Record<Accent, AccentPreset> = {
  gold: {
    id: 'gold',
    label: 'Velvet Aurum',
    desc: 'Champagne gold on obsidian · from color.md',
    swatch: ['#E5C378', '#D4AF37'],
    tokens: {
      '--color-primary': '#ffe09d',
      '--color-on-primary': '#3f2e00',
      '--color-primary-container': '#e5c378',
      '--color-on-primary-container': '#684f0f',
      '--color-secondary': '#e9c349',
      '--color-on-secondary': '#3c2f00',
      '--color-secondary-container': '#af8d11',
      '--color-on-secondary-container': '#342800',
      '--color-surface-tint': '#e4c277',
      '--color-inverse-primary': '#745b1a',
      '--color-primary-fixed': '#ffdf9b',
      '--color-primary-fixed-dim': '#e4c277',
      '--color-secondary-fixed': '#ffe088',
      '--color-secondary-fixed-dim': '#e9c349',
    },
  },
  blue: {
    id: 'blue',
    label: 'Azure Sovereign',
    desc: 'Sovereign blue accent · Aurum surfaces',
    swatch: ['#8fb8ec', '#2f5d9f'],
    tokens: {
      '--color-primary': '#c9dcfa',
      '--color-on-primary': '#10294d',
      '--color-primary-container': '#5a8fd6',
      '--color-on-primary-container': '#0c1f3a',
      '--color-secondary': '#8fb8ec',
      '--color-on-secondary': '#0f2a4d',
      '--color-secondary-container': '#2f5d9f',
      '--color-on-secondary-container': '#dbe9ff',
      '--color-surface-tint': '#8fb8ec',
      '--color-inverse-primary': '#3f6ea8',
      '--color-primary-fixed': '#c9dcfa',
      '--color-primary-fixed-dim': '#8fb8ec',
      '--color-secondary-fixed': '#b8d2f4',
      '--color-secondary-fixed-dim': '#8fb8ec',
    },
  },
  green: {
    id: 'green',
    label: 'Emerald Vault',
    desc: 'Vault emerald accent · Aurum surfaces',
    swatch: ['#8fd0a4', '#2e7d4f'],
    tokens: {
      '--color-primary': '#c4e9cf',
      '--color-on-primary': '#0d3b22',
      '--color-primary-container': '#4da56a',
      '--color-on-primary-container': '#08271a',
      '--color-secondary': '#8fd0a4',
      '--color-on-secondary': '#0d3b22',
      '--color-secondary-container': '#2e7d4f',
      '--color-on-secondary-container': '#dcf5e4',
      '--color-surface-tint': '#8fd0a4',
      '--color-inverse-primary': '#3a7d55',
      '--color-primary-fixed': '#c4e9cf',
      '--color-primary-fixed-dim': '#8fd0a4',
      '--color-secondary-fixed': '#b5e2c2',
      '--color-secondary-fixed-dim': '#8fd0a4',
    },
  },
  purple: {
    id: 'purple',
    label: 'Amethyst ToolBase',
    desc: 'ToolBase amethyst accent · Aurum surfaces',
    swatch: ['#bda6f2', '#5b4396'],
    tokens: {
      '--color-primary': '#ddcefb',
      '--color-on-primary': '#341863',
      '--color-primary-container': '#8b6fd6',
      '--color-on-primary-container': '#22103f',
      '--color-secondary': '#bda6f2',
      '--color-on-secondary': '#341863',
      '--color-secondary-container': '#5b4396',
      '--color-on-secondary-container': '#e9defc',
      '--color-surface-tint': '#bda6f2',
      '--color-inverse-primary': '#6a4fa3',
      '--color-primary-fixed': '#ddcefb',
      '--color-primary-fixed-dim': '#bda6f2',
      '--color-secondary-fixed': '#cdbcf5',
      '--color-secondary-fixed-dim': '#bda6f2',
    },
  },
};

/** Compact token map for the pre-paint boot script in layout.tsx. */
export function accentTokensForBoot(accent: string): Record<string, string> {
  const preset = ACCENT_PRESETS[(accent as Accent) || 'gold'] || ACCENT_PRESETS.gold;
  return preset.tokens;
}

/* ------------------------------------------------------------------ */
/* Custom color engine — builds a dark-theme accent family from one hex */
/* ------------------------------------------------------------------ */

export function clampHue(h: number): number {
  return ((Math.round(h) % 360) + 360) % 360;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.trim().replace(/^#/, '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  const n = parseInt(c, 16);
  if (Number.isNaN(n) || c.length !== 6) return { h: 40, s: 66, l: 63 };
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = ((max + min) / 2) * 100;
  if (max === min) return { h: 0, s: 0, l: Math.round(l) };
  const d = max - min;
  const s = (d / (l > 50 ? 2 - max - min : max + min)) * 100;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h: clampHue(h), s: Math.round(s), l: Math.round(l) };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = clampHue(h);
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;
  const k = (t: number) => (t + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (t: number) => l - a * Math.max(-1, Math.min(k(t) - 3, Math.min(9 - k(t), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}
export function normalizeHex(v: string): string | null {
  const c = v.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(c)) return `#${c.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(c)) {
    return `#${c.toLowerCase().split('').map((ch) => ch + ch).join('')}`;
  }
  return null;
}

/** HSV helpers — the SV pad in the rich picker works in HSV space. */
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let c = hex.trim().replace(/^#/, '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  const n = parseInt(c, 16);
  if (Number.isNaN(n) || c.length !== 6) return { h: 40, s: 66, v: 90 };
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max * 100;
  const s = max === 0 ? 0 : (d / max) * 100;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: clampHue(h), s: Math.round(s), v: Math.round(v) };
}

export function hsvToHex(h: number, s: number, v: number): string {
  h = clampHue(h);
  s = Math.min(100, Math.max(0, s)) / 100;
  v = Math.min(100, Math.max(0, v)) / 100;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;
  if (i === 0) { r = v; g = t; b = p; }
  else if (i === 1) { r = q; g = v; b = p; }
  else if (i === 2) { r = p; g = v; b = t; }
  else if (i === 3) { r = p; g = q; b = v; }
  else if (i === 4) { r = t; g = p; b = v; }
  else { r = v; g = p; b = q; }
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * Derive the full accent token family from a single base color,
 * tuned for the Velvet Aurum obsidian surfaces (dark theme).
 */
export function tokensFromBaseColor(baseHex: string): Record<string, string> {
  const { h, s } = hexToHsl(baseHex);
  const sat = Math.max(38, Math.min(s, 88));
  const P = (hh: number, ss: number, ll: number) => hslToHex(hh, ss, ll);
  return {
    '--color-primary': P(h, Math.max(sat, 55), 84),
    '--color-on-primary': P(h, 65, 11),
    '--color-primary-container': P(h, sat, 60),
    '--color-on-primary-container': P(h, 55, 15),
    '--color-secondary': P(h, sat * 0.85, 70),
    '--color-on-secondary': P(h, 65, 11),
    '--color-secondary-container': P(h, 60, 36),
    '--color-on-secondary-container': P(h, 55, 90),
    '--color-surface-tint': P(h, sat, 66),
    '--color-inverse-primary': P(h, 45, 44),
    '--color-primary-fixed': P(h, Math.max(sat, 55), 87),
    '--color-primary-fixed-dim': P(h, sat, 70),
    '--color-secondary-fixed': P(h, sat * 0.8, 78),
    '--color-secondary-fixed-dim': P(h, sat * 0.8, 68),
  };
}

/**
 * Derive the accent token family for LIGHT mode (warm-paper Aurum):
 * same hues as the dark engine, lightness remapped so text/fills stay
 * readable on ivory surfaces. Warm-white ink for on-accent text.
 */
export function tokensFromBaseColorLight(baseHex: string): Record<string, string> {
  const { h, s } = hexToHsl(baseHex);
  const sat = Math.max(40, Math.min(s, 88));
  const P = (hh: number, ss: number, ll: number) => hslToHex(hh, ss, ll);
  return {
    '--color-primary': P(h, Math.max(sat, 48), 36),
    '--color-on-primary': '#fffdf4',
    '--color-primary-container': P(h, sat, 76),
    '--color-on-primary-container': P(h, 55, 20),
    '--color-secondary': P(h, sat * 0.85, 32),
    '--color-on-secondary': '#fffdf4',
    '--color-secondary-container': P(h, 55, 78),
    '--color-on-secondary-container': P(h, 55, 20),
    '--color-surface-tint': P(h, sat, 40),
    '--color-inverse-primary': P(h, 45, 42),
    '--color-primary-fixed': P(h, sat, 80),
    '--color-primary-fixed-dim': P(h, sat, 62),
    '--color-secondary-fixed': P(h, sat * 0.8, 82),
    '--color-secondary-fixed-dim': P(h, sat * 0.8, 64),
  };
}

/** Base colors the light presets are generated from (keep in sync with ACCENT_PRESETS hues). */
export const LIGHT_BASES: Record<Accent, string> = {
  gold: '#e5c378',
  blue: '#5a8fd6',
  green: '#4da56a',
  purple: '#8b6fd6',
};

/** Light-mode accent presets, generated — never hand-edit values, tune the engine instead. */
export const LIGHT_PRESETS: Record<Accent, AccentPreset> = {
  gold: { ...ACCENT_PRESETS.gold, desc: 'Champagne bronze on ivory · from color.md', tokens: tokensFromBaseColorLight('#e5c378') },
  blue: { ...ACCENT_PRESETS.blue, desc: 'Sovereign blue accent · paper surfaces', tokens: tokensFromBaseColorLight('#5a8fd6') },
  green: { ...ACCENT_PRESETS.green, desc: 'Vault emerald accent · paper surfaces', tokens: tokensFromBaseColorLight('#4da56a') },
  purple: { ...ACCENT_PRESETS.purple, desc: 'ToolBase amethyst accent · paper surfaces', tokens: tokensFromBaseColorLight('#8b6fd6') },
};

export type ThemeMode = 'dark' | 'light';

/** Resolve the exact token map for an accent + mode (+ stored custom maps). */
export function accentTokens(
  accent: ThemeAccent,
  mode: ThemeMode,
  custom?: { dark?: Record<string, string>; light?: Record<string, string> }
): Record<string, string> {
  if (accent === 'custom' && custom) {
    const map = mode === 'light' ? custom.light : custom.dark;
    if (map && Object.keys(map).length > 0) return map;
  }
  if (mode === 'light') return (LIGHT_PRESETS[accent as Accent] || LIGHT_PRESETS.gold).tokens;
  return (ACCENT_PRESETS[accent as Accent] || ACCENT_PRESETS.gold).tokens;
}

/** Apply an accent preset to <html> via inline CSS variables (live preview). */
export function applyAccentToDom(
  accent: ThemeAccent,
  opts?: { mode?: ThemeMode; custom?: { dark?: Record<string, string>; light?: Record<string, string> } }
) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tokens = accentTokens(accent, opts?.mode ?? 'dark', opts?.custom);
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  root.dataset.accent = accent;
}

/** Remove accent overrides → falls back to compiled Velvet Aurum defaults. */
export function clearAccentFromDom() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of ACCENT_TOKEN_KEYS) {
    root.style.removeProperty(key);
  }
  root.dataset.accent = 'gold';
}
