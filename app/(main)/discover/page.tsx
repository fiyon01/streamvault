'use client';

import { Suspense, useEffect, useState, useCallback, useTransition, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveActionStore } from '@/store/filter-store';
import { discoverLiveAction } from '@/app/actions/discover';
import { ContentCard } from '@/components/ui/content-card';
import {
  SlidersHorizontal, X, RotateCcw, Film, Tv, Zap,
  Check, ChevronDown, ChevronUp, Loader2, Search, Globe, Clock,
  Layers, Star, BarChart2, Calendar, Clapperboard
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ── STATIC DATA ──

const GENRES = [
  { label: 'Action' }, { label: 'Adventure' }, { label: 'Comedy' },
  { label: 'Crime' }, { label: 'Documentary' }, { label: 'Drama' },
  { label: 'Fantasy' }, { label: 'History' }, { label: 'Horror' },
  { label: 'Mystery' }, { label: 'Romance' }, { label: 'Sci-Fi' },
  { label: 'Thriller' }, { label: 'War' },
];

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Most Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'recent', label: 'Newest First' },
];

const RATING_STEPS = [0, 6, 7, 7.5, 8, 8.5, 9];
const VOTE_PRESETS = [
  { label: 'Any', value: 0 },
  { label: '100+', value: 100 },
  { label: '500+', value: 500 },
  { label: '1K+', value: 1000 },
  { label: '5K+', value: 5000 },
];

const COUNTRIES = [
  { label: 'Nigeria', value: 'NG' }, { label: 'Kenya', value: 'KE' },
  { label: 'Tanzania', value: 'TZ' }, { label: 'Uganda', value: 'UG' },
  { label: 'South Africa', value: 'ZA' }, { label: 'Ghana', value: 'GH' },
  { label: 'Egypt', value: 'EG' }, { label: 'Ethiopia', value: 'ET' },
  { label: '🇺🇸 US', value: 'US' }, { label: '🇬🇧 UK', value: 'GB' },
  { label: '🇯🇵 Japan', value: 'JP' }, { label: '🇰🇷 South Korea', value: 'KR' },
  { label: '🇪🇸 Spain', value: 'ES' }, { label: '🇫🇷 France', value: 'FR' },
  { label: '🇩🇪 Germany', value: 'DE' }, { label: '🇮🇹 Italy', value: 'IT' },
  { label: '🇧🇷 Brazil', value: 'BR' }, { label: '🇨🇦 Canada', value: 'CA' },
  { label: '🇮🇳 India', value: 'IN' }, { label: '🇸🇪 Sweden', value: 'SE' },
  { label: '🇩🇰 Denmark', value: 'DK' }, { label: '🇳🇴 Norway', value: 'NO' },
  { label: '🇮🇱 Israel', value: 'IL' }, { label: '🇦🇺 Australia', value: 'AU' },
];

const LANGUAGES = [
  { label: 'Yoruba', value: 'yo' }, { label: 'Hausa', value: 'ha' },
  { label: 'Igbo', value: 'ig' }, { label: 'Swahili', value: 'sw' },
  { label: 'Arabic', value: 'ar' },
  { label: 'English', value: 'en' }, { label: 'Korean', value: 'ko' },
  { label: 'Japanese', value: 'ja' }, { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' }, { label: 'German', value: 'de' },
  { label: 'Portuguese', value: 'pt' }, { label: 'Italian', value: 'it' },
  { label: 'Swedish', value: 'sv' }, { label: 'Danish', value: 'da' },
  { label: 'Hebrew', value: 'he' }, { label: 'Hindi', value: 'hi' },
];

const NETWORKS = [
  'HBO', 'Netflix', 'Amazon', 'Hulu', 'Disney+', 'Apple TV+',
  'BBC', 'AMC', 'Showtime', 'FX', 'NBC', 'CBS', 'ABC', 'Fox', 'NHK', 'tvN',
];

const DECADES = ['1980s', '1990s', '2000s', '2010s', '2020s'];
const CURRENT_YEAR = new Date().getFullYear();
const PAGE_SIZE = 20;

// ── COMPONENT ──

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverLoading />}>
      <DiscoverClient />
    </Suspense>
  );
}

function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-[#05050f] text-white flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4">
        <Loader2 size={18} className="animate-spin text-[#9ee493]" />
        <span className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Preparing discovery</span>
      </div>
    </div>
  );
}

function DiscoverClient() {
  const searchParams = useSearchParams();
  const filters = useLiveActionStore();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true, genres: true, quality: true, status: false,
    structure: false, era: false, origin: false,
    language: false, commitment: false, advanced: false,
  });
  const observerTarget = useRef<HTMLDivElement>(null);
  const hydratedUrlFilters = useRef('');

  useEffect(() => {
    const query = searchParams.toString();
    if (!query || hydratedUrlFilters.current === query) return;
    hydratedUrlFilters.current = query;

    const contentType = searchParams.get('contentType');
    const originCountry = searchParams.get('originCountry');
    const originalLanguage = searchParams.get('originalLanguage');
    const selectedGenres = searchParams.get('selectedGenres');
    const africanRegion = searchParams.get('africanRegion');
    const africanOnly =
      searchParams.get('africanOnly') === 'true' ||
      searchParams.get('is_african_content') === 'true' ||
      searchParams.get('is_nollywood') === 'true' ||
      searchParams.get('east_african_content') === 'true';

    filters.resetFilters();
    if (contentType === 'movie' || contentType === 'tv' || contentType === 'both') {
      filters.setFilter('contentType', contentType);
    }
    if (originCountry) filters.setFilter('originCountry', originCountry);
    if (originalLanguage) filters.setFilter('originalLanguage', originalLanguage);
    if (selectedGenres) {
      filters.setFilter('selectedGenres', selectedGenres.split(',').map((genre) => genre.trim()).filter(Boolean));
    }
    if (africanOnly) filters.setFilter('africanOnly', true);
    if (
      africanRegion === 'west_africa' ||
      africanRegion === 'east_africa' ||
      africanRegion === 'south_africa' ||
      africanRegion === 'north_africa' ||
      africanRegion === 'central_africa' ||
      africanRegion === 'all'
    ) {
      filters.setFilter('africanRegion', africanRegion);
    }
    if (searchParams.get('is_sports_content') === 'true') filters.setFilter('selectedGenres', ['Documentary']);
    if (searchParams.get('is_music_content') === 'true') filters.setFilter('selectedGenres', ['Music', 'Documentary']);
    if (searchParams.get('is_kids_content') === 'true') filters.setFilter('selectedGenres', ['Family']);
  }, [filters, searchParams]);

  // Build a string of all non-page filters to detect changes
  const coreFiltersStr = JSON.stringify([
    filters.contentType, filters.minImdbRating, filters.minVoteCount,
    filters.selectedGenres, filters.excludeGenres, filters.genreLogic, filters.sortBy,
    filters.minMovieRuntime, filters.maxMovieRuntime,
    filters.tvStatus, filters.minSeasons, filters.maxSeasons,
    filters.minEpisodesPerSeason, filters.maxEpisodesPerSeason,
    filters.totalEpisodes, filters.minEpisodeRuntime, filters.maxEpisodeRuntime,
    filters.seasonFormat, filters.yearFrom, filters.yearTo, filters.decade,
    filters.originCountry, filters.africanOnly, filters.africanRegion, filters.originalLanguage, filters.network,
    filters.excludeCountries, filters.maturityRating,
    filters.requireDub, filters.requireSub, filters.dubLanguage,
    filters.noSeasonBelow, filters.qualityTrajectory, filters.minHealthScore,
    filters.hiddenGemMode, filters.minCommitmentHours, filters.maxCommitmentHours,
    filters.maxFillerPercentage,
  ]);
  const prevCoreFilters = useRef(coreFiltersStr);

  useEffect(() => {
    if (prevCoreFilters.current !== coreFiltersStr) {
      prevCoreFilters.current = coreFiltersStr;
      setHasMore(true);
      if (filters.page !== 1) { filters.setFilter('page', 1); return; }
    }
    let active = true;
    const fetchResults = async () => {
      const { setFilter, resetFilters, ...filterPayload } = filters;
      if (filters.page === 1) {
        startTransition(async () => {
          const data = await discoverLiveAction(filterPayload);
          if (active) {
            setResults(data);
            setHasMore(data.length >= PAGE_SIZE);
          }
        });
      } else {
        setIsLoadingMore(true);
        const data = await discoverLiveAction(filterPayload);
        if (active) {
          let reachedEnd = data.length < PAGE_SIZE;
          setResults(prev => {
            const newItems = data.filter((d: any) => !prev.some(p => p.id === d.id));
            reachedEnd = reachedEnd || newItems.length === 0;
            return [...prev, ...newItems];
          });
          if (reachedEnd) setHasMore(false);
          setIsLoadingMore(false);
        }
      }
    };
    fetchResults();
    return () => { active = false; };
  }, [coreFiltersStr, filters.page]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && !isLoadingMore && results.length > 0) {
      filters.setFilter('page', filters.page + 1);
    }
  }, [hasMore, isLoading, isLoadingMore, results.length, filters]);

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore]);

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const isTvMode = filters.contentType === 'tv' || filters.contentType === 'both';
  const isMovieMode = filters.contentType === 'movie' || filters.contentType === 'both';

  // Active filter count
  const activeFilterCount = [
    filters.contentType !== 'both',
    filters.minImdbRating > 0,
    filters.minVoteCount > 0,
    filters.selectedGenres.length > 0,
    filters.excludeGenres.length > 0,
    filters.genreLogic === 'AND',
    filters.minMovieRuntime > 0,
    filters.maxMovieRuntime > 0,
    filters.tvStatus !== 'all',
    filters.minSeasons > 0,
    filters.maxSeasons > 0,
    filters.minEpisodesPerSeason > 0,
    filters.maxEpisodesPerSeason > 0,
    filters.totalEpisodes !== 'all',
    filters.minEpisodeRuntime > 0,
    filters.maxEpisodeRuntime > 0,
    filters.seasonFormat !== 'all',
    filters.yearFrom > 0,
    filters.yearTo > 0,
    filters.decade !== 'all',
    !!filters.originCountry,
    filters.africanOnly,
    !!filters.originalLanguage,
    !!filters.network,
    filters.excludeCountries.length > 0,
    filters.maturityRating !== 'all',
    filters.requireDub,
    filters.requireSub,
    !!filters.dubLanguage,
    filters.noSeasonBelow > 0,
    filters.qualityTrajectory !== 'all',
    filters.minHealthScore > 0,
    filters.hiddenGemMode,
    filters.minCommitmentHours > 0,
    filters.maxCommitmentHours > 0,
    filters.maxFillerPercentage > 0,
  ].filter(Boolean).length;

  // All active chips for the summary bar
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...(filters.contentType !== 'both' ? [{ label: filters.contentType === 'movie' ? '🎬 Movies Only' : '📺 TV Shows Only', onRemove: () => filters.setFilter('contentType', 'both') }] : []),
    ...(filters.minImdbRating > 0 ? [{ label: `⭐ ${filters.minImdbRating}+ Rating`, onRemove: () => filters.setFilter('minImdbRating', 0) }] : []),
    ...(filters.minVoteCount > 0 ? [{ label: `🗳 ${filters.minVoteCount.toLocaleString()}+ Votes`, onRemove: () => filters.setFilter('minVoteCount', 0) }] : []),
    ...filters.selectedGenres.map(g => ({ label: g, onRemove: () => filters.setFilter('selectedGenres', filters.selectedGenres.filter(x => x !== g)) })),
    ...filters.excludeGenres.map(g => ({ label: `Not: ${g}`, onRemove: () => filters.setFilter('excludeGenres', filters.excludeGenres.filter(x => x !== g)) })),
    ...(filters.genreLogic === 'AND' ? [{ label: 'Match ALL Genres', onRemove: () => filters.setFilter('genreLogic', 'OR') }] : []),
    ...(filters.minMovieRuntime > 0 ? [{ label: `Movie ${filters.minMovieRuntime}min+`, onRemove: () => filters.setFilter('minMovieRuntime', 0) }] : []),
    ...(filters.maxMovieRuntime > 0 ? [{ label: `Movie <=${filters.maxMovieRuntime}min`, onRemove: () => filters.setFilter('maxMovieRuntime', 0) }] : []),
    ...(filters.tvStatus !== 'all' ? [{ label: `📡 ${filters.tvStatus.charAt(0).toUpperCase() + filters.tvStatus.slice(1)}`, onRemove: () => filters.setFilter('tvStatus', 'all') }] : []),
    ...(filters.minSeasons > 0 ? [{ label: `📺 ${filters.minSeasons}+ Seasons`, onRemove: () => filters.setFilter('minSeasons', 0) }] : []),
    ...(filters.maxSeasons > 0 ? [{ label: `📺 ≤${filters.maxSeasons} Seasons`, onRemove: () => filters.setFilter('maxSeasons', 0) }] : []),
    ...(filters.minEpisodesPerSeason > 0 ? [{ label: `📼 ${filters.minEpisodesPerSeason}+ Eps/Season`, onRemove: () => filters.setFilter('minEpisodesPerSeason', 0) }] : []),
    ...(filters.maxEpisodesPerSeason > 0 ? [{ label: `📼 ≤${filters.maxEpisodesPerSeason} Eps/Season`, onRemove: () => filters.setFilter('maxEpisodesPerSeason', 0) }] : []),
    ...(filters.totalEpisodes !== 'all' ? [{ label: `Total Eps: ${filters.totalEpisodes}`, onRemove: () => filters.setFilter('totalEpisodes', 'all') }] : []),
    ...(filters.minEpisodeRuntime > 0 ? [{ label: `⏱ ${filters.minEpisodeRuntime}min+`, onRemove: () => filters.setFilter('minEpisodeRuntime', 0) }] : []),
    ...(filters.maxEpisodeRuntime > 0 ? [{ label: `⏱ ≤${filters.maxEpisodeRuntime}min`, onRemove: () => filters.setFilter('maxEpisodeRuntime', 0) }] : []),
    ...(filters.seasonFormat !== 'all' ? [{ label: `Format: ${filters.seasonFormat}`, onRemove: () => filters.setFilter('seasonFormat', 'all') }] : []),
    ...(filters.decade !== 'all' ? [{ label: `🗓 ${filters.decade}`, onRemove: () => filters.setFilter('decade', 'all') }] : []),
    ...(filters.yearFrom > 0 ? [{ label: `From ${filters.yearFrom}`, onRemove: () => filters.setFilter('yearFrom', 0) }] : []),
    ...(filters.yearTo > 0 ? [{ label: `To ${filters.yearTo}`, onRemove: () => filters.setFilter('yearTo', 0) }] : []),
    ...(filters.originCountry ? [{ label: `🌍 ${COUNTRIES.find(c => c.value === filters.originCountry)?.label || filters.originCountry}`, onRemove: () => filters.setFilter('originCountry', '') }] : []),
    ...(filters.africanOnly ? [{ label: `African only${filters.africanRegion !== 'all' ? `: ${filters.africanRegion.replace(/_/g, ' ')}` : ''}`, onRemove: () => { filters.setFilter('africanOnly', false); filters.setFilter('africanRegion', 'all'); } }] : []),
    ...(filters.originalLanguage ? [{ label: `🗣 ${LANGUAGES.find(l => l.value === filters.originalLanguage)?.label || filters.originalLanguage}`, onRemove: () => filters.setFilter('originalLanguage', '') }] : []),
    ...(filters.network ? [{ label: `📡 ${filters.network}`, onRemove: () => filters.setFilter('network', '') }] : []),
    ...filters.excludeCountries.map(c => ({ label: `Not: ${COUNTRIES.find(ct => ct.value === c)?.label || c}`, onRemove: () => filters.setFilter('excludeCountries', filters.excludeCountries.filter(x => x !== c)) })),
    ...(filters.maturityRating !== 'all' ? [{ label: filters.maturityRating, onRemove: () => filters.setFilter('maturityRating', 'all') }] : []),
    ...(filters.requireDub ? [{ label: '🎤 Dubbed', onRemove: () => filters.setFilter('requireDub', false) }] : []),
    ...(filters.requireSub ? [{ label: '📝 Subtitled', onRemove: () => filters.setFilter('requireSub', false) }] : []),
    ...(filters.dubLanguage ? [{ label: `Dub: ${filters.dubLanguage}`, onRemove: () => filters.setFilter('dubLanguage', '') }] : []),
    ...(filters.noSeasonBelow > 0 ? [{ label: `📊 No season below ${filters.noSeasonBelow}`, onRemove: () => filters.setFilter('noSeasonBelow', 0) }] : []),
    ...(filters.qualityTrajectory !== 'all' ? [{ label: `📈 ${filters.qualityTrajectory} quality`, onRemove: () => filters.setFilter('qualityTrajectory', 'all') }] : []),
    ...(filters.minHealthScore > 0 ? [{ label: `💚 ${filters.minHealthScore}+ Health`, onRemove: () => filters.setFilter('minHealthScore', 0) }] : []),
    ...(filters.hiddenGemMode ? [{ label: '💎 Hidden Gems', onRemove: () => filters.setFilter('hiddenGemMode', false) }] : []),
    ...(filters.minCommitmentHours > 0 ? [{ label: `⏰ ${filters.minCommitmentHours}h+`, onRemove: () => filters.setFilter('minCommitmentHours', 0) }] : []),
    ...(filters.maxCommitmentHours > 0 ? [{ label: `⏰ ≤${filters.maxCommitmentHours}h`, onRemove: () => filters.setFilter('maxCommitmentHours', 0) }] : []),
    ...(filters.maxFillerPercentage > 0 ? [{ label: `🚫 <${filters.maxFillerPercentage}% filler`, onRemove: () => filters.setFilter('maxFillerPercentage', 0) }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#05050f] text-white flex flex-col">

      {/* ── CINEMATIC HEADER ── */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/8 via-transparent to-[#8b5cf6]/5" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[200px] bg-[#6366f1]/10 rounded-full blur-[80px] -translate-y-1/2" />
        <div className="relative px-6 md:px-10 py-10 max-w-screen-2xl mx-auto w-full">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center">
                  <Search size={16} className="text-[#6366f1]" />
                </div>
                <span className="text-[#6366f1] text-xs font-bold uppercase tracking-[0.2em]">Advanced Discovery</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Discover</h1>
              <p className="text-white/40 mt-2 text-sm font-medium">
                {isLoading ? 'Searching...' : `${results.length > 0 ? `${results.length}+ results` : 'No results'}`}
                {activeFilterCount > 0 && <span className="ml-2 text-[#6366f1]">· {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Sort (desktop) */}
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
                  'lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all',
                  filtersOpen || activeFilterCount > 0
                    ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                <SlidersHorizontal size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#6366f1] text-white text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

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
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-white/[0.06]">
              {activeChips.map((chip, i) => (
                <Chip key={i} label={chip.label} onRemove={chip.onRemove} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full">

        {/* ── LEFT FILTER PANEL ── */}
        <aside className={cn(
          'lg:w-80 shrink-0 lg:border-r border-white/[0.06] bg-[#07070f] z-50 transition-all',
          filtersOpen ? 'fixed inset-0 flex flex-col' : 'hidden',
          'lg:block lg:static'
        )}>
          {/* Mobile Header */}
          <div className="lg:hidden shrink-0 sticky top-0 bg-[#07070f]/95 backdrop-blur-xl border-b border-white/10 p-4 flex justify-between items-center z-10">
            <h3 className="font-black text-lg text-white">Filters</h3>
            <button onClick={() => setFiltersOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 lg:flex-none p-5 space-y-6 lg:sticky lg:top-0 max-h-screen overflow-y-auto scrollbar-none pb-24 lg:pb-6">

            {/* ── CONTENT TYPE ── */}
            <FilterSection icon={<Clapperboard size={13} />} title="Content Type" expanded={expandedSections.content} onToggle={() => toggleSection('content')}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'both', label: 'All', icon: Zap },
                  { value: 'movie', label: 'Movies', icon: Film },
                  { value: 'tv', label: 'TV Shows', icon: Tv },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => filters.setFilter('contentType', value as any)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all',
                      filters.contentType === value
                        ? 'bg-[#6366f1]/15 border-[#6366f1]/40 text-[#6366f1]'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                    )}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* ── QUALITY ── */}
            {isMovieMode && (
              <FilterSection icon={<Clock size={13} />} title="Movie Runtime" expanded={expandedSections.commitment} onToggle={() => toggleSection('commitment')}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/30 mb-1 block">Min</label>
                    <select value={filters.minMovieRuntime} onChange={e => filters.setFilter('minMovieRuntime', Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                      <option value={0} className="bg-[#0d0d1a]">Any</option>
                      {[70, 80, 90, 100, 110, 120, 150].map(n => (
                        <option key={n} value={n} className="bg-[#0d0d1a]">{n}+ min</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 mb-1 block">Max</label>
                    <select value={filters.maxMovieRuntime} onChange={e => filters.setFilter('maxMovieRuntime', Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                      <option value={0} className="bg-[#0d0d1a]">Any</option>
                      {[80, 95, 110, 120, 150, 180].map(n => (
                        <option key={n} value={n} className="bg-[#0d0d1a]">&le;{n} min</option>
                      ))}
                    </select>
                  </div>
                </div>
              </FilterSection>
            )}

            <FilterSection icon={<Star size={13} />} title="Quality" expanded={expandedSections.quality} onToggle={() => toggleSection('quality')}>
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Min Rating {filters.minImdbRating > 0 ? `— ⭐ ${filters.minImdbRating}+` : ''}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {RATING_STEPS.map(r => (
                      <button key={r} onClick={() => filters.setFilter('minImdbRating', r)}
                        className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                          filters.minImdbRating === r
                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                        )}>
                        {r === 0 ? 'Any' : `${r}+`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Min Vote Count</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VOTE_PRESETS.map(v => (
                      <button key={v.value} onClick={() => filters.setFilter('minVoteCount', v.value)}
                        className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                          filters.minVoteCount === v.value
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                        )}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* ── GENRES ── */}
            <FilterSection icon={<Layers size={13} />} title={`Genres${filters.selectedGenres.length > 0 ? ` (${filters.selectedGenres.length})` : ''}`} expanded={expandedSections.genres} onToggle={() => toggleSection('genres')}>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map(({ label }) => {
                  const active = filters.selectedGenres.includes(label);
                  return (
                    <button key={label} onClick={() => {
                      if (active) filters.setFilter('selectedGenres', filters.selectedGenres.filter(g => g !== label));
                      else if (filters.selectedGenres.length < 5) filters.setFilter('selectedGenres', [...filters.selectedGenres, label]);
                    }}
                      className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1',
                        active
                          ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                      )}>
                      {active && <Check size={9} strokeWidth={3} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* ── GENRE LOGIC & EXCLUSION ── */}
            {filters.selectedGenres.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Genre Match</span>
                  <div className="flex rounded-lg border border-white/10 overflow-hidden">
                    <button onClick={() => filters.setFilter('genreLogic', 'OR')}
                      className={cn('px-3 py-1.5 text-xs font-bold transition-all',
                        filters.genreLogic === 'OR' ? 'bg-[#6366f1]/30 text-white' : 'bg-white/5 text-white/40'
                      )}>Any</button>
                    <button onClick={() => filters.setFilter('genreLogic', 'AND')}
                      className={cn('px-3 py-1.5 text-xs font-bold transition-all',
                        filters.genreLogic === 'AND' ? 'bg-[#6366f1]/30 text-white' : 'bg-white/5 text-white/40'
                      )}>All</button>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Exclude Genres</p>
                  <div className="flex flex-wrap gap-1.5">
                    {GENRES.filter(g => !filters.selectedGenres.includes(g.label)).map(({ label }) => {
                      const active = filters.excludeGenres.includes(label);
                      return (
                        <button key={label} onClick={() => {
                          if (active) filters.setFilter('excludeGenres', filters.excludeGenres.filter(g => g !== label));
                          else filters.setFilter('excludeGenres', [...filters.excludeGenres, label]);
                        }}
                          className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                            active
                              ? 'bg-red-500/20 border-red-500/40 text-red-400'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50'
                          )}>
                          {active && '✕ '}{label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── TV STATUS (TV only) ── */}
            {isTvMode && (
              <FilterSection icon={<BarChart2 size={13} />} title="Show Status" expanded={expandedSections.status} onToggle={() => toggleSection('status')}>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: 'all', label: 'Any', emoji: '🔀' },
                    { value: 'returning', label: 'Ongoing', emoji: '🟢' },
                    { value: 'ended', label: 'Completed', emoji: '✅' },
                    { value: 'canceled', label: 'Cancelled', emoji: '❌' },
                    { value: 'hiatus', label: 'On Hiatus', emoji: '⏸️' },
                    { value: 'upcoming', label: 'Upcoming', emoji: '🔔' },
                  ].map(s => (
                    <button key={s.value} onClick={() => filters.setFilter('tvStatus', s.value as any)}
                      className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all',
                        filters.tvStatus === s.value
                          ? 'bg-[#6366f1]/15 border-[#6366f1]/40 text-[#6366f1]'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                      )}>
                      <span>{s.emoji}</span>{s.label}
                    </button>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* ── SHOW STRUCTURE (TV only) ── */}
            {isTvMode && (
              <FilterSection icon={<Tv size={13} />} title="Show Structure" expanded={expandedSections.structure} onToggle={() => toggleSection('structure')}>
                <div className="space-y-4">

                  {/* Seasons Range */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Number of Seasons</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Min</label>
                        <div className="flex flex-wrap gap-1">
                          {[0, 1, 2, 3, 5, 10].map(n => (
                            <button key={n} onClick={() => filters.setFilter('minSeasons', n)}
                              className={cn('px-2 py-1 rounded text-xs font-bold border transition-all',
                                filters.minSeasons === n
                                  ? 'bg-[#6366f1]/20 border-[#6366f1]/50 text-[#6366f1]'
                                  : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                              )}>
                              {n === 0 ? 'Any' : n === 10 ? '10+' : n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Max</label>
                        <div className="flex flex-wrap gap-1">
                          {[0, 1, 3, 5, 8, 15].map(n => (
                            <button key={n} onClick={() => filters.setFilter('maxSeasons', n)}
                              className={cn('px-2 py-1 rounded text-xs font-bold border transition-all',
                                filters.maxSeasons === n
                                  ? 'bg-[#6366f1]/20 border-[#6366f1]/50 text-[#6366f1]'
                                  : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                              )}>
                              {n === 0 ? 'Any' : n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Episodes per Season (numeric range) */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Episodes per Season</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Min</label>
                        <select value={filters.minEpisodesPerSeason} onChange={e => filters.setFilter('minEpisodesPerSeason', Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                          <option value={0} className="bg-[#0d0d1a]">Any</option>
                          {[1, 2, 3, 5, 7, 10, 13, 18, 22, 26, 50, 100].map(n => (
                            <option key={n} value={n} className="bg-[#0d0d1a]">{n}+</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Max</label>
                        <select value={filters.maxEpisodesPerSeason} onChange={e => filters.setFilter('maxEpisodesPerSeason', Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                          <option value={0} className="bg-[#0d0d1a]">Any</option>
                          {[3, 5, 7, 10, 13, 16, 20, 26, 50, 100].map(n => (
                            <option key={n} value={n} className="bg-[#0d0d1a]">≤{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Total Episodes */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Total Episodes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: 'all', label: 'Any' },
                        { value: 'under20', label: 'Under 20' },
                        { value: '20to50', label: '20–50' },
                        { value: '50to100', label: '50–100' },
                        { value: '100plus', label: '100+' },
                      ].map(o => (
                        <button key={o.value} onClick={() => filters.setFilter('totalEpisodes', o.value as any)}
                          className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                            filters.totalEpisodes === o.value
                              ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                          )}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Episode Runtime (numeric range) */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Episode Length (min)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Min</label>
                        <select value={filters.minEpisodeRuntime} onChange={e => filters.setFilter('minEpisodeRuntime', Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                          <option value={0} className="bg-[#0d0d1a]">Any</option>
                          {[10, 15, 20, 25, 30, 40, 50, 60, 75, 90].map(n => (
                            <option key={n} value={n} className="bg-[#0d0d1a]">{n}+ min</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Max</label>
                        <select value={filters.maxEpisodeRuntime} onChange={e => filters.setFilter('maxEpisodeRuntime', Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                          <option value={0} className="bg-[#0d0d1a]">Any</option>
                          {[20, 25, 30, 45, 60, 75, 90, 120].map(n => (
                            <option key={n} value={n} className="bg-[#0d0d1a]">≤{n} min</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Season Format */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Season Format</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: 'all', label: 'Any' },
                        { value: 'ongoing', label: 'Ongoing Series' },
                        { value: 'limited', label: 'Limited Series' },
                        { value: 'miniseries', label: 'Mini-Series' },
                        { value: 'anthology', label: 'Anthology' },
                      ].map(o => (
                        <button key={o.value} onClick={() => filters.setFilter('seasonFormat', o.value as any)}
                          className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                            filters.seasonFormat === o.value
                              ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                          )}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Maturity Rating */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Maturity Rating</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['all', 'TV-Y', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA'].map(r => (
                        <button key={r} onClick={() => filters.setFilter('maturityRating', r as any)}
                          className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                            filters.maturityRating === r
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                          )}>
                          {r === 'all' ? 'Any' : r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </FilterSection>
            )}

            {/* ── COMMITMENT (TV only) ── */}
            {isTvMode && (
              <FilterSection icon={<Clock size={13} />} title="Commitment" expanded={expandedSections.commitment} onToggle={() => toggleSection('commitment')}>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Total Watch Time</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Min Hours</label>
                        <select value={filters.minCommitmentHours} onChange={e => filters.setFilter('minCommitmentHours', Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                          <option value={0} className="bg-[#0d0d1a]">Any</option>
                          {[1, 3, 5, 10, 20, 40, 80, 150].map(n => (
                            <option key={n} value={n} className="bg-[#0d0d1a]">{n}+ h</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 mb-1 block">Max Hours</label>
                        <select value={filters.maxCommitmentHours} onChange={e => filters.setFilter('maxCommitmentHours', Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                          <option value={0} className="bg-[#0d0d1a]">Any</option>
                          {[5, 10, 20, 40, 80, 150, 300].map(n => (
                            <option key={n} value={n} className="bg-[#0d0d1a]">≤{n} h</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Max Filler %</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[0, 5, 10, 15, 30].map(n => (
                        <button key={n} onClick={() => filters.setFilter('maxFillerPercentage', filters.maxFillerPercentage === n ? 0 : n)}
                          className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                            filters.maxFillerPercentage === n
                              ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                          )}>
                          {n === 0 ? 'Any' : `<${n}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </FilterSection>
            )}

            {/* ── RELEASE ERA ── */}
            <FilterSection icon={<Calendar size={13} />} title="Release Era" expanded={expandedSections.era} onToggle={() => toggleSection('era')}>
              <div className="space-y-4">
                {/* Decade presets */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Decade</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => filters.setFilter('decade', 'all')}
                      className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                        filters.decade === 'all'
                          ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                      )}>Any</button>
                    {DECADES.map(d => (
                      <button key={d} onClick={() => { filters.setFilter('decade', d as any); filters.setFilter('yearFrom', 0); filters.setFilter('yearTo', 0); }}
                        className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                          filters.decade === d
                            ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                        )}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom year range */}
                {filters.decade === 'all' && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Custom Year Range</p>
                    <div className="flex gap-2 items-center">
                      <select value={filters.yearFrom || ''} onChange={e => filters.setFilter('yearFrom', Number(e.target.value) || 0)}
                        className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                        <option value="">From</option>
                        {Array.from({ length: CURRENT_YEAR - 1960 + 1 }, (_, i) => CURRENT_YEAR - i).map(y => (
                          <option key={y} value={y} className="bg-[#0d0d1a]">{y}</option>
                        ))}
                      </select>
                      <span className="text-white/30 text-xs">—</span>
                      <select value={filters.yearTo || ''} onChange={e => filters.setFilter('yearTo', Number(e.target.value) || 0)}
                        className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-[#6366f1]/50">
                        <option value="">To</option>
                        {Array.from({ length: CURRENT_YEAR - 1960 + 1 }, (_, i) => CURRENT_YEAR - i).map(y => (
                          <option key={y} value={y} className="bg-[#0d0d1a]">{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </FilterSection>

            {/* ── ADVANCED QUALITY ── */}
            <FilterSection icon={<BarChart2 size={13} />} title="Advanced Quality" expanded={expandedSections.advanced} onToggle={() => toggleSection('advanced')}>
              <div className="space-y-4">
                {isTvMode && (
                  <>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Minimum Season Score</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[0, 6, 6.5, 7, 7.5, 8].map(n => (
                          <button key={n} onClick={() => filters.setFilter('noSeasonBelow', filters.noSeasonBelow === n ? 0 : n)}
                            className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                              filters.noSeasonBelow === n
                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                            )}>
                            {n === 0 ? 'Any' : `${n}+`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Quality Trajectory</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: 'all', label: 'Any' },
                          { value: 'rising', label: 'Gets Better 📈' },
                          { value: 'stable', label: 'Consistent 📊' },
                          { value: 'declining', label: 'Fades 📉' },
                        ].map(o => (
                          <button key={o.value} onClick={() => filters.setFilter('qualityTrajectory', o.value as any)}
                            className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                              filters.qualityTrajectory === o.value
                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                            )}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Content Health Score</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 7, 8, 9].map(n => (
                      <button key={n} onClick={() => filters.setFilter('minHealthScore', filters.minHealthScore === n ? 0 : n)}
                        className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                          filters.minHealthScore === n
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                        )}>
                        {n === 0 ? 'Any' : `${n}+`}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg border border-white/[0.06] hover:border-white/20 transition-all">
                  <input type="checkbox" checked={filters.hiddenGemMode}
                    onChange={e => filters.setFilter('hiddenGemMode', e.target.checked)}
                    className="w-4 h-4 accent-[#6366f1]" />
                  <div>
                    <span className="text-xs font-bold text-white">💎 Hidden Gem Mode</span>
                    <p className="text-[10px] text-white/30">High rating (7.5+) with low vote count — underseen quality</p>
                  </div>
                </label>
              </div>
            </FilterSection>

            {/* ── ORIGIN & LANGUAGE ── */}
            <FilterSection icon={<Globe size={13} />} title="Origin & Language" expanded={expandedSections.origin} onToggle={() => toggleSection('origin')}>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg border border-[#9ee493]/20 bg-[#9ee493]/5 hover:border-[#9ee493]/35 transition-all">
                  <input type="checkbox" checked={filters.africanOnly}
                    onChange={e => filters.setFilter('africanOnly', e.target.checked)}
                    className="w-4 h-4 accent-[#9ee493]" />
                  <div>
                    <span className="text-xs font-bold text-white">African-only discovery</span>
                    <p className="text-[10px] text-white/35">Search Nigeria, Kenya, Ghana, South Africa, Egypt, and Ethiopia when no single country is selected.</p>
                  </div>
                </label>

                {filters.africanOnly && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">African Region</p>
                    <select value={filters.africanRegion} onChange={e => filters.setFilter('africanRegion', e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#9ee493]/50 cursor-pointer">
                      <option value="all" className="bg-[#0d0d1a]">All Africa</option>
                      <option value="west_africa" className="bg-[#0d0d1a]">West Africa</option>
                      <option value="east_africa" className="bg-[#0d0d1a]">East Africa</option>
                      <option value="south_africa" className="bg-[#0d0d1a]">South Africa</option>
                      <option value="north_africa" className="bg-[#0d0d1a]">North Africa</option>
                      <option value="central_africa" className="bg-[#0d0d1a]">Central Africa</option>
                    </select>
                  </div>
                )}

                {/* Country */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Country of Origin</p>
                  <select value={filters.originCountry} onChange={e => filters.setFilter('originCountry', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6366f1]/50 cursor-pointer">
                    <option value="" className="bg-[#0d0d1a]">Any Country</option>
                    {COUNTRIES.map(c => <option key={c.value} value={c.value} className="bg-[#0d0d1a]">{c.label}</option>)}
                  </select>
                </div>

                {/* Language */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Original Language</p>
                  <select value={filters.originalLanguage} onChange={e => filters.setFilter('originalLanguage', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6366f1]/50 cursor-pointer">
                    <option value="" className="bg-[#0d0d1a]">Any Language</option>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value} className="bg-[#0d0d1a]">{l.label}</option>)}
                  </select>
                </div>

                {/* Exclude Countries */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Exclude Countries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRIES.filter(c => c.value !== filters.originCountry).map(c => {
                      const active = filters.excludeCountries.includes(c.value);
                      return (
                        <button key={c.value} onClick={() => {
                          if (active) filters.setFilter('excludeCountries', filters.excludeCountries.filter(x => x !== c.value));
                          else filters.setFilter('excludeCountries', [...filters.excludeCountries, c.value]);
                        }}
                          className={cn('px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
                            active
                              ? 'bg-red-500/20 border-red-500/40 text-red-400'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50'
                          )}>
                          {active ? '✕ ' : ''}{c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Network/Platform */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Network / Platform</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => filters.setFilter('network', '')}
                      className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                        !filters.network
                          ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                      )}>Any</button>
                    {NETWORKS.map(n => (
                      <button key={n} onClick={() => filters.setFilter('network', filters.network === n ? '' : n)}
                        className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                          filters.network === n
                            ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                        )}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* ── LANGUAGE & DUB ── */}
            <FilterSection icon={<Globe size={13} />} title="Language & Dub" expanded={expandedSections.language} onToggle={() => toggleSection('language')}>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg border border-white/[0.06] hover:border-white/20 transition-all">
                  <input type="checkbox" checked={filters.requireDub}
                    onChange={e => filters.setFilter('requireDub', e.target.checked)}
                    className="w-4 h-4 accent-[#6366f1]" />
                  <span className="text-xs font-bold text-white">🔊 Has English Dub</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg border border-white/[0.06] hover:border-white/20 transition-all">
                  <input type="checkbox" checked={filters.requireSub}
                    onChange={e => filters.setFilter('requireSub', e.target.checked)}
                    className="w-4 h-4 accent-[#6366f1]" />
                  <span className="text-xs font-bold text-white">📝 Has Subtitles</span>
                </label>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Dub Language</p>
                  <select value={filters.dubLanguage} onChange={e => filters.setFilter('dubLanguage', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6366f1]/50 cursor-pointer">
                    <option value="" className="bg-[#0d0d1a]">Any</option>
                    {['en', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'hi'].map(l => (
                      <option key={l} value={l} className="bg-[#0d0d1a]">
                        {LANGUAGES.find(la => la.value === l)?.label || l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </FilterSection>

            {/* Sort (mobile) */}
            <FilterSection icon={<Clock size={13} />} title="Sort By" expanded={false} onToggle={() => {}} className="lg:hidden">
              <div className="space-y-1.5">
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => filters.setFilter('sortBy', o.value as any)}
                    className={cn('w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                      filters.sortBy === o.value
                        ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-white'
                        : 'bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white/70'
                    )}>
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <button onClick={() => { filters.resetFilters(); setFiltersOpen(false); }}
              className="w-full py-3 rounded-xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-all flex items-center justify-center gap-2">
              <RotateCcw size={14} /> Reset All Filters
            </button>
          </div>
        </aside>

        {/* ── RESULTS GRID ── */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 size={32} className="animate-spin text-[#6366f1]" />
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
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                          filters.sortBy === o.value
                            ? 'bg-[#6366f1]/20 border-[#6366f1]/40 text-[#6366f1]'
                            : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
                        )}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {results.map((item, i) => (
                  <div key={`${item.id}-${i}`} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${Math.min(i * 30, 400)}ms`, animationFillMode: 'backwards' }}>
                    <ContentCard
                      id={item.id.toString()}
                      title={item.title}
                      posterPath={item.poster_path}
                      type={item.type}
                      rating={item.vote_average}
                      year={item.release_date?.split('-')[0]}
                      priority={i < 10}
                    />
                  </div>
                ))}
              </div>
              <div ref={observerTarget} className="min-h-10 w-full flex items-center justify-center mt-4">
                {isLoadingMore && <Loader2 size={24} className="animate-spin text-[#6366f1]" />}
                {!isLoadingMore && hasMore && (
                  <button
                    onClick={loadMore}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2 text-xs font-bold text-white/45 transition hover:border-white/25 hover:text-white"
                  >
                    Load more precise matches
                  </button>
                )}
                {!hasMore && (
                  <p className="text-xs font-semibold text-white/30">
                    End of precise matches for this filter set.
                  </p>
                )}
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
                className="mt-8 px-6 py-3 bg-[#6366f1]/15 hover:bg-[#6366f1]/25 border border-[#6366f1]/30 text-[#6366f1] rounded-xl font-bold text-sm transition-all">
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

function FilterSection({ icon, title, children, expanded, onToggle, className }: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <button onClick={onToggle} className="flex items-center justify-between w-full group cursor-pointer">
        <div className="flex items-center gap-2">
          {icon && <span className="text-white/30 group-hover:text-white/50 transition-colors">{icon}</span>}
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 group-hover:text-white/50 transition-colors">{title}</span>
        </div>
        {expanded
          ? <ChevronUp size={12} className="text-white/20 group-hover:text-white/40" />
          : <ChevronDown size={12} className="text-white/20 group-hover:text-white/40" />
        }
      </button>
      {expanded && children}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#6366f1]/10 border border-[#6366f1]/25 text-[#6366f1] px-3 py-1.5 rounded-full text-xs font-semibold">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors ml-0.5">
        <X size={10} strokeWidth={3} />
      </button>
    </div>
  );
}
