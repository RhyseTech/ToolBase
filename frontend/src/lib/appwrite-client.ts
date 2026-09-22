'use client';

/**
 * Appwrite session client (browser).
 * Used when NEXT_PUBLIC_APPWRITE_* is configured; every flow keeps the
 * legacy backend-auth path as a fallback so nothing breaks mid-migration.
 *
 * Identity plumbing:
 *  - Appwrite session lives in the SDK (localStorage) after login/OAuth.
 *  - A short-lived JWT is minted via account.createJWT(), cached in
 *    localStorage (tb_jwt_cache) and mirrored to the readable tb_jwt
 *    cookie so server components can forward it (see lib/server-auth.ts).
 *  - authHeaders() (lib/providers.ts) attaches it as Bearer; the backend
 *    verifies it first and falls back to X-User-Email when absent/stale.
 */

import { Account, Client, ID } from 'appwrite';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';

export const JWT_COOKIE = 'tb_jwt';
const JWT_CACHE_KEY = 'tb_jwt_cache';

export function appwriteConfigured(): boolean {
  return Boolean(ENDPOINT && PROJECT);
}

let client: Client | null = null;
let account: Account | null = null;

export function getAccount(): Account | null {
  if (!appwriteConfigured() || typeof window === 'undefined') return null;
  if (!client) {
    client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT);
    account = new Account(client);
  }
  return account;
}

type JwtCache = { token: string; exp: number };

function readCache(): JwtCache | null {
  try {
    const raw = window.localStorage.getItem(JWT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JwtCache;
    if (!parsed.token || !parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Synchronous valid JWT (60s safety margin) or '' — never network-calls. */
export function getCachedJwt(): string {
  try {
    const c = readCache();
    if (c && c.exp - Date.now() > 60_000) return c.token;
  } catch {}
  return '';
}

export function storeJwt(token: string, expMs: number) {
  try {
    window.localStorage.setItem(JWT_CACHE_KEY, JSON.stringify({ token, exp: expMs }));
    document.cookie = `${JWT_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=900; samesite=lax`;
  } catch {}
}

export function clearJwt() {
  try {
    window.localStorage.removeItem(JWT_CACHE_KEY);
    document.cookie = `${JWT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } catch {}
}

/** Mint a fresh JWT from the active session and cache it. Null when logged out. */
export async function mintJwt(): Promise<string> {
  const account = getAccount();
  if (!account) return '';
  try {
    await account.get(); // throws when no session
    const res = await account.createJWT();
    // server does not disclose expiry — cache for 14 of the 15 minutes
    storeJwt(res.jwt, Date.now() + 14 * 60_000);
    return res.jwt;
  } catch {
    return '';
  }
}

export { ID };
