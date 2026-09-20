'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLogoCandidates } from '@/lib/logo';
import { Spotlight, setSpotlight } from '@/components/magic/MagicCard';

export function ToolCard({ id, url, name, category, description, icon, rating, reviews, tag, colorClass, favorite = false, logo_url, layout = 'grid' }: any) {
  const [isFavorite, setIsFavorite] = useState(favorite);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const router = useRouter();

  const logoCandidates = useMemo(
    () => getLogoCandidates({ logo_url, url }),
    [logo_url, url]
  );
  const activeLogo = logoCandidates[logoIndex] || '';
  const handleLogoError = () => setLogoIndex((i) => i + 1);

  const toggleFavorite = async () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300); // Animation duration
    
    // Optimistic update
    setIsFavorite(!isFavorite);
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/tools/${id}/favorite`, {
        method: 'PUT',
      });
      if (!res.ok) {
        // Revert on failure
        setIsFavorite(isFavorite);
      }
    } catch (err) {
      // Revert on error
      setIsFavorite(isFavorite);
    }
  };

  const deleteTool = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/tools/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete tool.');
        setIsDeleting(false);
      }
    } catch (err) {
      alert('Error deleting tool.');
      setIsDeleting(false);
    }
  };

  if (isDeleting) {
    return (
      <article className="group relative flex items-center justify-center p-space-lg rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] min-h-[250px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-on-surface-variant text-sm">Deleting...</span>
        </div>
      </article>
    );
  }

  if (layout === 'list') {
    return (
      <article onMouseMove={setSpotlight} className="group relative flex flex-col sm:flex-row sm:items-center gap-space-md p-space-md rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:bg-surface-container-low transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(229,195,120,0.35)]">
        <Spotlight />
        {/* Icon */}
        <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container-highest/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] flex-shrink-0 overflow-hidden ${colorClass}`}>
          {activeLogo ? (
            <img src={activeLogo} alt={`${name} logo`} className="w-7 h-7 object-contain" onError={handleLogoError} loading="lazy" />
          ) : (
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          )}
        </div>

        {/* Main info — grows, truncates cleanly */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-space-sm min-w-0">
            <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">{name}</h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high/60 text-on-surface-variant font-label-caps text-label-caps flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>Active</span>
            </span>
          </div>
          <div className="font-label-caps text-label-caps text-on-surface-variant mt-0.5 truncate">
            {(category || 'Uncategorized').toUpperCase()} · <span className="text-outline normal-case tracking-normal">{tag}</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug truncate mt-1">
            {description}
          </p>
        </div>

        {/* Rating + actions — fixed right column */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-space-sm flex-shrink-0 sm:w-auto sm:ml-auto sm:border-l sm:border-white/[0.06] sm:pl-space-md">
          <div className="flex items-center gap-space-xs">
            <div className="flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container-high/70 text-secondary font-label-caps text-label-caps">
              <span className="material-symbols-outlined text-xs">star</span>
              <span>{rating}</span>
            </div>
            <button
              onClick={toggleFavorite}
              aria-label="Toggle Favorite"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isFavorite ? 'text-secondary bg-secondary/10' : 'text-outline hover:text-secondary'}`}
            >
              <span
                className={`material-symbols-outlined text-base transition-transform ${isAnimating ? 'scale-125' : 'scale-100'}`}
                style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                star
              </span>
            </button>
          </div>
          <div className="flex items-center justify-end gap-1 flex-shrink-0 whitespace-nowrap">
            <Link href={`/tools/${id}`} className="flex-shrink-0 whitespace-nowrap px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-all">
              Details
            </Link>
            <button onClick={deleteTool} aria-label="Delete Tool" className="group/delete relative flex-shrink-0 p-1.5 rounded-full text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-surface-container-highest text-on-surface font-body-sm text-[11px] leading-none shadow-lg opacity-0 translate-y-1 group-hover/delete:opacity-100 group-hover/delete:translate-y-0 transition-all duration-150 z-50">
                Delete Tool
              </span>
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 whitespace-nowrap flex items-center gap-1 px-space-md py-space-xs rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-medium shadow-[0_0_14px_rgba(229,195,120,0.2)] hover:shadow-[0_0_20px_rgba(229,195,120,0.4)] transition-all">
              <span>Launch</span>
              <span className="material-symbols-outlined text-sm">north_east</span>
            </a>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article onMouseMove={setSpotlight} className="group relative flex flex-col justify-between p-space-lg rounded-2xl bg-surface-container-low/70 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:-translate-y-1.5 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(229,195,120,0.4)] h-full">
      <Spotlight />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="flex flex-col gap-space-md relative z-10">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex items-center gap-space-md min-w-0">
            <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container-highest/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] flex-shrink-0 overflow-hidden ${colorClass}`}>
              {activeLogo ? (
                <img src={activeLogo} alt={`${name} logo`} className="w-7 h-7 object-contain" onError={handleLogoError} loading="lazy" />
              ) : (
                <span className="material-symbols-outlined text-2xl">{icon}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">{name}</h2>
              <div className="flex items-center gap-1.5 text-on-surface-variant font-label-caps text-label-caps mt-0.5">
                <span>{category.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-space-xs flex-shrink-0">
            <div className="flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container-high/70 text-secondary font-label-caps text-label-caps mr-1">
              <span className="material-symbols-outlined text-xs">star</span>
              <span>{rating}</span>
            </div>
            <button 
              onClick={toggleFavorite}
              aria-label="Toggle Favorite" 
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isFavorite ? 'text-secondary bg-secondary/10' : 'text-outline hover:text-secondary'}`}
            >
              <span 
                className={`material-symbols-outlined text-base transition-transform ${isAnimating ? 'scale-125' : 'scale-100'}`} 
                style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                star
              </span>
            </button>
          </div>
        </div>
        
        <div className="p-space-md rounded-xl bg-surface-container-highest/40 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-1 text-primary font-label-caps text-label-caps tracking-widest uppercase mb-1">
            <span className="material-symbols-outlined text-xs">verified_user</span>
            <span>Curator Log</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug line-clamp-3 min-h-[54px]">
            {description}
          </p>
        </div>
        
        <div className="flex items-center justify-between gap-space-sm pt-1">
          <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high/60 text-on-surface-variant font-label-caps text-label-caps">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Active</span>
          </div>
          <span className="font-label-caps text-label-caps text-outline tracking-wider">{tag}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-space-sm pt-space-lg mt-space-md border-t border-white/[0.04] relative z-10">
        <div className="flex items-center gap-1">
          <Link href={`/tools/${id}`} className="px-space-md py-space-xs rounded-full font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-all">
            Details
          </Link>
          <button onClick={deleteTool} aria-label="Delete Tool" className="group/delete relative p-1.5 rounded-full text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all" >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-surface-container-highest text-on-surface font-body-sm text-[11px] leading-none shadow-lg opacity-0 translate-y-1 group-hover/delete:opacity-100 group-hover/delete:translate-y-0 transition-all duration-150 z-50">
              Delete Tool
            </span>
          </button>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-space-md py-space-xs rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg font-medium shadow-[0_0_14px_rgba(229,195,120,0.2)] hover:shadow-[0_0_20px_rgba(229,195,120,0.4)] transition-all">
          <span>Launch</span>
          <span className="material-symbols-outlined text-sm">north_east</span>
        </a>
      </div>
    </article>
  )
}
