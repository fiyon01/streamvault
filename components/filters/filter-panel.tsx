'use client';

import { useFilterStore } from '@/store/filter-store';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Tv, Film, Settings2, X, Check } from 'lucide-react';

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const COUNTRIES = ['US', 'UK', 'South Korea', 'Japan', 'France', 'India', 'Canada', 'Australia'];
const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-14', 'TV-MA'];

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPanel({ isOpen, onClose }: FilterPanelProps) {
  const filters = useFilterStore();
  const [activeTab, setActiveTab] = useState<'tv' | 'movie' | 'general'>('tv');

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      {/* Heavy Cinematic Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Immersive Command Center Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0c1015]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Sleek Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center border border-accent/30">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">StreamVault Command Center</h2>
              <p className="text-xs text-muted">Advanced filtering engine</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Vertical Tabs */}
          <div className="w-full md:w-64 border-r border-white/10 bg-black/20 p-6 flex flex-col gap-3 overflow-y-auto">
            <button
              onClick={() => setActiveTab('tv')}
              className={cn(
                "flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-medium text-left",
                activeTab === 'tv' 
                  ? "bg-accent text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-white/10" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Tv size={20} /> Television
            </button>
            <button
              onClick={() => setActiveTab('movie')}
              className={cn(
                "flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-medium text-left",
                activeTab === 'movie' 
                  ? "bg-accent text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-white/10" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Film size={20} /> Movies
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                "flex items-center gap-3 w-full p-4 rounded-2xl transition-all font-medium text-left",
                activeTab === 'general' 
                  ? "bg-accent text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-white/10" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Settings2 size={20} /> General & Sort
            </button>

            <div className="mt-auto pt-6">
              <button
                onClick={() => { filters.resetFilters(); onClose(); }}
                className="w-full py-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-semibold hover:bg-danger/20 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          </div>
          
          {/* Active Tab Settings */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-10 hide-scrollbar">
            
            {/* SHARED FILTERS (TV & MOVIE) */}
            {activeTab !== 'general' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                
                {/* Premium Genre Tokens */}
                <div>
                  <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Select Genres</label>
                  <div className="flex flex-wrap gap-3">
                    {GENRES.map(genre => {
                      const isActive = filters.selectedGenres.includes(genre);
                      return (
                        <button
                          key={genre}
                          onClick={() => {
                            if (isActive) {
                              filters.setFilter('selectedGenres', filters.selectedGenres.filter((g: string) => g !== genre));
                            } else if (filters.selectedGenres.length < 5) {
                              filters.setFilter('selectedGenres', [...filters.selectedGenres, genre]);
                            }
                          }}
                          className={cn(
                            "px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 border",
                            isActive
                              ? "bg-white text-black border-white shadow-lg scale-105"
                              : "bg-black/40 text-slate-300 border-white/10 hover:border-white/30 hover:bg-white/5"
                          )}
                        >
                          {isActive && <Check size={14} />} {genre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Animation Mode */}
                <div>
                  <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Animation Filtering</label>
                  <div className="grid md:grid-cols-3 gap-3">
                    <button
                      onClick={() => filters.setFilter('animationMode', 'include')}
                      className={cn(
                        "p-4 rounded-2xl border text-sm font-bold transition-all text-left",
                        filters.animationMode === 'include'
                          ? "bg-white text-black border-white shadow-lg"
                          : "bg-black/40 text-slate-300 border-white/10 hover:border-white/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {filters.animationMode === 'include' && <Check size={16} />} 
                        Include All
                      </div>
                      <div className="text-xs font-normal opacity-70">Live-action & Animation</div>
                    </button>
                    
                    <button
                      onClick={() => filters.setFilter('animationMode', 'exclude')}
                      className={cn(
                        "p-4 rounded-2xl border text-sm font-bold transition-all text-left",
                        filters.animationMode === 'exclude'
                          ? "bg-white text-black border-white shadow-lg"
                          : "bg-black/40 text-slate-300 border-white/10 hover:border-white/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {filters.animationMode === 'exclude' && <Check size={16} />} 
                        Live-Action Only
                      </div>
                      <div className="text-xs font-normal opacity-70">Strictly no cartoons/anime</div>
                    </button>

                    <button
                      onClick={() => filters.setFilter('animationMode', 'anime-only')}
                      className={cn(
                        "p-4 rounded-2xl border text-sm font-bold transition-all text-left",
                        filters.animationMode === 'anime-only'
                          ? "bg-accent text-white border-accent shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                          : "bg-black/40 text-slate-300 border-white/10 hover:border-white/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {filters.animationMode === 'anime-only' && <Check size={16} />} 
                        Anime Only
                      </div>
                      <div className="text-xs font-normal opacity-70">Japanese Animation only</div>
                    </button>
                  </div>
                </div>

                {/* Decades & Countries Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Decades</label>
                    <div className="flex flex-wrap gap-2">
                      {DECADES.map(decade => {
                        const isActive = filters.selectedDecades.includes(decade);
                        return (
                          <button
                            key={decade}
                            onClick={() => {
                              if (isActive) filters.setFilter('selectedDecades', filters.selectedDecades.filter((d: number) => d !== decade));
                              else filters.setFilter('selectedDecades', [...filters.selectedDecades, decade]);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                              isActive ? "bg-accent/20 text-accent border-accent/50" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5"
                            )}
                          >
                            {decade}s
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Origin</label>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRIES.map(country => {
                        const isActive = (filters.countries || []).includes(country);
                        return (
                          <button
                            key={country}
                            onClick={() => {
                              const current = filters.countries || [];
                              if (isActive) filters.setFilter('countries', current.filter((c: string) => c !== country));
                              else filters.setFilter('countries', [...current, country]);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                              isActive ? "bg-accent/20 text-accent border-accent/50" : "bg-black/40 text-slate-400 border-white/5 hover:bg-white/5"
                            )}
                          >
                            {country}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TV SHOW FILTERS */}
            {activeTab === 'tv' && (
              <div className="space-y-10 animate-in fade-in duration-300 pt-10 border-t border-white/5 mt-10">
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Minimum Seasons</label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 5, 8].map(num => (
                        <button
                          key={num}
                          onClick={() => filters.setFilter('minSeasons', num)}
                          className={cn(
                            "w-12 h-12 rounded-xl text-sm font-bold transition-all border flex items-center justify-center",
                            filters.minSeasons === num 
                              ? "bg-white text-black border-white shadow-lg" 
                              : "bg-black/40 text-slate-400 border-white/10 hover:border-white/30"
                          )}
                        >
                          {num}+
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Episodes / Season</label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 10, 13, 20].map(num => (
                        <button
                          key={num}
                          onClick={() => filters.setFilter('minEpisodesPerSeason', num)}
                          className={cn(
                            "px-4 py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center",
                            filters.minEpisodesPerSeason === num 
                              ? "bg-white text-black border-white shadow-lg" 
                              : "bg-black/40 text-slate-400 border-white/10 hover:border-white/30"
                          )}
                        >
                          {num === 0 ? 'Any' : `${num}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <label className="text-sm font-bold uppercase tracking-widest text-slate-400 block">Quality Control</label>
                  
                  <label className="flex items-center gap-4 cursor-pointer group bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition">
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border transition", filters.completedOnly ? "bg-accent border-accent" : "bg-black/40 border-white/20")}>
                      {filters.completedOnly && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.completedOnly} onChange={(e) => filters.setFilter('completedOnly', e.target.checked)} />
                    <div>
                      <div className="font-semibold text-white group-hover:text-accent transition">Completed series only</div>
                      <div className="text-xs text-slate-500">Hide shows that were cancelled or are still airing.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-4 cursor-pointer group bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition">
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border transition", filters.finaleBetterThanPilot ? "bg-accent border-accent" : "bg-black/40 border-white/20")}>
                      {filters.finaleBetterThanPilot && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.finaleBetterThanPilot} onChange={(e) => filters.setFilter('finaleBetterThanPilot', e.target.checked)} />
                    <div>
                      <div className="font-semibold text-white group-hover:text-accent transition">Satisfying Ending Guarantee</div>
                      <div className="text-xs text-slate-500">Finale episode is rated higher than the pilot.</div>
                    </div>
                  </label>
                </div>

              </div>
            )}
            
            {/* MOVIE FILTERS */}
            {activeTab === 'movie' && (
              <div className="space-y-10 animate-in fade-in duration-300 pt-10 border-t border-white/5 mt-10">
                <div>
                  <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Runtime (minutes)</label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                      <label className="text-xs text-muted font-semibold uppercase block mb-3">Min Minutes</label>
                      <select
                        value={filters.minRuntime || ''}
                        onChange={(e) => filters.setFilter('minRuntime', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-transparent text-xl font-bold text-white focus:outline-none"
                      >
                        <option value="" className="bg-[#0c1015]">Any length</option>
                        <option value="60" className="bg-[#0c1015]">60+ mins</option>
                        <option value="90" className="bg-[#0c1015]">90+ mins</option>
                        <option value="120" className="bg-[#0c1015]">120+ mins</option>
                      </select>
                    </div>
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                      <label className="text-xs text-muted font-semibold uppercase block mb-3">Max Minutes</label>
                      <select
                        value={filters.maxRuntime || ''}
                        onChange={(e) => filters.setFilter('maxRuntime', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-transparent text-xl font-bold text-white focus:outline-none"
                      >
                        <option value="" className="bg-[#0c1015]">Any length</option>
                        <option value="90" className="bg-[#0c1015]">Under 90</option>
                        <option value="120" className="bg-[#0c1015]">Under 120</option>
                        <option value="150" className="bg-[#0c1015]">Under 150</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <label className="text-sm font-bold uppercase tracking-widest text-slate-400 block">Accolades</label>
                  <label className="flex items-center gap-4 cursor-pointer group bg-black/20 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition">
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border transition", filters.oscarWinner ? "bg-accent border-accent" : "bg-black/40 border-white/20")}>
                      {filters.oscarWinner && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.oscarWinner} onChange={(e) => filters.setFilter('oscarWinner', e.target.checked)} />
                    <div>
                      <div className="font-semibold text-white group-hover:text-accent transition">Oscar Winner 🏆</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
            
            {/* GENERAL FILTERS */}
            {activeTab === 'general' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-bold uppercase tracking-widest text-slate-400">Minimum IMDb Rating</label>
                    <span className="text-2xl font-black text-accent">{filters.minImdbRating > 0 ? `${filters.minImdbRating}.0` : 'Any'}</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={10} step={0.5}
                    value={filters.minImdbRating}
                    onChange={(e) => filters.setFilter('minImdbRating', parseFloat(e.target.value))}
                    className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 block">Content Rating</label>
                  <div className="flex flex-wrap gap-2">
                    {RATINGS.map(rating => (
                      <button
                        key={rating}
                        onClick={() => {
                          if (filters.contentRatings.includes(rating)) filters.setFilter('contentRatings', filters.contentRatings.filter((r: string) => r !== rating));
                          else filters.setFilter('contentRatings', [...filters.contentRatings, rating]);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-all border",
                          filters.contentRatings.includes(rating) ? "bg-white text-black border-white" : "bg-black/40 text-slate-400 border-white/10"
                        )}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                    <label className="text-xs text-muted font-bold uppercase tracking-wider block mb-3">Sort Results By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => filters.setFilter('sortBy', e.target.value as any)}
                      className="w-full bg-transparent text-lg font-bold text-white focus:outline-none"
                    >
                      <option value="rating" className="bg-[#0c1015]">IMDb Rating</option>
                      <option value="recent" className="bg-[#0c1015]">Release Date</option>
                      <option value="popularity" className="bg-[#0c1015]">Popularity</option>
                    </select>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
                    <label className="text-xs text-muted font-bold uppercase tracking-wider block mb-3">Order</label>
                    <button
                      onClick={() => filters.setFilter('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="text-lg font-bold text-white w-full text-left"
                    >
                      {filters.sortDirection === 'asc' ? '↑ Ascending (Low to High)' : '↓ Descending (High to Low)'}
                    </button>
                  </div>
                </div>
                
              </div>
            )}
            
          </div>
        </div>

        {/* Floating Apply Action */}
        <div className="border-t border-white/10 bg-black/40 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Show Results
          </button>
        </div>

      </div>
    </div>
  );
}
