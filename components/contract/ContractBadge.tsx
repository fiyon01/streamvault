'use client';

import { Target, Zap, Coffee, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ContractBadgeProps {
  mode: 'casual' | 'committed' | 'binge';
  details?: string;
  onClick?: () => void;
  className?: string;
}

export function ContractBadge({ mode, details, onClick, className }: ContractBadgeProps) {
  const config = {
    casual: {
      icon: <Coffee size={16} />,
      label: 'Casual',
      colors: 'bg-slate-800/50 text-slate-300 border-slate-700',
      hover: 'hover:bg-slate-700/50'
    },
    committed: {
      icon: <Target size={16} />,
      label: 'Committed',
      colors: 'bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/30',
      hover: 'hover:bg-[#00BFFF]/20'
    },
    binge: {
      icon: <Zap size={16} />,
      label: 'Binge Plan',
      colors: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30',
      hover: 'hover:bg-[#8B5CF6]/20'
    }
  };

  const { icon, label, colors, hover } = config[mode] || config.casual;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
        colors,
        onClick && hover,
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default',
        className
      )}
    >
      {icon}
      <span className="font-bold">{label}</span>
      {details && (
        <>
          <span className="w-1 h-1 rounded-full bg-current opacity-50" />
          <span className="opacity-80">{details}</span>
        </>
      )}
    </button>
  );
}
