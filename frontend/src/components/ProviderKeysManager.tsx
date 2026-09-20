'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE, authHeaders, PROVIDERS, PROVIDER_MODELS, type ProviderId, type SavedProviderKey } from '@/lib/providers';
import { ModernSelect } from '@/components/ModernSelect';

export function ProviderKeysManager() {
  const [keys, setKeys] = useState<SavedProviderKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderId>('groq');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(PROVIDER_MODELS.groq[0]);
  const [customModel, setCustomModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [liveModels, setLiveModels] = useState<string[] | null>(null);
  const [liveBadge, setLiveBadge] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  const providerMeta = PROVIDERS.find((p) => p.id === provider);
  const modelOptions = liveModels ?? PROVIDER_MODELS[provider];

  const fetchLiveModels = async () => {
    // Uses the pasted key for preview, else the saved/backend key
    if (providerMeta?.needsKey && !apiKey.trim() && !keys.some((k) => k.provider === provider)) {
      setMsg('Paste the key (or save it) first, then fetch live models.');
      return;
    }
    setFetchingModels(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams({ provider });
      // Unsaved preview key goes in a header — never in the URL (logs/history).
      const headers: Record<string, string> = authHeaders();
      if (apiKey.trim()) headers['X-Provider-Key'] = apiKey.trim();
      const res = await fetch(`${API_BASE}/api/provider-keys/models?${qs.toString()}`, { cache: 'no-store', headers });
      const data = await res.json();
      const list: string[] = data.models || [];
      setLiveModels(list);
      setLiveBadge(!!data.live);
      if (list.length > 0 && !list.includes(model)) setModel(list[0]);
      setMsg(data.live ? `Live: ${list.length} models from ${provider}.` : (data.detail || 'Live listing failed — presets shown.'));
    } catch {
      setMsg('Live listing failed — is the backend running? Presets shown.');
      setLiveModels(null);
      setLiveBadge(false);
    } finally {
      setFetchingModels(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/provider-keys/`, { cache: 'no-store', headers: authHeaders() });
      if (res.ok) setKeys(await res.json());
    } catch {
      setMsg('Backend offline — cannot load keys.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // Reset model dropdown when provider changes; prefill saved model if present
    const saved = keys.find((k) => k.provider === provider);
    if (saved?.model) {
      setModel(saved.model);
      setCustomModel(!PROVIDER_MODELS[provider].includes(saved.model));
    } else {
      setModel(PROVIDER_MODELS[provider][0]);
      setCustomModel(false);
    }
    setLabel(saved?.label || '');
    setLiveModels(null);
    setLiveBadge(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleSave = async () => {
    if (providerMeta?.needsKey && !apiKey.trim()) {
      setMsg('Paste an API key first.');
      return;
    }
    if (!model.trim()) {
      setMsg('Pick or type a model.');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/provider-keys/`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ provider, label: label.trim(), api_key: apiKey.trim(), model: model.trim() }),
      });
      if (res.ok) {
        setMsg(`${provider} key saved — our code and Ask AI will use it.`);
        setApiKey('');
        setShowKey(false);
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg(data.detail || 'Save failed.');
      }
    } catch {
      setMsg('Save failed — is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (k: SavedProviderKey) => {
    if (!window.confirm(`Remove the ${k.provider} key? Ask AI will fall back to env keys.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/provider-keys/${k.id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        setMsg(`${k.provider} key removed.`);
        await load();
      } else {
        setMsg('Delete failed.');
      }
    } catch {
      setMsg('Delete failed — is the backend running?');
    }
  };

  const providerMetaById = (id: string) => PROVIDERS.find((p) => p.id === id);

  return (
    <div className="p-space-lg rounded-xl bg-surface-container-low/70 backdrop-blur-xl flex flex-col gap-space-md">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Add one key per provider — GPT, Gemini, Groq, OpenRouter — pick its model, and it saves in the
        backend. Ask AI and analysis use these keys automatically.
      </p>

      <div className="grid sm:grid-cols-2 gap-space-sm">
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Provider</span>
          <ModernSelect
            ariaLabel="Provider"
            value={provider}
            onChange={(v) => setProvider(v as ProviderId)}
            options={PROVIDERS.map((p) => ({
              value: p.id,
              label: p.label,
              hint: keys.some((k) => k.provider === p.id) ? '✓ key saved' : 'no key yet',
            }))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Label (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. personal-groq"
            className="h-11 px-space-sm rounded-lg bg-surface-container-highest/50 border border-surface-container-highest text-on-surface focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">API key</span>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={providerMetaById(provider)?.placeholder || 'paste key'}
            className="w-full h-11 pl-space-sm pr-12 rounded-lg bg-surface-container-highest/50 border border-surface-container-highest text-on-surface font-mono text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            title={showKey ? 'Hide' : 'Show'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-lg">{showKey ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>
      </label>

      <div className="flex flex-col gap-1">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
          Model {liveBadge && <span className="text-secondary">· LIVE from {provider}</span>}
        </span>
        <div className="flex flex-col sm:flex-row gap-space-sm">
          {!customModel ? (
            <ModernSelect
              ariaLabel="Model"
              value={model}
              className="flex-1"
              onChange={(v) => {
                if (v === '__custom__') setCustomModel(true);
                else setModel(v);
              }}
              options={[
                ...(!modelOptions.includes(model) ? [{ value: model, label: model }] : []),
                ...modelOptions.map((m) => ({ value: m, label: m })),
                { value: '__custom__', label: 'Custom model…' },
              ]}
            />
          ) : (
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
              className="flex-1 h-11 px-space-sm rounded-lg bg-surface-container-highest/50 border border-surface-container-highest text-on-surface font-mono text-sm focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
            />
          )}
          <button
            onClick={fetchLiveModels}
            disabled={fetchingModels}
            title="Fetch the actual available models from this provider"
            className="px-space-md h-11 rounded-lg bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${fetchingModels ? 'animate-spin' : ''}`}>
              {fetchingModels ? 'progress_activity' : 'sync'}
            </span>
            {fetchingModels ? 'Fetching…' : 'Live models'}
          </button>
          {customModel && (
            <button onClick={() => { setCustomModel(false); setModel(modelOptions[0]); }} className="px-space-sm text-on-surface-variant hover:text-on-surface font-label-caps text-label-caps">
              Presets
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-space-lg py-space-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">{saving ? 'progress_activity' : 'add'}</span>
        {saving ? 'Saving…' : `Save ${providerMetaById(provider)?.label} key`}
      </button>

      {msg && <p className="font-body-sm text-body-sm text-on-surface-variant">{msg}</p>}

      <div className="flex flex-col gap-space-sm pt-space-sm border-t border-surface-container-highest">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
          Saved in backend ({keys.length}/{PROVIDERS.length} providers)
        </span>
        {loading ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">Loading…</p>
        ) : keys.length === 0 ? (
          <div className="py-space-lg flex flex-col items-center text-center gap-2 border border-dashed border-surface-container-highest rounded-xl">
            <span className="material-symbols-outlined text-3xl text-outline">key_off</span>
            <span className="font-label-lg text-label-lg text-on-surface">No provider keys yet</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Add your first key above — Ask AI falls back to env keys until then.</span>
          </div>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="flex items-center gap-space-sm p-space-md rounded-xl bg-surface-container-highest/40 border border-surface-container-highest">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-lg">key</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-label-lg text-label-lg text-on-surface truncate">
                  {providerMetaById(k.provider)?.label || k.provider}
                  {k.label && <span className="text-on-surface-variant"> · {k.label}</span>}
                </div>
                <div className="font-mono text-xs text-on-surface-variant truncate">{k.model || 'default model'} · key stored ✓</div>
              </div>
              <button onClick={() => handleDelete(k)} title="Remove" className="p-2 rounded-full text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
