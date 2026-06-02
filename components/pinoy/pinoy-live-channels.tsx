'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Radio, RefreshCw } from 'lucide-react';
import type { PinoyChannel } from '@/lib/pinoy/iptv';

export function PinoyLiveChannels() {
  const [channels, setChannels] = useState<PinoyChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('/api/pinoy/live');
        const data = await response.json();
        if (cancelled) return;
        setChannels(data.channels || []);
        if (data.error) setError(data.error);
      } catch {
        if (!cancelled) setError('Live channels are temporarily unavailable.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadChannels();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Live Pinoy TV</p>
          <h2 className="mt-1 text-xl font-black md:text-2xl">Kapamilya, GMA, TV5 and more</h2>
        </div>
        <span className="text-xs font-bold text-muted">Community M3U, opens externally</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-bg/60 p-4 text-sm font-bold text-muted">
          <RefreshCw size={16} className="animate-spin" />
          Loading live channels
        </div>
      ) : error ? (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm font-semibold text-yellow-100/80">
          {error}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {channels.slice(0, 12).map((channel) => (
            <a
              key={`${channel.name}-${channel.url}`}
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-bg/60 p-3 transition hover:border-accent/40 hover:bg-accent/10"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/8 text-accent">
                <Radio size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{channel.name}</p>
                <p className="truncate text-xs text-muted">{channel.group || 'Philippines'}</p>
              </div>
              <ExternalLink size={14} className="shrink-0 text-muted" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

