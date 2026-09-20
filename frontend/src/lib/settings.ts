'use client';

import { applyAccentToDom, type ThemeAccent } from './themes';
import type { BackgroundVariant } from './shaders';

export type ApiKey = {
  id: string;
  name: string;
  value: string;
  createdAt: string;
  lastUsed: string;
};

export type Integration = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  enabled: boolean;
  config: string;
};

export type SettingsState = {
  displayName: string;
  email: string;
  role: string;
  bio: string;
  location: string;
  website: string;
  avatar: string;
  emailNotifications: boolean;
  telemetry: boolean;
  compactMode: boolean;
  theme: 'dark' | 'light' | 'system';
  accent: ThemeAccent;
  /** animated page backdrop — Stitch shaders selectable in Appearance */
  background: BackgroundVariant | 'off';
  /** base color for the custom accent (accent === 'custom') */
  customAccent: string;
  /** pre-generated token maps for the custom accent (also used pre-paint) */
  customAccentTokens: Record<string, string>;
  customAccentTokensLight: Record<string, string>;
  fontSize: 'small' | 'medium' | 'large';
  density: 'comfortable' | 'compact';
  animations: boolean;
  apiKeys: ApiKey[];
  integrations: Integration[];
};

export const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'github', name: 'GitHub', icon: 'code', desc: 'Sync starred repos and import tool lists.', enabled: true, config: 'https://api.github.com' },
  { id: 'slack', name: 'Slack', icon: 'forum', desc: 'Post collection updates to a channel.', enabled: false, config: '' },
  { id: 'notion', name: 'Notion', icon: 'description', desc: 'Export tools and notes to a database.', enabled: false, config: '' },
  { id: 'groq', name: 'Groq Cloud', icon: 'bolt', desc: 'Fast inference for Ask and curation.', enabled: true, config: 'https://api.groq.com' },
  { id: 'openai', name: 'OpenAI', icon: 'auto_awesome', desc: 'Fallback model for summaries.', enabled: false, config: '' },
  { id: 'zapier', name: 'Zapier', icon: 'electric_bolt', desc: 'Trigger zaps on new tools.', enabled: false, config: '' },
];

export const DEFAULTS: SettingsState = {
  displayName: 'Rakesh',
  email: 'rakesh@example.com',
  role: 'Curator',
  bio: '',
  location: '',
  website: '',
  avatar: '',
  emailNotifications: true,
  telemetry: false,
  compactMode: false,
  theme: 'dark',
  accent: 'gold',
  background: 'atelier-flow',
  customAccent: '#e5c378',
  customAccentTokens: {},
  customAccentTokensLight: {},
  fontSize: 'medium',
  density: 'comfortable',
  animations: true,
  apiKeys: [],
  integrations: DEFAULT_INTEGRATIONS,
};

export const STORAGE_KEY = 'aitoolbox-settings-v1';
export const SETTINGS_EVENT = 'aitoolbox-settings-changed';

export function loadSettings(): SettingsState {
  try {
    if (typeof localStorage === 'undefined') return DEFAULTS;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export const IDENTITY_COOKIE = 'tb_email';

export function persistSettings(s: SettingsState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Quota exceeded (large uploads share the same ~5MB budget) — caller
    // must surface this instead of pretending the save worked.
    return false;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: s }));
  }
  syncIdentityCookie(s.email);
  return true;
}

/** Mirror the login email into a plain cookie so server components can scope
 * reads (tool visibility) to the owner. Backend also accepts X-User-Email. */
export function syncIdentityCookie(email: string) {
  try {
    if (typeof document === 'undefined') return;
    const v = (email || '').trim().toLowerCase();
    document.cookie =
      v
        ? `${IDENTITY_COOKIE}=${encodeURIComponent(v)}; path=/; max-age=31536000; samesite=lax`
        : `${IDENTITY_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } catch {
    /* cookies unavailable — header auth still works client-side */
  }
}

export function resolveTheme(theme: SettingsState['theme']): 'dark' | 'light' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  }
  return theme;
}

/** Apply settings to <html>/<body> immediately — safe to call on every change (live preview). */
export function applySettingsToDom(s: SettingsState) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  // Theme
  const mode = resolveTheme(s.theme);
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
  root.style.colorScheme = mode;
  root.dataset.theme = mode;

  // Accent / color theme — mode-aware presets + custom color in @/lib/themes
  // (gold = Velvet Aurum, color.md; light maps keep contrast on ivory)
  applyAccentToDom(s.accent || 'gold', {
    mode,
    custom: { dark: s.customAccentTokens, light: s.customAccentTokensLight },
  });

  // Font size — base rem scaling
  const px = s.fontSize === 'small' ? 14 : s.fontSize === 'large' ? 18 : 16;
  root.style.fontSize = `${px}px`;
  root.dataset.fontSize = s.fontSize;

  // Density / compact — shrink spacing tokens live
  const compact = s.compactMode || s.density === 'compact';
  root.dataset.density = compact ? 'compact' : 'comfortable';
  if (compact) {
    root.style.setProperty('--spacing-space-lg', '1rem');
    root.style.setProperty('--spacing-space-md', '0.625rem');
    root.style.setProperty('--spacing-space-xl', '1.5rem');
    body.classList.add('density-compact');
  } else {
    root.style.setProperty('--spacing-space-lg', '1.5rem');
    root.style.setProperty('--spacing-space-md', '1rem');
    root.style.setProperty('--spacing-space-xl', '2.5rem');
    body.classList.remove('density-compact');
  }

  // Animations
  root.dataset.animations = s.animations ? 'on' : 'off';
  body.classList.toggle('no-animations', !s.animations);
}
