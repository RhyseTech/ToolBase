'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  applySettingsToDom,
  DEFAULT_INTEGRATIONS,
  DEFAULTS,
  loadSettings,
  persistSettings,
  type ApiKey,
  type SettingsState,
} from '@/lib/settings';
import { ACCENT_PRESETS, type AccentPreset } from '@/lib/themes';
import { tokensFromBaseColor, tokensFromBaseColorLight } from '@/lib/themes';
import { BACKGROUND_OPTIONS } from '@/lib/shaders';
import { AccentColorPicker } from '@/components/AccentColorPicker';
import { ProviderKeysManager } from '@/components/ProviderKeysManager';
import { AvatarCropper } from '@/components/AvatarCropper';

type TabId = 'account' | 'appearance' | 'api' | 'integrations';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'account', label: 'Account', icon: 'person' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'api', label: 'API Keys', icon: 'key' },
  { id: 'integrations', label: 'Integrations', icon: 'integration_instructions' },
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] ${
        on ? 'bg-primary-container' : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ${
          on ? 'right-1 bg-on-primary-container' : 'left-1 bg-outline'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('account');
  const [saved, setSaved] = useState<SettingsState>(DEFAULTS);
  const [form, setForm] = useState<SettingsState>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [emailError, setEmailError] = useState('');
  const [testStatus, setTestStatus] = useState<Record<string, { state: 'testing' | 'ok' | 'fail'; detail: string }>>({});
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = loadSettings();
    setSaved(s);
    setForm(s);
    applySettingsToDom(s);
    setLoaded(true);
  }, []);

  // Live preview: apply every change to the real app instantly
  useEffect(() => {
    if (!loaded) return;
    applySettingsToDom(form);
  }, [form, loaded]);

  // Track latest snapshots for the unmount guard below (avoids stale closures)
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const formRef = useRef(form);
  formRef.current = form;

  // Leaving without saving must not leak the preview: roll the live
  // document back to the last saved settings (no persistence here).
  useEffect(() => {
    return () => {
      if (JSON.stringify(savedRef.current) !== JSON.stringify(formRef.current)) {
        applySettingsToDom(savedRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(form), [saved, form]);
  const set = <K extends keyof SettingsState>(k: K, v: SettingsState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validateEmail = (v: string) => {
    if (!v) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
    return '';
  };

  const handleSave = async () => {
    const err = validateEmail(form.email);
    setEmailError(err);
    if (err) {
      setTab('account');
      return;
    }
    setSaving(true);
    // Small delay keeps the spinner perceptible on fast saves.
    await new Promise((r) => setTimeout(r, 450));
    const ok = persistSettings(form);
    if (!ok) {
      // Storage full: roll the preview back too, so the page never
      // claims a look it couldn't keep.
      applySettingsToDom(savedRef.current);
      setSaving(false);
      setToast('Browser storage is full — delete an uploaded video or image, then save again.');
      return;
    }
    applySettingsToDom(form);
    setSaved(form);
    // keep unmount guard in sync even if user leaves before re-render
    savedRef.current = form;
    formRef.current = form;
    setSaving(false);
    // Best-effort: sync identity to the server so a re-login restores
    // these edits instead of wiping them. Local save never fails here.
    try {
      const prevEmail = savedRef.current.email || '';
      const lookupEmail = prevEmail || form.email;
      if (!lookupEmail) {
        setToast('Settings saved successfully.');
        return;
      }
      const r = await fetch(`${BACKEND}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: lookupEmail,
          displayName: form.displayName,
          avatar: form.avatar,
          role: form.role,
          bio: form.bio,
          location: form.location,
          website: form.website,
          ...(form.email !== prevEmail ? { newEmail: form.email } : {}),
        }),
      });
      if (r.ok) {
        setToast('Settings saved successfully.');
      } else if (r.status === 404) {
        setToast('Settings saved on this device.');
      } else {
        const data = await r.json().catch(() => ({}));
        setToast(`Settings saved locally — ${data.detail || 'account sync failed.'}`);
      }
    } catch {
      setToast('Settings saved locally — will sync when backend is reachable.');
    }
  };

  const handleCancel = () => {
    setForm(saved);
    formRef.current = saved;
    applySettingsToDom(saved);
    persistSettings(saved);
    setEmailError('');
    setToast('Changes discarded.');
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setToast('Please choose an image file for your avatar.');
      return;
    }
    if (avatarDraft && avatarDraft.startsWith('blob:')) {
      URL.revokeObjectURL(avatarDraft);
    }
    setAvatarDraft(URL.createObjectURL(f));
  };

  const applyAvatar = (dataUrl: string) => {
    set('avatar', dataUrl);
    if (avatarDraft && avatarDraft.startsWith('blob:')) {
      URL.revokeObjectURL(avatarDraft);
    }
    setAvatarDraft(null);
    setToast('Avatar ready — press Save Changes to keep it.');
  };

  const cancelAvatar = () => {
    if (avatarDraft && avatarDraft.startsWith('blob:')) {
      URL.revokeObjectURL(avatarDraft);
    }
    setAvatarDraft(null);
  };

  const toggleIntegration = (id: string) =>
    set(
      'integrations',
      form.integrations.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );

  const setIntegrationConfig = (id: string, config: string) =>
    set(
      'integrations',
      form.integrations.map((i) => (i.id === id ? { ...i, config } : i))
    );

  const testIntegration = async (id: string, config: string) => {
    if (!config.trim()) {
      setToast('Paste the endpoint / webhook URL first.');
      return;
    }
    setTestStatus((s) => ({ ...s, [id]: { state: 'testing', detail: 'Probing…' } }));
    try {
      const res = await fetch('http://127.0.0.1:8000/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, config: config.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setTestStatus((s) => ({ ...s, [id]: { state: 'ok', detail: data.detail || 'Reachable ✓' } }));
      } else {
        setTestStatus((s) => ({ ...s, [id]: { state: 'fail', detail: data.detail || `Failed (${res.status})` } }));
      }
    } catch {
      setTestStatus((s) => ({ ...s, [id]: { state: 'fail', detail: 'Backend offline' } }));
    }
  };

  const inputCls =
    'w-full bg-surface-container-highest/50 border border-surface-container-highest rounded-lg px-space-md py-space-sm text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] placeholder:text-on-surface-variant/50';
  const labelCls = 'font-label-caps text-label-caps text-outline uppercase tracking-wider';

  if (!loaded) {
    return (
      <main className="w-full pt-28 bg-background min-h-screen px-space-xl pb-space-xl">
        <div className="max-w-[1200px] mx-auto text-on-surface-variant font-body-md">Loading settings…</div>
      </main>
    );
  }

  return (
    <main className="w-full pt-28 bg-background min-h-screen px-space-xl pb-space-xl">
      <div className="flex flex-col w-full relative min-w-0">
        <div className="relative z-10 flex flex-col w-full max-w-[1200px] mx-auto gap-space-xl">
          <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">Settings</h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Manage your account preferences, API keys, and workspace configurations.
              </p>
            </div>
            {dirty && (
              <span className="inline-flex items-center gap-2 px-space-sm py-1 rounded-full bg-secondary/10 text-secondary font-label-caps text-label-caps w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Unsaved changes
              </span>
            )}
          </section>

          <div className="flex flex-col lg:flex-row gap-space-xl items-start">
            <aside className="w-full lg:w-64 flex flex-col gap-space-xs shrink-0 lg:sticky lg:top-28">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-medium transition-all text-left ${
                    tab === t.id
                      ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(229,195,120,0.2)]'
                      : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface'
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${tab === t.id ? 'text-on-primary-container' : 'group-hover:text-primary'}`}>{t.icon}</span>
                  <span className="font-label-lg text-label-lg">{t.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  // Real local logout: wipe identity, keep device settings
                  // (appearance, keys, integrations), then land on sign-in.
                  const cleared = {
                    ...form,
                    displayName: '',
                    email: '',
                    role: '',
                    bio: '',
                    location: '',
                    website: '',
                    avatar: '',
                  };
                  setForm(cleared);
                  formRef.current = cleared;
                  setSaved(cleared);
                  savedRef.current = cleared;
                  persistSettings(cleared);
                  applySettingsToDom(cleared);
                  router.push('/signin');
                }}
                className="flex items-center gap-space-sm px-space-md py-space-sm rounded-xl text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface transition-all text-left mt-space-md"
              >
                <span className="material-symbols-outlined text-lg text-error">logout</span>
                <span className="font-label-lg text-label-lg text-error">Log Out</span>
              </button>
            </aside>

            <div className="flex-1 flex flex-col gap-space-xl w-full min-w-0">
              {tab === 'account' && (
                <>
                  <section className="flex flex-col gap-space-md">
                    <h2 className="font-headline-md text-headline-md text-on-surface font-medium border-b border-surface-container-highest pb-space-sm">
                      Profile Details
                    </h2>
                    <div className="p-space-lg rounded-xl bg-surface-container-low/70 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col sm:flex-row gap-space-lg">
                      <div className="flex flex-col items-center gap-space-sm shrink-0">
                        <div className="w-24 h-24 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant border-2 border-surface-container shadow-inner overflow-hidden">
                          {form.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-4xl">person</span>
                          )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                        <div className="flex gap-2">
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="px-space-md py-space-sm rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors border border-surface-container-highest"
                          >
                            Upload New Avatar
                          </button>
                          {form.avatar && (
                            <button
                              onClick={() => set('avatar', '')}
                              className="px-space-sm py-space-sm rounded-lg text-on-surface-variant hover:text-error transition-colors"
                              title="Remove avatar"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-space-sm w-full">
                        <div className="grid sm:grid-cols-2 gap-space-sm">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Display Name</label>
                            <input
                              value={form.displayName}
                              onChange={(e) => set('displayName', e.target.value)}
                              placeholder="Your name"
                              className={inputCls}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Role / Title</label>
                            <input
                              value={form.role}
                              onChange={(e) => set('role', e.target.value)}
                              placeholder="e.g. Curator, Developer"
                              className={inputCls}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Email Address</label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => {
                              set('email', e.target.value);
                              setEmailError('');
                            }}
                            placeholder="you@example.com"
                            className={`${inputCls} ${emailError ? 'border-error' : ''}`}
                          />
                          {emailError && <span className="text-error text-xs">{emailError}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Bio</label>
                          <textarea
                            value={form.bio}
                            onChange={(e) => set('bio', e.target.value)}
                            rows={3}
                            placeholder="Tell us about your stack and interests…"
                            className={`${inputCls} resize-none`}
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-space-sm">
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Location</label>
                            <input
                              value={form.location}
                              onChange={(e) => set('location', e.target.value)}
                              placeholder="City, Country"
                              className={inputCls}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Website</label>
                            <input
                              value={form.website}
                              onChange={(e) => set('website', e.target.value)}
                              placeholder="https://…"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-space-md">
                    <h2 className="font-headline-md text-headline-md text-on-surface font-medium border-b border-surface-container-highest pb-space-sm">
                      Preferences
                    </h2>
                    <div className="p-space-lg rounded-xl bg-surface-container-low/70 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col gap-space-lg">
                      <div className="flex items-center justify-between gap-space-md">
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg text-on-surface">Email Notifications</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Receive updates about your favorite tools and collections.
                          </span>
                        </div>
                        <Toggle on={form.emailNotifications} onChange={(v) => set('emailNotifications', v)} label="Email notifications" />
                      </div>
                      <hr className="border-surface-container-highest" />
                      <div className="flex items-center justify-between gap-space-md">
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg text-on-surface">Telemetry & Analytics</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Help us improve the platform by sending anonymous usage data.
                          </span>
                        </div>
                        <Toggle on={form.telemetry} onChange={(v) => set('telemetry', v)} label="Telemetry" />
                      </div>
                      <hr className="border-surface-container-highest" />
                      <div className="flex items-center justify-between gap-space-md">
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg text-on-surface">Compact Mode</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Reduce padding and font size to fit more tools on screen.
                          </span>
                        </div>
                        <Toggle on={form.compactMode} onChange={(v) => set('compactMode', v)} label="Compact mode" />
                      </div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-space-md mt-space-lg">
                    <h2 className="font-headline-md text-headline-md text-error font-medium border-b border-error/20 pb-space-sm">
                      Danger Zone
                    </h2>
                    <div className="p-space-lg rounded-xl border border-error/30 bg-error/5 flex flex-col gap-space-md backdrop-blur-xl">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg text-on-surface">Delete Account</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Permanently remove your account and all data. This action cannot be undone.
                          </span>
                        </div>
                        <button
                          onClick={() => setToast('Delete is disabled in this POC — clear site data to reset.')}
                          className="px-space-lg py-space-sm rounded-lg bg-error text-on-error font-label-md text-label-md shadow-sm hover:bg-error/90 transition-colors shrink-0"
                        >
                          Delete Account
                        </button>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-space-sm items-stretch sm:items-center">
                        <input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          placeholder='Type DELETE to confirm (disabled in POC)'
                          disabled
                          className="flex-1 bg-surface-container-highest/40 border border-error/20 rounded-lg px-space-md py-space-sm text-on-surface-variant font-body-md opacity-60 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </section>
                </>
              )}

              {tab === 'appearance' && (
                <section className="flex flex-col gap-space-md">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-medium border-b border-surface-container-highest pb-space-sm">
                    Appearance
                  </h2>
                  <div className="p-space-lg rounded-xl bg-surface-container-low/70 backdrop-blur-xl flex flex-col gap-space-lg">
                    <div className="flex flex-col gap-space-sm">
                      <span className={labelCls}>Theme</span>
                      <div className="grid grid-cols-3 gap-space-sm">
                        {(
                          [
                            { v: 'dark', icon: 'dark_mode', label: 'Dark' },
                            { v: 'light', icon: 'light_mode', label: 'Light' },
                            { v: 'system', icon: 'computer', label: 'System' },
                          ] as const
                        ).map((o) => (
                          <button
                            key={o.v}
                            onClick={() => set('theme', o.v)}
                            className={`flex flex-col items-center gap-1 p-space-md rounded-xl border transition-all ${
                              form.theme === o.v
                                ? 'border-primary bg-primary/10 text-on-surface'
                                : 'border-surface-container-highest text-on-surface-variant hover:border-outline'
                            }`}
                          >
                            <span className="material-symbols-outlined text-2xl">{o.icon}</span>
                            <span className="font-label-lg text-label-lg">{o.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-space-sm">
                      <span className={labelCls}>Color theme</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-space-sm">
                        {(Object.values(ACCENT_PRESETS) as AccentPreset[]).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => set('accent', p.id)}
                            className={`flex flex-col items-start gap-2 p-space-md rounded-xl border transition-all text-left ${
                              form.accent === p.id
                                ? 'border-primary bg-primary/10 text-on-surface shadow-[0_0_15px_rgba(229,195,120,0.15)]'
                                : 'border-surface-container-highest text-on-surface-variant hover:border-outline'
                            }`}
                          >
                            <span
                              className="w-9 h-9 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
                              style={{ background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]})` }}
                            />
                            <span>
                              <span className="block font-label-lg text-label-lg text-on-surface">{p.label}</span>
                              <span className="block font-body-sm text-body-sm text-on-surface-variant text-xs mt-0.5">{p.desc}</span>
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            const hex = form.customAccent || '#e5c378';
                            setForm((f) => ({
                              ...f,
                              accent: 'custom',
                              customAccent: hex,
                              customAccentTokens: tokensFromBaseColor(hex),
                              customAccentTokensLight: tokensFromBaseColorLight(hex),
                            }));
                          }}
                          className={`flex flex-col items-start gap-2 p-space-md rounded-xl border transition-all text-left ${
                            form.accent === 'custom'
                              ? 'border-primary bg-primary/10 text-on-surface shadow-[0_0_15px_rgba(229,195,120,0.15)]'
                              : 'border-surface-container-highest text-on-surface-variant hover:border-outline'
                          }`}
                        >
                          <span
                            className="w-9 h-9 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
                            style={{ background: 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
                          />
                          <span>
                            <span className="block font-label-lg text-label-lg text-on-surface">Custom</span>
                            <span className="block font-body-sm text-body-sm text-on-surface-variant text-xs mt-0.5">Build your own accent</span>
                          </span>
                        </button>
                      </div>
                      {form.accent === 'custom' && (
                        <div className="p-space-md rounded-xl border border-primary/30 bg-primary/[0.04]">
                          <AccentColorPicker
                            value={form.customAccent || '#e5c378'}
                            onChange={(hex) =>
                              setForm((f) => ({
                                ...f,
                                accent: 'custom',
                                customAccent: hex,
                                customAccentTokens: tokensFromBaseColor(hex),
                                customAccentTokensLight: tokensFromBaseColorLight(hex),
                              }))
                            }
                          />
                        </div>
                      )}
                      <span className="font-body-sm text-body-sm text-outline text-xs">
                        Velvet Aurum is the default theme — tokens defined in <span className="font-mono text-secondary">color.md</span> at the project root.
                      </span>
                    </div>

                    <div className="flex flex-col gap-space-sm">
                      <span className={labelCls}>Background animation</span>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
                        {BACKGROUND_OPTIONS.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => set('background', o.id)}
                            className={`flex flex-col gap-2 p-space-sm rounded-xl border transition-all text-left ${
                              form.background === o.id
                                ? 'border-primary bg-primary/10 text-on-surface shadow-[0_0_15px_rgba(229,195,120,0.15)]'
                                : 'border-surface-container-highest text-on-surface-variant hover:border-outline'
                            }`}
                          >
                            <span
                              className="w-full h-14 rounded-lg border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] flex items-end justify-start p-1.5"
                              style={{ background: o.thumb }}
                            >
                              <span className="material-symbols-outlined text-lg text-white/90 drop-shadow">{o.icon}</span>
                            </span>
                            <span>
                              <span className="block font-label-lg text-label-lg text-on-surface">{o.label}</span>
                              <span className="block font-body-sm text-body-sm text-on-surface-variant text-xs mt-0.5">{o.desc}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <span className="font-body-sm text-body-sm text-outline text-xs">
                        Applies to every page backdrop after save. Liquid Gold + Prism Rings are Stitch shaders — sources in <span className="font-mono text-secondary">stitch_assets_shader/</span>.
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-space-lg">
                      <div className="flex flex-col gap-space-sm">
                        <span className={labelCls}>Font size</span>
                        <div className="flex gap-2">
                          {(['small', 'medium', 'large'] as const).map((v) => (
                            <button
                              key={v}
                              onClick={() => set('fontSize', v)}
                              className={`flex-1 px-space-sm py-space-sm rounded-lg border capitalize font-label-md text-label-md transition-all ${
                                form.fontSize === v
                                  ? 'border-primary bg-primary/10 text-on-surface'
                                  : 'border-surface-container-highest text-on-surface-variant hover:border-outline'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-space-sm">
                        <span className={labelCls}>Card density</span>
                        <div className="flex gap-2">
                          {(['comfortable', 'compact'] as const).map((v) => (
                            <button
                              key={v}
                              onClick={() => set('density', v)}
                              className={`flex-1 px-space-sm py-space-sm rounded-lg border capitalize font-label-md text-label-md transition-all ${
                                form.density === v
                                  ? 'border-primary bg-primary/10 text-on-surface'
                                  : 'border-surface-container-highest text-on-surface-variant hover:border-outline'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-space-md">
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg text-on-surface">Animations</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Card hover lifts and background shimmer.</span>
                      </div>
                      <Toggle on={form.animations} onChange={(v) => set('animations', v)} label="Animations" />
                    </div>
                  </div>
                </section>
              )}

              {tab === 'api' && (
                <section className="flex flex-col gap-space-md">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-medium border-b border-surface-container-highest pb-space-sm">
                    API Keys
                  </h2>
                  <ProviderKeysManager />
                </section>
              )}

              {tab === 'integrations' && (
                <section className="flex flex-col gap-space-md">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-medium border-b border-surface-container-highest pb-space-sm">
                    Integrations
                  </h2>
                  <div className="flex flex-col gap-space-sm">
                    {form.integrations.map((it) => (
                      <div
                        key={it.id}
                        className="p-space-md rounded-xl bg-surface-container-low/70 backdrop-blur-xl border border-surface-container-highest flex flex-col gap-space-sm"
                      >
                        <div className="flex items-center gap-space-md">
                          <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-xl">{it.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-label-lg text-label-lg text-on-surface">{it.name}</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant truncate">{it.desc}</div>
                          </div>
                          <Toggle on={it.enabled} onChange={() => toggleIntegration(it.id)} label={`${it.name} enabled`} />
                        </div>
                        {it.enabled && (
                          <div className="flex flex-col gap-1">
                            <label className={labelCls}>Endpoint / config</label>
                            <div className="flex flex-col sm:flex-row gap-space-sm">
                              <input
                                value={it.config}
                                onChange={(e) => setIntegrationConfig(it.id, e.target.value)}
                                placeholder={`https://… (${it.name} webhook or base URL)`}
                                className={`${inputCls} flex-1`}
                              />
                              <button
                                onClick={() => testIntegration(it.id, it.config)}
                                disabled={testStatus[it.id]?.state === 'testing'}
                                className="px-space-md py-space-sm rounded-lg bg-surface-container-high/70 hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                              >
                                <span className={`material-symbols-outlined text-base ${testStatus[it.id]?.state === 'testing' ? 'animate-spin' : 'text-secondary'}`}>
                                  {testStatus[it.id]?.state === 'testing' ? 'progress_activity' : 'wifi_tethering'}
                                </span>
                                Test
                              </button>
                            </div>
                            {testStatus[it.id] && (
                              <span className={`font-label-caps text-label-caps mt-1 ${
                                testStatus[it.id].state === 'ok' ? 'text-green-400'
                                : testStatus[it.id].state === 'fail' ? 'text-red-400'
                                : 'text-on-surface-variant'
                              }`}>
                                {testStatus[it.id].state === 'ok' ? '● ' : testStatus[it.id].state === 'fail' ? '● ' : ''}
                                {testStatus[it.id].detail}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* API tab self-saves each key to the backend, so the form
                  Save bar below doesn't apply there — hide it to avoid
                  the "blocked Save Changes" confusion. */}
              {tab !== 'api' && (
              <div className="flex flex-col sm:flex-row justify-end gap-space-md pt-space-lg pb-space-xl sm:items-center">
                <span className="text-xs text-on-surface-variant sm:mr-auto">
                  {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
                </span>
                <button
                  onClick={handleCancel}
                  disabled={!dirty || saving}
                  className="px-space-lg py-space-sm rounded-lg text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="px-space-lg py-space-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow-[0_0_24px_rgba(229,195,120,0.32)] hover:shadow-[0_0_32px_rgba(229,195,120,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2 min-w-[150px]"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-space-md py-space-sm rounded-full bg-surface-container-highest text-on-surface shadow-2xl border border-white/10 font-body-sm text-body-sm whitespace-nowrap">
          <span className="material-symbols-outlined text-base text-secondary">check_circle</span>
          {toast}
        </div>
      )}

      {avatarDraft && (
        <AvatarCropper src={avatarDraft} onApply={applyAvatar} onCancel={cancelAvatar} />
      )}
    </main>
  );
}
