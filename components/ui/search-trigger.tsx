'use client';

import { Brain, Search } from 'lucide-react';

export function SearchTrigger() {
  const openSearch = () => {
    document.dispatchEvent(new CustomEvent('open-search'));
  };

  return (
    <button
      onClick={openSearch}
      className="group flex w-full max-w-[360px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm text-white/55 transition hover:border-[#6366f1]/45 hover:bg-white/[0.06] hover:text-white"
    >
      <Search size={16} className="shrink-0 text-white/35 group-hover:text-white/70" />
      <span className="min-w-0 flex-1 truncate text-left">Describe what you want to watch...</span>
      <span className="hidden items-center gap-1 rounded-lg border border-[#6366f1]/25 bg-[#6366f1]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#a5b4fc] sm:flex">
        <Brain size={12} />
        AI
      </span>
      <kbd className="hidden rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-mono text-white/35 transition group-hover:text-white/70 lg:inline-block">
        Ctrl K
      </kbd>
    </button>
  );
}
