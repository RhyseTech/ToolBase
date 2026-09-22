import { cookies } from 'next/headers';

/** Server-component identity for per-user visibility scoping.
 * Forwards the tb_jwt session cookie as Bearer (verified server-side)
 * plus the tb_email login cookie as X-User-Email legacy fallback.
 * Anonymous when logged out. */
export async function toolHeaders(): Promise<Record<string, string>> {
  try {
    const jar = await cookies();
    const headers: Record<string, string> = {};
    const jwt = jar.get('tb_jwt')?.value ?? '';
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
    const email = jar.get('tb_email')?.value ?? '';
    if (email) headers['X-User-Email'] = email;
    return headers;
  } catch {
    return {};
  }
}
