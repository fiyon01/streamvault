'use client';

import { useEffect, useState } from 'react';
import { Check, Clock, ExternalLink, EyeOff, Play, X } from 'lucide-react';
import type { YouTubeVideo } from '@/lib/youtube/types';

function formatDuration(seconds?: number) {
  if (!seconds) return 'Unknown length';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function CreatorVideoCard({ video }: { video: YouTubeVideo }) {
  const [tracked, setTracked] = useState(false);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const trackWatch = async (completed = false) => {
    setPending(true);
    try {
      const res = await fetch(`/api/creators/videos/${video.videoId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: video.channelId,
          watchDurationSeconds: completed ? video.durationSeconds ?? 0 : 90,
          completed,
        }),
      });
      if (res.ok) setTracked(true);
    } finally {
      setPending(false);
    }
  };

  const openPlayer = () => {
    setOpen(true);
    trackWatch(false);
  };

  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <>
      <article
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d14] transition hover:border-[#9ee493]/30 hover:bg-[#10141d]"
      >
        <button
          type="button"
          onClick={openPlayer}
          className="block text-left"
        >
          <div className="relative aspect-video overflow-hidden bg-white/5">
            {video.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            ) : (
              <div className="grid h-full w-full place-items-center text-white/30">
                <EyeOff size={24} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/15 text-white shadow-2xl backdrop-blur-md transition group-hover:scale-110 group-hover:bg-[#9ee493] group-hover:text-black">
                <Play size={22} className="ml-0.5 fill-current" />
              </span>
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white/80">
              <Clock size={11} />
              {formatDuration(video.durationSeconds)}
            </div>
          </div>

          <div className="p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="line-clamp-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9ee493]/75">
                {video.creatorName ?? video.category ?? 'Creator video'}
              </p>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black text-white/45 transition group-hover:border-[#9ee493]/25 group-hover:text-[#9ee493]">
                Play here
              </span>
            </div>
            <h3 className="line-clamp-3 min-h-[3.2rem] text-base font-black leading-tight text-white">{video.title}</h3>
            <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-white/45">
              {video.description || 'Indexed as creator content. StreamVault can sort this by unseen status, duration, and curation score.'}
            </p>
          </div>
        </button>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/8 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
            {tracked ? 'Saved to history' : 'Unseen queue'}
          </span>
          <button
            type="button"
            onClick={() => trackWatch(true)}
            disabled={pending || tracked}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] font-black text-white/65 transition hover:border-[#9ee493]/30 hover:text-[#9ee493] disabled:opacity-60"
          >
            <Check size={12} />
            {tracked ? 'Marked' : 'I watched this'}
          </button>
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/92 p-3 backdrop-blur-xl md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(158,228,147,0.16),transparent_42%)]" />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-2xl border border-white/12 bg-[#06080d] shadow-[0_40px_140px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9ee493]">{video.creatorName ?? 'Creator playback'}</p>
                <h2 className="truncate text-sm font-black text-white md:text-base">{video.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close creator player"
              >
                <X size={18} />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe
                src={embedUrl}
                title={video.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
              <p className="text-xs leading-relaxed text-white/45">
                StreamVault records this as creator history so this channel can become unseen-first next time.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => trackWatch(true)}
                  disabled={pending || tracked}
                  className="inline-flex items-center gap-2 rounded-full bg-[#9ee493] px-4 py-2 text-xs font-black text-black transition hover:bg-[#b9f5ae] disabled:opacity-70"
                >
                  <Check size={14} />
                  {tracked ? 'In history' : 'Mark watched'}
                </button>
                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-xs font-black text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink size={14} />
                  YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
