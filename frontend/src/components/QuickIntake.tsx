'use client';

import React, { useState } from 'react';
import { TypingHint } from '@/components/magic/TypingAnimation';
import { API_BASE, authHeaders } from '@/lib/providers';

const HINTS = [
  'Try pasting: openrouter.ai — models, pricing, docs…',
  'Try pasting: console.groq.com — inference specs…',
  'Try pasting: gamma.app — capabilities & use-cases…',
];

export function QuickIntake() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [focused, setFocused] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleAnalyze = async () => {
    if (!url) return;
    setAnalyzing(true);
    try {
      // 1. Analyze Tool
      const aiRes = await fetch(`${API_BASE}/api/ai/analyze-tool`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ url })
      });
      if (!aiRes.ok) throw new Error('Analysis failed');
      const aiData = await aiRes.json();

      const faviconForUrl = (() => {
        try {
          const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
          const host = new URL(withProto).hostname.replace(/^www\./, '');
          return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : '';
        } catch {
          return '';
        }
      })();
      
      // 2. Save Tool
      const toolPayload = {
        name: aiData.name || 'Unknown Tool',
        url: url,
        description: aiData.description || '',
        purpose: aiData.purpose || '',
        category: aiData.category || 'Other',
        subcategory: aiData.subcategory || '',
        pricing: aiData.pricing || 'Unknown',
        logo_url: aiData.logo_url || faviconForUrl,
        rating: 0.0,
        favorite: false,
        archived: false,
        tags: aiData.tags || []
      };
      
      const saveRes = await fetch(`${API_BASE}/api/tools/`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(toolPayload)
      });
      
      if (!saveRes.ok) throw new Error('Save failed');
      
      setUrl('');
      // Reload page to show new tool
      window.location.reload();
      
    } catch (error) {
      console.error('Error analyzing tool:', error);
      alert('Error analyzing tool. Check console.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section className="w-full mb-space-xl">
      <div className="relative group rounded-2xl bg-surface-container-low/80 backdrop-blur-2xl p-2 md:p-space-sm shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-all duration-500 hover:shadow-[0_25px_60px_rgba(229,195,120,0.15),inset_0_1px_0_0_rgba(229,195,120,0.3)]">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-space-sm">
          <div className="flex items-center pl-space-md text-primary">
            <span className="material-symbols-outlined text-xl">link</span>
          </div>
          <div className="relative flex-1 flex items-center min-w-0">
            <input
              className="w-full bg-transparent py-space-sm px-space-xs font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
              id="tool-url-input"
              placeholder={url || focused ? 'Paste frontier AI tool URL…' : ' '}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {url === '' && !focused && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 truncate px-space-xs py-space-sm font-body-md text-body-md text-outline/80">
                <TypingHint phrases={HINTS} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-space-sm px-space-xs pb-space-xs md:pb-0">
            <button onClick={handlePaste} className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl bg-surface-container-high/60 backdrop-blur-md text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <span className="material-symbols-outlined text-sm">content_paste</span>
              <span className="font-label-md text-label-md">Paste Clipboard</span>
            </button>
            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className={`relative overflow-hidden flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded-xl bg-gradient-to-r from-primary-container via-secondary to-primary-container text-on-primary font-label-lg text-label-lg shadow-[0_0_25px_rgba(229,195,120,0.35)] transition-all duration-300 ${analyzing ? 'opacity-70 cursor-wait' : 'hover:shadow-[0_0_35px_rgba(229,195,120,0.55)] group-hover:shadow-[0_0_35px_rgba(229,195,120,0.55)]'}`} 
            >
              <span className="font-medium tracking-wide">
                {analyzing ? 'Analyzing...' : 'Analyze & Save →'}
              </span>
              {!analyzing && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
