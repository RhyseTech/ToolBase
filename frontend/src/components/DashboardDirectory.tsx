'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ToolCard } from './ToolCard';

function getIconForCategory(category: string) {
  if (!category) return 'build';
  const c = category.toLowerCase();
  if (c.includes('code') || c.includes('coding')) return 'terminal';
  if (c.includes('design') || c.includes('image')) return 'brush';
  if (c.includes('research')) return 'science';
  if (c.includes('search')) return 'travel_explore';
  return 'auto_awesome';
}

export function DashboardDirectory({ tools }: { tools: any[] }) {
  // Recently added only — newest 4 by id
  const recentFour = useMemo(
    () => [...tools].sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0)).slice(0, 4),
    [tools]
  );

  return (
    <>
      {/* Recently added — 4 newest tools */}
      <section className="flex flex-col gap-space-md mb-space-lg mt-space-lg">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-xl">token</span>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Recently Added</h2>
          <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high/80 font-label-caps text-label-caps text-secondary">TIER ALPHA</span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        {recentFour.length > 0 ? (
          recentFour.map((tool: any) => (
            <ToolCard
              key={tool.id}
              id={tool.id}
              url={tool.url}
              name={tool.name}
              category={tool.category || 'Uncategorized'}
              description={tool.description || 'No description provided.'}
              icon={getIconForCategory(tool.category)}
              logo_url={tool.logo_url}
              rating={tool.rating ? tool.rating.toString() : '4.5'}
              reviews="Live"
              tag={tool.pricing || 'Freemium'}
              colorClass="text-primary"
              favorite={tool.favorite} visibility={tool.visibility}
              can_manage={tool.can_manage}
              layout="grid"
            />
          ))
        ) : (
          <div className="col-span-full py-space-lg text-center text-on-surface-variant font-body-lg">
            No tools added yet. Use the intake bar above to scrape a tool.
          </div>
        )}
      </section>

      {tools.length > 4 && (
        <div className="flex justify-center mb-space-xl">
          <Link href="/tools" className="px-space-md py-space-sm rounded-full bg-surface-container-low/70 font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all">
            View all {tools.length} in directory →
          </Link>
        </div>
      )}
    </>
  );
}
