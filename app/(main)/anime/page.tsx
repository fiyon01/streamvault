import Image from 'next/image';
import Link from 'next/link';
import { jikan } from '@/lib/jikan/api';
import { AnimeRow } from '@/components/anime/anime-row';
import { AnimeMoodChips } from '@/components/anime/anime-mood-chips';
import { SubDubToggle } from '@/components/anime/sub-dub-toggle';
import { Calendar, Star, Building2, ShieldCheck, ChevronRight, Tv } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Anime',
  description: 'Explore the world of anime. Seasonal picks, top-rated series, and hidden gems — powered by MyAnimeList data.',
  openGraph: {
    title: 'Anime | StreamVault',
    description: 'Explore the world of anime. Seasonal picks, top-rated series, and hidden gems — powered by MyAnimeList data.',
  },
};

const SEASON_GRADIENT: Record<string, string> = {
  spring: 'from-pink-600/30 to-green-600/20',
  summer: 'from-yellow-500/30 to-orange-600/20',
  fall:   'from-orange-600/30 to-red-700/20',
  winter: 'from-blue-600/30 to-cyan-500/20',
};
const SEASON_EMOJI: Record<string, string> = {
  spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️',
};

function getCurrentSeason(): { season: 'spring' | 'summer' | 'fall' | 'winter'; year: number } {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  if (month >= 1 && month <= 3)  return { season: 'winter', year };
  if (month >= 4 && month <= 6)  return { season: 'spring', year };
  if (month >= 7 && month <= 9)  return { season: 'summer', year };
  return { season: 'fall', year };
}

export default async function AnimePage() {
  const { season, year } = getCurrentSeason();

  // Fetch in parallel — Jikan rate limiter handles spacing internally
  const [currentSeasonData, topAnimeData, completedData] = await Promise.all([
    jikan.getCurrentSeason(20).catch(() => ({ data: [] })),
    jikan.getTopAnime(25).catch(() => ({ data: [] })),
    jikan.searchAnime('', { status: 'complete', min_score: '8', order_by: 'score', sort: 'desc', limit: '20' }).catch(() => ({ data: [] })),
  ]);

  const currentSeason: any[] = Array.from(
    new Map(((currentSeasonData as any)?.data || []).map((i: any) => [i.mal_id, i])).values()
  );
  const topAnime: any[] = Array.from(
    new Map(((topAnimeData as any)?.data || []).map((i: any) => [i.mal_id, i])).values()
  );
  const completedTop: any[] = Array.from(
    new Map(((completedData as any)?.data || []).map((i: any) => [i.mal_id, i])).values()
  );

  // Pick the top-scored currently airing show for the Season Banner hero
  const seasonHero = [...currentSeason].sort((a, b) => (b.score || 0) - (a.score || 0))[0];

  const STUDIOS = [
    { id: '569', name: 'MAPPA',           known: 'Jujutsu Kaisen, Chainsaw Man',       color: 'from-red-600/20 to-rose-800/20',     border: 'border-red-500/20',    glow: 'rgba(239,68,68,0.35)',   seriesCount: 47  },
    { id: '43',  name: 'Ufotable',        known: 'Demon Slayer, Fate Series',           color: 'from-purple-700/20 to-indigo-800/20', border: 'border-purple-500/20', glow: 'rgba(139,92,246,0.35)',  seriesCount: 31  },
    { id: '858', name: 'Wit Studio',      known: 'Vinland Saga, Spy x Family',          color: 'from-blue-700/20 to-cyan-800/20',     border: 'border-blue-500/20',   glow: 'rgba(59,130,246,0.35)',  seriesCount: 28  },
    { id: '4',   name: 'Bones',           known: 'Fullmetal Alchemist, My Hero Acad.',  color: 'from-orange-600/20 to-amber-800/20',  border: 'border-orange-500/20', glow: 'rgba(249,115,22,0.35)',  seriesCount: 95  },
    { id: '2',   name: 'Kyoto Animation', known: 'Violet Evergarden, K-On!',            color: 'from-pink-600/20 to-rose-700/20',     border: 'border-pink-500/20',   glow: 'rgba(236,72,153,0.35)',  seriesCount: 44  },
    { id: '11',  name: 'Madhouse',        known: 'Death Note, Hunter x Hunter',         color: 'from-slate-600/20 to-zinc-800/20',    border: 'border-slate-500/20',  glow: 'rgba(100,116,139,0.35)', seriesCount: 68  },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* ═══════════════════════════════════════
          SEASON BANNER HERO
      ═══════════════════════════════════════ */}
      <div className={`relative w-full overflow-hidden`} style={{ minHeight: '52vh' }}>
        {/* Backdrop */}
        {seasonHero?.images?.jpg?.large_image_url && (
          <>            <Image
              src={seasonHero.images.jpg.large_image_url}
              alt={seasonHero.title}
              fill
              priority
              className="object-cover object-center scale-110 blur-sm opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)] via-[var(--color-bg)]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-transparent to-transparent" />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 px-6 md:px-14 pt-10 pb-14">

          {/* Season Badge + Title */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
              <span className="text-2xl">{SEASON_EMOJI[season]}</span>
              <span className="text-sm font-black uppercase tracking-widest text-white">
                {season.charAt(0).toUpperCase() + season.slice(1)} {year} Anime Season
              </span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              New Season.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00BFFF] to-[#8B5CF6]">
                Now Streaming.
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
              {currentSeason.length} new titles this season. From explosive shonen to cozy slice-of-life — find your next obsession instantly.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/anime/seasonal" className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-slate-200 transition hover:scale-105">
                <Calendar size={18} /> Browse Season
              </Link>
              <Link href="/anime/top" className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition backdrop-blur-md">
                <Star size={18} /> All-Time Top
              </Link>
            </div>
          </div>

          {/* Season Hero Card */}
          {seasonHero && (
            <Link href={`/anime/${seasonHero.mal_id}`} className="group flex-shrink-0 w-[200px] md:w-[240px]">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border-2 border-[#8B5CF6]/50 shadow-[0_0_40px_rgba(139,92,246,0.3)] group-hover:scale-105 transition-transform duration-500">
                <Image
                  src={seasonHero.images?.jpg?.large_image_url || ''}
                  alt={seasonHero.title_english || seasonHero.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
                  <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                    <Star size={12} className="fill-yellow-400" />
                    {seasonHero.score?.toFixed(1) || 'N/A'}
                  </div>
                  <h3 className="text-white font-black text-sm leading-tight line-clamp-2">
                    {seasonHero.title_english || seasonHero.title}
                  </h3>
                  <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    Currently Airing
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          QUICK NAV PILLS
      ═══════════════════════════════════════ */}
      <div className="px-6 md:px-14 mb-12 -mt-2">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Seasonal', href: '/anime/seasonal', icon: Calendar, color: 'hover:border-[#00BFFF]/50 hover:text-[#00BFFF]' },
            { label: 'Top Rated', href: '/anime/top', icon: Star, color: 'hover:border-yellow-400/50 hover:text-yellow-400' },
            { label: 'By Studio', href: '/anime/studios', icon: Building2, color: 'hover:border-[#8B5CF6]/50 hover:text-[#8B5CF6]' },
            { label: 'Filler-Free', href: '/anime/filler-free', icon: ShieldCheck, color: 'hover:border-green-500/50 hover:text-green-400' },
          ].map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold text-sm transition-all hover:scale-105 ${nav.color}`}
            >
              <nav.icon size={15} /> {nav.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SUB / DUB TOGGLE + MOOD CHIPS
      ═══════════════════════════════════════ */}
      <div className="px-6 md:px-14 mb-14 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Audio Preference</p>
            <SubDubToggle value="either" />
          </div>
          <div className="hidden sm:block w-px h-12 bg-white/10" />
          <div className="text-sm text-slate-400 font-medium leading-relaxed">
            <span className="text-white font-bold">SUB</span> — Original Japanese audio with subtitles<br />
            <span className="text-white font-bold">DUB</span> — English dubbed version<br />
            <span className="text-white font-bold">EITHER</span> — Show everything available
          </div>
        </div>

        <AnimeMoodChips />
      </div>

      {/* ═══════════════════════════════════════
          CONTENT ROWS
      ═══════════════════════════════════════ */}
      <div className="space-y-16">

        {/* Currently Airing This Season */}
        {currentSeason.length > 0 && (
          <AnimeRow
            title={`${SEASON_EMOJI[season]} New This Season`}
            subtitle={`${season.charAt(0).toUpperCase() + season.slice(1)} ${year} · ${currentSeason.length} titles airing now`}
            items={currentSeason}
          />
        )}

        {/* All-Time Top Rated */}
        {topAnime.length > 0 && (
          <AnimeRow
            title="🏆 All-Time Greatest"
            subtitle="Ranked by MyAnimeList score · community-verified quality"
            items={topAnime}
          />
        )}

        {/* ── STUDIOS SPOTLIGHT ── */}
        <div className="px-6 md:px-14 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">🎨 Studios Spotlight</h2>
              <p className="text-slate-400 text-sm mt-0.5">Every legendary animation house, one click away</p>
            </div>
            <Link href="/anime/studios" className="flex items-center gap-1 text-[#8B5CF6] font-bold text-sm hover:gap-2 transition-all">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {STUDIOS.map((studio) => (
              <Link
                key={studio.name}
                href={`/anime/discover?studioId=${studio.id}`}
                style={{ '--studio-glow': studio.glow } as React.CSSProperties}
                className={`group relative p-5 rounded-2xl bg-gradient-to-br ${studio.color} border ${studio.border} hover:border-opacity-80 hover:scale-[1.02] transition-all duration-300 overflow-hidden`}
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{ boxShadow: `inset 0 0 30px var(--studio-glow)` }}
                />
                <div className="absolute inset-0 bg-[#050505]/60" />
                <div className="relative z-10">
                  {/* Header row: icon + series count badge */}
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xl">🎬</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-black text-slate-300 tracking-widest">
                      {studio.seriesCount} series
                    </span>
                  </div>
                  <h3 className="font-black text-white text-base group-hover:text-[#8B5CF6] transition-colors">{studio.name}</h3>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{studio.known}</p>
                  <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-[#8B5CF6] flex items-center gap-1 transition-colors">
                    Browse Studio <ChevronRight size={10} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Completed Series */}
        {completedTop.length > 0 && (
          <AnimeRow
            title="✅ Complete Series — Binge Now"
            subtitle="No waiting for new episodes — every episode ready to watch"
            items={completedTop}
          />
        )}

        {/* ── FILLER-FREE CTA BANNER ── */}
        <div className="px-6 md:px-14">
          <Link href="/anime/filler-free" className="group relative flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-12 rounded-3xl bg-gradient-to-r from-[#00BFFF]/10 to-[#8B5CF6]/10 border border-[#00BFFF]/20 hover:border-[#00BFFF]/50 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00BFFF]/20 text-[#00BFFF] text-xs font-black uppercase tracking-widest mb-4">
                <ShieldCheck size={12} /> Filler-Free Collection
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">Zero Filler. All Story.</h2>
              <p className="text-slate-400 mt-2 max-w-xl">Every series here has under 5% filler content. No more watching 300 episodes to get 150 episodes of actual plot.</p>
            </div>
            <div className="relative z-10 flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black text-lg group-hover:scale-105 transition-transform whitespace-nowrap">
              <ShieldCheck size={20} /> Browse Collection
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
