'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { finishAppwriteSession } from '@/lib/appwrite-auth';

/** Landing page for Appwrite OAuth2 (Google) redirects. */
export default function OAuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await finishAppwriteSession();
      if (res.ok) router.push('/');
      else setError(res.error || 'Sign-in failed.');
    })();
  }, [router]);

  return (
    <main className="w-full min-h-screen bg-background flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {error ? (
          <>
            <span className="material-symbols-outlined text-4xl text-error">error</span>
            <p className="font-body-md text-body-md text-on-surface">{error}</p>
            <a href="/signin" className="font-label-lg text-label-lg text-primary hover:underline">
              Back to sign in →
            </a>
          </>
        ) : (
          <>
            <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-body-md text-body-md text-on-surface-variant">Finishing sign-in…</p>
          </>
        )}
      </div>
    </main>
  );
}
