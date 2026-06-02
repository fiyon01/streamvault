import { jikan } from '@/lib/jikan/api';
import { AnimeRow } from '@/components/anime/anime-row';
import { AnimeCard } from '@/components/anime/anime-card';
import { Calendar } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Seasonal Anime | StreamVault',
  description: 'Browse anime by season — Spring, Summer, Fall, Winter.',
};

function getCurrentSeason(): { season: 'spring' | 'summer' | 'fall' | 'winter'; year: number } {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  if (month <= 3) return { season: 'winter', year };
  if (month <= 6) return { season: 'spring', year };
  if (month <= 9) return { season: 'summer', year };
  return { season: 'fall', year };
}

const SEASON_EMOJI: Record<string, string> = { spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' };
const ALL_SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;

export default async function SeasonalAnimePage() {
  const { season, year } = getCurrentSeason();

  const [currentData, prevSeasonData] = await Promise.all([
    jikan.getCurrentSeason(24).catch(() => ({ data: [] })),
    jikan.getSeason(
      year.toString(),
      ALL_SEASONS[(ALL_SEASONS.indexOf(season) - 1 + 4) % 4],
      20
    ).catch(() => ({ data: [] })),
  ]);

  // Deduplicate by mal_id to fix React key warnings
  const current = Array.from(
    new Map(((currentData as any)?.data || []).map((i: any) => [i.mal_id, i])).values()
  ) as any[];
  
  const previous = Array.from(
    new Map(((prevSeasonData as any)?.data || []).map((i: any) => [i.mal_id, i])).values()
  ) as any[];

  const prevSeason = ALL_SEASONS[(ALL_SEASONS.indexOf(season) - 1 + 4) % 4];

  // Past seasons for browsing grid
  const PAST_SEASONS = [];
  let y = year, s = ALL_SEASONS.indexOf(season) - 2;
  for (let i = 0; i < 8; i++) {
    if (s < 0) { s += 4; y--; }
    PAST_SEASONS.push({ season: ALL_SEASONS[s % 4], year: y });
    s--;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-6 md:px-14 pt-10 pb-12 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center">
            <Calendar className="text-[#00BFFF]" size={20} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Seasonal Browser</h1>
            <p className="text-slate-400 text-sm mt-0.5">Every anime season, organized by when it aired</p>
          </div>
        </div>
      </div>

      <div className="space-y-16">

        {/* Current Season Grid */}
        <div className="px-6 md:px-14 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-white">
              {SEASON_EMOJI[season]} {season.charAt(0).toUpperCase() + season.slice(1)} {year} — Currently Airing
            </h2>
            <p className="text-slate-400 text-sm mt-1">{current.length} titles airing this season</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {current.map((item: any) => (
              <AnimeCard
                key={item.mal_id}
                id={item.mal_id}
                title={item.title}
                titleEnglish={item.title_english}
                imageUrl={item.images?.jpg?.large_image_url}
                score={item.score}
                episodes={item.episodes}
                isAiring={true}
                year={item.year || item.aired?.prop?.from?.year}
              />
            ))}
          </div>
        </div>

        {/* Previous Season Row */}
        {previous.length > 0 && (
          <AnimeRow
            title={`${SEASON_EMOJI[prevSeason]} Last Season: ${prevSeason.charAt(0).toUpperCase() + prevSeason.slice(1)} ${year}`}
            items={previous}
          />
        )}

        {/* Browse Past Seasons */}
        <div className="px-6 md:px-14 space-y-6">
          <h2 className="text-2xl font-black text-white">📅 Browse Past Seasons</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PAST_SEASONS.map(({ season: s, year: y }) => (
              <Link
                key={`${s}-${y}`}
                href={`/anime/seasonal/${y}/${s}`}
                className="group p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 transition-all duration-300"
              >
                <div className="text-3xl mb-3">{SEASON_EMOJI[s]}</div>
                <div className="font-black text-white group-hover:text-[#8B5CF6] transition-colors capitalize">{s} {y}</div>
                <div className="text-xs text-slate-500 mt-1">View season →</div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
