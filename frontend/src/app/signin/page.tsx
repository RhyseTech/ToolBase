'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AuthShell,
  LuxCard,
  LuxInput,
  LuxLabel,
  LuxPassword,
  LuxSubmit,
  MonolithPanel,
  goldShimmer,
  luxSerifClass,
  persistLocalProfile,
} from '@/components/AuthLux';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { OtpAuth } from '@/components/OtpAuth';
import { appwriteConfigured, getAccount } from '@/lib/appwrite-client';
import { finishAppwriteSession, looksOffline } from '@/lib/appwrite-auth';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<'email' | 'phone'>('email');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    try {
      // Prefer Appwrite sessions when configured. If Appwrite rejects the
      // login (unknown account there — e.g. local-only accounts like the
      // seeded admin), fall through to legacy backend auth instead of
      // erroring out. Only true network failures skip Appwrite silently.
      if (appwriteConfigured()) {
        try {
          await getAccount()?.createEmailPasswordSession(email.trim(), password);
          const done = await finishAppwriteSession();
          if (done.ok) {
            router.push('/');
            return;
          }
          // Session established but profile sync failed — still try backend
          // before giving up, so local-only accounts keep working.
        } catch (e: unknown) {
          if (looksOffline(e)) {
            // offline → fall through to legacy backend flow below
          }
          // invalid credentials on Appwrite → try backend next (no return!)
        }
      }
      const r = await fetch(`${BACKEND}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (r.ok) {
        const data = await r.json();
        persistLocalProfile({ displayName: data.displayName, email: data.email, avatar: data.avatar });
        router.push('/');
        return;
      }
      const data = await r.json().catch(() => ({}));
      setError(data.detail || 'Incorrect email or password.');
    } catch (err) {
      if (err instanceof TypeError) {
        // Backend unreachable — refuse to log in with unverified credentials
        // (previously ANY credentials were accepted offline).
        setError('Cannot reach the server — check that the backend is running, then try again.');
        return;
      }
      setError('Sign-in failed — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <MonolithPanel
          heading={<>Architectural <span className={`${goldShimmer} italic font-normal`}>Intelligence</span></>}
          body="Curated creative intelligence inside an ultra-private cryptographic sanctuary."
        />

        <LuxCard wide>
          <div className="mb-5">
            <h1 className={`${luxSerifClass} text-3xl sm:text-4xl font-light tracking-tight text-on-surface`}>
              Welcome to <span className={`${goldShimmer} italic font-normal`}>ToolBase</span>
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-1">Sign in to access your AI workspace.</p>
          </div>

          <div className="flex flex-col gap-4">
          {/* Channel tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-container-lowest/70 border border-white/10">
            {(
              [
                { id: 'email', label: 'Gmail', icon: 'mail' },
                { id: 'phone', label: 'Phone', icon: 'smartphone' },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setChannel(c.id);
                  setError('');
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg font-label-lg text-label-lg transition-all ${
                  channel === c.id
                    ? 'bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(229,195,120,0.3)]'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {channel === 'phone' && appwriteConfigured() ? (
            <OtpAuth channel="phone" />
          ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <LuxLabel htmlFor="signin-email">Email address</LuxLabel>
              <LuxInput
                id="signin-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <LuxLabel htmlFor="signin-password">Password</LuxLabel>
                <span className="text-xs text-primary/90 hover:text-primary transition-colors cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <LuxPassword
                id="signin-password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-error bg-error/10 border border-error/30 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <LuxSubmit loading={loading}>
              <span>Sign in to ToolBase</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </LuxSubmit>
          </form>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[11px] tracking-widest text-outline uppercase">
              <span className="flex-1 h-px bg-white/10" />
              <span>or</span>
              <span className="flex-1 h-px bg-white/10" />
            </div>

            <GoogleSignIn label="Continue with Google" />

            <p className="text-center text-sm text-on-surface-variant">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up →
              </Link>
            </p>
            <p className="text-center text-[11px] text-outline">POC local vault — credentials stay in this browser.</p>
          </div>
          </div>
        </LuxCard>
      </div>
    </AuthShell>
  );
}
