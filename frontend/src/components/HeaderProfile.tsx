'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadSettings, SETTINGS_EVENT } from '@/lib/settings';

const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida/AEtjO1UGdBuQRnkxxRNEGzbUKQsQl6THHD3CVNEYhfu94MHP22YkfoAqZdrxHYKoovqN8sQ69cdJ0eAJF8G59oNeoT1B9nW_7e5X1lGO5d89nlHX62na1E0uI6gfSKJeOsgAcLb_KBx32cN7srob_4qb5UqNRYJes1zhZS_z9DrGkVr7okiCSLtqJXFKIvSQgt-3_noS9v-VxAOGIQG6_zCjWyEdP4tb7YTdKwaGg9N19DgsWXb5MpuXnRdQNg';

/** Header avatar + name that update in real time when settings change. */
export function HeaderProfile() {
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const sync = () => {
      const s = loadSettings();
      setAvatar(s.avatar || '');
      setName(s.displayName || '');
    };
    sync();
    window.addEventListener(SETTINGS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <Link href="/settings" className="flex items-center gap-2 cursor-pointer" title={name || 'Settings'}>
      {name ? (
        <span className="hidden xl:block max-w-[120px] truncate font-label-lg text-label-lg text-on-surface">
          {name}
        </span>
      ) : null}
      <span className="relative p-0.5 rounded-full bg-gradient-to-tr from-secondary to-primary-container shadow-[0_0_12px_rgba(229,195,120,0.3)]">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Profile" className="w-8 h-8 rounded-full object-cover" src={avatar} />
        ) : (
          <img alt="Profile" className="w-8 h-8 rounded-full object-cover" src={FALLBACK_AVATAR} />
        )}
      </span>
    </Link>
  );
}
