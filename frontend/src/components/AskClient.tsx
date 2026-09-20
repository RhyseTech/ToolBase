'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE, PROVIDERS, PROVIDER_MODELS, type ProviderId, type SavedProviderKey } from '@/lib/providers';
import { ModernSelect } from '@/components/ModernSelect';
import { AiSparkIcon } from '@/components/AiSparkIcon';
import { NumberTicker } from '@/components/magic/NumberTicker';

type Tool = { id: number; name: string; category?: string; url?: string };
type Macro = { id: number; title: string; prompt: string };
type Msg = {
  role: 'user' | 'assistant';
  text: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  toolsUsed?: { id: number; name: string }[];
  macroTitle?: string;
};

const ASK_API = 'http://127.0.0.1:8000/api/ai/ask';
const PROMPTS_API = 'http://127.0.0.1:8000/api/prompts';

const STARTERS = [
  'Which indexed tools are best for rapid frontend prototyping?',
  'Compare the research tools in my directory.',
  'What can the design tools in ToolBase do?',
];

export function AskClient({ tools, macros }: { tools: Tool[]; macros: Macro[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [macro, setMacro] = useState<Macro | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sessionNo, setSessionNo] = useState(1);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [forkedIdx, setForkedIdx] = useState<number | null>(null);
  const [savedKeys, setSavedKeys] = useState<SavedProviderKey[]>([]);
  const [provider, setProvider] = useState<ProviderId>('groq');
  const [model, setModel] = useState(PROVIDER_MODELS.groq[0]);
  const [liveModels, setLiveModels] = useState<Record<string, string[]>>({});
  const [fetchingModels, setFetchingModels] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load saved provider keys → default the switcher to the first one
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/provider-keys/options`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const saved: SavedProviderKey[] = data.saved || [];
        setSavedKeys(saved);
        if (saved.length > 0) {
          const first = saved[0];
          if ((PROVIDERS as { id: string }[]).some((p) => p.id === first.provider)) {
            setProvider(first.provider as ProviderId);
            setModel(first.model || PROVIDER_MODELS[first.provider as ProviderId][0]);
          }
        }
      } catch {
        /* backend offline — env fallback still works server-side */
      }
    })();
  }, []);

  const savedFor = (p: ProviderId) => savedKeys.find((k) => k.provider === p);
  const modelsFor = (p: ProviderId) => liveModels[p] ?? PROVIDER_MODELS[p];

  const fetchLiveModels = async (p: ProviderId) => {
    setFetchingModels(true);
    try {
      const res = await fetch(`${API_BASE}/api/provider-keys/models?provider=${p}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.models?.length) {
        setLiveModels((m) => ({ ...m, [p]: data.models }));
        if (data.live) setModel((cur) => (p === provider && data.models.includes(cur) ? cur : data.models[0]));
        if (p === provider && !data.models.includes(model)) setModel(data.models[0]);
      }
    } catch {
      /* keep presets */
    } finally {
      setFetchingModels(false);
    }
  };

  const pickProvider = (p: ProviderId) => {
    setProvider(p);
    const saved = savedFor(p);
    const list = liveModels[p] ?? PROVIDER_MODELS[p];
    setModel(saved?.model && (list.includes(saved.model) || !liveModels[p]) ? saved.model : list[0]);
    fetchLiveModels(p);
  };

  const convoTokens = useMemo(
    () => Math.ceil(messages.reduce((a, m) => a + m.text.length, 0) / 4),
    [messages]
  );
  const lastLatency = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant' && m.latencyMs != null);
    return last?.latencyMs ?? null;
  }, [messages]);
  const sessionTitle = useMemo(() => {
    const first = messages.find((m) => m.role === 'user');
    if (!first) return `Session #${sessionNo}: New inquiry`;
    const t = first.text.slice(0, 42);
    return `Session #${sessionNo}: ${t}${first.text.length > 42 ? '…' : ''}`;
  }, [messages, sessionNo]);

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  const send = async (override?: string) => {
    const question = (override ?? input).trim();
    if (!question || sending) return;
    setSending(true);
    setError(null);
    const userMsg: Msg = { role: 'user', text: question, macroTitle: macro?.title };
    setMessages((list) => [...list, userMsg]);
    setInput('');
    scrollDown();
    try {
      const res = await fetch(ASK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          macro: macro ? `${macro.title}\n${macro.prompt}` : null,
          provider,
          model,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setMessages((list) => [
        ...list,
        {
          role: 'assistant',
          text: data.answer,
          model: data.model,
          provider: data.provider,
          latencyMs: data.latency_ms,
          toolsUsed: data.tools_used || [],
          macroTitle: macro?.title,
        },
      ]);
    } catch (e: any) {
      setError(e?.message || 'AI request failed — add a provider key in Settings → API Keys.');
    } finally {
      setSending(false);
      scrollDown();
    }
  };

  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || sending) return;
    // Drop the last assistant reply, re-ask the last question
    setMessages((list) => {
      const i = list.map((m) => m.role).lastIndexOf('assistant');
      return i >= 0 ? list.slice(0, i) : list;
    });
    await send(lastUser.text);
  };

  const copyText = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 1500);
    } catch {
      alert('Copy failed.');
    }
  };

  const forkToVault = async (text: string, idx: number) => {
    try {
      const res = await fetch(PROMPTS_API + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Ask AI synthesis — ${new Date().toLocaleString()}`,
          prompt: text.slice(0, 4000),
        }),
      });
      if (res.ok) {
        setForkedIdx(idx);
        setTimeout(() => setForkedIdx((v) => (v === idx ? null : v)), 2000);
      } else {
        alert('Fork failed.');
      }
    } catch {
      alert('Fork failed — is the backend running?');
    }
  };

  const clearContext = () => {
    if (sending) return; // don't wipe mid-request — the reply would land in an empty session
    setMessages([]);
    setMacro(null);
    setError(null);
    setCopiedIdx(null);
    setForkedIdx(null);
    setPickerOpen(false);
  };

  const newSession = () => {
    if (sending) return;
    clearContext();
    setSessionNo((n) => n + 1);
  };

  return (
    <>
      {/* Header */}
      <section className="flex flex-col gap-space-md">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
          <div className="flex flex-col gap-space-xs max-w-3xl">
            <h1 className="font-display-md text-display-md text-on-surface tracking-tight font-light">Ask AI</h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Answers grounded in your {tools.length} indexed tool{tools.length === 1 ? '' : 's'}
              {macros.length > 0 && <> and {macros.length} vault macro{macros.length === 1 ? '' : 's'}</>}.
            </p>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap self-start lg:self-end">
            <button onClick={clearContext} disabled={sending} title={sending ? 'Wait for the reply to finish' : 'Clear messages, keep this session'} className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container-high/60 hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-base text-outline">history</span>
              <span>Clear Context</span>
            </button>
            <button onClick={newSession} disabled={sending} title={sending ? 'Wait for the reply to finish' : 'Start a fresh numbered session'} className="btn-shimmer flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-gradient-to-br from-primary-container to-secondary text-on-primary font-label-lg text-label-lg font-semibold hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-base">add</span>
              <span>New Session</span>
            </button>
          </div>
        </div>
      </section>

      {/* Model switcher — driven by saved provider keys */}
      <section className="relative z-30 flex flex-col sm:flex-row sm:items-center gap-space-sm rounded-xl bg-surface-container-low/70 backdrop-blur-xl px-space-md py-space-sm">
        <div className="flex items-center gap-space-xs shrink-0">
          <AiSparkIcon size={18} />
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Model</span>
        </div>
        <div className="flex items-center gap-space-xs flex-wrap">
          {PROVIDERS.map((p) => {
            const saved = savedFor(p.id);
            const active = provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => pickProvider(p.id)}
                title={saved ? `${p.label} — key saved, ${saved.model}` : `${p.label} — no key saved (env fallback)`}
                className={`flex items-center gap-1 px-space-sm py-1 rounded-full font-label-caps text-label-caps transition-all ${
                  active
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(229,195,120,0.3)]'
                    : 'bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {saved && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                <span>{p.short}</span>
              </button>
            );
          })}
        </div>
        <ModernSelect
          ariaLabel="Model for the selected provider"
          value={model}
          onChange={setModel}
          size="sm"
          mono
          className="flex-1 min-w-[12rem]"
          options={[
            ...(!modelsFor(provider).includes(model) ? [{ value: model, label: model }] : []),
            ...modelsFor(provider).map((m) => ({ value: m, label: m })),
          ]}
        />
        <button
          onClick={() => fetchLiveModels(provider)}
          disabled={fetchingModels}
          title="Refresh live model list from this provider"
          className="h-9 w-9 rounded-lg bg-surface-container-high/50 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all disabled:opacity-50 shrink-0"
        >
          <span className={`material-symbols-outlined text-base ${fetchingModels ? 'animate-spin' : ''}`}>
            {fetchingModels ? 'progress_activity' : 'sync'}
          </span>
        </button>
        {savedKeys.length === 0 && (
          <Link href="/settings" className="font-label-caps text-label-caps text-primary hover:underline whitespace-nowrap">
            + Add keys in Settings
          </Link>
        )}
      </section>

      {/* Live HUD */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <Hud label="Indexed Tools" value={<NumberTicker value={tools.length} />} sub="Live directory context" />
        <Hud label="Vault Macros" value={<NumberTicker value={macros.length} />} sub="Available for injection" />
        <Hud label="Conversation" value={<NumberTicker value={convoTokens} format={(n) => (n > 0 ? `~${Math.round(n)} tok` : '0 tok')} />} sub={`${messages.length} message${messages.length === 1 ? '' : 's'} this session`} />
        <Hud label="Last Latency" value={lastLatency != null ? <NumberTicker value={lastLatency} format={(n) => `${Math.round(n)}ms`} /> : '—'} sub="Measured per request" />
      </section>

      {/* Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          <div className="flex items-center justify-between px-space-lg py-space-md rounded-xl bg-surface-container/50 backdrop-blur-xl">
            <div className="flex items-center gap-space-sm min-w-0">
              <span className="material-symbols-outlined text-secondary text-lg">forum</span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-lg text-label-lg text-on-surface font-medium truncate">{sessionTitle}</span>
                <span className="font-label-caps text-label-caps text-outline">{messages.length === 0 ? 'Idle' : 'Active'}</span>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={regenerate} disabled={sending} className="flex items-center gap-space-xs text-outline hover:text-primary transition-colors font-label-md text-label-md disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">cached</span>
                <span>Regenerate</span>
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-space-lg py-space-xs">
            {messages.length === 0 && (
              <div className="flex flex-col gap-space-sm p-space-lg rounded-2xl bg-surface-container/40 backdrop-blur-xl">
                <p className="font-body-md text-body-md text-on-surface-variant">No messages yet. Try a starter:</p>
                <div className="flex flex-wrap gap-space-xs">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} disabled={sending} className="px-space-md py-space-xs rounded-full bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-all text-left disabled:opacity-50">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex flex-col gap-space-xs pl-space-md">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-secondary-container to-primary-container text-on-secondary font-label-caps text-label-caps font-bold flex items-center justify-center">YOU</div>
                    {m.macroTitle && (
                      <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-secondary-container/30 text-primary">Macro: {m.macroTitle}</span>
                    )}
                  </div>
                  <div className="p-space-lg rounded-2xl rounded-tl-sm bg-surface-container-high/60 max-w-3xl">
                    <p className="font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-space-sm">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center">
                      <AiSparkIcon size={18} />
                    </div>
                    <span className="font-label-caps text-label-caps text-primary tracking-widest font-semibold uppercase truncate">{m.provider ? `${m.provider} · ` : ''}{m.model || 'AI'}</span>
                    {m.latencyMs != null && (
                      <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-surface-container-highest text-secondary">ANSWERED IN {m.latencyMs}MS</span>
                    )}
                  </div>
                  <div className="p-space-xl rounded-2xl rounded-tl-sm bg-surface-container/60 backdrop-blur-2xl flex flex-col gap-space-md">
                    <Markdown text={m.text} />
                    {m.toolsUsed && m.toolsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-space-xs">
                        {m.toolsUsed.map((t) => (
                          <Link key={t.id} href={`/tools/${t.id}`} className="px-space-sm py-0.5 rounded-full bg-surface-container-high/70 font-label-caps text-label-caps text-secondary hover:text-primary transition-colors">
                            {t.name}
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-space-xs flex-wrap pt-space-sm">
                      <button onClick={() => copyText(m.text, i)} className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-colors">
                        <span className="material-symbols-outlined text-sm text-secondary">{copiedIdx === i ? 'check' : 'content_copy'}</span>
                        <span>{copiedIdx === i ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button onClick={() => forkToVault(m.text, i)} className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-md text-label-md transition-colors">
                        <span className="material-symbols-outlined text-sm text-primary">alt_route</span>
                        <span>{forkedIdx === i ? 'Saved to Vault!' : 'Fork to Prompt Vault'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
            {sending && (
              <div className="flex items-center gap-space-sm p-space-md rounded-2xl bg-surface-container/40">
                <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                <span className="font-body-md text-body-md text-on-surface-variant">Reasoning over your directory…</span>
              </div>
            )}
            {error && (
              <div className="p-space-md rounded-xl bg-red-500/10 border border-red-500/30 font-body-sm text-body-sm text-red-300">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="flex flex-col gap-space-xs rounded-2xl bg-surface-container-low/90 backdrop-blur-2xl p-space-md">
            {macro && (
              <div className="flex items-center gap-space-xs flex-wrap px-space-xs">
                <div className="flex items-center gap-space-xs px-space-sm py-0.5 rounded-md bg-surface-container-highest text-primary font-label-caps text-label-caps">
                  <span className="material-symbols-outlined text-xs text-secondary">token</span>
                  <span>Attached: {macro.title}</span>
                  <button onClick={() => setMacro(null)} aria-label="Detach macro" className="material-symbols-outlined text-xs cursor-pointer hover:text-on-surface">close</button>
                </div>
              </div>
            )}
            {pickerOpen && (
              <div className="flex flex-col gap-space-xs max-h-56 overflow-y-auto rounded-xl bg-surface-container-lowest/80 p-space-sm">
                {macros.length === 0 && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant px-space-xs">
                    Vault is empty. <Link href="/vault" className="text-primary hover:underline">Create a macro first →</Link>
                  </p>
                )}
                {macros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-high/60 transition-colors">
                    <span className="font-body-sm text-body-sm text-on-surface truncate">{m.title}</span>
                    <button
                      onClick={() => {
                        setMacro(m);
                        setPickerOpen(false);
                      }}
                      className="font-label-caps text-label-caps px-2 py-1 rounded bg-secondary-container/40 text-primary hover:bg-secondary-container font-semibold transition-all flex-shrink-0"
                    >
                      Inject
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
              }}
              className="w-full bg-transparent border-0 outline-none text-on-surface font-body-md text-body-md placeholder:text-outline/60 resize-none px-space-xs py-space-xs"
              placeholder="Ask anything across ToolBase… (⌘/Ctrl+Enter to send)"
              rows={3}
            />
            <div className="flex items-center justify-between pt-space-xs flex-wrap gap-space-sm">
              <button onClick={() => setPickerOpen((v) => !v)} className="flex items-center gap-1 px-space-xs py-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors font-label-caps text-label-caps">
                <span className="material-symbols-outlined text-base text-secondary">bolt</span>
                <span>{macro ? 'Change Macro' : 'Macro Picker'}</span>
              </button>
              <div className="flex items-center gap-space-md">
                <span className="font-label-caps text-label-caps text-outline">~{Math.ceil(input.length / 4)} tokens</span>
                <button
                  onClick={() => send()}
                  disabled={sending || !input.trim()}
                  className="btn-shimmer flex items-center gap-space-xs px-space-lg py-space-xs rounded-xl bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg font-semibold hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{sending ? 'Thinking…' : 'Execute Query'}</span>
                  <span className="material-symbols-outlined text-sm font-bold">keyboard_return</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right inspector — live macros */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          <div className="flex flex-col p-space-lg rounded-2xl bg-surface-container/40 backdrop-blur-xl gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-base">auto_fix_high</span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold tracking-wider">Quick Macro Injection</span>
              </div>
              <Link href="/vault" className="font-label-caps text-label-caps text-outline hover:text-primary">Vault ↗</Link>
            </div>
            <div className="flex flex-col gap-space-sm">
              {macros.slice(0, 5).map((m) => (
                <div key={m.id} className="flex flex-col p-space-md rounded-xl bg-surface-container-high/40 hover:bg-surface-container-high/70 transition-all group">
                  <div className="flex items-center justify-between mb-1 gap-space-sm">
                    <span className="font-label-lg text-label-lg text-on-surface font-medium group-hover:text-primary transition-colors truncate">{m.title}</span>
                    <button
                      onClick={() => {
                        setMacro(m);
                        setPickerOpen(false);
                      }}
                      className="font-label-caps text-label-caps px-2 py-1 rounded bg-secondary-container/40 text-primary hover:bg-secondary-container font-semibold transition-all flex-shrink-0"
                    >
                      {macro?.id === m.id ? 'Attached ✓' : 'Inject'}
                    </button>
                  </div>
                  <div className="text-outline font-label-caps text-label-caps mt-1 truncate">{m.prompt.slice(0, 80)}</div>
                </div>
              ))}
              {macros.length === 0 && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">No macros yet. <Link href="/vault" className="text-primary hover:underline">Create one →</Link></p>
              )}
            </div>
          </div>

          <div className="flex flex-col p-space-lg rounded-2xl bg-surface-container/40 backdrop-blur-xl gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-base">pin_drop</span>
              <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold tracking-wider">Indexed Context</span>
            </div>
            <div className="flex flex-col gap-space-xs">
              {tools.slice(0, 6).map((t) => (
                <Link key={t.id} href={`/tools/${t.id}`} className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-highest/50 hover:bg-surface-container-high/70 transition-colors">
                  <span className="font-body-sm text-body-sm text-on-surface truncate">{t.name}</span>
                  <span className="font-label-caps text-label-caps text-outline flex-shrink-0">{t.category || ''}</span>
                </Link>
              ))}
              {tools.length === 0 && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">No tools indexed. <Link href="/add" className="text-primary hover:underline">Add one →</Link></p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Normalize common model quirks so answers render cleanly:
 *  - single-* bullets -> dash bullets (with blank line before a list)
 *  - whole-line **Bold** labels -> real ### headings
 */
function normalizeMd(src: string): string {
  const lines = src.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (heading && heading[1].length < 80 && !trimmed.includes('](')) {
      if (out.length && out[out.length - 1].trim() !== '') out.push('');
      out.push(`### ${heading[1].trim()}`);
      out.push('');
      continue;
    }
    const bullet = line.match(/^(\s*)\*\s+(.*)$/);
    if (bullet) {
      const prev = out.length ? out[out.length - 1] : '';
      if (prev.trim() !== '' && !/^\s*[-*]\s/.test(prev) && !prev.trim().startsWith('###')) out.push('');
      out.push(`${bullet[1]}- ${bullet[2]}`);
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function Markdown({ text }: { text: string }) {
  const normalized = useMemo(() => normalizeMd(text), [text]);
  return (
    <div className="font-body-md text-body-md text-on-surface-variant leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight border-l-2 border-secondary pl-space-sm mt-space-md mb-space-xs">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-space-xs leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="my-space-sm space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="my-space-sm space-y-1.5 list-decimal pl-6 marker:text-secondary">{children}</ol>,
          li: ({ children }) => (
            <li className="relative pl-5 leading-relaxed before:content-['›'] before:absolute before:left-1 before:text-secondary before:font-bold">
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-surface-container-highest font-mono text-[13px] text-primary-fixed-dim">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="p-space-md rounded-xl bg-surface-container-lowest/90 overflow-x-auto font-mono text-[13px] leading-relaxed">{children}</pre>
          ),
          hr: () => <hr className="border-white/10 my-space-md" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

function Hud({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {  return (
    <div className="flex flex-col justify-between p-space-lg rounded-xl bg-surface-container/40 backdrop-blur-xl relative overflow-hidden hover:bg-surface-container/60 transition-all">
      <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">{label}</span>
      <div className="mt-space-md mb-space-xs">
        <div className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">{value}</div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
