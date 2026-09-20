'use client';

import { useEffect, useState } from 'react';
import {
  applySettingsToDom,
  loadSettings,
  SETTINGS_EVENT,
  type SettingsState,
} from '@/lib/settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Apply saved settings on every page load
    applySettingsToDom(loadSettings());

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<SettingsState>).detail;
      if (detail) applySettingsToDom(detail);
      else applySettingsToDom(loadSettings());
      setTick((t) => t + 1);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'aitoolbox-settings-v1') {
        applySettingsToDom(loadSettings());
        setTick((t) => t + 1);
      }
    };
    // Follow OS theme when "system" is selected
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    const onMq = () => applySettingsToDom(loadSettings());
    window.addEventListener(SETTINGS_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    mq?.addEventListener?.('change', onMq);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
      mq?.removeEventListener?.('change', onMq);
    };
  }, []);

  return <>{children}</>;
}
