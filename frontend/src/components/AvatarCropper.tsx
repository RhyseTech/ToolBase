'use client';

import { useEffect, useRef, useState } from 'react';

const OUT = 256; // exported avatar resolution

type Grade = { brightness: number; contrast: number; saturate: number };

const GRADE_PRESETS: { id: string; label: string; dot: string; grade: Grade }[] = [
  { id: 'normal', label: 'Normal', dot: 'linear-gradient(135deg,#e8e8e8,#9a9a9a)', grade: { brightness: 100, contrast: 100, saturate: 100 } },
  { id: 'vivid', label: 'Vivid', dot: 'linear-gradient(135deg,#ff5f6d,#ffc371)', grade: { brightness: 105, contrast: 115, saturate: 135 } },
  { id: 'warm', label: 'Warm', dot: 'linear-gradient(135deg,#f6d365,#fda085)', grade: { brightness: 104, contrast: 104, saturate: 118 } },
  { id: 'cool', label: 'Cool', dot: 'linear-gradient(135deg,#89f7fe,#66a6ff)', grade: { brightness: 102, contrast: 106, saturate: 95 } },
  { id: 'mono', label: 'Mono', dot: 'linear-gradient(135deg,#fff,#000)', grade: { brightness: 102, contrast: 110, saturate: 0 } },
];

/**
 * Modern avatar crop + grade editor.
 * Glass modal, drag-to-crop circular viewport, zoom, one-tap grade
 * presets + manual sliders, live multi-size previews.
 * Exports a compact 256px JPEG data URL (quota-safe for settings).
 */
export function AvatarCropper({
  src,
  onApply,
  onCancel,
}: {
  src: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [grade, setGrade] = useState<Grade>({ brightness: 100, contrast: 100, saturate: 100 });
  const [preset, setPreset] = useState('normal');
  const [dragged, setDragged] = useState(false);
  const [size, setSize] = useState(300);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setZoom(1);
      setGrade({ brightness: 100, contrast: 100, saturate: 100 });
      setPreset('normal');
      setDragged(false);
      setOff({ x: 0, y: 0 });
    };
    im.src = src;
  }, [src]);

  useEffect(() => {
    const measure = () => {
      if (boxRef.current) setSize(boxRef.current.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const base = img ? Math.max(size / img.naturalWidth, size / img.naturalHeight) : 1;
  const dw = img ? img.naturalWidth * base * zoom : 0;
  const dh = img ? img.naturalHeight * base * zoom : 0;

  const clampOff = (ox: number, oy: number) => ({
    x: Math.min(0, Math.max(size - dw, ox)),
    y: Math.min(0, Math.max(size - dh, oy)),
  });

  // center the image on load / zoom change
  useEffect(() => {
    if (!img) return;
    setOff({ x: (size - dw) / 2, y: (size - dh) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, size, zoom]);

  const filter = `brightness(${grade.brightness}%) contrast(${grade.contrast}%) saturate(${grade.saturate}%)`;

  const moveDrag = (clientX: number, clientY: number) => {
    const d = dragRef.current;
    if (!d) return;
    setDragged(true);
    setOff(clampOff(d.ox + (clientX - d.px), d.oy + (clientY - d.py)));
  };

  const pickPreset = (id: string) => {
    const p = GRADE_PRESETS.find((g) => g.id === id);
    if (!p) return;
    setPreset(id);
    setGrade({ ...p.grade });
  };

  const tweak = (patch: Partial<Grade>) => {
    setPreset('custom');
    setGrade((g) => ({ ...g, ...patch }));
  };

  const apply = () => {
    if (!img || dw === 0) return;
    const c = document.createElement('canvas');
    c.width = OUT;
    c.height = OUT;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    // JPEG has no alpha — paint the app's dark canvas behind, corners are
    // masked by the circular avatar frame anyway.
    ctx.fillStyle = '#141518';
    ctx.fillRect(0, 0, OUT, OUT);
    const kx = img.naturalWidth / dw;
    const ky = img.naturalHeight / dh;
    try {
      ctx.filter = filter;
    } catch {}
    ctx.drawImage(img, -off.x * kx, -off.y * ky, size * kx, size * ky, 0, 0, OUT, OUT);
    onApply(c.toDataURL('image/jpeg', 0.88));
  };

  return (
    <div
      className="modal-scrim fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
      onClick={onCancel}
    >
      <div
        className="modal-pop w-full max-w-lg rounded-3xl border border-white/10 bg-surface-container-low/90 backdrop-blur-3xl shadow-[0_40px_120px_rgba(0,0,0,0.8),0_0_60px_rgba(229,195,120,0.08),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-space-lg flex flex-col gap-space-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Crop and adjust profile photo"
      >
        {/* Header */}
        <div className="flex items-center gap-space-sm">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center shadow-[0_0_20px_rgba(229,195,120,0.35)] shrink-0">
            <span className="material-symbols-outlined text-xl text-on-primary">face_retouching_natural</span>
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight">Profile photo studio</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">Drag, zoom & grade — live on the right</p>
          </div>
          <button onClick={onCancel} aria-label="Close editor" className="w-9 h-9 rounded-full bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 hover:rotate-90 transition-all duration-300 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-[1fr_92px] gap-space-md items-start">
          {/* Crop viewport with glowing circular mask */}
          <div
            ref={boxRef}
            className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/60 cursor-grab active:cursor-grabbing select-none ring-1 ring-white/10"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y };
            }}
            onPointerMove={(e) => {
              if (e.buttons & 1) moveDrag(e.clientX, e.clientY);
            }}
            onPointerUp={() => (dragRef.current = null)}
            tabIndex={0}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 10 : 2;
              if (e.key === 'ArrowLeft') setOff((o) => clampOff(o.x - step, o.y));
              else if (e.key === 'ArrowRight') setOff((o) => clampOff(o.x + step, o.y));
              else if (e.key === 'ArrowUp') setOff((o) => clampOff(o.x, o.y - step));
              else if (e.key === 'ArrowDown') setOff((o) => clampOff(o.x, o.y + step));
              else return;
              e.preventDefault();
            }}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt="Crop preview"
                draggable={false}
                className="absolute top-0 left-0 max-w-none pointer-events-none"
                style={{ width: dw, height: dh, transform: `translate(${off.x}px, ${off.y}px)`, filter }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-full h-full rounded-full border-2 border-primary-container shadow-[0_0_35px_rgba(229,195,120,0.35)]"
                style={{ boxShadow: '0 0 0 999px rgba(8, 9, 12, 0.62), 0 0 35px rgba(229,195,120,0.3)' }}
              />
            </div>
            {!dragged && (
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-label-lg text-label-lg text-white/90 bg-black/55 backdrop-blur px-3 py-1 rounded-full pointer-events-none whitespace-nowrap animate-pulse">
                Drag to reposition
              </span>
            )}
          </div>

          {/* Live size previews */}
          <div className="flex sm:flex-col flex-row items-center gap-3 justify-center py-1">
            {[64, 44, 30].map((px) => (
              <div key={px} className="flex flex-col items-center gap-1">
                <span
                  className="rounded-full overflow-hidden ring-2 ring-primary-container/70 shadow-[0_0_18px_rgba(229,195,120,0.3)] bg-surface-container-highest"
                  style={{ width: px, height: px }}
                >
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" aria-hidden className="w-full h-full object-cover pointer-events-none" style={{ filter }} />
                  )}
                </span>
                <span className="font-mono text-[10px] text-outline">{px}px</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom pill */}
        <div className="flex items-center gap-space-sm px-space-md py-space-sm rounded-full bg-white/[0.04] ring-1 ring-white/10">
          <span className="material-symbols-outlined text-base text-on-surface-variant">zoom_out</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1"
            style={{ accentColor: '#e5c378' }}
          />
          <span className="material-symbols-outlined text-base text-on-surface-variant">zoom_in</span>
          <span className="font-mono text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded-full min-w-[52px] text-center">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Grade */}
        <div className="flex flex-col gap-space-sm p-space-md rounded-2xl bg-black/25 ring-1 ring-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">tune</span>
              Grade
            </span>
            <button
              onClick={() => {
                setGrade({ brightness: 100, contrast: 100, saturate: 100 });
                setPreset('normal');
                setZoom(1);
              }}
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-secondary transition-colors"
            >
              Reset all
            </button>
          </div>

          {/* One-tap presets */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {GRADE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => pickPreset(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-lg text-label-lg whitespace-nowrap transition-all ${
                  preset === p.id
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_14px_rgba(229,195,120,0.35)]'
                    : 'bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 ring-1 ring-white/10'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full ring-1 ring-white/30" style={{ background: p.dot }} />
                {p.label}
              </button>
            ))}
            {preset === 'custom' && (
              <span className="flex items-center px-3 py-1.5 rounded-full font-label-lg text-label-lg bg-secondary/15 text-secondary whitespace-nowrap">
                Custom
              </span>
            )}
          </div>

          {([
            { k: 'brightness', label: 'Brightness', v: grade.brightness },
            { k: 'contrast', label: 'Contrast', v: grade.contrast },
            { k: 'saturate', label: 'Saturation', v: grade.saturate },
          ] as const).map((s) => (
            <div key={s.k} className="flex items-center gap-space-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant w-24 shrink-0">{s.label}</span>
              <input
                type="range"
                min={0}
                max={200}
                value={s.v}
                onChange={(e) => tweak({ [s.k]: Number(e.target.value) } as Partial<Grade>)}
                aria-label={s.label}
                className="flex-1"
                style={{ accentColor: '#e5c378' }}
              />
              <span className="font-mono text-xs text-on-surface-variant w-12 text-right shrink-0">{s.v}%</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end items-center gap-space-sm">
          <button onClick={onCancel} className="px-space-lg py-space-sm rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/5 font-label-lg text-label-lg transition-all">
            Cancel
          </button>
          <button onClick={apply} disabled={!img} className="group px-space-lg py-space-sm rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg shadow-[0_0_25px_rgba(229,195,120,0.35)] hover:shadow-[0_0_35px_rgba(229,195,120,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base group-hover:scale-125 transition-transform">check</span>
            Apply avatar
          </button>
        </div>
      </div>
    </div>
  );
}
