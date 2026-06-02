'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clapperboard, Clock } from 'lucide-react';
import type { YouTubeVideo } from '@/lib/youtube/types';

export function CreatorCatchUpCard() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/creators/unseen?limit=3&longFormOnly=false')
      .then((res) => res.ok ? res.json() : { videos: [] })
      .then((data) => {
        if (!cancelled) setVideos(data.videos ?? []);
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="px-6 md:px-12">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d14] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#9ee493]/20 bg-[#9ee493]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#9ee493]">
              <Clapperboard size={13} />
              Creator Catch-Up
            </div>
            <h2 className="text-xl font-black text-white">Unseen-first creator browsing</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/55">
              Follow creators once. StreamVault shows what you have not watched yet, ranked like a real watch queue.
            </p>
          </div>
          <Link href="/creators" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-slate-200">
            Open Creator Hub
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-3 border-t border-white/8 p-4 md:grid-cols-3">
          {!loaded && [0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
          ))}

          {loaded && videos.length === 0 && (
            <div className="md:col-span-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <p className="text-sm font-bold text-white">No followed-creator gaps yet.</p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">
                Follow Mark Angel, Mkurugenzi, Churchill Show, CAF TV, or any indexed creator. Their unwatched videos become a catch-up queue here.
              </p>
            </div>
          )}

          {videos.map((video) => (
            <Link
              key={video.videoId}
              href={video.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="group flex gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3 transition hover:border-[#9ee493]/25 hover:bg-white/[0.05]"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-white/5">
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[#9ee493]/70">{video.creatorName ?? 'Creator'}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-white">{video.title}</h3>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/40">
                  <Clock size={11} />
                  {video.durationSeconds ? `${Math.round(video.durationSeconds / 60)} min` : 'Unseen'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
