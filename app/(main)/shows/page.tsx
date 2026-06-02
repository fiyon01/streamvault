import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';
import { HeroCarousel } from '@/components/ui/hero-carousel';
import Image from 'next/image';
import Link from 'next/link';
import { Tv, Drama, Search, Laugh, Rocket, Star } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TV Shows',
  description: 'Discover the best TV shows. Drama, crime, comedy, sci-fi — curated by AI, rated by taste.',
  openGraph: {
    title: 'TV Shows | StreamVault',
    description: 'Discover the best TV shows. Drama, crime, comedy, sci-fi — curated by AI, rated by taste.',
  },
};

export default async function ShowsPage() {
  const [trending, topRated, drama, crime, comedy, scifi] = await Promise.all([
    tmdb.getTrending('tv', 'week'),
    tmdb.discoverTv({ sort_by: 'vote_average.desc', 'vote_count.gte': '5000' }),
    tmdb.discoverTv({ with_genres: '18' }),
    tmdb.discoverTv({ with_genres: '80' }),
    tmdb.discoverTv({ with_genres: '35' }),
    tmdb.discoverTv({ with_genres: '10765' }),
  ]);

  const normalize = (items: any[]) =>
    (items || []).map(s => ({ ...s, title: s.title || s.name }));

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--color-bg)' }}>

      {/* ── CINEMATIC HERO ── */}
      <HeroCarousel items={trending?.results || []} type="tv" />

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between px-6 md:px-14 lg:px-20 py-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight">TV Shows</h2>
          <p className="text-muted mt-1 text-sm">From prestige drama to addictive binges</p>
        </div>
        <Link href="/discover" className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-surface transition flex items-center gap-2">
          🎯 Advanced Filters
        </Link>
      </div>

      {/* ── GENRE PILLS ── */}
      <div className="px-6 md:px-14 lg:px-20 mb-10">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {[
            { label: 'Trending', icon: Tv },
            { label: 'Drama', icon: Drama },
            { label: 'Crime', icon: Search },
            { label: 'Comedy', icon: Laugh },
            { label: 'Sci-Fi', icon: Rocket },
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
        <ContentRow title="📺 Trending This Week" items={normalize(trending?.results)} type="tv" />
        <ContentRow title="🌟 All-Time Greats" items={normalize(topRated?.results)} type="tv" />
        <ContentRow title="🎭 Drama & Prestige TV" items={normalize(drama?.results)} type="tv" />
        <ContentRow title="🔍 Crime & Mystery" items={normalize(crime?.results)} type="tv" />
        <ContentRow title="😂 Comedy" items={normalize(comedy?.results)} type="tv" />
        <ContentRow title="🚀 Sci-Fi & Fantasy" items={normalize(scifi?.results)} type="tv" />
      </div>
    </div>
  );
}
