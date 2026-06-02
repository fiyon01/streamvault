import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';
import { WatchlistButton } from '@/components/ui/watchlist-button';
import { WatchButtons } from '@/components/ui/watch-buttons';
import { DetailTabs } from '@/components/music/detail-tabs';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export default async function MovieDetailPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  if (!/^\d+$/.test(resolvedParams.id)) notFound();

  let movie: any = null;
  try {
    movie = await tmdb.getDetails('movie', resolvedParams.id);
  } catch (error) {
    console.error('Movie detail failed:', error);
    notFound();
  }

  if (!movie || movie.success === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎬</div>
          <h1 className="text-2xl font-bold">Movie not found</h1>
          <p className="text-muted">This movie doesn't exist or couldn't be loaded.</p>
        </div>
      </div>
    );
  }

  const year = movie.release_date?.split('-')[0];
  const runtimeH = Math.floor((movie.runtime || 0) / 60);
  const runtimeM = (movie.runtime || 0) % 60;
  const runtimeStr = runtimeH > 0 ? `${runtimeH}h ${runtimeM}m` : `${runtimeM}m`;
  const rating = movie.vote_average?.toFixed(1);

  // Extract Trailer
  const videos = movie.videos?.results || [];
  const trailer = videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') || videos.find((v: any) => v.site === 'YouTube');
  const youtubeKey = trailer?.key || null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      
      {/* ── HERO SECTION ── */}
      <div className="relative w-full" style={{ minHeight: '80vh' }}>
        {/* Full bleed backdrop */}
        {movie.backdrop_path && (
          <div className="absolute inset-0">
            <Image
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title}
              fill
              priority
              className="object-cover object-top"
            />
            {/* Multi-layer cinematic gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-end min-h-[80vh] pb-12 px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full">
          
          {/* Poster + Info layout */}
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-end">
            
            {/* Poster (hidden mobile) */}
            {movie.poster_path && (
              <div className="hidden md:block flex-shrink-0 w-48 lg:w-56 rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.8)] border border-white/10 -mb-2">
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  width={300}
                  height={450}
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Text content */}
            <div className="flex-1 space-y-5 max-w-3xl">
              {/* Genres */}
              <div className="flex flex-wrap gap-2">
                {movie.genres?.slice(0, 4).map((g: any) => (
                  <span key={g.id} className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
                {movie.title}
              </h1>

              {/* Tagline */}
              {movie.tagline && (
                <p className="text-lg text-muted italic">"{movie.tagline}"</p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
                <span className="flex items-center gap-1.5 text-yellow-400 font-bold text-base">
                  ⭐ {rating}
                </span>
                <span className="text-muted">·</span>
                <span>{year}</span>
                <span className="text-muted">·</span>
                <span>{runtimeStr}</span>
                {movie.status && (
                  <>
                    <span className="text-muted">·</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${movie.status === 'Released' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {movie.status}
                    </span>
                  </>
                )}
              </div>

              {/* Overview */}
              <div className="relative group/overview">
                <p className="text-base md:text-lg leading-relaxed text-slate-300 max-w-2xl line-clamp-4 group-hover/overview:line-clamp-none transition-all duration-300">
                  {movie.overview}
                </p>
                <div className="text-xs text-accent mt-1 opacity-0 group-hover/overview:opacity-100 transition-opacity absolute -bottom-5">
                  Hover to read full description
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <WatchButtons tmdbId={resolvedParams.id} type="movie" youtubeKey={youtubeKey} />
                <WatchlistButton
                  tmdbId={resolvedParams.id}
                  title={movie.title}
                  type="movie"
                  posterPath={movie.poster_path}
                />
                {movie.vote_count > 0 && (
                  <div className="hidden md:flex items-center gap-2 text-sm text-muted ml-auto">
                    <span>{(movie.vote_count / 1000).toFixed(1)}k ratings</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 pb-20 mt-12">
        <DetailTabs
          contentId={resolvedParams.id}
          contentType="movie"
          title={movie.title}
          castSection={
            <div className="space-y-10 mb-16">
              <section>
                <h2 className="text-2xl font-bold mb-6">Top Cast</h2>
                <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                  {movie.credits?.cast?.slice(0, 12).map((person: any) => (
                    <div key={person.id} className="flex-shrink-0 text-center w-20 group">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-surface border-2 border-border group-hover:border-accent transition mx-auto mb-2">
                        {person.profile_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl bg-surface">👤</div>
                        )}
                      </div>
                      <div className="text-xs font-semibold line-clamp-1">{person.name}</div>
                      <div className="text-[10px] text-muted line-clamp-1">{person.character}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          }
          infoSection={
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
              <div className="lg:col-span-2" />
              <div>
                <div className="bg-surface border border-border rounded-2xl p-6 space-y-5 sticky top-6">
                  <h3 className="font-bold text-lg border-b border-border pb-3">Movie Info</h3>
                  <div className="space-y-4 text-sm">
                    {[
                      { label: 'Status', value: movie.status },
                      { label: 'Language', value: movie.original_language?.toUpperCase() },
                      { label: 'Budget', value: movie.budget > 0 ? `$${(movie.budget / 1e6).toFixed(1)}M` : 'N/A' },
                      { label: 'Revenue', value: movie.revenue > 0 ? `$${(movie.revenue / 1e6).toFixed(1)}M` : 'N/A' },
                      { label: 'Country', value: movie.production_countries?.[0]?.name },
                    ].filter(item => item.value).map(item => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-muted">{item.label}</span>
                        <span className="font-medium text-right max-w-[60%]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted">TMDB Score</span>
                      <span className="text-2xl font-black text-yellow-400">{rating}</span>
                    </div>
                    <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full"
                        style={{ width: `${(movie.vote_average / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-2 text-right">{(movie.vote_count / 1000).toFixed(1)}k votes</p>
                  </div>
                </div>
              </div>
            </div>
          }
        />

        {/* SIMILAR MOVIES */}
        {movie.similar?.results?.length > 0 && (
          <section className="mt-8">
            <ContentRow
              title="You Might Also Like"
              items={movie.similar.results}
              type="movie"
            />
          </section>
        )}
      </div>
    </div>
  );
}
