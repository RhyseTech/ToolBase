'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AuthShell,
  LuxInput,
  LuxLabel,
  LuxPassword,
  LuxSubmit,
  goldShimmer,
  luxSerifClass,
  passwordScore,
  persistLocalProfile,
} from '@/components/AuthLux';
import { GoogleSignIn } from '@/components/GoogleSignIn';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Availability = 'idle' | 'checking' | 'taken' | 'free' | 'unknown';

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailState, setEmailState] = useState<Availability>('idle');
  const [nameState, setNameState] = useState<Availability>('idle');

  const strength = passwordScore(password);

  const checkEmail = async (value: string) => {
    const v = value.trim();
    if (!EMAIL_RE.test(v)) {
      setEmailState('idle');
      return;
    }
    setEmailState('checking');
    try {
      const r = await fetch(`${BACKEND}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v }),
      });
      if (!r.ok) throw new Error('check failed');
      const data = await r.json();
      setEmailState(data.available ? 'free' : 'taken');
    } catch {
      setEmailState('unknown'); // backend down — server re-checks on submit
    }
  };

  const checkName = async (value: string) => {
    const v = value.trim();
    if (v.length < 2) {
      setNameState('idle');
      return;
    }
    setNameState('checking');
    try {
      const r = await fetch(`${BACKEND}/api/auth/check-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: v }),
      });
      if (!r.ok) throw new Error('check failed');
      const data = await r.json();
      setNameState(data.available ? 'free' : 'taken');
    } catch {
      setNameState('unknown'); // backend down — server re-checks on submit
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Tell us your name (min. 2 characters).');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid work email address.');
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setError('Password needs min. 12 characters & symbols — at least 8 with a number for this POC.');
      return;
    }
    if (!agreed) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }
    if (emailState === 'taken') {
      setError('This email is already registered — sign in instead.');
      return;
    }
    if (nameState === 'taken') {
      setError('This username is already taken — try another one.');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name.trim(), email: email.trim(), password }),
      });
      if (r.ok) {
        const data = await r.json();
        persistLocalProfile({ displayName: data.displayName, email: data.email });
        router.push('/');
        return;
      }
      const data = await r.json().catch(() => ({}));
      const msg: string = data.detail || 'Sign-up failed — try again.';
      if (r.status === 409) {
        if (/email/i.test(msg)) setEmailState('taken');
        else setNameState('taken');
      }
      setError(msg);
    } catch (err) {
      if (err instanceof TypeError) {
        // Backend unreachable — fall back to the local POC vault.
        persistLocalProfile({ displayName: name.trim(), email: email.trim() });
        router.push('/');
        return;
      }
      setError('Sign-up failed — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-5xl relative">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary-container/25 via-primary-container/10 to-transparent blur-2xl opacity-60 pointer-events-none" />
        <div className="relative backdrop-blur-2xl bg-surface-container-low/90 border border-primary-container/25 shadow-2xl rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-8 border-r border-white/5 overflow-hidden bg-gradient-to-b from-surface-container-low to-surface-container-lowest">
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="ToolBase Monolith Artwork"
                src="/auth-monolith.png"
                className="w-full h-full object-cover object-center opacity-70 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-container-low/80" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
            </div>
            <div className="relative z-10 mt-auto pt-32">
              <div className="p-5 rounded-xl bg-surface-container-lowest/70 border border-white/10 backdrop-blur-md shadow-xl">
                <p className="text-[11px] tracking-[0.2em] text-primary uppercase mb-1.5">Architectural Synthesis</p>
                <p className={`${luxSerifClass} text-xl text-on-surface font-light leading-snug`}>
                  Sovereign intelligence, <span className={`${goldShimmer} italic`}>crafted to endure.</span>
                </p>
                <div className="flex items-center justify-between mt-3 text-[10px] tracking-widest text-outline uppercase">
                  <span>Isolated cluster</span>
                  <span>Zero-telemetry</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-8">
            <p className="text-[11px] tracking-[0.25em] text-outline uppercase">Private registration</p>
            <h1 className={`${luxSerifClass} text-3xl sm:text-4xl font-light tracking-tight text-on-surface mt-1`}>
              Begin with <span className={`${goldShimmer} italic font-normal`}>ToolBase</span>
            </h1>
            <p className="text-sm text-on-surface-variant mt-1 mb-5">Create your sovereign workspace for curated machine intelligence.</p>

            <form onSubmit={submit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <LuxLabel htmlFor="signup-name">Full name</LuxLabel>
                <LuxInput
                  id="signup-name"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameState('idle');
                  }}
                  onBlur={(e) => checkName(e.target.value)}
                />
                {nameState === 'taken' && (
                  <span className="text-xs text-error">This username is already taken — try another one.</span>
                )}
                {nameState === 'checking' && (
                  <span className="text-xs text-on-surface-variant">Checking username…</span>
                )}
                {nameState === 'free' && (
                  <span className="text-xs text-primary">Username is available ✓</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <LuxLabel htmlFor="signup-email">Work email address</LuxLabel>
                <LuxInput
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="ada@toolbase.sovereign"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailState('idle');
                  }}
                  onBlur={(e) => checkEmail(e.target.value)}
                />
                {emailState === 'taken' && (
                  <span className="text-xs text-error">
                    This email is already registered —{' '}
                    <Link href="/signin" className="text-primary font-medium hover:underline">
                      sign in →
                    </Link>
                  </span>
                )}
                {emailState === 'checking' && (
                  <span className="text-xs text-on-surface-variant">Checking email…</span>
                )}
                {emailState === 'free' && (
                  <span className="text-xs text-primary">Email is available ✓</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <LuxLabel htmlFor="signup-password">Master password</LuxLabel>
                  <span className="text-[11px] text-on-surface-variant">
                    Min. 12 characters & symbols · <span className="text-primary">{strength.label}</span>
                  </span>
                </div>
                <LuxPassword
                  id="signup-password"
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex gap-1 mt-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strength.score ? 'bg-gradient-to-r from-primary-container to-secondary' : 'bg-surface-container-highest'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#e5c378]"
                />
                <span>
                  I agree to the <span className="text-primary hover:underline">Terms of Service</span> and sovereign{' '}
                  <span className="text-primary hover:underline">Privacy Charter</span>.
                </span>
              </label>

              {error && (
                <p className="text-sm text-error bg-error/10 border border-error/30 rounded-xl px-4 py-2.5">{error}</p>
              )}

              <LuxSubmit loading={loading}>
                <span>Commission Workspace</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </LuxSubmit>

              <div className="flex items-center gap-3 text-[11px] tracking-widest text-outline uppercase">
                <span className="flex-1 h-px bg-white/10" />
                <span>or continue with</span>
                <span className="flex-1 h-px bg-white/10" />
              </div>

              <GoogleSignIn label="Google Enterprise SSO" />

              <p className="text-center text-sm text-on-surface-variant">
                Already have an account?{' '}
                <Link href="/signin" className="text-primary font-medium hover:underline">
                  Sign in →
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
