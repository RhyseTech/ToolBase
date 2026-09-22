'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE, authHeaders } from '@/lib/providers';

type AdminUser = {
  id: number;
  email: string;
  displayName: string;
  is_admin: boolean;
  tools_total: number;
  tools_public: number;
  tools_private: number;
  created_at: string;
};

type AdminTool = {
  id: number;
  name: string;
  url: string;
  category?: string;
  owner_email?: string;
  visibility?: string;
  favorite?: boolean;
};

export function AdminClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tools, setTools] = useState<AdminTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, tRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/users`, { headers: authHeaders(), cache: 'no-store' }),
        fetch(`${API_BASE}/api/tools/?limit=500`, { headers: authHeaders(), cache: 'no-store' }),
      ]);
      if (uRes.status === 403 || tRes.status === 403) {
        setError('Admins only — this account is not an admin.');
        return;
      }
      if (!uRes.ok || !tRes.ok) throw new Error('fetch failed');
      setUsers(await uRes.json());
      setTools(await tRes.json());
    } catch {
      setError('Cannot reach the backend — is it running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flipVisibility = async (t: AdminTool) => {
    const next = (t.visibility || 'public') === 'public' ? 'private' : 'public';
    if (next === 'public' && !window.confirm(`Publish "${t.name}" globally for all users?`)) return;
    setBusyId(t.id);
    try {
      const res = await fetch(`${API_BASE}/api/tools/${t.id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ visibility: next }),
      });
      if (res.ok) {
        setTools((list) => list.map((x) => (x.id === t.id ? { ...x, visibility: next } : x)));
      } else {
        alert('Update failed.');
      }
    } catch {
      alert('Update failed — backend offline?');
    } finally {
      setBusyId(null);
    }
  };

  const removeTool = async (t: AdminTool) => {
    if (!window.confirm(`Delete "${t.name}" permanently?`)) return;
    setBusyId(t.id);
    try {
      const res = await fetch(`${API_BASE}/api/tools/${t.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setTools((list) => list.filter((x) => x.id !== t.id));
      } else {
        alert('Delete failed.');
      }
    } catch {
      alert('Delete failed — backend offline?');
    } finally {
      setBusyId(null);
    }
  };

  const pubCount = tools.filter((t) => (t.visibility || 'public') === 'public').length;

  if (loading) {
    return <p className="text-on-surface-variant font-body-md py-space-xl">Loading mission control…</p>;
  }
  if (error) {
    return (
      <div className="py-space-xl flex flex-col items-center gap-space-sm text-center">
        <span className="material-symbols-outlined text-4xl text-error">shield_lock</span>
        <p className="text-on-surface font-headline-sm">{error}</p>
        <Link href="/" className="text-primary hover:underline font-label-lg">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-xl">
      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <Stat label="Accounts" value={users.length} icon="group" />
        <Stat label="Tools (all)" value={tools.length} icon="apps" />
        <Stat label="Global" value={pubCount} icon="public" />
        <Stat label="Private" value={tools.length - pubCount} icon="lock" />
      </section>

      {/* Users */}
      <section className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">group</span> Accounts
        </h2>
        <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-surface-container-low/60">
          <div className="hidden md:grid grid-cols-12 gap-space-sm px-space-md py-space-sm font-label-caps text-label-caps text-outline uppercase tracking-wider border-b border-white/[0.06]">
            <span className="col-span-4">Account</span>
            <span className="col-span-2">Role</span>
            <span className="col-span-2 text-center">Tools</span>
            <span className="col-span-2 text-center">Global</span>
            <span className="col-span-2 text-center">Private</span>
          </div>
          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-2 md:grid-cols-12 gap-space-sm items-center px-space-md py-space-sm border-b border-white/[0.04] last:border-0">
              <div className="col-span-2 md:col-span-4 min-w-0">
                <div className="font-label-lg text-label-lg text-on-surface truncate">{u.displayName || '—'}</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant truncate">{u.email}</div>
              </div>
              <div className="md:col-span-2">
                {u.is_admin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-caps text-label-caps">
                    <span className="material-symbols-outlined text-[11px]">shield_person</span> Admin
                  </span>
                ) : (
                  <span className="font-label-caps text-label-caps text-on-surface-variant">User</span>
                )}
              </div>
              <div className="md:col-span-2 md:text-center font-headline-sm text-on-surface">{u.tools_total}</div>
              <div className="md:col-span-2 md:text-center text-on-surface-variant">{u.tools_public}</div>
              <div className="md:col-span-2 md:text-center text-on-surface-variant">{u.tools_private}</div>
            </div>
          ))}
          {users.length === 0 && <p className="p-space-md text-on-surface-variant">No accounts yet.</p>}
        </div>
      </section>

      {/* Tools */}
      <section className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">apps</span> All tools
          <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">— including private ones</span>
        </h2>
        <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-surface-container-low/60">
          <div className="hidden md:grid grid-cols-12 gap-space-sm px-space-md py-space-sm font-label-caps text-label-caps text-outline uppercase tracking-wider border-b border-white/[0.06]">
            <span className="col-span-4">Tool</span>
            <span className="col-span-3">Owner</span>
            <span className="col-span-2">Visibility</span>
            <span className="col-span-3 text-right">Actions</span>
          </div>
          {tools.map((t) => {
            const isPub = (t.visibility || 'public') === 'public';
            const busy = busyId === t.id;
            return (
              <div key={t.id} className="grid grid-cols-2 md:grid-cols-12 gap-space-sm items-center px-space-md py-space-sm border-b border-white/[0.04] last:border-0">
                <div className="col-span-2 md:col-span-4 min-w-0">
                  <Link href={`/tools/${t.id}`} className="font-label-lg text-label-lg text-on-surface hover:text-primary truncate block">
                    {t.name}
                  </Link>
                  <div className="font-body-sm text-body-sm text-outline truncate">{t.category || 'Uncategorized'}</div>
                </div>
                <div className="md:col-span-3 font-body-sm text-body-sm text-on-surface-variant truncate">{t.owner_email || '— (legacy)'}</div>
                <div className="md:col-span-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-caps text-label-caps ${isPub ? 'bg-surface-container-high/60 text-on-surface-variant' : 'bg-secondary/15 text-secondary'}`}>
                    <span className="material-symbols-outlined text-[11px]">{isPub ? 'public' : 'lock'}</span>
                    {isPub ? 'Global' : 'Private'}
                  </span>
                </div>
                <div className="col-span-2 md:col-span-3 flex items-center md:justify-end gap-1">
                  <button
                    onClick={() => flipVisibility(t)}
                    disabled={busy}
                    title={isPub ? 'Make private' : 'Publish globally'}
                    className="px-3 py-1.5 rounded-full bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all disabled:opacity-50"
                  >
                    {isPub ? 'Make private' : 'Publish'}
                  </button>
                  <button
                    onClick={() => removeTool(t)}
                    disabled={busy}
                    title="Delete"
                    className="p-1.5 rounded-full text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
          {tools.length === 0 && <p className="p-space-md text-on-surface-variant">No tools indexed.</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="p-space-lg rounded-2xl bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between mb-space-sm">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{label}</span>
        <span className="material-symbols-outlined text-lg text-primary">{icon}</span>
      </div>
      <div className="font-display-md text-display-md text-on-surface font-light">{value}</div>
    </div>
  );
}
