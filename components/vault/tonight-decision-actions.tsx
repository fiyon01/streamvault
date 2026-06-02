'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, MessageCircle, Play, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { trackRecommendationEvent } from '@/lib/recommendations/events';

type TonightDecisionActionsProps = {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  watchHref: string;
};

type FeedbackKind = 'perfect' | 'wrong_mood' | 'already_seen';

const FEEDBACK_COPY: Record<FeedbackKind, string> = {
  perfect: 'Locked. VAULT will trust this lane harder next time.',
  wrong_mood: 'Good correction. VAULT will keep the title viable but move the mood.',
  already_seen: 'Marked. VAULT will stop treating this as an unseen decision.',
};

export function TonightDecisionActions({ tmdbId, mediaType, title, watchHref }: TonightDecisionActionsProps) {
  const [active, setActive] = useState<FeedbackKind | null>(null);
  const [pending, setPending] = useState<FeedbackKind | null>(null);

  useEffect(() => {
    trackRecommendationEvent({
      tmdbId,
      mediaType,
      eventType: 'impression',
      source: 'tonight_decision',
      rowType: 'decision',
      rowLabel: "Tonight's Pick",
      metadata: { title },
    });
  }, [mediaType, title, tmdbId]);

  async function sendFeedback(feedback: FeedbackKind) {
    setPending(feedback);
    setActive(feedback);

    try {
      await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          mediaType,
          title,
          feedback,
          source: 'tonight_decision',
        }),
      });
    } catch {
      const raw = window.localStorage.getItem('streamvault-tonight-feedback');
      const history = raw ? (JSON.parse(raw) as unknown[]) : [];
      history.unshift({ tmdbId, mediaType, title, feedback, createdAt: new Date().toISOString() });
      window.localStorage.setItem('streamvault-tonight-feedback', JSON.stringify(history.slice(0, 50)));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap gap-2.5">
        <Link
          href={watchHref}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-black shadow-xl shadow-black/30 transition hover:bg-slate-200"
        >
          <Play size={16} className="fill-black" />
          Watch now
        </Link>
        <Link
          href={`${watchHref}?tool=watch_party`}
          className="inline-flex items-center gap-2 rounded-full border border-[#9ee493]/35 bg-[#9ee493]/12 px-5 py-3 text-sm font-black text-[#d8ffd4] transition hover:bg-[#9ee493]/20"
        >
          <MessageCircle size={16} />
          Open Watch Party
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => sendFeedback('perfect')}
          disabled={pending !== null}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition',
            active === 'perfect'
              ? 'border-green-300/45 bg-green-300/15 text-green-100'
              : 'border-white/10 bg-white/[0.04] text-white/58 hover:bg-white/10 hover:text-white'
          )}
        >
          <CheckCircle2 size={14} />
          This is it
        </button>
        <button
          onClick={() => sendFeedback('wrong_mood')}
          disabled={pending !== null}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition',
            active === 'wrong_mood'
              ? 'border-amber-300/45 bg-amber-300/15 text-amber-100'
              : 'border-white/10 bg-white/[0.04] text-white/58 hover:bg-white/10 hover:text-white'
          )}
        >
          <Shuffle size={14} />
          Wrong mood
        </button>
        <button
          onClick={() => sendFeedback('already_seen')}
          disabled={pending !== null}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition',
            active === 'already_seen'
              ? 'border-sky-300/45 bg-sky-300/15 text-sky-100'
              : 'border-white/10 bg-white/[0.04] text-white/58 hover:bg-white/10 hover:text-white'
          )}
        >
          <Eye size={14} />
          Already seen
        </button>
      </div>

      {active && (
        <p className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs font-semibold text-white/55">
          {FEEDBACK_COPY[active]}
        </p>
      )}
    </div>
  );
}
