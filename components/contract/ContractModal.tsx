'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Target, Zap, Coffee, X, Calendar, CheckCircle2 } from 'lucide-react';

export interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: 'casual' | 'committed' | 'binge') => void;
  title: string;
}

export function ContractModal({ isOpen, onClose, onSelect, title }: ContractModalProps) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);

  if (!isOpen) return null;

  const modes = [
    {
      id: 'casual',
      title: 'Casual',
      description: 'No pressure, just watch',
      icon: <Coffee size={24} />,
      color: 'text-slate-400',
      bgHover: 'hover:bg-slate-800',
      borderHover: 'hover:border-slate-500'
    },
    {
      id: 'committed',
      title: 'Committed',
      description: 'Remind me at my usual time',
      icon: <Target size={24} />,
      color: 'text-[#00BFFF]',
      bgHover: 'hover:bg-[#00BFFF]/10',
      borderHover: 'hover:border-[#00BFFF]/50'
    },
    {
      id: 'binge',
      title: 'Binge',
      description: 'Plan it to finish by a date',
      icon: <Zap size={24} />,
      color: 'text-[#8B5CF6]',
      bgHover: 'hover:bg-[#8B5CF6]/10',
      borderHover: 'hover:border-[#8B5CF6]/50'
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              How do you want to watch <span className="text-[#8B5CF6]">{title}</span>?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Netflix wants you watching more. We want you watching smarter.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onSelect(mode.id as any)}
                onMouseEnter={() => setHoveredMode(mode.id)}
                onMouseLeave={() => setHoveredMode(null)}
                className={cn(
                  'flex flex-row sm:flex-col items-center sm:justify-center gap-4 sm:gap-3 p-4 sm:p-6 rounded-2xl border border-white/5 bg-white/5 transition-all duration-300 text-left sm:text-center',
                  mode.bgHover,
                  mode.borderHover,
                  hoveredMode === mode.id ? 'scale-[1.02]' : 'scale-100'
                )}
              >
                <div className={cn('p-3 rounded-full bg-white/5', mode.color)}>
                  {mode.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{mode.title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">{mode.description}</p>
                </div>
              </button>
            ))}
          </div>

          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-white text-sm font-medium transition-colors pt-2"
          >
            Skip — I'll just watch
          </button>
        </div>
      </div>
    </div>
  );
}
