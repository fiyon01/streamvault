import { jikan } from '@/lib/jikan/api';
import { tmdb } from '@/lib/tmdb/api';
import { WatchButtons } from '@/components/ui/watch-buttons';
import { WatchlistButton } from '@/components/ui/watchlist-button';
import { AnimeRow } from '@/components/anime/anime-row';
import { Star, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  try {
    const res = await jikan.getAnimeById(resolvedParams.id) as any;
    const title = res.data?.title_english || res.data?.title || 'Anime';
    return {
      title: `${title} | StreamVault Anime`,
      description: res.data?.synopsis || 'Watch this anime on StreamVault.',
    };
  } catch {
    return { title: 'Anime | StreamVault' };
  }
}

// Known filler percentages for popular series
const FILLER_DATA: Record<string, number> = {
  'fullmetal alchemist: brotherhood': 2,
  'attack on titan': 1,
  'death note': 0,
  'hunter x hunter': 2,
  'steins;gate': 0,
  'violet evergarden': 0,
  'vinland saga': 0,
  'demon slayer': 1,
  'jujutsu kaisen': 2,
  'chainsaw man': 0,
  'one punch man': 1,
  'mob psycho 100': 0,
  'parasyte': 0,
  'tokyo ghoul': 3,
  'code geass': 0,
  'cowboy bebop': 0,
  'neon genesis evangelion': 0,
  'naruto': 41,
  'naruto: shippuden': 41,
  'bleach': 45,
  'one piece': 9,
  'dragon ball z': 13,
};

async function getTmdbMatch(title: string, isMovie: boolean) {
  try {
    const res = await tmdb.search(title);
    const results = res.results || [];
    
    // Exact type match first
    const typeMatch = results.find((r: any) => isMovie ? r.media_type === 'movie' : (r.media_type === 'tv' || !r.media_type));
    if (typeMatch) return { id: typeMatch.id.toString(), type: isMovie ? 'movie' : 'show' as const };
    
    // Fallback
    if (results.length > 0) {
      return { id: results[0].id.toString(), type: results[0].media_type === 'movie' ? 'movie' : 'show' as const };
    }
  } catch (e) {
    console.error("TMDB search failed for anime:", title);
  }
  return null;
}

export default async function AnimeDetailPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  
  // 1. Fetch Anime Data from Jikan (MAL)
  let animeData;
  try {
    const res = await jikan.getAnimeById(resolvedParams.id) as any;
    animeData = res.data;
  } catch (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-6xl mb-4">🎌</div>
        <h1 className="text-2xl font-bold">Anime not found</h1>
        <p className="text-muted mt-2">This anime doesn't exist or MAL is currently down.</p>
      </div>
    );
  }

  const anime = animeData;
  const isMovie = anime.type === 'Movie';
  
  // 2. Fetch TMDB Match for Video Playback
  const tmdbMatch = await getTmdbMatch(anime.title_english || anime.title, isMovie);
  
  // 3. Fetch Recommendations
  const recsRes = await jikan.getRecommendations(resolvedParams.id).catch(() => ({ data: [] })) as any;
  const recommendations = (recsRes.data || []).map((r: any) => r.entry).slice(0, 15);

  const title = anime.title_english || anime.title;
  const originalTitle = anime.title_japanese || anime.title;
  const backdrop = anime.trailer?.images?.maximum_image_url || anime.images?.jpg?.large_image_url;
  const poster = anime.images?.jpg?.large_image_url;
  
  const fillerKey = title.toLowerCase();
  const fillerPercent = FILLER_DATA[fillerKey];
  const isFillerFree = fillerPercent !== undefined && fillerPercent <= 5;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      
      {/* ── HERO SECTION ── */}
      <div className="relative w-full" style={{ minHeight: '80vh' }}>
        {/* Full bleed backdrop */}
        {backdrop && (
          <div className="absolute inset-0">
            {/* Native image avoids Next's optimizer proxy timing out on MAL CDN. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backdrop}
              alt={title}
              className="h-full w-full object-cover object-center opacity-40 blur-[2px]"
            />
            {/* Multi-layer cinematic gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)] via-[var(--color-bg)]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/40 to-transparent" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-end min-h-[80vh] pb-12 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-end">
            
            {/* Poster */}
            {poster && (
              <div className="hidden md:block flex-shrink-0 w-48 lg:w-60 rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(139,92,246,0.25)] border-2 border-[#8B5CF6]/30 -mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster}
                  alt={title}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Text content */}
            <div className="flex-1 space-y-5 max-w-3xl">
              
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-3">
                {isFillerFree && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[#00BFFF]/20 border border-[#00BFFF]/30 rounded-full text-[10px] font-black text-[#00BFFF] uppercase tracking-wider">
                    <ShieldCheck size={12} /> Filler-Free Collection
                  </span>
                )}
                {anime.status === 'Currently Airing' && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-[10px] font-black text-green-400 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Airing Now
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-3 py-1 bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 rounded-full text-[10px] font-black text-[#8B5CF6] uppercase tracking-wider">
                  🎌 {anime.type}
                </span>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none text-white">
                  {title}
                </h1>
                {originalTitle !== title && (
                  <h2 className="text-xl md:text-2xl font-bold text-slate-500 mt-2">
                    {originalTitle}
                  </h2>
                )}
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-yellow-400 text-lg">
                  <Star size={18} className="fill-yellow-400" /> {anime.score?.toFixed(1) || 'N/A'}
                </span>
                <span className="text-slate-600">·</span>
                <span>{anime.year || anime.aired?.prop?.from?.year || 'TBA'}</span>
                <span className="text-slate-600">·</span>
                <span>{anime.episodes ? `${anime.episodes} Episodes` : 'Ongoing'}</span>
                <span className="text-slate-600">·</span>
                <span className="text-[#8B5CF6]">{anime.studios?.[0]?.name || 'Unknown Studio'}</span>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 pt-2">
                {anime.genres?.map((g: any) => (
                  <span key={g.mal_id} className="text-[11px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-slate-400">
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <div className="relative group/overview mt-4">
                <p className="text-base md:text-lg leading-relaxed text-slate-400 max-w-3xl line-clamp-4 group-hover/overview:line-clamp-none transition-all duration-300">
                  {anime.synopsis}
                </p>
                <div className="text-xs text-[#00BFFF] mt-2 opacity-0 group-hover/overview:opacity-100 transition-opacity absolute -bottom-6">
                  Hover to read full synopsis
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-wrap items-center gap-3 pt-6">
                {/* Watch Now: route through TMDB id if available */}
                {tmdbMatch ? (
                  <WatchButtons
                    tmdbId={tmdbMatch.id}
                    type={isMovie ? 'movie' : 'show'}
                    youtubeKey={anime.trailer?.youtube_id || null}
                  />
                ) : (
                  <>
                    {anime.trailer?.youtube_id && (
                      <WatchButtons
                        tmdbId=""
                        type="show"
                        youtubeKey={anime.trailer.youtube_id}
                      />
                    )}
                    <span className="text-sm text-muted italic">Stream not available for this title</span>
                  </>
                )}
                <WatchlistButton
                  tmdbId={`mal-${resolvedParams.id}`}
                  title={title}
                  type={isMovie ? 'movie' : 'tv'}
                  posterPath={poster}
                />
                {fillerPercent !== undefined && (
                  <a
                    href="#filler-guide"
                    className="flex items-center gap-2 px-5 py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-sm"
                  >
                    <ShieldCheck size={16} className={isFillerFree ? 'text-[#00BFFF]' : 'text-orange-400'} />
                    Filler Guide
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pb-20 space-y-16 mt-12">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left: Anime Info */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Details Grid */}
            <section>
              <h2 className="text-xl font-black mb-4">Series Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Japanese', value: anime.title_japanese },
                  { label: 'Source', value: anime.source },
                  { label: 'Rating', value: anime.rating },
                  { label: 'Season', value: anime.season ? `${anime.season} ${anime.year}` : null },
                  { label: 'Duration', value: anime.duration },
                  { label: 'Rank', value: anime.rank ? `#${anime.rank}` : null },
                ].filter(i => i.value).map((item) => (
                  <div key={item.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">{item.label}</div>
                    <div className="text-sm text-slate-300 font-medium">{item.value}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Filler Guide / MAL Stats */}
          <div className="space-y-6">
            
            {/* Filler Guide Panel */}
            {fillerPercent !== undefined && (
              <div id="filler-guide" className="scroll-mt-24 p-6 rounded-2xl bg-gradient-to-b from-[#0a0f16] to-[#050505] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00BFFF] to-[#8B5CF6]" />
                
                <h3 className="text-lg font-black text-white flex items-center gap-2 mb-6">
                  <ShieldCheck className={isFillerFree ? 'text-[#00BFFF]' : 'text-orange-400'} size={20} />
                  Vault Filler Guide
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-slate-400">Filler Content</span>
                      <span className={`text-3xl font-black ${isFillerFree ? 'text-[#00BFFF]' : 'text-orange-400'}`}>
                        {fillerPercent}%
                      </span>
                    </div>
                    
                    {/* Visual Meter */}
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${fillerPercent > 40 ? 'bg-red-500' : fillerPercent > 20 ? 'bg-orange-400' : fillerPercent > 5 ? 'bg-yellow-400' : 'bg-[#00BFFF]'}`}
                        style={{ width: `${Math.max(fillerPercent, 2)}%` }} // At least 2% so it's visible
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-400 leading-relaxed pt-2">
                    {isFillerFree 
                      ? "This series is incredibly faithful to its source material. You can watch every episode without worrying about skipped canon or wasted time."
                      : "This series contains a noticeable amount of filler. We recommend using a filler list to skip non-canon episodes for the best pacing."}
                  </p>
                </div>
              </div>
            )}
            
            {/* MAL Stats Panel */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-5">
              <h3 className="font-black text-white flex items-center gap-2 border-b border-white/10 pb-4">
                <Star className="text-yellow-400 fill-yellow-400" size={18} />
                MyAnimeList Stats
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Score</span>
                  <span className="font-bold text-white text-lg">{anime.score?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Members</span>
                  <span className="font-bold text-white">{anime.members?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Favorites</span>
                  <span className="font-bold text-white">{anime.favorites?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Popularity</span>
                  <span className="font-bold text-[#8B5CF6]">#{anime.popularity || 'N/A'}</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* ── RECOMMENDATIONS ── */}
        {recommendations.length > 0 && (
          <section>
            <AnimeRow
              title="Similar Anime"
              subtitle="If you liked this, you'll love these"
              items={recommendations}
            />
          </section>
        )}
      </div>
    </div>
  );
}
