'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Brain,
  Clock3,
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type MoodId =
  | 'edge'
  | 'comfort'
  | 'laugh'
  | 'mind'
  | 'cry'
  | 'couple'
  | 'family'
  | 'binge'
  | 'late';

type TimeId = 'one_movie' | 'two_hours' | 'few_episodes' | 'weekend' | 'long_journey';
type TrustId = 'completed' | 'strong_quality' | 'low_filler' | 'hidden_gem';
type AudienceId = 'solo' | 'partner' | 'family';

const MOODS: Array<{ id: MoodId; label: string; line: string; genres: string[] }> = [
  { id: 'edge', label: 'Edge of seat', line: 'Tension, crime, pressure.', genres: ['Thriller', 'Crime', 'Mystery'] },
  { id: 'comfort', label: 'Comfort watch', line: 'Low friction, warm energy.', genres: ['Comedy', 'Drama'] },
  { id: 'laugh', label: 'Make me laugh', line: 'Comedy first, no homework.', genres: ['Comedy'] },
  { id: 'mind', label: 'Mind-blowing', line: 'Mystery, sci-fi, puzzle box.', genres: ['Sci-Fi', 'Mystery', 'Thriller'] },
  { id: 'cry', label: 'Good cry', line: 'Emotional but worth it.', genres: ['Drama', 'Romance'] },
  { id: 'couple', label: 'Couple night', line: 'Overlap: heart plus plot.', genres: ['Romance', 'Drama', 'Comedy'] },
  { id: 'family', label: 'Family night', line: 'Safe, broad, easy to join.', genres: ['Family', 'Adventure', 'Comedy'] },
  { id: 'binge', label: 'Weekend binge', line: 'A show you can finish.', genres: ['Drama', 'Crime', 'Thriller'] },
  { id: 'late', label: 'Late-night', line: 'Hook fast, not too heavy.', genres: ['Thriller', 'Mystery', 'Comedy'] },
];

const TIME_WINDOWS: Array<{ id: TimeId; label: string; line: string }> = [
  { id: 'one_movie', label: 'One sitting', line: 'A complete watch tonight.' },
  { id: 'two_hours', label: 'Under 2 hours', line: 'No time debt.' },
  { id: 'few_episodes', label: 'Few episodes', line: 'Sample a show safely.' },
  { id: 'weekend', label: 'Finish weekend', line: 'Whole series under control.' },
  { id: 'long_journey', label: 'Long journey', line: 'Give me a world to live in.' },
];

const TRUST_FILTERS: Array<{ id: TrustId; label: string; line: string }> = [
  { id: 'completed', label: 'Completed', line: 'No cancellation risk.' },
  { id: 'strong_quality', label: 'No bad seasons', line: 'Quality floor stays high.' },
  { id: 'low_filler', label: 'Low filler', line: 'Less wasted time.' },
  { id: 'hidden_gem', label: 'Hidden gems', line: 'Underseen quality.' },
];

const AUDIENCES: Array<{ id: AudienceId; label: string; icon: typeof Users }> = [
  { id: 'solo', label: 'Solo', icon: Brain },
  { id: 'partner', label: 'With someone', icon: Heart },
  { id: 'family', label: 'Family', icon: Users },
];

function toggleItem<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

function buildTonightUrl(mood: MoodId, time: TimeId, trusts: TrustId[], audience: AudienceId) {
  const params = new URLSearchParams({ tonightMode: 'true' });
  const selectedMood = MOODS.find((item) => item.id === mood) ?? MOODS[0];
  const genres = new Set(selectedMood.genres);

  if (audience === 'partner') {
    genres.add('Drama');
    genres.add('Romance');
  }

  if (audience === 'family') {
    genres.add('Family');
    params.set('maturityRating', 'TV-PG');
  }

  if (mood === 'binge' || time === 'weekend' || time === 'long_journey' || time === 'few_episodes') {
    params.set('contentType', 'tv');
  } else {
    params.set('contentType', 'both');
  }

  params.set('selectedGenres', Array.from(genres).slice(0, 5).join(','));
  params.set('minImdbRating', mood === 'comfort' || mood === 'laugh' ? '6.5' : '7');
  params.set('minVoteCount', '300');

  if (time === 'one_movie') {
    params.set('contentType', 'movie');
    params.set('maxMovieRuntime', '150');
  }
  if (time === 'two_hours') {
    params.set('maxMovieRuntime', '120');
    params.set('maxEpisodeRuntime', '45');
  }
  if (time === 'few_episodes') {
    params.set('contentType', 'tv');
    params.set('maxEpisodeRuntime', '45');
    params.set('maxCommitmentHours', '20');
  }
  if (time === 'weekend') {
    params.set('contentType', 'tv');
    params.set('maxCommitmentHours', '15');
    params.set('tvStatus', 'ended');
  }
  if (time === 'long_journey') {
    params.set('contentType', 'tv');
    params.set('minCommitmentHours', '80');
    params.set('minSeasons', '3');
  }

  if (trusts.includes('completed')) params.set('tvStatus', 'ended');
  if (trusts.includes('strong_quality')) {
    params.set('noSeasonBelow', '7');
    params.set('qualityTrajectory', 'stable');
  }
  if (trusts.includes('low_filler')) params.set('maxFillerPercentage', '10');
  if (trusts.includes('hidden_gem')) {
    params.set('hiddenGemMode', 'true');
    params.set('minImdbRating', '7.5');
    params.set('minVoteCount', '100');
  }

  params.set('sortBy', trusts.length > 0 ? 'rating' : 'popularity');
  return `/discover?${params.toString()}`;
}

export function TonightModePanel() {
  const [mood, setMood] = useState<MoodId>('edge');
  const [time, setTime] = useState<TimeId>('two_hours');
  const [trusts, setTrusts] = useState<TrustId[]>(['completed']);
  const [audience, setAudience] = useState<AudienceId>('solo');

  const url = useMemo(() => buildTonightUrl(mood, time, trusts, audience), [audience, mood, time, trusts]);
  const selectedMood = MOODS.find((item) => item.id === mood) ?? MOODS[0];
  const selectedTime = TIME_WINDOWS.find((item) => item.id === time) ?? TIME_WINDOWS[0];

  return (
    <section className="px-4 pt-6 sm:px-6 md:px-8 lg:px-12">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#080b10_0%,#0d1018_55%,#06070b_100%)] shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#d9ffd6]">
                <Zap size={13} />
                Tonight Mode
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                Decision fatigue killer
              </span>
            </div>

            <div className="mt-5 max-w-3xl">
              <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">
                Tell StreamVault the night, not the category.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 md:text-base">
                Pick mood, time, and risk tolerance. StreamVault turns it into commitment and
                no-regrets filters so you get fewer posters and better decisions.
              </p>
            </div>

            <div className="mt-7 grid gap-6 xl:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Mood</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {MOODS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMood(item.id)}
                      className={cn(
                        'rounded-2xl border p-3 text-left transition',
                        mood === item.id
                          ? 'border-[#9ee493]/55 bg-[#9ee493]/12 text-white'
                          : 'border-white/10 bg-white/[0.035] text-white/50 hover:border-white/20 hover:text-white',
                      )}
                    >
                      <span className="text-sm font-black">{item.label}</span>
                      <span className="mt-1 block text-xs leading-4 text-white/38">{item.line}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Commitment</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TIME_WINDOWS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setTime(item.id)}
                        className={cn(
                          'rounded-2xl border p-3 text-left transition',
                          time === item.id
                            ? 'border-sky-300/50 bg-sky-300/10 text-white'
                            : 'border-white/10 bg-white/[0.035] text-white/50 hover:border-white/20 hover:text-white',
                        )}
                      >
                        <span className="text-sm font-black">{item.label}</span>
                        <span className="mt-1 block text-xs leading-4 text-white/38">{item.line}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">No-regrets filters</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TRUST_FILTERS.map((item) => {
                      const active = trusts.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setTrusts((current) => toggleItem(current, item.id))}
                          className={cn(
                            'rounded-2xl border p-3 text-left transition',
                            active
                              ? 'border-amber-300/50 bg-amber-300/10 text-white'
                              : 'border-white/10 bg-white/[0.035] text-white/50 hover:border-white/20 hover:text-white',
                          )}
                        >
                          <span className="text-sm font-black">{item.label}</span>
                          <span className="mt-1 block text-xs leading-4 text-white/38">{item.line}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="border-t border-white/10 bg-black/24 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Who is watching?</p>
            <div className="mt-3 grid gap-2">
              {AUDIENCES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setAudience(id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition',
                    audience === id
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#9ee493]">
                <ShieldCheck size={14} />
                Tonight recipe
              </div>
              <h3 className="mt-3 text-2xl font-black leading-tight text-white">{selectedMood.label}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{selectedTime.line}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...selectedMood.genres, ...trusts.map((item) => TRUST_FILTERS.find((filter) => filter.id === item)?.label || item)]
                  .slice(0, 7)
                  .map((label) => (
                    <span key={label} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-bold text-white/50">
                      {label}
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={url}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-slate-200"
              >
                <Sparkles size={17} />
                Find tonight's watch
              </Link>
              <Link
                href={`/discover?tonightMode=true&contentType=tv&maxCommitmentHours=15&tvStatus=ended&noSeasonBelow=7&qualityTrajectory=stable&sortBy=rating`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white/62 transition hover:bg-white/10 hover:text-white"
              >
                <Clock3 size={17} />
                Weekend binge preset
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
