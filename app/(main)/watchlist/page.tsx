import { getWatchlist } from '@/app/actions/watchlist';
import { WatchlistGrid } from '@/components/watchlist/watchlist-grid';
import { BookmarkCheck, Clock, Film, Tv } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Watchlist',
  description: 'Your personal watchlist. Track what you want to watch, what you are watching, and what you have finished.',
  openGraph: {
    title: 'My Watchlist | StreamVault',
    description: 'Your personal watchlist. Track what you want to watch, what you are watching, and what you have finished.',
  },
};

export default async function WatchlistPage() {
  const items = await getWatchlist();
  
  const movieCount = items.filter(i => i.type === 'movie').length;
  const tvCount = items.filter(i => i.type === 'tv').length;
  
  // Rough estimation of total watch time (2h per movie, 10h per tv show)
  const estimatedHours = (movieCount * 2) + (tvCount * 10);

  return (
    <div className="min-h-screen bg-[#030508] flex flex-col">
      {/* ── PREMIUM HEADER ── */}
      <div className="bg-gradient-to-b from-accent/10 to-transparent border-b border-white/5 pt-12 pb-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BookmarkCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">My Watchlist</h1>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                <Film size={16} className="text-blue-400" /> {movieCount} Movies
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                <Tv size={16} className="text-purple-400" /> {tvCount} Shows
              </div>
              {items.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                  <Clock size={16} className="text-green-400" /> ~{estimatedHours} hours of content
                </div>
              )}
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex gap-2">
              <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-white/30 transition-colors cursor-pointer appearance-none">
                <option value="date">Sort by: Recently Added</option>
                <option value="title">Sort by: Title A-Z</option>
                <option value="rating">Sort by: Highest Rated</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT GRID ── */}
      <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-in fade-in zoom-in-95">
            <div className="w-32 h-32 mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-600/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-full h-full bg-[#0c1015] border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                <BookmarkCheck className="w-12 h-12 text-slate-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-white">Your watchlist is empty</h2>
            <p className="text-slate-400 max-w-md text-lg leading-relaxed mb-8">
              Discover your next favorite movie or TV show. Tap the <span className="text-white font-bold inline-flex items-center"><BookmarkCheck size={16} className="mx-1" /> icon</span> on any title to save it for later.
            </p>
            <a href="/discover" className="px-8 py-3.5 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Explore Content
            </a>
          </div>
        ) : (
          <WatchlistGrid items={items} />
        )}
      </div>
    </div>
  );
}
