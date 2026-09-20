'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, authHeaders } from '@/lib/providers';

export function CollectionStarToggle({
  toolIds,
  starredCount,
}: {
  toolIds: number[];
  starredCount: number;
}) {
  const router = useRouter();
  const allStarred = toolIds.length > 0 && starredCount >= toolIds.length;
  const [busy, setBusy] = useState(false);
  const [starred, setStarred] = useState(allStarred);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || toolIds.length === 0) return;
    const target = !starred; // select (star all) or undo (unstar all)
    setBusy(true);
    setStarred(target); // optimistic
    try {
      // Only flip tools that aren't already in target state
      // Fetch current states in parallel is overkill — page passes counts,
      // so toggle each and revert failures. Simpler: toggle tools individually
      // based on known per-tool state via API reads would be N+1; instead we
      // call favorite endpoint only for tools needing change, tracked below.
      //
      // Practical approach: try toggling every tool, then reconcile by
      // re-reading the collection. Backend toggle is a flip, so we first read
      // each tool to know whether it needs a flip.
      const reads = await Promise.all(
        toolIds.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE}/api/tools/${id}`, { cache: 'no-store', headers: authHeaders() });
            if (!r.ok) return { id, fav: null };
            const t = await r.json();
            return { id, fav: !!t.favorite };
          } catch {
            return { id, fav: null };
          }
        })
      );
      const needFlip = reads.filter((r) => r.fav !== null && r.fav !== target).map((r) => r.id);
      const results = await Promise.all(
        needFlip.map(async (id) => {
          try {
            const r = await fetch(`${API_BASE}/api/tools/${id}/favorite`, { method: 'PUT', headers: authHeaders() });
            return r.ok;
          } catch {
            return false;
          }
        })
      );
      if (results.some((ok) => !ok)) {
        setStarred(!target); // revert on partial failure
      }
    } catch {
      setStarred(!target);
    } finally {
      setBusy(false);
      router.refresh();
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={starred ? 'Unstar collection (undo)' : 'Star collection (select all)'}
      aria-label={starred ? 'Unstar collection' : 'Star collection'}
      aria-pressed={starred}
      className={`flex items-center justify-center w-7 h-7 rounded-full transition-all flex-shrink-0 ${
        starred
          ? 'text-secondary bg-secondary/10 hover:bg-secondary/20'
          : 'text-outline/40 hover:text-secondary hover:bg-secondary/10'
      } ${busy ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      <span
        className="material-symbols-outlined text-base"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {busy ? 'progress_activity' : 'star'}
      </span>
    </button>
  );
}
