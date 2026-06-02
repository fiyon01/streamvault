'use client';

import { useEffect, useState, useCallback, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAnimeFilterStore } from '@/store/filter-store';
import { discoverAnime } from '@/app/actions/discover';
import { ContentCard } from '@/components/ui/content-card';
import {
  SlidersHorizontal, X, RotateCcw, Film, Tv, Zap,
  Check, ChevronDown, ChevronUp, Loader2, Search, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const GENRES = [
  { label: 'Action', id: 'action' }, { label: 'Adventure', id: 'adventure' },
  { label: 'Comedy', id: 'comedy' }, { label: 'Drama', id: 'drama' },
  { label: 'Fantasy', id: 'fantasy' }, { label: 'Sci-Fi', id: 'sci-fi' },
  { label: 'Romance', id: 'romance' }, { label: 'Slice of Life', id: 'slice-of-life' }
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Top Scored' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'favorites', label: 'Most Favorited' },
];

const RATING_STEPS = [0, 6, 7, 7.5, 8, 8.5, 9];

export default function AnimeDiscoverPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05050f]" />}>
      <AnimeDiscoverPage />
    </Suspense>
  );
}

function AnimeDiscoverPage() {
  const searchParams = useSearchParams();
  const filters = useAnimeFilterStore();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, startTransition] = useTransition();
  const [genresExpanded, setGenresExpanded] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const runSearch = useCallback(() => {
    startTransition(async () => {
      const data = await discoverAnime(filters);
      setResults(data);
    });
  }, [
    filters.contentType, filters.minScore, filters.selectedGenres,
    filters.season, filters.status, filters.sortBy, filters.studioId,
    filters.demographic, filters.source,
  ]);

  useEffect(() => {
    const studioId = searchParams.get('studioId');
    if (studioId && studioId !== filters.studioId) {
      filters.setFilter('studioId', studioId);
    }
  }, [searchParams]);

  useEffect(() => { runSearch(); }, [runSearch]);

  const activeFilterCount = [
    filters.contentType !== 'both',
    filters.minScore > 0,
    filters.selectedGenres.length > 0,
    filters.season !== 'all',
    filters.status !== 'all',
    !!filters.studioId,
    !!filters.demographic,
    !!filters.source,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#05050f] text-white flex flex-col">

      {/* ── CINEMATIC HEADER ── */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#d946ef]/8 via-transparent to-[#ec4899]/5" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[200px] bg-[#d946ef]/10 rounded-full blur-[80px] -translate-y-1/2" />
        <div className="relative px-6 md:px-10 py-10 max-w-screen-2xl mx-auto w-full">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#d946ef]/20 border border-[#d946ef]/30 flex items-center justify-center">
                  <Sparkles size={16} className="text-[#d946ef]" />
                </div>
                <span className="text-[#d946ef] text-xs font-bold uppercase tracking-[0.2em]">Powered by MyAnimeList</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Anime Discovery</h1>
              <p className="text-white/40 mt-2 text-sm font-medium">
                {isLoading ? 'Searching...' : `${results.length > 0 ? `${results.length}+ results` : 'No results'}`}
              </p>
            </div>

            {/* Sort + Filter Controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Sort */}
              <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/[0.08] rounded-xl px-4 py-2.5">
                <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Sort</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => filters.setFilter('sortBy', e.target.value as any)}
                  className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0d0d1a]">{o.label}</option>)}
                </select>
              </div>

              {/* Filter Toggle (mobile) */}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={cn(
                  "lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all",
                  filtersOpen || activeFilterCount > 0
                    ? "bg-[#d946ef]/20 border-[#d946ef]/40 text-[#d946ef]"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <SlidersHorizontal size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#d946ef] text-white text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Reset */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => filters.resetFilters()}
                  className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-white/[0.06]">
              {filters.contentType !== 'both' && (
                <Chip theme="anime" label={filters.contentType === 'movie' ? '🎬 Movies' : '📺 TV'} onRemove={() => filters.setFilter('contentType', 'both')} />
              )}
              {filters.season !== 'all' && (
                <Chip theme="anime" label={`🌸 ${filters.season}`} onRemove={() => filters.setFilter('season', 'all')} />
              )}
              {filters.status !== 'all' && (
                <Chip theme="anime" label={`📺 ${filters.status}`} onRemove={() => filters.setFilter('status', 'all')} />
              )}
              {filters.minScore > 0 && (
                <Chip theme="anime" label={`⭐ ${filters.minScore}+ Score`} onRemove={() => filters.setFilter('minScore', 0)} />
              )}
              {filters.studioId && (
                <Chip theme="anime" label="🎨 Studio Filter" onRemove={() => filters.setFilter('studioId', '')} />
              )}
              {filters.demographic && (
                <Chip theme="anime" label={`👥 ${filters.demographic}`} onRemove={() => filters.setFilter('demographic', '')} />
              )}
              {filters.source && (
                <Chip theme="anime" label={`📖 ${filters.source}`} onRemove={() => filters.setFilter('source', '')} />
              )}
              {filters.selectedGenres.map(g => (
                <Chip theme="anime" key={g} label={g} onRemove={() => filters.setFilter('selectedGenres', filters.selectedGenres.filter(x => x !== g))} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full">

        {/* ── LEFT FILTER PANEL ── */}
        <aside className={cn(
          "lg:w-72 shrink-0 lg:border-r border-white/[0.06] bg-[#07070f] z-50 transition-all",
          filtersOpen ? "fixed inset-0 flex flex-col" : "hidden",
          "lg:block lg:static"
        )}>
          {/* Mobile Header with Close Button */}
          <div className="lg:hidden shrink-0 sticky top-0 bg-[#07070f]/95 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center z-10">
            <h3 className="font-black text-lg text-white">Filters & Sort</h3>
            <button 
              onClick={() => setFiltersOpen(false)} 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="flex-1 lg:flex-none p-6 space-y-8 lg:sticky lg:top-0 max-h-screen overflow-y-auto scrollbar-none pb-24 lg:pb-6">

            {/* Content Type */}
            <FilterSection title="Content Type">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'all', label: 'All', icon: Zap },
                  { value: 'movie', label: 'Movies', icon: Film },
                  { value: 'tv', label: 'TV', icon: Tv },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => filters.setFilter('contentType', value as any)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all",
                      filters.contentType === value
                        ? "bg-[#d946ef]/15 border-[#d946ef]/40 text-[#d946ef]"
                        : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>
            
            {/* Season */}
            <FilterSection title="Season">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'winter', label: 'Winter' },
                  { value: 'spring', label: 'Spring' },
                  { value: 'summer', label: 'Summer' },
                  { value: 'fall', label: 'Fall' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => filters.setFilter('season', value as any)}
                    className={cn(
                      "py-2 rounded-lg border text-xs font-bold transition-all text-center",
                      filters.season === value
                        ? "bg-[#d946ef]/15 border-[#d946ef]/40 text-[#d946ef]"
                        : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Status */}
            <FilterSection title="Status">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'airing', label: 'Airing' },
                  { value: 'complete', label: 'Complete' },
                  { value: 'upcoming', label: 'Upcoming' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => filters.setFilter('status', value as any)}
                    className={cn(
                      "py-2 rounded-lg border text-xs font-bold transition-all text-center",
                      filters.status === value
                        ? "bg-[#d946ef]/15 border-[#d946ef]/40 text-[#d946ef]"
                        : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Min Score */}
            <FilterSection title={`Min Score  ${filters.minScore > 0 ? `— ⭐ ${filters.minScore}+` : ''}`}>
              <div className="flex flex-wrap gap-2">
                {RATING_STEPS.map(r => (
                  <button
                    key={r}
                    onClick={() => filters.setFilter('minScore', r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      filters.minScore === r
                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                        : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70"
                    )}
                  >
                    {r === 0 ? 'Any' : `${r}+`}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Genres */}
            <FilterSection
              title={`Genres${filters.selectedGenres.length > 0 ? ` (${filters.selectedGenres.length})` : ''}`}
              collapsible
              expanded={genresExpanded}
              onToggle={() => setGenresExpanded(!genresExpanded)}
            >
              <div className="flex flex-wrap gap-2">
                {GENRES.map(({ label }) => {
                  const active = filters.selectedGenres.includes(label);
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        if (active) filters.setFilter('selectedGenres', filters.selectedGenres.filter((g: string) => g !== label));
                        else if (filters.selectedGenres.length < 5) filters.setFilter('selectedGenres', [...filters.selectedGenres, label]);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5",
                        active
                          ? "bg-[#d946ef]/20 border-[#d946ef]/40 text-[#d946ef]"
                          : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                      )}
                    >
                      {active && <Check size={10} strokeWidth={3} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Demographic */}
            <FilterSection title={`Demographic${filters.demographic ? ` — ${filters.demographic}` : ''}`}>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '', label: 'Any' },
                  { value: 'Shounen', label: 'Shounen (Teen Male)' },
                  { value: 'Shoujo', label: 'Shoujo (Teen Female)' },
                  { value: 'Seinen', label: 'Seinen (Adult Male)' },
                  { value: 'Josei', label: 'Josei (Adult Female)' },
                  { value: 'Kodomomuke', label: 'Kids' },
                ].map(o => (
                  <button key={o.value} onClick={() => filters.setFilter('demographic', o.value as any)}
                    className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all',
                      filters.demographic === o.value
                        ? 'bg-[#d946ef]/20 border-[#d946ef]/40 text-[#d946ef]'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Source Material */}
            <FilterSection title={`Source${filters.source ? ` — ${filters.source}` : ''}`}>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '', label: 'Any' },
                  { value: 'Manga', label: 'Manga' },
                  { value: 'Novel', label: 'Light Novel' },
                  { value: 'Original', label: 'Original' },
                  { value: 'Game', label: 'Game' },
                  { value: 'Webtoon', label: 'Webtoon/Manhwa' },
                ].map(o => (
                  <button key={o.value} onClick={() => filters.setFilter('source', o.value as any)}
                    className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all',
                      filters.source === o.value
                        ? 'bg-[#d946ef]/20 border-[#d946ef]/40 text-[#d946ef]'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Sort (mobile only in sidebar) */}
            <FilterSection title="Sort By" className="lg:hidden">
              <div className="space-y-2">
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => filters.setFilter('sortBy', o.value as any)}
                    className={cn("w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      filters.sortBy === o.value
                        ? "bg-[#d946ef]/10 border-[#d946ef]/30 text-white"
                        : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white/70"
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <button onClick={() => { filters.resetFilters(); setFiltersOpen(false); }}
              className="w-full py-3 rounded-xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-all">
              Reset All Filters
            </button>
          </div>
        </aside>

        {/* ── RESULTS GRID ── */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 size={32} className="animate-spin text-[#d946ef]" />
              <p className="text-white/40 text-sm font-medium animate-pulse">Searching the vault...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="hidden lg:flex items-center justify-between mb-6">
                <p className="text-white/30 text-sm font-medium">{results.length} titles found</p>
                <div className="flex items-center gap-3">
                  <span className="text-white/30 text-xs">Sort:</span>
                  <div className="flex gap-2">
                    {SORT_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => filters.setFilter('sortBy', o.value as any)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                          filters.sortBy === o.value
                            ? "bg-[#d946ef]/20 border-[#d946ef]/40 text-[#d946ef]"
                            : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70"
                        )}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {results.map((item, i) => (
                  <div key={`${item.id}-${i}`} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${Math.min(i * 40, 400)}ms`, animationFillMode: 'backwards' }}>
                    <ContentCard
                      id={item.id.toString()}
                      title={item.title}
                      posterPath={item.poster_path}
                      type={item.type}
                      rating={item.vote_average || item.score}
                      year={item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || item.year}
                      priority={i < 10}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
                <Search size={32} className="text-white/20" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">No matches found</h3>
              <p className="text-white/30 text-sm max-w-sm">Try broadening your filters or resetting them to see more results.</p>
              <button onClick={() => filters.resetFilters()}
                className="mt-8 px-6 py-3 bg-[#d946ef]/15 hover:bg-[#d946ef]/25 border border-[#d946ef]/30 text-[#d946ef] rounded-xl font-bold text-sm transition-all">
                Reset Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ──

function FilterSection({ title, children, collapsible, expanded, onToggle, className }: {
  title: string; children: React.ReactNode; collapsible?: boolean;
  expanded?: boolean; onToggle?: () => void; className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <button
        onClick={collapsible ? onToggle : undefined}
        className={cn("flex items-center justify-between w-full", collapsible && "cursor-pointer group")}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{title}</span>
        {collapsible && (expanded ? <ChevronUp size={12} className="text-white/20 group-hover:text-white/40" /> : <ChevronDown size={12} className="text-white/20 group-hover:text-white/40" />)}
      </button>
      {(!collapsible || expanded) && children}
    </div>
  );
}

function Chip({ label, onRemove, theme = 'default' }: { label: string; onRemove: () => void; theme?: 'default'|'anime'|'cartoon' }) {
  const colorClasses = {
    default: "bg-[#6366f1]/10 border-[#6366f1]/25 text-[#6366f1]",
    anime: "bg-[#d946ef]/10 border-[#d946ef]/25 text-[#d946ef]",
    cartoon: "bg-[#f97316]/10 border-[#f97316]/25 text-[#f97316]"
  };
  
  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border", colorClasses[theme])}>
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors ml-0.5">
        <X size={10} strokeWidth={3} />
      </button>
    </div>
  );
}
