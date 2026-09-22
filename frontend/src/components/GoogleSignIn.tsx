'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { persistLocalProfile } from '@/components/AuthLux';
import { loadSettings } from '@/lib/settings';
import { OAuthProvider } from 'appwrite';
import { appwriteConfigured, getAccount } from '@/lib/appwrite-client';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (opts: {
            client_id: string;
            scope: string;
            callback: (res: { access_token: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function GoogleGLogo() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Custom full-width dark Google button — logo only, no white background.
 * Opens the Google account chooser via OAuth2 token client. */
export function GoogleSignIn({ label = 'Continue with Google' }: { label?: string }) {
  const router = useRouter();
  const tokenClientRef = useRef<{ requestAccessToken: (opts?: { prompt?: string }) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAccessToken = useCallback(
    async (accessToken: string) => {
      setError('');
      setBusy(true);
      try {
        const r = await fetch(`${BACKEND}/api/auth/google-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        });
        if (!r.ok) {
          // Fallback: backend down — fetch profile directly. Preserve local
          // edits (same account) instead of wiping them with Google values.
          const u = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!u.ok) throw new Error('Google verification failed');
          const p = await u.json();
          if (!p.email) throw new Error('Google verification failed');
          const current = loadSettings();
          const sameAccount =
            !!current.email && current.email.trim().toLowerCase() === String(p.email).trim().toLowerCase();
          const googleName = p.name || String(p.email).split('@')[0];
          persistLocalProfile({
            displayName: sameAccount && current.displayName ? current.displayName : googleName,
            email: p.email,
            avatar: sameAccount && current.avatar ? current.avatar : p.picture || '',
          });
        } else {
          const data = await r.json();
          persistLocalProfile({ displayName: data.displayName, email: data.email, avatar: data.avatar });
        }
        router.push('/');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Google sign-in failed — try again.');
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google?.accounts?.oauth2) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'openid email profile',
        callback: (res) => {
          if (res.error || !res.access_token) {
            setError('Google sign-in was cancelled or failed — try again.');
            return;
          }
          handleAccessToken(res.access_token);
        },
      });
      setReady(true);
    };

    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      if (window.google?.accounts?.oauth2) init();
      else existing.addEventListener('load', init, { once: true });
    } else {
      const s = document.createElement('script');
      s.id = 'google-gsi-client';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
    };
  }, [handleAccessToken]);

  if (!CLIENT_ID) {
    return (
      <div className="w-full flex flex-col gap-2 p-3 rounded-xl border border-dashed border-white/15 bg-surface-container-high/30 text-center">
        <span className="text-xs text-on-surface-variant">
          {label} is disabled — set <code className="text-primary">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in{' '}
          <code className="text-primary">frontend/.env.local</code> and <code className="text-primary">GOOGLE_CLIENT_ID</code>{' '}
          in <code className="text-primary">backend/.env</code>, then restart both servers.
        </span>
      </div>
    );
  }

  const click = () => {
    setError('');
    // Prefer Appwrite OAuth2 (real session + JWT) when configured.
    if (appwriteConfigured()) {
      try {
        const origin = window.location.origin;
        getAccount()?.createOAuth2Session(
          OAuthProvider.Google,
          `${origin}/oauth/callback`,
          `${origin}/signin?error=google`
        );
        return;
      } catch {
        // fall through to legacy GIS flow
      }
    }
    if (!tokenClientRef.current) {
      setError('Google is still loading — try again in a second.');
      return;
    }
    // prompt='' forces the account chooser every time
    tokenClientRef.current.requestAccessToken({ prompt: '' });
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <button
        type="button"
        onClick={click}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-white/10 bg-surface-container-high/40 text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high/70 hover:text-primary transition-all disabled:opacity-60 disabled:cursor-wait"
      >
        {busy ? (
          <>
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <GoogleGLogo />
            <span>{ready ? label : 'Loading Google…'}</span>
          </>
        )}
      </button>
      {error && <p className="text-sm text-error bg-error/10 border border-error/30 rounded-xl px-4 py-2.5">{error}</p>}
    </div>
  );
}
