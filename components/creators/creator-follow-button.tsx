'use client';

import { useState } from 'react';
import { Bell, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function CreatorFollowButton({
  channelId,
  initialFollowing = false,
}: {
  channelId: string;
  initialFollowing?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    const next = !following;
    setFollowing(next);

    try {
      const res = await fetch(`/api/creators/${channelId}/follow`, {
        method: next ? 'POST' : 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Could not update follow.');
        setFollowing(!next);
      }
    } catch {
      setError('Could not update follow.');
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition',
          following
            ? 'border border-[#9ee493]/25 bg-[#9ee493]/10 text-[#9ee493] hover:bg-[#9ee493]/15'
            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
          pending && 'opacity-60',
        )}
      >
        {following ? <Check size={13} /> : <Plus size={13} />}
        {following ? 'Following' : 'Follow'}
        {following && <Bell size={12} className="text-white/35" />}
      </button>
      {error && <span className="max-w-44 text-right text-[10px] font-bold text-red-300/80">{error}</span>}
    </div>
  );
}
