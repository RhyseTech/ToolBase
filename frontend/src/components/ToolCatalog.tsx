'use client';

import React, { useMemo, useState } from 'react';
import { ToolCard } from './ToolCard';
import { BlurFade } from '@/components/magic/BlurFade';

type ViewMode = 'grid' | 'list';

const FILTERS = ['ALL', 'CODING', 'RESEARCH', 'DESIGN & 3D'] as const;

export function ToolCatalog({ tools }: { tools: any[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [view, setView] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [highRatedOnly, setHighRatedOnly] = useState(false);

  const counts = useMemo(() => {
    const coding = tools.filter((t) => t.category?.toLowerCase() === 'coding').length;
    const research = tools.filter((t) => {
      const c = t.category?.toLowerCase() ?? '';
      return c === 'research' || c === 'search';
    }).length;
    const design = tools.filter((t) => {
      const c = t.category?.toLowerCase() ?? '';
      return c === 'design' || c === 'image';
    }).length;
    return { coding, research, design, all: tools.length };
  }, [tools]);

  const displayedTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) => {
      if (filter === 'CODING' && t.category?.toLowerCase() !== 'coding') return false;
      if (filter === 'RESEARCH') {
        const c = t.category?.toLowerCase() ?? '';
        if (c !== 'research' && c !== 'search') return false;
      }
      if (filter === 'DESIGN & 3D') {
        const c = t.category?.toLowerCase() ?? '';
        if (c !== 'design' && c !== 'image') return false;
      }
      if (favOnly && !t.favorite) return false;
      if (highRatedOnly && Number(t.rating ?? 0) < 4.8) return false;
      if (q) {
        const hay = `${t.name ?? ''} ${t.description ?? ''} ${t.category ?? ''} ${t.subcategory ?? ''} ${t.pricing ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tools, filter, query, favOnly, highRatedOnly]);

  const countFor = (f: (typeof FILTERS)[number]) => {
    if (f === 'ALL') return counts.all;
    if (f === 'CODING') return counts.coding;
    if (f === 'RESEARCH') return counts.research;
    return counts.design;
  };

  return (
    <>
      {/* Search + view toggle — single source of truth (was previously dead UI in page header) */}
      <section className="flex flex-col gap-space-md mb-space-lg">
        <div className="flex flex-col lg:flex-row gap-space-md lg:items-center">
          <div className="group relative flex items-center h-12 px-space-md rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-all duration-300 focus-within:shadow-[inset_0_1px_0_0_rgba(255,224,157,0.35),0_0_20px_rgba(233,195,73,0.12)] flex-1">
            <span className="material-symbols-outlined text-on-surface-variant text-lg mr-space-sm group-focus-within:text-primary transition-colors">travel_explore</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
              placeholder="Filter by instrument name, telemetry tag, or core capability..."
              type="text"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="ml-space-sm flex items-center justify-center w-6 h-6 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-space-xs py-0.5 rounded-lg bg-surface-container-highest/80 font-label-caps text-label-caps text-on-surface-variant group-focus-within:text-primary transition-all">⌘K</kbd>
            )}
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={() => setFavOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-space-md py-space-xs rounded-full backdrop-blur-xl font-label-caps text-label-caps uppercase tracking-wider transition-all duration-200 ${favOnly ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(229,195,120,0.3)]' : 'bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-high/70 hover:text-primary'}`}
            >
              <span className="material-symbols-outlined text-sm text-secondary">star</span>
              <span>Favorites</span>
            </button>
            <button
              onClick={() => setHighRatedOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-space-md py-space-xs rounded-full backdrop-blur-xl font-label-caps text-label-caps uppercase tracking-wider transition-all duration-200 ${highRatedOnly ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(229,195,120,0.3)]' : 'bg-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-high/70 hover:text-primary'}`}
            >
              <span className="material-symbols-outlined text-sm text-primary">verified</span>
              <span>Rating 4.8+</span>
            </button>

            {/* View density switcher — this was previously a dead button pair */}
            <div className="flex items-center p-1 rounded-full bg-surface-container-high/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <button
                aria-label="Grid layout"
                title="Grid view"
                onClick={() => setView('grid')}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${view === 'grid' ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(229,195,120,0.3)]' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
              </button>
              <button
                aria-label="List layout"
                title="List view"
                onClick={() => setView('list')}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${view === 'list' ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(229,195,120,0.3)]' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-base">view_agenda</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Ribbon Tabs */}
      <section className="flex flex-col gap-space-md mb-space-xl">
        <div className="relative overflow-x-auto scrollbar-none pt-2 pb-1">
          <nav className="flex items-center gap-space-sm min-w-max">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative px-space-md py-space-sm rounded-full font-label-lg text-label-lg tracking-wide transition-all duration-300 ${filter === f ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_15px_rgba(229,195,120,0.25)]' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'}`}
              >
                <span>{f}</span>
                <span className="ml-1 text-xs font-normal">({countFor(f)})</span>
              </button>
            ))}
          </nav>
        </div>
        {(query || favOnly || highRatedOnly) && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {displayedTools.length} of {tools.length} tools
            {query && <> matching “{query}”</>}
            <button onClick={() => { setQuery(''); setFavOnly(false); setHighRatedOnly(false); setFilter('ALL'); }} className="ml-2 text-primary hover:underline">
              Clear filters
            </button>
          </p>
        )}
      </section>

      {/* Directory Catalog — grid OR list */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg transition-all duration-500">
          {displayedTools.length > 0 ? (
            displayedTools.map((tool: any, i: number) => (
              <BlurFade key={tool.id} delay={(i % 6) * 70} className="h-full">
              <ToolCard
                id={tool.id}
                name={tool.name}
                url={tool.url}
                category={tool.category || 'Uncategorized'}
                description={tool.description || 'No description provided.'}
                icon={getIconForCategory(tool.category)}
                logo_url={tool.logo_url}
                rating={tool.rating ? tool.rating.toString() : '4.5'}
                tag={tool.pricing || 'Freemium'}
                colorClass="text-primary"
                tagLabel={tool.subcategory || 'Active'}
                favorite={tool.favorite} visibility={tool.visibility}
                layout="grid"
              />
              </BlurFade>
            ))
          ) : (
            <EmptyState onReset={() => { setQuery(''); setFavOnly(false); setHighRatedOnly(false); setFilter('ALL'); }} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-space-sm transition-all duration-500">
          {displayedTools.length > 0 ? (
            displayedTools.map((tool: any, i: number) => (
              <BlurFade key={tool.id} delay={(i % 6) * 70}>
              <ToolCard
                id={tool.id}
                name={tool.name}
                url={tool.url}
                category={tool.category || 'Uncategorized'}
                description={tool.description || 'No description provided.'}
                icon={getIconForCategory(tool.category)}
                logo_url={tool.logo_url}
                rating={tool.rating ? tool.rating.toString() : '4.5'}
                tag={tool.pricing || 'Freemium'}
                colorClass="text-primary"
                tagLabel={tool.subcategory || 'Active'}
                favorite={tool.favorite} visibility={tool.visibility}
                layout="list"
              />
              </BlurFade>
            ))
          ) : (
            <EmptyState onReset={() => { setQuery(''); setFavOnly(false); setHighRatedOnly(false); setFilter('ALL'); }} />
          )}
        </div>
      )}
    </>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="col-span-full py-space-2xl flex flex-col items-center justify-center text-on-surface-variant">
      <span className="material-symbols-outlined text-4xl mb-space-sm">info</span>
      <p className="font-body-lg text-body-lg">No tools found for this filter.</p>
      <button onClick={onReset} className="mt-space-sm px-space-md py-space-xs rounded-full bg-surface-container-high/60 font-label-lg text-label-lg text-on-surface hover:bg-surface-container-high transition-all">
        Reset filters
      </button>
    </div>
  );
}

function getIconForCategory(category: string) {
  if (!category) return "build";
  const c = category.toLowerCase();
  if (c.includes("code") || c.includes("coding")) return "terminal";
  if (c.includes("design") || c.includes("image")) return "brush";
  if (c.includes("research")) return "science";
  if (c.includes("search")) return "travel_explore";
  return "auto_awesome";
}
