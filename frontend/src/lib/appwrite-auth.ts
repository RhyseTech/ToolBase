'use client';

/**
 * Shared finishers for Appwrite login flows (email, signup, OAuth).
 * Verifies the session, mints the JWT cookie/cache, syncs the backend
 * profile row (keeps Settings/admin flags working), then mirrors identity
 * into local settings like the legacy flows do.
 */

import { getAccount, mintJwt } from './appwrite-client';
import { persistLocalProfile } from '@/components/AuthLux';
import { apiUrl } from './providers';

export function looksOffline(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return e instanceof TypeError || /fetch|network|load failed|failed to fetch/i.test(msg);
}

export async function finishAppwriteSession(): Promise<{ ok: boolean; error?: string }> {
  const account = getAccount();
  if (!account) return { ok: false, error: 'Appwrite is not configured.' };
  try {
    const me = await account.get();
    const jwt = await mintJwt();
    let displayName = me.name || '';
    let email = me.email || '';
    let avatar = '';
    if (jwt) {
      try {
        const r = await fetch(apiUrl('/api/auth/appwrite-login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jwt }),
        });
        if (r.ok) {
          const d = await r.json();
          displayName = d.displayName || displayName;
          email = d.email || email;
          avatar = d.avatar || avatar;
        }
      } catch {
        /* backend offline — continue with Appwrite profile only */
      }
    }
    persistLocalProfile({
      displayName: displayName || email.split('@')[0] || 'Curator',
      email,
      avatar,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Appwrite session not found — try again.' };
  }
}

export async function signOutAppwrite() {
  try {
    await getAccount()?.deleteSession('current');
  } catch {
    /* already logged out */
  }
  const { clearJwt } = await import('./appwrite-client');
  clearJwt();
}
