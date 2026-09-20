'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DeleteToolButton } from '@/components/DeleteToolButton';
import { Backlight } from '@/components/ui/backlight';
import { BorderBeam } from '@/components/magic/BorderBeam';
import { API_BASE, authHeaders } from '@/lib/providers';

const API = API_BASE;

type Tab = 'overview' | 'notes' | 'prompts' | 'videos' | 'skill' | 'mcp' | 'links';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'notes', label: 'Notes', icon: 'edit_note' },
  { id: 'prompts', label: 'Prompts', icon: 'terminal' },
  { id: 'videos', label: 'Media', icon: 'perm_media' },
  { id: 'skill', label: 'SKILL.md', icon: 'code' },
  { id: 'mcp', label: 'MCP', icon: 'hub' },
  { id: 'links', label: 'Links', icon: 'link' },
];

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

export type ImageAdjust = {
  src: string;
  fit: 'cover' | 'contain';
  brightness: number;
  contrast: number;
  saturate: number;
};

const DEFAULT_ADJUST: ImageAdjust = { src: '', fit: 'cover', brightness: 100, contrast: 100, saturate: 100 };

function parseImage(content: string): ImageAdjust {
  try {
    const o = JSON.parse(content);
    if (o && typeof o.src === 'string') return { ...DEFAULT_ADJUST, ...o };
  } catch {}
  return { ...DEFAULT_ADJUST, src: content || '' };
}

function adjustFilter(a: ImageAdjust): string {
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%)`;
}

const OPENROUTER_SKILL_TEMPLATE = `---
name: openrouter
description: Use OpenRouter unified LLM gateway for chat, models, credits
homepage: https://openrouter.ai/
api_base: https://openrouter.ai/api/v1
docs: https://openrouter.ai/docs
---

# OpenRouter Skill

## Auth
- Header: \`Authorization: Bearer $OPENROUTER_API_KEY\`
- Optional: \`HTTP-Referer: <your-site>\`, \`X-Title: <app-name>\`

## Chat completion
\`\`\`bash
curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
\`\`\`

## List models
\`GET https://openrouter.ai/api/v1/models\`

## Notes
- Model slug format: \`provider/model-name\` e.g. \`anthropic/claude-3.5-sonnet\`
- Credits: https://openrouter.ai/credits
`;

const OPENROUTER_MCP_PRESET = JSON.stringify(
  {
    mcpServers: {
      openrouter: {
        command: 'npx',
        args: ['-y', '@openrouter/mcp-server'],
        env: {
          OPENROUTER_API_KEY: '${OPENROUTER_API_KEY}',
          OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
        },
      },
    },
  },
  null,
  2
);

function lsKey(toolId: string | number, kind: string) {
  return `tool-${toolId}-${kind}`;
}

function loadLocal(toolId: string | number, kind: string): any[] | string | null {
  try {
    const raw = localStorage.getItem(lsKey(toolId, kind));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocal(toolId: string | number, kind: string, value: any) {
  try {
    localStorage.setItem(lsKey(toolId, kind), JSON.stringify(value));
  } catch {}
}

/**
 * Quota-safe cache for media lists: giant data: URLs live in the backend
 * DB (source of truth when online). The localStorage copy keeps metadata
 * but blanks oversized inline payloads so one upload can't evict settings
 * or everything else sharing the ~5MB budget.
 */
const INLINE_CACHE_LIMIT = 120000;

function slimForCache(list: any[]): any[] {
  return list.map((it: any) => {
    const c = String(it.content ?? '');
    if (c.startsWith('data:')) {
      return c.length > INLINE_CACHE_LIMIT ? { ...it, content: '' } : it;
    }
    if (c.startsWith('{')) {
      try {
        const o = JSON.parse(c);
        if (o && typeof o.src === 'string' && o.src.startsWith('data:') && o.src.length > INLINE_CACHE_LIMIT) {
          return { ...it, content: JSON.stringify({ ...o, src: '' }) };
        }
      } catch {}
    }
    return it;
  });
}

function saveListCache(toolId: string | number, kind: string, list: any[]) {
  try {
    localStorage.setItem(lsKey(toolId, kind), JSON.stringify(list));
    return;
  } catch {}
  try {
    localStorage.setItem(lsKey(toolId, kind), JSON.stringify(slimForCache(list)));
  } catch {}
}

export function ToolDetailClient({ tool }: { tool: any }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [notes, setNotes] = useState<any[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [prompts, setPrompts] = useState<any[]>([]);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptBody, setPromptBody] = useState('');
  const [skill, setSkill] = useState('');
  const [skillSaved, setSkillSaved] = useState(false);
  const [mcp, setMcp] = useState('');
  const [mcpError, setMcpError] = useState('');
  const [mcpSaved, setMcpSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [videos, setVideos] = useState<any[]>([]);
  const [videoTitle, setVideoTitle] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [videoError, setVideoError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [imgTitle, setImgTitle] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [imgError, setImgError] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState<string | number | null>(null);
  const imagesRef = useRef<any[]>([]);
  imagesRef.current = images;
  const [loading, setLoading] = useState(true);

  const toolId = tool.id;
  const isOpenRouter = useMemo(() => {
    const n = (tool.name || '').toLowerCase();
    const u = (tool.url || '').toLowerCase();
    return n.includes('openrouter') || u.includes('openrouter');
  }, [tool]);

  // Initial skill/mcp defaults
  useEffect(() => {
    const defaultSkill = isOpenRouter ? OPENROUTER_SKILL_TEMPLATE : `---\nname: ${(tool.name || 'tool').toLowerCase().replace(/\s+/g, '-')}\ndescription: ${(tool.description || '').slice(0, 120)}\nhomepage: ${tool.url || ''}\n---\n\n# ${(tool.name || 'Tool')} Skill\n\n## Overview\n${tool.description || 'Add usage notes here.'}\n\n## Quick start\n- URL: ${tool.url || ''}\n- Category: ${tool.category || 'General'}\n`;
    const defaultMcp = isOpenRouter
      ? OPENROUTER_MCP_PRESET
      : JSON.stringify({ mcpServers: { [(tool.name || 'tool').toLowerCase().replace(/\s+/g, '-')]: { command: 'npx', args: ['-y', 'mcp-server'], env: {} } } }, null, 2);
    setSkill((loadLocal(toolId, 'skill') as string) || defaultSkill);
    setMcp((loadLocal(toolId, 'mcp') as string) || defaultMcp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  // Load artifacts from backend, fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/tools/${toolId}/artifacts`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          const byKind = (k: string) => data.filter((d: any) => d.kind === k);
          const n = byKind('note');
          const p = byKind('prompt');
          const l = byKind('link');
          const v = byKind('video');
          const im = byKind('image');
          const s = byKind('skill')[0];
          const m = byKind('mcp')[0];
          if (n.length) {
            setNotes(n);
            saveLocal(toolId, 'notes-list', n);
          } else {
            setNotes((loadLocal(toolId, 'notes-list') as any[]) || []);
          }
          if (p.length) {
            setPrompts(p);
            saveLocal(toolId, 'prompts-list', p);
          } else {
            setPrompts((loadLocal(toolId, 'prompts-list') as any[]) || []);
          }
          if (l.length) setLinks(l);
          else setLinks((loadLocal(toolId, 'links-list') as any[]) || defaultLinks());
          if (v.length) {
            setVideos(v);
            saveListCache(toolId, 'videos-list', v);
          } else {
            setVideos((loadLocal(toolId, 'videos-list') as any[]) || []);
          }
          if (im.length) {
            setImages(im);
            saveListCache(toolId, 'images-list', im);
          } else {
            setImages((loadLocal(toolId, 'images-list') as any[]) || []);
          }
          if (s?.content) {
            setSkill(s.content);
            saveLocal(toolId, 'skill', s.content);
          }
          if (m?.content) {
            setMcp(m.content);
            saveLocal(toolId, 'mcp', m.content);
          }
        } else {
          throw new Error('backend unavailable');
        }
      } catch {
        if (!cancelled) {
          setNotes((loadLocal(toolId, 'notes-list') as any[]) || []);
          setPrompts((loadLocal(toolId, 'prompts-list') as any[]) || []);
          setLinks((loadLocal(toolId, 'links-list') as any[]) || defaultLinks());
          setVideos((loadLocal(toolId, 'videos-list') as any[]) || []);
          setImages((loadLocal(toolId, 'images-list') as any[]) || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  function defaultLinks() {
    if (isOpenRouter) {
      return [
        { id: 'docs', title: 'Documentation', content: 'https://openrouter.ai/docs' },
        { id: 'models', title: 'Models catalog', content: 'https://openrouter.ai/models' },
        { id: 'keys', title: 'API keys', content: 'https://openrouter.ai/keys' },
        { id: 'credits', title: 'Credits & billing', content: 'https://openrouter.ai/credits' },
      ];
    }
    return tool.url ? [{ id: 'home', title: 'Homepage', content: tool.url }] : [];
  }

  async function persistArtifact(kind: string, title: string, content: string) {
    try {
      const res = await fetch(`${API}/api/tools/${toolId}/artifacts`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ kind, title, content }),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  const addNote = async () => {
    if (!noteBody.trim() && !noteTitle.trim()) return;
    const saved = await persistArtifact('note', noteTitle || 'Untitled note', noteBody);
    const item = saved || { id: `local-${Date.now()}`, title: noteTitle || 'Untitled note', content: noteBody };
    const next = [item, ...notes];
    setNotes(next);
    saveLocal(toolId, 'notes-list', next);
    setNoteTitle('');
    setNoteBody('');
  };

  const deleteArtifact = async (id: number | string, kindList: 'notes' | 'prompts' | 'links' | 'videos' | 'images') => {
    const setter = kindList === 'notes' ? setNotes : kindList === 'prompts' ? setPrompts : kindList === 'videos' ? setVideos : kindList === 'images' ? setImages : setLinks;
    const current = kindList === 'notes' ? notes : kindList === 'prompts' ? prompts : kindList === 'videos' ? videos : kindList === 'images' ? images : links;
    setter(current.filter((x: any) => x.id !== id));
    const next = current.filter((x: any) => x.id !== id);
    const cacheKind = kindList === 'notes' ? 'notes-list' : kindList === 'prompts' ? 'prompts-list' : kindList === 'videos' ? 'videos-list' : kindList === 'images' ? 'images-list' : 'links-list';
    if (kindList === 'videos' || kindList === 'images') saveListCache(toolId, cacheKind, next);
    else saveLocal(toolId, cacheKind, next);
    if (typeof id === 'number') {
      try {
        await fetch(`${API}/api/artifacts/${id}`, { method: 'DELETE', headers: authHeaders() });
      } catch {}
    }
  };

  const addPrompt = async () => {
    if (!promptBody.trim()) return;
    const saved = await persistArtifact('prompt', promptTitle || 'Untitled prompt', promptBody);
    const item = saved || { id: `local-${Date.now()}`, title: promptTitle || 'Untitled prompt', content: promptBody };
    const next = [item, ...prompts];
    setPrompts(next);
    saveLocal(toolId, 'prompts-list', next);
    setPromptTitle('');
    setPromptBody('');
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    const saved = await persistArtifact('link', linkTitle || linkUrl, linkUrl);
    const item = saved || { id: `local-${Date.now()}`, title: linkTitle || linkUrl, content: linkUrl };
    const next = [item, ...links];
    setLinks(next);
    saveLocal(toolId, 'links-list', next);
    setLinkTitle('');
    setLinkUrl('');
  };

  const pushVideo = async (title: string, content: string) => {
    const saved = await persistArtifact('video', title, content);
    const item = saved || { id: `local-${Date.now()}`, title, content };
    const next = [item, ...videos];
    setVideos(next);
    try {
      saveListCache(toolId, 'videos-list', next);
    } catch {
      // uploaded data-URLs can exceed localStorage quota — backend copy still kept
    }
  };

  const addYouTube = async () => {
    setVideoError('');
    const url = ytUrl.trim();
    if (!url) return;
    if (!getYouTubeId(url)) {
      setVideoError('That does not look like a YouTube link. Paste a watch / youtu.be / shorts URL.');
      return;
    }
    await pushVideo(videoTitle.trim() || 'YouTube video', url);
    setYtUrl('');
    setVideoTitle('');
  };

  const addFileUrl = async () => {
    setVideoError('');
    const url = fileUrl.trim();
    if (!url) return;
    if (getYouTubeId(url)) {
      setVideoError('That is a YouTube link — paste it in the YouTube box above.');
      return;
    }
    await pushVideo(videoTitle.trim() || 'Video file', url);
    setFileUrl('');
    setVideoTitle('');
  };

  const onVideoFile = async (f: File | undefined) => {
    setVideoError('');
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      setVideoError('Please choose a video file (mp4 / webm / mov).');
      return;
    }
    if (f.size > 30 * 1024 * 1024) {
      setVideoError('File is over 30 MB — upload it somewhere and paste the link instead.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('read failed'));
        r.readAsDataURL(f);
      });
      await pushVideo(videoTitle.trim() || f.name, dataUrl);
      setVideoTitle('');
    } catch {
      setVideoError('Could not read that file. Try a different video.');
    } finally {
      setUploading(false);
    }
  };

  const pushImage = async (title: string, src: string, adjust?: Partial<ImageAdjust>) => {
    const content = JSON.stringify({ ...DEFAULT_ADJUST, ...adjust, src });
    const saved = await persistArtifact('image', title, content);
    const item = saved || { id: `local-${Date.now()}`, title, content };
    const next = [item, ...images];
    setImages(next);
    try {
      saveListCache(toolId, 'images-list', next);
    } catch {
      // uploaded data-URLs can exceed localStorage quota — backend copy still kept
    }
  };

  const addImageUrl = async () => {
    setImgError('');
    const url = imgUrl.trim();
    if (!url) return;
    await pushImage(imgTitle.trim() || 'Image', url);
    setImgUrl('');
    setImgTitle('');
  };

  const onImageFile = async (f: File | undefined) => {
    setImgError('');
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setImgError('Please choose an image file (png / jpg / webp / gif).');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setImgError('Image is over 8 MB — host it somewhere and paste the link instead.');
      return;
    }
    setUploadingImg(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('read failed'));
        r.readAsDataURL(f);
      });
      await pushImage(imgTitle.trim() || f.name, dataUrl);
      setImgTitle('');
    } catch {
      setImgError('Could not read that file. Try a different image.');
    } finally {
      setUploadingImg(false);
    }
  };

  /** Live adjust (drag) — commit writes through on release. */
  const tweakImage = (id: number | string, patch: Partial<ImageAdjust>) => {
    setImages((cur) =>
      cur.map((it: any) =>
        it.id !== id ? it : { ...it, content: JSON.stringify({ ...parseImage(it.content || ''), ...patch }) }
      )
    );
  };

  const commitImageAdjust = async (id: number | string) => {
    const it = imagesRef.current.find((x: any) => x.id === id);
    const content = it?.content || '';
    const snapshot = imagesRef.current.map((x: any) => (x.id === id ? { ...x, content } : x));
    try {
      saveListCache(toolId, 'images-list', snapshot);
    } catch {}
    if (typeof id === 'number') {
      try {
        await fetch(`${API}/api/artifacts/${id}`, {
          method: 'PUT',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ content }),
        });
      } catch {}
    }
  };

  const resetImageAdjust = (id: number | string) => {
    const it = images.find((x: any) => x.id === id);
    if (!it) return;
    const src = parseImage(it.content || '').src;
    tweakImage(id, { ...DEFAULT_ADJUST, src });
    setTimeout(() => commitImageAdjust(id), 0);
  };

  const saveSkill = async () => {
    saveLocal(toolId, 'skill', skill);
    await persistArtifact('skill', 'SKILL.md', skill);
    setSkillSaved(true);
    setTimeout(() => setSkillSaved(false), 2000);
  };

  const saveMcp = async () => {
    try {
      JSON.parse(mcp);
      setMcpError('');
    } catch (e: any) {
      setMcpError('Invalid JSON: ' + e.message);
      return;
    }
    saveLocal(toolId, 'mcp', mcp);
    await persistArtifact('mcp', 'mcp.json', mcp);
    setMcpSaved(true);
    setTimeout(() => setMcpSaved(false), 2000);
  };

  const copy = async (text: string, key = 'default') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback for non-secure contexts
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    }
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((cur) => (cur === key ? null : cur));
    }, 1600);
  };

  const heroLogo = useMemo(() => {
    let logo = (tool.logo_url || '').trim();
    if (!logo && tool.url) {
      try {
        const withProto = /^https?:\/\//i.test(tool.url) ? tool.url : `https://${tool.url}`;
        const host = new URL(withProto).hostname.replace(/^www\./, '');
        if (host) logo = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
      } catch {}
    }
    return logo;
  }, [tool]);

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-sm">
        <div className="flex items-center gap-space-md">
          <Link href="/tools" className="group inline-flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-lowest/60 backdrop-blur-xl hover:bg-surface-container-high/60 transition-all">
            <span className="material-symbols-outlined text-sm text-primary group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span className="font-label-lg text-label-lg text-on-surface-variant group-hover:text-on-surface">Back to Directory</span>
          </Link>
          <DeleteToolButton id={toolId} />
        </div>
        <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low/70 backdrop-blur-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
          </span>
          <span className="font-label-caps text-label-caps text-on-surface tracking-widest uppercase">Live Status: Operational</span>
        </div>
      </div>

      {/* Hero — basic details */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low/70 backdrop-blur-2xl p-space-lg md:p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)]">
        <BorderBeam duration={7} />
        <div className="absolute -right-16 -top-16 w-96 h-96 rounded-full bg-secondary/5 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-xl">
          <div className="flex items-start sm:items-center gap-space-lg min-w-0">
            <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-container-lowest/90 overflow-hidden">
              {heroLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroLogo} alt={`${tool.name} logo`} className="w-12 h-12 object-contain" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-primary">psychology</span>
              )}
            </div>
            <div className="flex flex-col gap-space-xs min-w-0">
              <div className="flex flex-wrap items-center gap-space-sm">
                <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-primary-container/20 text-secondary font-label-caps text-label-caps tracking-widest">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  VERIFIED INTELLIGENCE
                </span>
                <span className="font-label-caps text-label-caps text-outline uppercase tracking-widest">TOOLBASE DOSSIER #{String(toolId).padStart(4, '0')}</span>
              </div>
              <h1 className="font-display-md text-display-md text-on-surface tracking-tight truncate">{tool.name}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs truncate">
                <span className="material-symbols-outlined text-sm text-primary">radar</span>
                {tool.category || 'General'} {tool.subcategory ? `> ${tool.subcategory}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-md">
            <a className="btn-shimmer inline-flex items-center gap-space-xs px-space-xl py-space-md rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg" href={tool.url} target="_blank" rel="noopener noreferrer">
              <span>Launch Platform</span>
              <span className="material-symbols-outlined text-base">north_east</span>
            </a>
            <button onClick={() => copy(tool.url || '', 'url')} className={`inline-flex items-center gap-1.5 px-space-md py-space-md rounded-full font-label-lg text-label-lg transition-all duration-300 ${copiedKey === 'url' ? 'bg-emerald-500/15 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.35)] scale-105' : 'bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface'}`} title="Copy URL">
              <span key={copiedKey === 'url' ? 'tick' : 'copy'} className={`material-symbols-outlined text-base inline-block transition-transform duration-300 ${copiedKey === 'url' ? 'scale-125 copy-tick-pop' : ''}`}>{copiedKey === 'url' ? 'check' : 'content_copy'}</span>
              {copiedKey === 'url' ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-space-lg flex items-center gap-space-sm overflow-x-auto pb-1 border-t border-white/5 pt-space-md">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-space-md py-space-sm rounded-full font-label-lg text-label-lg whitespace-nowrap transition-all ${tab === t.id ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(229,195,120,0.25)]' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'}`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
              {t.id === 'notes' && notes.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-surface-container-highest/60">{notes.length}</span>}
              {t.id === 'prompts' && prompts.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-surface-container-highest/60">{prompts.length}</span>}
              {t.id === 'videos' && (videos.length + images.length) > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-surface-container-highest/60">{videos.length + images.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-on-surface-variant font-body-sm text-body-sm">Loading workspace…</p>}

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          <div className="lg:col-span-2 flex flex-col gap-space-md rounded-xl bg-surface-container-low/70 p-space-lg">
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Curator Log — Basic Details</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{tool.description || 'No description provided.'}</p>
            {tool.purpose && (
              <p className="font-body-sm text-body-sm text-on-surface-variant"><span className="text-primary">Purpose: </span>{tool.purpose}</p>
            )}
            {isOpenRouter && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm mt-space-sm">
                {[
                  { k: 'API Base', v: 'https://openrouter.ai/api/v1' },
                  { k: 'Auth', v: 'Bearer $OPENROUTER_API_KEY' },
                  { k: 'Models', v: '400+ via provider/model slug' },
                  { k: 'Pricing', v: 'Pay-as-you-go + free tier' },
                ].map((r) => (
                  <div key={r.k} className="p-space-sm rounded-lg bg-surface-container-lowest/60">
                    <div className="font-label-caps text-label-caps text-outline uppercase">{r.k}</div>
                    <div className="font-body-sm text-body-sm text-on-surface mt-1 break-words">{r.v}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {(tool.tags || []).map((tag: any) => (
                <span key={tag.id ?? tag.name} className="inline-flex px-2 py-0.5 rounded bg-surface-container-high/60 text-secondary text-xs">#{tag.name ?? tag}</span>
              ))}
              {(!tool.tags || tool.tags.length === 0) && <span className="text-on-surface text-sm">No tags</span>}
            </div>
            {(() => {
              const ytLinks = links.filter((l: any) => getYouTubeId(l.content || ''));
              const liveVideos = videos.filter((x: any) => x.content);
              const liveImages = images.filter((x: any) => parseImage(x.content || '').src);
              const media = [...liveVideos, ...liveImages.map((im: any) => ({ ...im, fromImage: true })), ...ytLinks.map((l: any) => ({ ...l, fromLink: true }))];
              if (media.length === 0) return null;
              return (
                <div className="flex flex-col gap-space-sm mt-space-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="font-label-caps text-label-caps text-outline uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary">play_circle</span>
                      Attached media ({media.length})
                    </h4>
                    <button onClick={() => setTab('videos')} className="font-label-lg text-label-lg text-primary hover:underline">Open Videos →</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    {media.slice(0, 4).map((m: any) => {
                      const ytId = getYouTubeId(m.content || '');
                      const isFile = !ytId && !m.fromLink && !m.fromImage;
                      const imgAdj = m.fromImage ? parseImage(m.content || '') : null;
                      return (
                        <div key={`${m.fromImage ? 'image' : m.fromLink ? 'link' : 'video'}-${m.id}`} className="rounded-lg overflow-hidden bg-surface-container-lowest/70 flex flex-col">
                          {ytId ? (
                            <Backlight blur={24} className="w-full">
                              <div className="w-full aspect-video bg-black">
                                {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                                <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                              </div>
                            </Backlight>
                          ) : imgAdj ? (
                            <Backlight blur={24} className="w-full">
                              <div className="w-full aspect-video bg-black/40 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgAdj.src} alt={m.title} className="w-full h-full" style={{ objectFit: imgAdj.fit, filter: adjustFilter(imgAdj) }} />
                              </div>
                            </Backlight>
                          ) : isFile ? (
                            <Backlight blur={24} className="w-full">
                              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                              <video controls preload="metadata" src={m.content} className="w-full aspect-video bg-black" />
                            </Backlight>
                          ) : null}
                          <div className="px-space-sm py-space-xs font-body-sm text-body-sm text-on-surface-variant truncate">{m.title}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-low/70 p-space-lg">
            <div className="flex flex-col"><span className="font-label-caps text-label-caps text-outline uppercase">URL</span><a href={tool.url} target="_blank" rel="noreferrer" className="text-primary truncate mt-1">{tool.url}</a></div>
            <div className="flex flex-col"><span className="font-label-caps text-label-caps text-outline uppercase">Pricing</span><span className="text-on-surface mt-1">{tool.pricing || 'Unknown'}</span></div>
            <div className="flex flex-col"><span className="font-label-caps text-label-caps text-outline uppercase">Category</span><span className="text-on-surface mt-1">{tool.category || 'General'} {tool.subcategory ? `/ ${tool.subcategory}` : ''}</span></div>
            <div className="flex flex-col"><span className="font-label-caps text-label-caps text-outline uppercase">Rating</span><span className="text-on-surface mt-1">{tool.rating?.toFixed ? tool.rating.toFixed(1) : tool.rating || '0.0'} ★ {tool.favorite ? '· Favorited' : ''}</span></div>
            <div className="flex gap-space-sm pt-space-sm flex-wrap">
              <button onClick={() => setTab('notes')} className="flex-1 min-w-[100px] px-space-md py-space-sm rounded-full bg-surface-container-high/60 text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high">+ Note</button>
              <button onClick={() => setTab('videos')} className="flex-1 min-w-[100px] px-space-md py-space-sm rounded-full bg-surface-container-high/60 text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high">+ Media</button>
              <button onClick={() => setTab('skill')} className="flex-1 min-w-[100px] px-space-md py-space-sm rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg">SKILL.md</button>
              <button onClick={() => setTab('mcp')} className="flex-1 min-w-[100px] px-space-md py-space-sm rounded-full bg-surface-container-high/60 text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high">MCP</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTES */}
      {tab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          <div className="rounded-xl bg-surface-container-low/70 p-space-lg flex flex-col gap-space-sm">
            <h3 className="font-label-caps text-label-caps text-outline uppercase">Add a note</h3>
            <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title…" className="h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none" />
            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write usage notes, API keys hints, model picks…" rows={8} className="p-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none resize-y" />
            <button onClick={addNote} className="px-space-lg py-space-sm rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg w-fit">Save note</button>
          </div>
          <div className="flex flex-col gap-space-sm">
            {notes.length === 0 && <p className="text-on-surface-variant font-body-sm text-body-sm rounded-xl bg-surface-container-low/70 p-space-lg">No notes yet. Add your first deployment note.</p>}
            {notes.map((n: any) => (
              <div key={n.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface truncate">{n.title}</span>
                  <button onClick={() => deleteArtifact(n.id, 'notes')} className="text-red-400/70 hover:text-red-300" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROMPTS */}
      {tab === 'prompts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          <div className="rounded-xl bg-surface-container-low/70 p-space-lg flex flex-col gap-space-sm">
            <h3 className="font-label-caps text-label-caps text-outline uppercase">Add a prompt for {tool.name}</h3>
            <input value={promptTitle} onChange={(e) => setPromptTitle(e.target.value)} placeholder="Prompt title…" className="h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none" />
            <textarea value={promptBody} onChange={(e) => setPromptBody(e.target.value)} placeholder="Paste prompt with [VARIABLES]…" rows={8} className="p-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none resize-y font-mono text-sm" />
            <button onClick={addPrompt} className="px-space-lg py-space-sm rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg w-fit">Save prompt</button>
          </div>
          <div className="flex flex-col gap-space-sm">
            {prompts.length === 0 && <p className="text-on-surface-variant font-body-sm text-body-sm rounded-xl bg-surface-container-low/70 p-space-lg">No prompts linked to this tool yet.</p>}
            {prompts.map((p: any) => (
              <div key={p.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface truncate">{p.title}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copy(p.content, `prompt-${p.id}`)} className={`p-1.5 rounded-full transition-all duration-300 ${copiedKey === `prompt-${p.id}` ? 'text-emerald-300 scale-125' : 'text-on-surface-variant hover:text-primary'}`} title={copiedKey === `prompt-${p.id}` ? 'Copied!' : 'Copy'}><span key={copiedKey === `prompt-${p.id}` ? 'tick' : 'copy'} className={`material-symbols-outlined text-base inline-block ${copiedKey === `prompt-${p.id}` ? 'copy-tick-pop' : ''}`}>{copiedKey === `prompt-${p.id}` ? 'check' : 'content_copy'}</span></button>
                    <button onClick={() => deleteArtifact(p.id, 'prompts')} className="text-red-400/70 hover:text-red-300" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                  </div>
                </div>
                <pre className="font-mono text-xs text-on-surface-variant whitespace-pre-wrap bg-surface-container-lowest/60 rounded-lg p-space-sm">{p.content}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIDEOS */}
      {tab === 'videos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          <div className="rounded-xl bg-surface-container-low/70 p-space-lg flex flex-col gap-space-md">
            <h3 className="font-label-caps text-label-caps text-outline uppercase">Add a video for {tool.name}</h3>
            <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title (optional)…" className="h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none" />

            <div className="flex flex-col gap-space-sm p-space-md rounded-lg bg-surface-container-lowest/60">
              <span className="font-label-caps text-label-caps text-secondary uppercase flex items-center gap-1"><span className="material-symbols-outlined text-sm">youtube_activity</span> YouTube link</span>
              <div className="flex gap-space-sm">
                <input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=… or youtu.be/…" className="flex-1 h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none min-w-0" />
                <button onClick={addYouTube} className="px-space-lg py-space-sm rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg whitespace-nowrap">Add</button>
              </div>
            </div>

            <div className="flex flex-col gap-space-sm p-space-md rounded-lg bg-surface-container-lowest/60">
              <span className="font-label-caps text-label-caps text-secondary uppercase flex items-center gap-1"><span className="material-symbols-outlined text-sm">movie</span> Your own video</span>
              <div className="flex gap-space-sm">
                <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…/demo.mp4" className="flex-1 h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none min-w-0" />
                <button onClick={addFileUrl} className="px-space-lg py-space-sm rounded-full bg-surface-container-high/70 text-on-surface font-label-lg text-label-lg whitespace-nowrap hover:bg-surface-container-high">Add link</button>
              </div>
              <label className={`inline-flex items-center justify-center gap-2 px-space-lg py-space-sm rounded-full font-label-lg text-label-lg cursor-pointer transition-all ${uploading ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-container-high/70 text-on-surface hover:bg-surface-container-high'}`}>
                <span className="material-symbols-outlined text-base">{uploading ? 'progress_activity' : 'upload'}</span>
                {uploading ? 'Uploading…' : 'Or upload a video file'}
                <input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(e) => { onVideoFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <p className="font-body-sm text-body-sm text-outline">Uploads under 30 MB are stored with this tool. Larger files — host them and paste the link.</p>
            </div>

            {videoError && <p className="text-red-400 font-body-sm text-body-sm">{videoError}</p>}

            <div className="flex flex-col gap-space-sm p-space-md rounded-lg bg-surface-container-lowest/60">
              <span className="font-label-caps text-label-caps text-secondary uppercase flex items-center gap-1"><span className="material-symbols-outlined text-sm">image</span> Your own image</span>
              <div className="flex gap-space-sm">
                <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="https://…/screenshot.png" className="flex-1 h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none min-w-0" />
                <button onClick={addImageUrl} className="px-space-lg py-space-sm rounded-full bg-surface-container-high/70 text-on-surface font-label-lg text-label-lg whitespace-nowrap hover:bg-surface-container-high">Add link</button>
              </div>
              <label className={`inline-flex items-center justify-center gap-2 px-space-lg py-space-sm rounded-full font-label-lg text-label-lg cursor-pointer transition-all ${uploadingImg ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-container-high/70 text-on-surface hover:bg-surface-container-high'}`}>
                <span className="material-symbols-outlined text-base">{uploadingImg ? 'progress_activity' : 'upload'}</span>
                {uploadingImg ? 'Uploading…' : 'Or upload an image file'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImg} onChange={(e) => { onImageFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <p className="font-body-sm text-body-sm text-outline">Uploads under 8 MB are stored with this tool. Larger files — host them and paste the link.</p>
            </div>

            {imgError && <p className="text-red-400 font-body-sm text-body-sm">{imgError}</p>}
          </div>

          <div className="flex flex-col gap-space-sm">
            {videos.length === 0 && images.length === 0 && <p className="text-on-surface-variant font-body-sm text-body-sm rounded-xl bg-surface-container-low/70 p-space-lg">No media yet. Add a YouTube demo, upload a video, or drop in an image.</p>}
            {images.map((im: any) => {
              const adj = parseImage(im.content || '');
              if (!adj.src) {
                return (
                  <div key={im.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex items-center gap-space-sm">
                    <span className="w-10 h-10 rounded-xl bg-surface-container-highest/60 flex items-center justify-center text-outline shrink-0">
                      <span className="material-symbols-outlined text-xl">cloud_off</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-headline-sm text-headline-sm text-on-surface truncate">{im.title}</div>
                      <div className="font-body-sm text-body-sm text-outline text-xs">Stored in the app database — start the backend to view it.</div>
                    </div>
                    <button onClick={() => deleteArtifact(im.id, 'images')} className="text-red-400/70 hover:text-red-300 p-1.5 shrink-0" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                  </div>
                );
              }
              const open = adjustOpen === im.id;
              return (
                <div key={im.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-headline-sm text-headline-sm text-on-surface truncate flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-secondary">image</span>
                      {im.title}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setAdjustOpen(open ? null : im.id)} className={`p-1.5 rounded-full transition-all ${open ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant hover:text-primary'}`} title="Adjust image">
                        <span className="material-symbols-outlined text-base">tune</span>
                      </button>
                      {!String(adj.src || '').startsWith('data:') && (
                        <a href={adj.src} target="_blank" rel="noreferrer" className="p-1.5 rounded-full text-on-surface-variant hover:text-primary" title="Open original"><span className="material-symbols-outlined text-base">open_in_new</span></a>
                      )}
                      <button onClick={() => deleteArtifact(im.id, 'images')} className="text-red-400/70 hover:text-red-300 p-1.5" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                    </div>
                  </div>
                  <Backlight blur={28} className="w-full">
                    <div className="w-full rounded-lg overflow-hidden bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={adj.src} alt={im.title} className="w-full max-h-[320px]" style={{ objectFit: adj.fit, filter: adjustFilter(adj) }} />
                    </div>
                  </Backlight>
                  {open && (
                    <div className="flex flex-col gap-space-sm p-space-md rounded-lg bg-surface-container-lowest/60">
                      <div className="flex items-center gap-2">
                        <span className="font-label-caps text-label-caps text-outline uppercase">Fit</span>
                        {(['cover', 'contain'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => { tweakImage(im.id, { fit: f }); commitImageAdjust(im.id); }}
                            className={`px-space-md py-space-xs rounded-full font-label-lg text-label-lg capitalize transition-all ${adj.fit === f ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface'}`}
                          >
                            {f}
                          </button>
                        ))}
                        <button onClick={() => resetImageAdjust(im.id)} className="ml-auto font-label-lg text-label-lg text-on-surface-variant hover:text-secondary transition-colors">Reset</button>
                      </div>
                      {([
                        { k: 'brightness', label: 'Brightness', min: 0, max: 200 },
                        { k: 'contrast', label: 'Contrast', min: 0, max: 200 },
                        { k: 'saturate', label: 'Saturation', min: 0, max: 200 },
                      ] as const).map((s) => (
                        <div key={s.k} className="flex items-center gap-space-sm">
                          <span className="font-body-sm text-body-sm text-on-surface-variant w-24 shrink-0">{s.label}</span>
                          <input
                            type="range"
                            min={s.min}
                            max={s.max}
                            value={adj[s.k]}
                            onChange={(e) => tweakImage(im.id, { [s.k]: Number(e.target.value) } as Partial<ImageAdjust>)}
                            onPointerUp={() => commitImageAdjust(im.id)}
                            onKeyUp={() => commitImageAdjust(im.id)}
                            aria-label={s.label}
                            className="hue-slider flex-1"
                            style={{ background: 'rgba(255,255,255,0.12)' }}
                          />
                          <span className="font-mono text-xs text-on-surface-variant w-12 text-right shrink-0">{adj[s.k]}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {videos.map((vd: any) => {
              if (!vd.content) {
                return (
                  <div key={vd.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex items-center gap-space-sm">
                    <span className="w-10 h-10 rounded-xl bg-surface-container-highest/60 flex items-center justify-center text-outline shrink-0">
                      <span className="material-symbols-outlined text-xl">cloud_off</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-headline-sm text-headline-sm text-on-surface truncate">{vd.title}</div>
                      <div className="font-body-sm text-body-sm text-outline text-xs">Stored in the app database — start the backend to view it.</div>
                    </div>
                    <button onClick={() => deleteArtifact(vd.id, 'videos')} className="text-red-400/70 hover:text-red-300 p-1.5 shrink-0" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                  </div>
                );
              }
              const ytId = getYouTubeId(vd.content || '');
              return (
                <div key={vd.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-headline-sm text-headline-sm text-on-surface truncate">{vd.title}</span>
                    <div className="flex items-center gap-1">
                      {ytId == null && !String(vd.content || '').startsWith('data:') && (
                        <a href={vd.content} target="_blank" rel="noreferrer" className="p-1.5 rounded-full text-on-surface-variant hover:text-primary" title="Open original"><span className="material-symbols-outlined text-base">open_in_new</span></a>
                      )}
                      <button onClick={() => copy(vd.content || '', `video-${vd.id}`)} className={`p-1.5 rounded-full transition-all ${copiedKey === `video-${vd.id}` ? 'text-emerald-300' : 'text-on-surface-variant hover:text-primary'}`} title={copiedKey === `video-${vd.id}` ? 'Copied!' : 'Copy link'}>
                        <span className={`material-symbols-outlined text-base inline-block ${copiedKey === `video-${vd.id}` ? 'copy-tick-pop' : ''}`}>{copiedKey === `video-${vd.id}` ? 'check' : 'content_copy'}</span>
                      </button>
                      <button onClick={() => deleteArtifact(vd.id, 'videos')} className="text-red-400/70 hover:text-red-300 p-1.5" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                    </div>
                  </div>
                  {ytId ? (
                    <Backlight blur={28} className="w-full">
                      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
                        {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    </Backlight>
                  ) : (
                    <Backlight blur={28} className="w-full">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video controls preload="metadata" src={vd.content} className="w-full rounded-lg bg-black max-h-[320px]" />
                    </Backlight>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SKILL.MD */}
      {tab === 'skill' && (
        <div className="rounded-xl bg-surface-container-low/70 p-space-lg flex flex-col gap-space-md">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-label-caps text-label-caps text-outline uppercase">SKILL.md — agent skill for {tool.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => copy(skill, 'skill')} className={`px-space-md py-space-xs rounded-full font-label-lg text-label-lg transition-all duration-300 ${copiedKey === 'skill' ? 'bg-emerald-500/15 text-emerald-300 scale-105' : 'bg-surface-container-high/60 text-on-surface'}`}>{copiedKey === 'skill' ? 'Copied ✓' : 'Copy'}</button>
              <button onClick={() => { const blob = new Blob([skill], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'SKILL.md'; a.click(); }} className="px-space-md py-space-xs rounded-full bg-surface-container-high/60 text-on-surface font-label-lg text-label-lg">Download</button>
              <button onClick={saveSkill} className="px-space-lg py-space-xs rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg">{skillSaved ? 'Saved ✓' : 'Save'}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
            <textarea value={skill} onChange={(e) => setSkill(e.target.value)} rows={22} spellCheck={false} className="p-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface font-mono text-xs focus:outline-none resize-y" />
            <pre className="p-space-md rounded-lg bg-surface-container-lowest/60 text-on-surface-variant font-mono text-xs whitespace-pre-wrap overflow-auto max-h-[560px]">{skill}</pre>
          </div>
        </div>
      )}

      {/* MCP */}
      {tab === 'mcp' && (
        <div className="rounded-xl bg-surface-container-low/70 p-space-lg flex flex-col gap-space-md">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-label-caps text-label-caps text-outline uppercase">MCP server config</h3>
            <div className="flex gap-2">
              {isOpenRouter && <button onClick={() => setMcp(OPENROUTER_MCP_PRESET)} className="px-space-md py-space-xs rounded-full bg-surface-container-high/60 text-secondary font-label-lg text-label-lg">Load OpenRouter preset</button>}
              <button onClick={() => copy(mcp, 'mcp')} className={`px-space-md py-space-xs rounded-full font-label-lg text-label-lg transition-all duration-300 ${copiedKey === 'mcp' ? 'bg-emerald-500/15 text-emerald-300 scale-105' : 'bg-surface-container-high/60 text-on-surface'}`}>{copiedKey === 'mcp' ? 'Copied ✓' : 'Copy JSON'}</button>
              <button onClick={saveMcp} className="px-space-lg py-space-xs rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg">{mcpSaved ? 'Saved ✓' : 'Save'}</button>
            </div>
          </div>
          {mcpError && <p className="text-red-400 font-body-sm text-body-sm">{mcpError}</p>}
          <textarea value={mcp} onChange={(e) => setMcp(e.target.value)} rows={18} spellCheck={false} className="p-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface font-mono text-xs focus:outline-none resize-y" />
          <p className="font-body-sm text-body-sm text-outline">Paste into <span className="text-primary font-mono">claude_desktop_config.json / mcp.json</span>. Set <span className="font-mono text-secondary">OPENROUTER_API_KEY</span> in env. Works with Claude Desktop, Cursor, Windsurf, OpenCode.</p>
        </div>
      )}

      {/* LINKS */}
      {tab === 'links' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          <div className="rounded-xl bg-surface-container-low/70 p-space-lg flex flex-col gap-space-sm">
            <h3 className="font-label-caps text-label-caps text-outline uppercase">Add a link</h3>
            <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Label e.g. API docs…" className="h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none" />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="h-11 px-space-md rounded-lg bg-surface-container-lowest/90 text-on-surface focus:outline-none" />
            <button onClick={addLink} className="px-space-lg py-space-sm rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg w-fit">Save link</button>
          </div>
          <div className="flex flex-col gap-space-sm">
            {links.map((l: any) => {
              const ytId = getYouTubeId(l.content || '');
              if (ytId) {
                return (
                  <div key={l.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-headline-sm text-headline-sm text-on-surface truncate flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-secondary">play_circle</span>
                        {l.title}
                      </span>
                      <div className="flex items-center gap-1">
                        <a href={l.content} target="_blank" rel="noreferrer" className="p-1.5 rounded-full text-on-surface-variant hover:text-primary" title="Open on YouTube"><span className="material-symbols-outlined text-base">open_in_new</span></a>
                        <button onClick={() => deleteArtifact(l.id, 'links')} className="text-red-400/70 hover:text-red-300 p-1.5" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                      </div>
                    </div>
                    <Backlight blur={28} className="w-full">
                      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
                        {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    </Backlight>
                  </div>
                );
              }
              return (
                <div key={l.id} className="rounded-xl bg-surface-container-low/70 p-space-md flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-headline-sm text-headline-sm text-on-surface truncate">{l.title}</div>
                    <a href={l.content} target="_blank" rel="noreferrer" className="text-primary font-body-sm text-body-sm truncate block">{l.content}</a>
                  </div>
                  <button onClick={() => deleteArtifact(l.id, 'links')} className="text-red-400/70 hover:text-red-300" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                </div>
              );
            })}
            {links.length === 0 && <p className="text-on-surface-variant font-body-sm text-body-sm rounded-xl bg-surface-container-low/70 p-space-lg">No links yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
