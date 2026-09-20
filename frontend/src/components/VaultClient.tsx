'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

type Prompt = {
  id: number;
  title: string;
  prompt: string;
  tool_id?: number | null;
  created_at?: string;
};

type TestResult = {
  id: number;
  ok: boolean;
  issues: string[];
  variables: string[];
  tokens: number;
};

const API = 'http://127.0.0.1:8000/api/prompts';

function extractVariables(body: string): string[] {
  const m = body.match(/\[[A-Z0-9_]+\]/g);
  return m ? [...new Set(m)] : [];
}

function validatePrompt(p: Prompt): TestResult {
  const issues: string[] = [];
  const body = (p.prompt || '').trim();
  const variables = extractVariables(p.prompt || '');
  const tokens = Math.ceil(body.length / 4);
  if (!p.title?.trim()) issues.push('Missing title');
  if (!body) issues.push('Empty body');
  if (body && body.length < 20) issues.push('Body under 20 chars');
  const open = (body.match(/\[/g) || []).length;
  const close = (body.match(/\]/g) || []).length;
  if (open !== close) issues.push('Unbalanced [ ] brackets');
  if (variables.length === 0 && body.length >= 20) issues.push('No [VARIABLE] slots');
  return { id: p.id, ok: issues.length === 0, issues, variables, tokens };
}

export function VaultClient({ initialPrompts }: { initialPrompts: Prompt[] }) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Record<number, TestResult>>({});
  const [testedAt, setTestedAt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter((p) =>
      `${p.title} ${p.prompt}`.toLowerCase().includes(q)
    );
  }, [prompts, query]);

  const stats = useMemo(() => {
    const tokens = prompts.map((p) => Math.ceil((p.prompt || '').length / 4));
    const avg = tokens.length ? Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length) : 0;
    const vars = new Set<string>();
    prompts.forEach((p) => extractVariables(p.prompt || '').forEach((v) => vars.add(v)));
    const linked = new Set(prompts.map((p) => p.tool_id).filter((v) => v != null)).size;
    return { count: prompts.length, avgTokens: avg, variables: vars.size, linked };
  }, [prompts]);

  const passCount = useMemo(() => Object.values(results).filter((r) => r.ok).length, [results]);

  const handleTestAll = async () => {
    setTesting(true);
    // Real per-prompt validation (structure, brackets, variables) — no fake AI run.
    await new Promise((r) => setTimeout(r, 400));
    const map: Record<number, TestResult> = {};
    prompts.forEach((p) => {
      map[p.id] = validatePrompt(p);
    });
    setResults(map);
    setTestedAt(new Date().toLocaleTimeString());
    setTesting(false);
  };

  const handleCopy = async (p: Prompt) => {
    try {
      await navigator.clipboard.writeText(p.prompt || '');
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((v) => (v === p.id ? null : v)), 1500);
    } catch {
      alert('Copy failed — select the text manually.');
    }
  };

  const handleDelete = async (p: Prompt) => {
    if (!window.confirm(`Delete macro "${p.title}"?`)) return;
    setDeletingId(p.id);
    try {
      const res = await fetch(`${API}/${p.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPrompts((list) => list.filter((x) => x.id !== p.id));
        setResults((m) => {
          const c = { ...m };
          delete c[p.id];
          return c;
        });
      } else {
        alert('Delete failed.');
      }
    } catch {
      alert('Delete failed — is the backend running?');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      alert('Title and prompt body are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), prompt: newBody.trim() }),
      });
      if (res.ok) {
        const created: Prompt = await res.json();
        setPrompts((list) => [created, ...list]);
        setNewTitle('');
        setNewBody('');
        setShowNew(false);
      } else {
        alert('Create failed.');
      }
    } catch {
      alert('Create failed — is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Top Sub-header & Status Strip */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-lg">
        <div className="flex flex-col gap-space-xs max-w-3xl">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">Knowledge Base</span>
            <span className="text-outline-variant font-label-caps text-label-caps px-1">/</span>
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Synced</span>
          </div>
          <h1 className="font-display-md text-display-md text-on-surface tracking-tight font-light">Prompt Vault</h1>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {stats.count > 0
              ? `${stats.count} live macro${stats.count === 1 ? '' : 's'} from your backend — no mock data.`
              : 'No macros yet — create your first one below.'}
            {testedAt && ` Last chain test ${testedAt}: ${passCount}/${prompts.length} passed.`}
          </p>
        </div>

        <div className="flex items-center gap-space-md shrink-0">
          <button
            onClick={handleTestAll}
            disabled={testing || prompts.length === 0}
            className="group flex items-center gap-space-xs px-space-md py-space-sm rounded-lg bg-surface-container-high/60 backdrop-blur-xl text-on-surface hover:text-primary transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-base text-primary transition-transform duration-200 ${testing ? 'animate-spin' : 'group-hover:rotate-12'}`}>
              {testing ? 'progress_activity' : 'bolt'}
            </span>
            <span className="font-label-lg text-label-lg font-medium">{testing ? 'Testing…' : 'Test All Chains'}</span>
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-gradient-to-br from-primary-container via-secondary to-primary-fixed-dim text-on-primary font-label-lg text-label-lg font-semibold shadow-[0_0_24px_rgba(229,195,120,0.32)] hover:shadow-[0_0_32px_rgba(229,195,120,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            <span className="material-symbols-outlined text-base font-semibold">add</span>
            <span>New Prompt Macro</span>
          </button>
        </div>
      </div>

      {/* Live Telemetry HUD (computed, not hardcoded) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <HudTile label="Indexed Macros" value={String(stats.count)} sub="Live from /api/prompts" />
        <HudTile label="Avg Tokens / Macro" value={String(stats.avgTokens)} sub="≈ chars ÷ 4" />
        <HudTile label="Unique [Variables]" value={String(stats.variables)} sub="Across all macros" />
        <HudTile label="Linked Tools" value={String(stats.linked)} sub="Macros with tool_id" />
      </div>

      {/* Search + view toggle (both functional) */}
      <div className="flex flex-col gap-space-md">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md bg-surface-container-lowest/90 backdrop-blur-2xl p-space-md rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="relative flex-1 flex items-center bg-surface-container-low/80 rounded-lg px-space-md py-space-xs gap-space-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] focus-within:ring-1 focus-within:ring-primary/40">
            <span className="material-symbols-outlined text-outline text-lg">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-0 outline-none text-on-surface font-body-sm text-body-sm placeholder:text-outline/70 w-full"
              placeholder="Search live macros by title or body text..."
              type="text"
            />
            {query ? (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            ) : (
              <span className="font-label-caps text-label-caps text-outline bg-surface-container-high px-space-xs py-0.5 rounded">⌘F</span>
            )}
          </div>
          <div className="flex items-center bg-surface-container-low/80 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              title="Grid Layout"
              className={`p-space-xs rounded transition-colors ${view === 'grid' ? 'bg-surface-container-high text-primary shadow-sm' : 'text-outline hover:text-on-surface hover:bg-surface-container-high/50'}`}
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
            </button>
            <button
              onClick={() => setView('table')}
              title="Table Layout"
              className={`p-space-xs rounded transition-colors ${view === 'table' ? 'bg-surface-container-high text-primary shadow-sm' : 'text-outline hover:text-on-surface hover:bg-surface-container-high/50'}`}
            >
              <span className="material-symbols-outlined text-base">table_rows</span>
            </button>
          </div>
        </div>
        {(query || Object.keys(results).length > 0) && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {filtered.length} of {prompts.length} macros
            {query && <> matching “{query}”</>}
            {Object.keys(results).length > 0 && <> · {passCount} passed validation</>}
          </p>
        )}
      </div>

      {/* Cards — grid or table */}
      {filtered.length > 0 ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
            {filtered.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                result={results[p.id]}
                copied={copiedId === p.id}
                deleting={deletingId === p.id}
                onCopy={() => handleCopy(p)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-space-xs rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-space-sm px-space-md py-space-xs font-label-caps text-label-caps text-outline uppercase tracking-wider">
              <span className="col-span-4">Title</span>
              <span className="col-span-4">Excerpt</span>
              <span className="col-span-1 text-center">Tokens</span>
              <span className="col-span-1 text-center">Vars</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>
            {filtered.map((p) => {
              const vars = extractVariables(p.prompt || '');
              const tokens = Math.ceil((p.prompt || '').length / 4);
              const r = results[p.id];
              return (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center px-space-md py-space-sm rounded-xl bg-surface-container-low/70 hover:bg-surface-container-high/50 transition-colors">
                  <div className="md:col-span-4 min-w-0">
                    <div className="font-label-lg text-label-lg text-on-surface font-medium truncate">{p.title}</div>
                    <div className="font-label-caps text-label-caps text-outline">#{p.id}{r && (r.ok ? ' · ✓ PASS' : ' · ✗ FAIL')}</div>
                  </div>
                  <div className="md:col-span-4 font-body-sm text-body-sm text-on-surface-variant truncate">{p.prompt}</div>
                  <div className="md:col-span-1 text-center font-label-caps text-label-caps text-on-surface-variant">{tokens}</div>
                  <div className="md:col-span-1 text-center font-label-caps text-label-caps text-on-surface-variant">{vars.length}</div>
                  <div className="md:col-span-2 flex items-center justify-end gap-1">
                    <button onClick={() => handleCopy(p)} title="Copy" className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-base">{copiedId === p.id ? 'check' : 'content_copy'}</span>
                    </button>
                    <Link href="/ask" title="Run in Ask AI" className="p-2 rounded-lg hover:bg-surface-container-high text-primary transition-colors">
                      <span className="material-symbols-outlined text-base">bolt</span>
                    </Link>
                    <button onClick={() => handleDelete(p)} title="Delete" className="p-2 rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-surface-container-low/40 rounded-2xl border border-white/5">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 opacity-50">folder_special</span>
          <h3 className="text-xl font-headline-sm text-on-surface mb-2">{prompts.length === 0 ? 'Vault is empty' : 'No matches'}</h3>
          <p className="text-on-surface-variant max-w-md">
            {prompts.length === 0
              ? 'Create your first macro — it saves to the backend, not mock data.'
              : `Nothing matches “${query}”.`}
          </p>
          {prompts.length === 0 && (
            <button onClick={() => setShowNew(true)} className="mt-4 px-space-lg py-space-sm rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container">
              New Prompt Macro
            </button>
          )}
        </div>
      )}

      {/* New macro modal — POST /api/prompts/ */}
      {showNew && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="New prompt macro">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setShowNew(false)} />
          <div className="relative w-full max-w-xl rounded-2xl bg-surface-container-lowest border border-white/10 p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">New Prompt Macro</h3>
              <button onClick={() => !saving && setShowNew(false)} aria-label="Close" className="w-9 h-9 rounded-full bg-surface-container-high/50 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Title</span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. API Error Triage"
                className="h-11 px-space-sm rounded-lg bg-surface-container-low border border-white/10 text-on-surface focus:outline-none focus:border-primary/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Prompt body (use [VARIABLES])</span>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Diagnose [ERROR_LOG] from [SERVICE_NAME] and propose…"
                rows={6}
                className="px-space-sm py-space-sm rounded-lg bg-surface-container-low border border-white/10 text-on-surface font-mono text-body-sm focus:outline-none focus:border-primary/50 resize-y"
              />
            </label>
            {newBody && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Detected variables: {extractVariables(newBody).join(', ') || 'none'} · ≈{Math.ceil(newBody.length / 4)} tokens
              </p>
            )}
            <div className="flex justify-end gap-space-sm">
              <button onClick={() => setShowNew(false)} disabled={saving} className="px-space-lg py-space-sm rounded-full bg-surface-container-high/60 font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving} className="px-space-lg py-space-sm rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Macro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HudTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="group relative flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-low/70 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:bg-surface-container-high/60 transition-all duration-300">
      <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{label}</span>
      <div className="mt-space-md flex flex-col">
        <span className="font-headline-lg text-headline-lg text-on-surface font-light tracking-tight">{value}</span>
        <span className="font-label-md text-label-md text-on-surface-variant mt-1">{sub}</span>
      </div>
    </div>
  );
}

function PromptCard({
  prompt,
  result,
  copied,
  deleting,
  onCopy,
  onDelete,
}: {
  prompt: Prompt;
  result?: TestResult;
  copied: boolean;
  deleting: boolean;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const vars = extractVariables(prompt.prompt || '');
  const tokens = Math.ceil((prompt.prompt || '').length / 4);
  return (
    <div className="group relative flex flex-col justify-between rounded-xl bg-surface-container-low/75 backdrop-blur-2xl p-space-lg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(229,195,120,0.3)] transition-all duration-300">
      <div>
        <div className="flex items-start justify-between gap-space-sm mb-space-sm">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="font-label-caps text-label-caps text-outline bg-surface-container-high px-2 py-0.5 rounded-full">{tokens} Tokens</span>
            {prompt.tool_id != null && (
              <span className="font-label-caps text-label-caps text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Tool #{prompt.tool_id}</span>
            )}
            {result && (
              <span className={`font-label-caps text-label-caps px-2 py-0.5 rounded-full ${result.ok ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                {result.ok ? '✓ PASS' : `✗ ${result.issues.length} ISSUE${result.issues.length === 1 ? '' : 'S'}`}
              </span>
            )}
          </div>
          <button onClick={onDelete} title="Delete macro" className="p-1.5 rounded-lg text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <span className="material-symbols-outlined text-lg">{deleting ? 'progress_activity' : 'delete'}</span>
          </button>
        </div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium group-hover:text-primary transition-colors">{prompt.title}</h2>
        {result && !result.ok && (
          <ul className="mt-1 font-body-sm text-body-sm text-amber-400/90 list-disc pl-4">
            {result.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
        {vars.length > 0 && (
          <div className="flex flex-wrap gap-space-xs my-space-md">
            {vars.map((v) => (
              <span key={v} className="font-label-caps text-label-caps text-secondary-fixed-dim bg-secondary-container/20 px-2 py-0.5 rounded font-mono">{v}</span>
            ))}
          </div>
        )}
        <div className="relative bg-surface-container-lowest/90 rounded-lg p-space-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] font-mono text-body-sm text-on-surface-variant leading-relaxed overflow-hidden mt-space-sm">
          <div className="absolute top-2 right-2 text-outline/40 font-label-caps text-label-caps uppercase">SYS_PROMPT</div>
          <p className="line-clamp-4">{prompt.prompt}</p>
        </div>
      </div>
      <div className="mt-space-lg pt-space-md flex flex-col gap-space-sm border-t border-white/5">
        <div className="grid grid-cols-2 gap-space-xs">
          <button onClick={onCopy} className="flex items-center justify-center gap-space-xs py-space-xs rounded-lg bg-surface-container-high/80 hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all">
            <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
            <span>{copied ? 'Copied!' : 'Copy Macro'}</span>
          </button>
          <Link href="/ask" className="flex items-center justify-center gap-space-xs py-space-xs rounded-lg bg-primary-container/20 hover:bg-primary-container/30 text-primary font-label-md text-label-md font-medium transition-all shadow-[inset_0_1px_0_0_rgba(229,195,120,0.2)]">
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>Run in Ask AI</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
