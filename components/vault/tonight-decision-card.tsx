import { Brain, Clock3, Compass, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { TonightDecisionActions } from '@/components/vault/tonight-decision-actions';

type CalibrationRow = {
  loved_titles?: string[] | null;
  overrated_titles?: string[] | null;
  abandoned_title?: string | null;
  standards_summary?: string | null;
};

type HistoryRow = {
  content_id: string;
  completed: boolean | null;
  position_seconds: number | null;
  content?: {
    title?: string | null;
    type?: string | null;
  } | null;
};

type SignalRow = {
  tmdb_id: string | null;
  signal_type: string | null;
  signal_weight: number | null;
};

type Candidate = {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  subtitle: string;
  runtimeLabel: string;
  watchHref: string;
  badge: string;
  posterTone: string;
  reasons: string[];
  bridgeTerms: string[];
};

const CANDIDATES: Candidate[] = [
  {
    tmdbId: '70593',
    mediaType: 'tv',
    title: 'Kingdom',
    subtitle: 'Korean court politics with horror pressure, built for people who like history with teeth.',
    runtimeLabel: '45-55 min episodes',
    watchHref: '/watch/show/70593',
    badge: 'Sharp pivot from The Last Kingdom',
    posterTone: 'from-emerald-300/28 via-cyan-500/12 to-black',
    bridgeTerms: ['last kingdom', 'vikings', 'game of thrones', 'historical', 'kingdom', 'shogun'],
    reasons: [
      'It keeps the political pressure of historical drama but adds a cleaner survival hook.',
      'It is easier to sample than a huge anime commitment and still feels serious.',
      'If you bounce, VAULT learns you wanted realism, not mythology.',
    ],
  },
  {
    tmdbId: '94605',
    mediaType: 'tv',
    title: 'Arcane',
    subtitle: 'Animation for live-action people: prestige tragedy, class conflict, and no homework required.',
    runtimeLabel: '39-44 min episodes',
    watchHref: '/watch/show/94605',
    badge: 'Best anime-adjacent gateway',
    posterTone: 'from-fuchsia-400/24 via-sky-500/14 to-black',
    bridgeTerms: ['anime', 'animation', 'cartoon', 'prestige', 'breaking bad', 'the boys'],
    reasons: [
      'This is the safest proof that animation can carry adult dramatic weight.',
      'It has immediate craft: production design, character stakes, and clean episode hooks.',
      'VAULT can use your reaction to decide whether to go deeper into anime proper.',
    ],
  },
  {
    tmdbId: '70523',
    mediaType: 'tv',
    title: 'Dark',
    subtitle: 'A demanding mystery that rewards attention instead of wasting it.',
    runtimeLabel: '50-60 min episodes',
    watchHref: '/watch/show/70523',
    badge: 'For puzzle patience',
    posterTone: 'from-blue-300/20 via-violet-500/12 to-black',
    bridgeTerms: ['mindhunter', 'severance', 'true detective', 'mystery', 'puzzle', 'dark'],
    reasons: [
      'It is not casual background TV; it earns a focused night.',
      'The hook is strong enough to test whether you want complexity or just tension.',
      'It gives VAULT a clean signal about patience and payoff tolerance.',
    ],
  },
  {
    tmdbId: '598',
    mediaType: 'movie',
    title: 'City of God',
    subtitle: 'A complete, electric film when you want impact without starting another series.',
    runtimeLabel: '130 min',
    watchHref: '/watch/movie/598',
    badge: 'One-night canon',
    posterTone: 'from-amber-300/25 via-red-500/10 to-black',
    bridgeTerms: ['crime', 'prestige', 'wire', 'narcos', 'international', 'movie'],
    reasons: [
      'It respects your night: one sitting, no season math, no commitment debt.',
      'It is international without feeling like homework.',
      'A strong reaction here helps VAULT route you into hidden-gem global crime.',
    ],
  },
];

function textIncludes(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term));
}

function selectCandidate(params: {
  calibration: CalibrationRow | null;
  history: HistoryRow[];
  signals: SignalRow[];
}) {
  const watched = new Set(params.history.map((row) => row.content_id));
  const rejected = new Set(
    params.signals
      .filter((row) => Number(row.signal_weight ?? 0) < 0)
      .map((row) => String(row.tmdb_id ?? ''))
      .filter(Boolean)
  );

  const lovedText = [
    ...(params.calibration?.loved_titles ?? []),
    params.calibration?.abandoned_title ?? '',
    ...params.history.map((row) => row.content?.title ?? ''),
  ].join(' ').toLowerCase();

  const scored = CANDIDATES
    .filter((candidate) => !watched.has(candidate.tmdbId) && !rejected.has(candidate.tmdbId))
    .map((candidate) => ({
      candidate,
      score: textIncludes(lovedText, candidate.bridgeTerms) ? 10 : 0,
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.candidate ?? CANDIDATES[0];
}

function confidenceLabel(calibration: CalibrationRow | null, historyCount: number) {
  if (calibration && historyCount >= 3) return 'High confidence';
  if (calibration) return 'Calibrated starter';
  return 'Cold-start decision';
}

export async function TonightDecisionCard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let calibration: CalibrationRow | null = null;
  let history: HistoryRow[] = [];
  let signals: SignalRow[] = [];

  if (user) {
    const [calibrationRes, historyRes, signalsRes] = await Promise.all([
      supabase
        .from('user_taste_calibrations')
        .select('loved_titles, overrated_titles, abandoned_title, standards_summary')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('watch_history')
        .select('content_id, completed, position_seconds, content(title,type)')
        .eq('user_id', user.id)
        .order('last_watched', { ascending: false })
        .limit(12),
      supabase
        .from('user_signals')
        .select('tmdb_id, signal_type, signal_weight')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80),
    ]);

    calibration = (calibrationRes.data as CalibrationRow | null) ?? null;
    history = (historyRes.data as HistoryRow[] | null) ?? [];
    signals = (signalsRes.data as SignalRow[] | null) ?? [];
  }

  const pick = selectCandidate({ calibration, history, signals });
  const confidence = confidenceLabel(calibration, history.length);
  const isLate = new Date().getHours() >= 21;

  return (
    <section className="px-4 pt-4 sm:px-6 md:px-8 lg:px-12">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#05070d] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className={`absolute inset-y-0 right-0 w-full bg-gradient-to-br ${pick.posterTone} opacity-90 sm:w-[52%]`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.13),transparent_28%),linear-gradient(90deg,#05070d_0%,rgba(5,7,13,0.96)_48%,rgba(5,7,13,0.54)_100%)]" />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.75fr)] lg:p-9">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#d9ffd6]">
                <Sparkles size={13} />
                Tonight's Pick
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/48">
                <ShieldCheck size={13} />
                {confidence}
              </span>
            </div>

            <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-white/38">
              VAULT is making the call
            </p>
            <h1 className="mt-2 text-4xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {pick.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/66 sm:text-lg">
              {pick.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-white/55">
                <Clock3 size={14} />
                {pick.runtimeLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-white/55">
                <Compass size={14} />
                {isLate ? 'Late-night aware' : 'Good for tonight'}
              </span>
            </div>

            <TonightDecisionActions
              tmdbId={pick.tmdbId}
              mediaType={pick.mediaType}
              title={pick.title}
              watchHref={pick.watchHref}
            />
          </div>

          <aside className="rounded-2xl border border-white/10 bg-black/28 p-4 backdrop-blur-xl lg:self-end">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
              <Brain size={14} className="text-[#9ee493]" />
              Why this, not a row
            </div>
            <p className="mt-3 text-sm font-bold text-white/82">{pick.badge}</p>
            <div className="mt-4 space-y-3">
              {pick.reasons.map((reason) => (
                <div key={reason} className="flex gap-3 text-sm leading-6 text-white/58">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9ee493]" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
