'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond } from 'next/font/google';
import { loadSettings, persistSettings } from '@/lib/settings';
import { Meteors } from '@/components/magic/Meteors';

const luxSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

export const luxSerifClass = luxSerif.className;

export const goldShimmer =
  'bg-gradient-to-r from-primary-fixed via-secondary to-primary-container bg-clip-text text-transparent';

/** Persist the POC-local profile so the header + settings pick up the new identity. */
export function persistLocalProfile(patch: { displayName?: string; email?: string; avatar?: string }) {
  try {
    const s = loadSettings();
    persistSettings({ ...s, ...patch });
    return true;
  } catch {
    return false;
  }
}

export function passwordScore(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const clamped = Math.min(score, 4);
  return {
    score: clamped,
    label: pw.length === 0 ? 'Awaiting key…' : ['Fragile', 'Weak', 'Resilient', 'Strong', 'Sovereign'][clamped],
  };
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background text-on-surface">
      {/* Ambient backing lights */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-gradient-to-b from-primary-container/15 via-primary-container/5 to-transparent blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-10 w-[500px] h-[400px] rounded-full bg-secondary/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(229,195,120,0.06)_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
        <Meteors count={6} />
      </div>

      {/* Main — full viewport, no header/footer */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-6 lg:py-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}

export function MonolithPanel({
  badge,
  heading,
  body,
  footLeft,
  footRight,
}: {
  badge?: string;
  heading: React.ReactNode;
  body: string;
  footLeft?: string;
  footRight?: string;
}) {
  return (
    <div className="hidden lg:flex lg:col-span-5 flex-col justify-center relative pl-4 pr-6">
      <div className="relative group rounded-2xl overflow-hidden border border-primary-container/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-surface-container-lowest">
        <div className="relative h-[560px] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="ToolBase digital intelligence monolith with illuminated golden AI core"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-1000 ease-out"
            src="/auth-monolith.png"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest/70 via-transparent to-surface-container-lowest/60" />
          <div className="absolute inset-2 border border-primary-container/20 rounded-xl pointer-events-none" />
          {badge && (
            <div className="absolute top-5 left-5 z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container-lowest/80 border border-white/10 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span className="text-[10px] tracking-wider text-primary uppercase">{badge}</span>
            </div>
          )}
          <div className="absolute bottom-6 inset-x-6 z-10">
            <div className="text-[10px] tracking-widest text-on-surface-variant uppercase">Architectural Synthesis</div>
            <h3 className={`${luxSerifClass} text-2xl text-on-surface font-light leading-snug mt-1`}>{heading}</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed pt-1">{body}</p>
            {(footLeft || footRight) && (
              <div className="flex items-center justify-between mt-3 text-[10px] tracking-widest text-outline uppercase">
                <span>{footLeft}</span>
                <span>{footRight}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LuxCard({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`w-full ${wide ? 'lg:col-span-7' : ''} flex justify-center`}>
      <div className="w-full max-w-xl rounded-2xl p-6 sm:p-8 border border-primary-container/25 relative bg-surface-container-low/70 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_35px_-5px_rgba(229,195,120,0.15)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-[80px] blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-tr-[70px] blur-xl pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface-container-highest/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all duration-200';

export function LuxInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function LuxPassword({
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} {...props} type={show ? 'text' : 'password'} className={`${inputCls} pr-11 font-mono tracking-wider`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-lg">{show ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}

export function LuxLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs tracking-wide text-on-surface-variant">
      {children}
    </label>
  );
}

export function LuxSubmit({
  loading,
  children,
  disabled,
}: {
  loading?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg font-semibold shadow-[0_0_25px_rgba(229,195,120,0.35)] hover:shadow-[0_0_35px_rgba(229,195,120,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
          <span>Entering vault…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
