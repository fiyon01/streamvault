'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface SeasonData {
  seasonNumber: number;
  averageRating: number;
  episodeCount: number;
  bestEpisode?: {
    episodeNumber: number;
    rating: number;
    title: string;
  };
  worstEpisode?: {
    episodeNumber: number;
    rating: number;
    title: string;
  };
  fillerPercentage?: number;
  airDate?: string;
}

interface SeasonQualityDashboardProps {
  seasons: SeasonData[];
  showTitle: string;
  isCompleted?: boolean;
}

export function SeasonQualityDashboard({ seasons, showTitle, isCompleted }: SeasonQualityDashboardProps) {
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  
  // Calculate overall stats
  const averageRating = seasons.reduce((acc, s) => acc + s.averageRating, 0) / (seasons.length || 1);
  const bestSeason = [...seasons].sort((a, b) => b.averageRating - a.averageRating)[0];
  const worstSeason = [...seasons].sort((a, b) => a.averageRating - b.averageRating)[0];
  const trending = seasons.length > 1 && seasons[seasons.length - 1]?.averageRating > seasons[0]?.averageRating ? 'improving' : 
                    seasons.length > 1 && seasons[seasons.length - 1]?.averageRating < seasons[0]?.averageRating ? 'declining' : 'stable';
  
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-500';
    if (rating >= 7) return 'text-yellow-500';
    if (rating >= 6) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const getRatingBarColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-500';
    if (rating >= 7) return 'bg-yellow-500';
    if (rating >= 6) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">📊 Season Quality Dashboard</h2>
            <p className="text-muted text-sm mt-1">
              See exactly how each season performs before you commit
            </p>
          </div>
          {isCompleted && (
            <div className="bg-success/10 text-success px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <span>✓</span> Completed Series
            </div>
          )}
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-bg/30 border-b border-border">
        <div>
          <div className="text-muted text-sm">Overall Average</div>
          <div className="text-2xl font-bold">{averageRating.toFixed(1)} ⭐</div>
        </div>
        <div>
          <div className="text-muted text-sm">Best Season</div>
          <div className="text-2xl font-bold text-green-500">
            S{bestSeason?.seasonNumber} ({bestSeason?.averageRating.toFixed(1)})
          </div>
        </div>
        <div>
          <div className="text-muted text-sm">Worst Season</div>
          <div className="text-2xl font-bold text-red-500">
            S{worstSeason?.seasonNumber} ({worstSeason?.averageRating.toFixed(1)})
          </div>
        </div>
        <div>
          <div className="text-muted text-sm">Trend</div>
          <div className="text-2xl font-bold">
            {trending === 'improving' && '📈 Improving'}
            {trending === 'declining' && '📉 Declining'}
            {trending === 'stable' && '➡️ Stable'}
          </div>
        </div>
      </div>
      
      {/* Season List */}
      <div className="divide-y divide-border">
        {seasons.map((season, idx) => (
          <div key={season.seasonNumber} className="p-4 hover:bg-bg/30 transition">
            {/* Season Header */}
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedSeason(expandedSeason === season.seasonNumber ? null : season.seasonNumber)}
            >
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">S{season.seasonNumber}</div>
                  {idx === 0 && <div className="text-xs text-muted">Pilot</div>}
                  {idx === seasons.length - 1 && <div className="text-xs text-muted">Finale</div>}
                </div>
                
                <div className="w-48">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{season.episodeCount} episodes</span>
                    <span className={getRatingColor(season.averageRating)}>
                      {season.averageRating.toFixed(1)} ⭐
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className={cn("h-2 rounded-full transition-all", getRatingBarColor(season.averageRating))}
                      style={{ width: `${(season.averageRating / 10) * 100}%` }}
                    />
                  </div>
                </div>
                
                {season.fillerPercentage && season.fillerPercentage > 20 && (
                  <div className="text-orange-500 text-sm flex items-center gap-1">
                    <span>⚠️</span> {season.fillerPercentage}% filler
                  </div>
                )}
              </div>
              
              <div className="text-muted">
                {expandedSeason === season.seasonNumber ? '▼' : '▶'}
              </div>
            </div>
            
            {/* Expanded Details */}
            {expandedSeason === season.seasonNumber && (
              <div className="mt-4 pl-16 space-y-3">
                {season.bestEpisode && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">🏆 Best Episode:</span>
                    <span>Episode {season.bestEpisode.episodeNumber}</span>
                    <span className="text-muted">-</span>
                    <span>{season.bestEpisode.title}</span>
                    <span className="text-green-500">({season.bestEpisode.rating.toFixed(1)}⭐)</span>
                  </div>
                )}
                
                {season.worstEpisode && season.worstEpisode.rating < 6.5 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-orange-500">⚠️ Weakest Episode:</span>
                    <span>Episode {season.worstEpisode.episodeNumber}</span>
                    <span className="text-muted">-</span>
                    <span>{season.worstEpisode.title}</span>
                    <span className="text-orange-500">({season.worstEpisode.rating.toFixed(1)}⭐)</span>
                  </div>
                )}
                
                {season.airDate && (
                  <div className="text-xs text-muted">
                    Aired: {new Date(season.airDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Overall Verdict */}
      <div className="p-6 bg-bg/30 border-t border-border">
        {trending === 'improving' && (
          <div className="flex items-start gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <h4 className="font-semibold text-green-500">The show gets better over time</h4>
              <p className="text-sm text-muted">Stick with it through the early seasons, the payoff is worth it.</p>
            </div>
          </div>
        )}
        {trending === 'declining' && (
          <div className="flex items-start gap-3">
            <span className="text-2xl">📉</span>
            <div>
              <h4 className="font-semibold text-red-500">Quality drops in later seasons</h4>
              <p className="text-sm text-muted">You might want to stop watching before the final seasons.</p>
            </div>
          </div>
        )}
        {trending === 'stable' && (
          <div className="flex items-start gap-3">
            <span className="text-2xl">➡️</span>
            <div>
              <h4 className="font-semibold text-yellow-500">Consistent quality</h4>
              <p className="text-sm text-muted">The show maintains a steady level of quality throughout.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
