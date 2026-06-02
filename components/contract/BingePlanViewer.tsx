'use client';

import { Calendar, Clock, PlayCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface BingeDay {
  date: string;
  episodes: number[];
  stopAfter: string;
  stopReason: string;
  estimatedMinutes: number;
  breakQuality: number;
}

export interface BingePlanViewerProps {
  days: BingeDay[];
  totalEpisodes: number;
  estimatedHours: number;
}

export function BingePlanViewer({ days, totalEpisodes, estimatedHours }: BingePlanViewerProps) {
  return (
    <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-transparent p-6 border-b border-white/10">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <Calendar size={20} className="text-[#8B5CF6]" />
          Your Binge Itinerary
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          {totalEpisodes} episodes • ~{estimatedHours.toFixed(1)} hours total
        </p>
      </div>

      {/* Days List */}
      <div className="p-4 space-y-4">
        {days.map((day, idx) => {
          const dateObj = new Date(day.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
          const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div 
              key={idx}
              className="relative pl-8 pb-4 last:pb-0"
            >
              {/* Timeline line */}
              {idx !== days.length - 1 && (
                <div className="absolute left-3 top-6 bottom-0 w-px bg-white/10" />
              )}
              
              {/* Timeline dot */}
              <div className="absolute left-2 top-2 w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.5)]" />

              <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-bold text-lg">
                    {dayName} <span className="text-slate-500 text-sm font-normal ml-2">{shortDate}</span>
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                    <Clock size={14} />
                    {Math.round(day.estimatedMinutes / 60 * 10) / 10}h
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-center gap-2 text-[#00BFFF] font-medium text-sm">
                    <PlayCircle size={16} />
                    Watch {day.episodes.length} episode{day.episodes.length > 1 ? 's' : ''}
                  </div>
                  
                  <div className="flex-1 bg-black/40 rounded-lg p-3 border border-white/5 flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {day.breakQuality >= 0.8 ? (
                        <CheckCircle2 size={16} className="text-green-400" />
                      ) : (
                        <AlertCircle size={16} className="text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm font-bold">Stop after {day.stopAfter}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{day.stopReason}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Just a dummy import for CheckCircle2 to avoid TS errors
import { CheckCircle2 } from 'lucide-react';
