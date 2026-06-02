'use client';

import { useMemo } from 'react';

interface CommitmentCalculatorProps {
  totalEpisodes: number;
  avgRuntime: number;
  showTitle: string;
}

export function CommitmentCalculator({ totalEpisodes, avgRuntime, showTitle }: CommitmentCalculatorProps) {
  const totalMinutes = totalEpisodes * (avgRuntime || 45);
  const totalHours = totalMinutes / 60;
  
  const calculations = useMemo(() => {
    return [
      {
        label: 'Hardcore Binge',
        rate: '6 hours / day',
        time: Math.ceil(totalHours / 6),
        unit: 'days'
      },
      {
        label: 'Balanced Viewing',
        rate: '2 hours / day',
        time: Math.ceil(totalHours / 2),
        unit: 'days'
      },
      {
        label: 'Casual Savoring',
        rate: '2 episodes / week',
        time: Math.ceil(totalEpisodes / 2),
        unit: 'weeks'
      }
    ];
  }, [totalHours, totalEpisodes]);

  return (
    <div className="bg-surface/50 border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⏳</span>
        <div>
          <h3 className="font-bold">Commitment Calculator</h3>
          <p className="text-xs text-muted">How long will it take you to finish {showTitle}?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {calculations.map((calc) => (
          <div key={calc.label} className="bg-bg/40 border border-border/50 rounded-lg p-4">
            <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
              {calc.label}
            </div>
            <div className="text-2xl font-black">
              {calc.time} <span className="text-sm font-normal text-muted">{calc.unit}</span>
            </div>
            <div className="text-[10px] text-muted mt-1">
              at {calc.rate}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/30 text-center">
        <p className="text-sm text-muted">
          Total commitment: <span className="text-white font-bold">{totalHours.toFixed(1)} hours</span> of content
        </p>
      </div>
    </div>
  );
}
