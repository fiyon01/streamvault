import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';
import { HeroCarousel } from '@/components/ui/hero-carousel';
import Image from 'next/image';
import Link from 'next/link';
import { Flame, Swords, Rocket, Ghost, Laugh, Star } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Movies',
  description: 'Browse thousands of movies — trending blockbusters, all-time classics, action, sci-fi, horror and more. AI-powered discovery.',
  openGraph: {
    title: 'Movies | StreamVault',
    description: 'Browse thousands of movies — trending blockbusters, all-time classics, action, sci-fi, horror and more. AI-powered discovery.',
  },
};

export default async function MoviesPage() {
  const [trending, topRated, action, scifi, horror, comedy] = await Promise.all([
    tmdb.getTrending('movie', 'week'),
    tmdb.discoverMovies({ sort_by: 'vote_average.desc', 'vote_count.gte': '8000' }),
    tmdb.discoverMovies({ with_genres: '28' }),
    tmdb.discoverMovies({ with_genres: '878' }),
    tmdb.discoverMovies({ with_genres: '27' }),
    tmdb.discoverMovies({ with_genres: '35' }),
  ]);

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--color-bg)' }}>

      {/* ── CINEMATIC HERO ── */}
      <HeroCarousel items={trending?.results || []} type="movie" />

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between px-6 md:px-14 lg:px-20 py-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Movies</h2>
          <p className="text-muted mt-1 text-sm">Explore hundreds of thousands of films</p>
        </div>
        <Link href="/discover" className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-surface transition flex items-center gap-2">
          🎯 Advanced Filters
        </Link>
      </div>

      {/* ── GENRE PILLS ── */}
      <div className="px-6 md:px-14 lg:px-20 mb-10">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {[
            { label: 'Trending', icon: Flame },
            { label: 'Action', icon: Swords },
            { label: 'Sci-Fi', icon: Rocket },
            { label: 'Horror', icon: Ghost },
            { label: 'Comedy', icon: Laugh },
            { label: 'Top Rated', icon: Star },
          ].map(g => (
            <span
              key={g.label}
              className="flex-shrink-0 px-4 py-2 rounded-full border border-border bg-surface hover:bg-accent hover:border-accent hover:text-white text-sm font-medium cursor-pointer transition flex items-center gap-2"
            >
              <g.icon size={16} /> {g.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── CONTENT ROWS ── */}
      <div className="space-y-14">
        <ContentRow title="🔥 Trending This Week" items={trending?.results || []} type="movie" />
        <ContentRow title="🌟 Top Rated All-Time" items={topRated?.results || []} type="movie" />
        <ContentRow title="💥 Action & Adventure" items={action?.results || []} type="movie" />
        <ContentRow title="🚀 Science Fiction" items={scifi?.results || []} type="movie" />
        <ContentRow title="😂 Comedy" items={comedy?.results || []} type="movie" />
        <ContentRow title="👻 Horror" items={horror?.results || []} type="movie" />
      </div>
    </div>
  );
}
