import { cookies } from 'next/headers';

/** Server-component identity for per-user visibility scoping.
 * Forwards the tb_email login cookie as X-User-Email. Anonymous when logged out. */
export async function toolHeaders(): Promise<Record<string, string>> {
  try {
    const email = (await cookies()).get('tb_email')?.value ?? '';
    return email ? { 'X-User-Email': email } : {};
  } catch {
    return {};
  }
}
