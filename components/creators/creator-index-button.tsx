'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function CreatorIndexButton({ channelId, autoStart = false }: { channelId: string; autoStart?: boolean }) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const indexVideos = useCallback(async (mode: 'manual' | 'auto' = 'manual') => {
    if (pending) return;
    setPending(true);
    setStatus(mode === 'auto' ? 'Building this creator catalogue...' : 'Indexing official uploads...');
    try {
      const res = await fetch(`/api/creators/${channelId}/index?limit=${mode === 'auto' ? 36 : 48}`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof body.error === 'string' ? body.error : 'Indexing failed.');
        return;
      }
      setStatus(`Indexed ${body.indexed ?? 0} videos. Refreshing...`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setStatus('Indexing failed. Check the YouTube API key and quota.');
    } finally {
      setPending(false);
    }
  }, [channelId, pending]);

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    indexVideos('auto');
  }, [autoStart, indexVideos]);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => indexVideos('manual')}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/65 transition hover:bg-white/10 hover:text-white',
          pending && 'cursor-wait opacity-70'
        )}
      >
        <RefreshCw size={13} className={pending ? 'animate-spin' : ''} />
        {pending ? 'Indexing' : 'Index videos'}
      </button>
      {status && <p className="max-w-xs text-[11px] font-medium leading-relaxed text-white/45">{status}</p>}
    </div>
  );
}
