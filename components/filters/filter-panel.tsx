'use client';

import { useFilterStore } from '@/store/filter-store';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const LANGUAGES = ['English', 'Spanish', 'Korean', 'Japanese', 'Hindi', 'French', 'German', 'Italian'];
const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-14', 'TV-MA'];

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPanel({ isOpen, onClose }: FilterPanelProps) {
  const filters = useFilterStore();
  const [activeTab, setActiveTab] = useState<'tv' | 'movie' | 'general'>('tv');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Advanced Filters</h2>
          <button onClick={onClose} className="text-2xl hover:text-accent">×</button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: 'tv', label: 'TV Shows', icon: '📺' },
            { id: 'movie', label: 'Movies', icon: '🎬' },
            { id: 'general', label: 'General', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-3 text-center font-medium transition",
                activeTab === tab.id ? "text-accent border-b-2 border-accent" : "text-muted"
              )}
            >
              <span className="mr-1">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-4 space-y-6">
          {/* TV SHOW FILTERS */}
          {activeTab === 'tv' && (
            <>
              {/* Season Count */}
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Seasons</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <button
                      key={num}
                      onClick={() => filters.setFilter('minSeasons', num)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition",
                        filters.minSeasons === num 
                          ? "bg-accent text-white" 
                          : "bg-bg hover:bg-bg/80"
                      )}
                    >
                      {num}+
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Completed Series Only */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.completedOnly}
                  onChange={(e) => filters.setFilter('completedOnly', e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span>Completed series only (no cancelled shows)</span>
              </label>
              
              {/* Episodes per Season */}
              <div>
                <label className="block text-sm font-medium mb-2">Min Episodes Per Season</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 10, 13, 20, 22, 24].map(num => (
                    <button
                      key={num}
                      onClick={() => filters.setFilter('minEpisodesPerSeason', num)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition",
                        filters.minEpisodesPerSeason === num 
                          ? "bg-accent text-white" 
                          : "bg-bg hover:bg-bg/80"
                      )}
                    >
                      {num === 0 ? 'Any' : `${num}+`}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Season Quality */}
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Season Rating</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={filters.minSeasonRating}
                    onChange={(e) => filters.setFilter('minSeasonRating', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">
                    {filters.minSeasonRating > 0 ? filters.minSeasonRating : 'Any'}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">Every season must meet this rating</p>
              </div>
              
              {/* Finale Better Than Pilot */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.finaleBetterThanPilot}
                  onChange={(e) => filters.setFilter('finaleBetterThanPilot', e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span>Finale rated higher than pilot (satisfying ending)</span>
              </label>
              
              {/* Filler Episodes */}
              <div>
                <label className="block text-sm font-medium mb-2">Max Filler Percentage</label>
                <div className="flex gap-2">
                  {[0, 10, 20, 30].map(pct => (
                    <button
                      key={pct}
                      onClick={() => filters.setFilter('maxFillerPercentage', pct)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition",
                        filters.maxFillerPercentage === pct 
                          ? "bg-accent text-white" 
                          : "bg-bg hover:bg-bg/80"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    onClick={() => filters.setFilter('maxFillerPercentage', null)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-bg hover:bg-bg/80"
                  >
                    Any
                  </button>
                </div>
              </div>
            </>
          )}
          
          {/* MOVIE FILTERS */}
          {activeTab === 'movie' && (
            <>
              {/* Runtime */}
              <div>
                <label className="block text-sm font-medium mb-2">Runtime (minutes)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted">Min</label>
                    <select
                      value={filters.minRuntime || ''}
                      onChange={(e) => filters.setFilter('minRuntime', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Any</option>
                      <option value="60">60</option>
                      <option value="90">90</option>
                      <option value="120">120</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted">Max</label>
                    <select
                      value={filters.maxRuntime || ''}
                      onChange={(e) => filters.setFilter('maxRuntime', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Any</option>
                      <option value="90">Under 90</option>
                      <option value="120">Under 120</option>
                      <option value="150">Under 150</option>
                      <option value="180">Under 180</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Awards */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.oscarWinner}
                    onChange={(e) => filters.setFilter('oscarWinner', e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span>🏆 Oscar Winner</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.oscarNominated}
                    onChange={(e) => filters.setFilter('oscarNominated', e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span>⭐ Oscar Nominated</span>
                </label>
              </div>
            </>
          )}
          
          {/* GENERAL FILTERS */}
          {activeTab === 'general' && (
              <>
              {/* IMDb Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Minimum IMDb Rating</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={filters.minImdbRating}
                    onChange={(e) => filters.setFilter('minImdbRating', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm w-12">{filters.minImdbRating > 0 ? filters.minImdbRating : 'Any'}</span>
                </div>
              </div>
              
              {/* Genres */}
              <div>
                <label className="block text-sm font-medium mb-2">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(genre => (
                    <button
                      key={genre}
                      onClick={() => {
                        if (filters.selectedGenres.includes(genre)) {
                          filters.setFilter('selectedGenres', filters.selectedGenres.filter(g => g !== genre));
                        } else if (filters.selectedGenres.length < 5) {
                          filters.setFilter('selectedGenres', [...filters.selectedGenres, genre]);
                        }
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm transition",
                        filters.selectedGenres.includes(genre)
                          ? "bg-accent text-white"
                          : "bg-bg hover:bg-bg/80"
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                {filters.selectedGenres.length > 0 && (
                  <p className="text-xs text-muted mt-1">Selected: {filters.selectedGenres.join(', ')}</p>
                )}
              </div>
              
              {/* Decades */}
              <div>
                <label className="block text-sm font-medium mb-2">Decades</label>
                <div className="flex flex-wrap gap-2">
                  {DECADES.map(decade => (
                    <button
                      key={decade}
                      onClick={() => {
                        if (filters.selectedDecades.includes(decade)) {
                          filters.setFilter('selectedDecades', filters.selectedDecades.filter(d => d !== decade));
                        } else {
                          filters.setFilter('selectedDecades', [...filters.selectedDecades, decade]);
                        }
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm transition",
                        filters.selectedDecades.includes(decade)
                          ? "bg-accent text-white"
                          : "bg-bg hover:bg-bg/80"
                      )}
                    >
                      {decade}s
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Content Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Content Rating</label>
                <div className="flex flex-wrap gap-2">
                  {RATINGS.map(rating => (
                    <button
                      key={rating}
                      onClick={() => {
                        if (filters.contentRatings.includes(rating)) {
                          filters.setFilter('contentRatings', filters.contentRatings.filter(r => r !== rating));
                        } else {
                          filters.setFilter('contentRatings', [...filters.contentRatings, rating]);
                        }
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm transition",
                        filters.contentRatings.includes(rating)
                          ? "bg-accent text-white"
                          : "bg-bg hover:bg-bg/80"
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Total Hours Commitment */}
              <div>
                <label className="block text-sm font-medium mb-2">Max Total Hours</label>
                <div className="flex gap-2">
                  {[10, 20, 50, 100, 200].map(hours => (
                    <button
                      key={hours}
                      onClick={() => filters.setFilter('maxTotalHours', hours)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition",
                        filters.maxTotalHours === hours 
                          ? "bg-accent text-white" 
                          : "bg-bg hover:bg-bg/80"
                      )}
                    >
                      {hours}h
                    </button>
                  ))}
                  <button
                    onClick={() => filters.setFilter('maxTotalHours', null)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-bg hover:bg-bg/80"
                  >
                    Any
                  </button>
                </div>
              </div>
              
              {/* Hidden Gems */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hiddenGem}
                  onChange={(e) => filters.setFilter('hiddenGem', e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span>💎 Hidden Gems (under 50k votes)</span>
              </label>
            </>
          )}
          
          {/* Filter Logic */}
          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium mb-2">Filter Logic</label>
            <div className="flex gap-3">
              <button
                onClick={() => filters.setFilter('filterLogic', 'AND')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition",
                  filters.filterLogic === 'AND' ? "bg-accent text-white" : "bg-bg"
                )}
              >
                AND (Strict)
              </button>
              <button
                onClick={() => filters.setFilter('filterLogic', 'OR')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition",
                  filters.filterLogic === 'OR' ? "bg-accent text-white" : "bg-bg"
                )}
              >
                OR (Flexible)
              </button>
            </div>
          </div>
          
          {/* Sort */}
          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium mb-2">Sort By</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => filters.setFilter('sortBy', e.target.value as any)}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="rating">IMDb Rating</option>
                <option value="recent">Release Date</option>
                <option value="popularity">Popularity</option>
                <option value="runtime">Runtime</option>
                <option value="total-hours">Total Hours</option>
              </select>
              <button
                onClick={() => filters.setFilter('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc')}
                className="bg-bg border border-border rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-1"
              >
                {filters.sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="border-t border-border pt-4 flex gap-3">
            <button
              onClick={() => filters.resetFilters()}
              className="flex-1 py-2 bg-danger/10 text-danger rounded-lg text-sm font-medium hover:bg-danger/20"
            >
              Reset All Filters
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-accent text-white rounded-lg text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
