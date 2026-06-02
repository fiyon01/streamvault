'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Brain, Clock3, Filter, Search, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type SearchResult = {
  id: number | string;
  title: string;
  poster: string | null;
  media_type: 'movie' | 'tv';
  year: string;
  rating?: number;
  context?: string;
  reason?: string;
  confidence?: number;
};

type SearchMeta = {
  intent?: string;
  filterUrl?: string;
  filters?: Record<string, unknown>;
};

const EXAMPLES = [
  'Completed US crime drama, at least 4 seasons, dark tone',
  'Anime from the 2000s with a proper ending, around 24 episodes',
  'Something like Breaking Bad but I have already seen Ozark',
  'Feel-good British comedy I can watch with family',
];

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAiMode, setIsAiMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const context = pathname.startsWith('/anime')
    ? 'anime'
    : pathname.startsWith('/cartoons')
      ? 'cartoons'
      : 'live-action';

  const contextLabel = context === 'anime' ? 'Anime' : context === 'cartoons' ? 'Cartoons' : 'Movies and TV';

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
      if (event.key === 'Escape') setIsOpen(false);
    };
    const openEvent = () => setIsOpen(true);

    document.addEventListener('keydown', down);
    document.addEventListener('open-search', openEvent);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('open-search', openEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setMeta({});
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setMeta({});
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, isAi: isAiMode, context }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Search failed (${response.status})`);

        setResults(data.results || []);
        setMeta({ intent: data.intent, filterUrl: data.filterUrl, filters: data.filters });
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : 'Search failed');
        setResults([]);
        setMeta({});
      } finally {
        setIsLoading(false);
      }
    }, isAiMode ? 700 : 220);

    return () => clearTimeout(timer);
  }, [context, isAiMode, query]);

  const openResult = (item: SearchResult) => {
    setIsOpen(false);
    if (item.context === 'anime') {
      router.push(`/anime/${item.id}`);
      return;
    }
    router.push(`/${item.media_type === 'tv' ? 'shows' : 'movies'}/${item.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center px-4 pt-[7vh] animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/78 backdrop-blur-xl" onClick={() => setIsOpen(false)} />

      <div className="relative flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#08090d] shadow-[0_32px_120px_rgba(0,0,0,0.72)]">
        <div className="border-b border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#a5b4fc]">
              <Sparkles size={14} />
              VAULT conversational discovery
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/45 transition hover:bg-white/10 hover:text-white"
              aria-label="Close search"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
            <Search size={22} className="shrink-0 text-white/35" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Describe exactly what you want in ${contextLabel}...`}
              className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-white outline-none placeholder:text-white/28 sm:text-2xl"
            />
            <button
              onClick={() => setIsAiMode((value) => !value)}
              className={cn(
                'hidden shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition sm:flex',
                isAiMode
                  ? 'border-[#6366f1]/60 bg-[#6366f1]/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/45 hover:text-white'
              )}
            >
              <Brain size={14} />
              {isAiMode ? 'AI On' : 'Exact'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.slice(0, 3).map((example) => (
              <button
                key={example}
                onClick={() => {
                  setIsAiMode(true);
                  setQuery(example);
                }}
                className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-semibold text-white/48 transition hover:border-[#6366f1]/40 hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
              <div className="h-10 w-10 rounded-full border-4 border-[#6366f1] border-t-transparent animate-spin" />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">VAULT is parsing intent</p>
                <p className="mt-2 text-sm text-white/38">Mood, structure, exclusions, and quality bar.</p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {!isLoading && !query && (
            <div className="grid min-h-[320px] place-items-center text-center">
              <div className="max-w-xl">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.035]">
                  <Clock3 size={26} className="text-[#f9c74f]" />
                </div>
                <h3 className="mt-5 text-2xl font-black text-white">Find the right thing in under 60 seconds.</h3>
                <p className="mt-3 text-sm leading-6 text-white/48">
                  Say the mood, structure, country, era, exclusions, or commitment level. VAULT turns it into ranked picks and usable filters.
                </p>
              </div>
            </div>
          )}

          {!isLoading && query && results.length === 0 && !error && (
            <div className="grid min-h-[260px] place-items-center text-center text-white/45">
              <p>No exact matches yet. Try loosening one condition.</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-4">
              {(meta.intent || meta.filterUrl) && (
                <div className="rounded-2xl border border-[#6366f1]/25 bg-[#6366f1]/10 p-4">
                  {meta.intent && (
                    <p className="text-sm leading-6 text-white/75">
                      <span className="font-black text-white">Intent:</span> {meta.intent}
                    </p>
                  )}
                  {meta.filterUrl && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push(meta.filterUrl || '/discover');
                      }}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black transition hover:bg-slate-200"
                    >
                      <Filter size={14} />
                      Open exact filters
                    </button>
                  )}
                </div>
              )}

              <div className="grid gap-3">
                {results.map((item) => (
                  <button
                    key={`${item.context}:${item.media_type}:${item.id}`}
                    onClick={() => openResult(item)}
                    className="group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-left transition hover:border-[#6366f1]/45 hover:bg-white/[0.055]"
                  >
                    <div className="relative h-20 w-14 overflow-hidden rounded-lg bg-white/5">
                      {item.poster ? (
                        <Image
                          src={item.poster.startsWith('http') ? item.poster : `https://image.tmdb.org/t/p/w200${item.poster}`}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[10px] text-white/30">No art</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/32">
                        <span>{item.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                        <span>{item.year}</span>
                        {typeof item.rating === 'number' && item.rating > 0 && <span>{item.rating.toFixed(1)}</span>}
                        {item.confidence && <span>{Math.round(item.confidence * 100)}% match</span>}
                      </div>
                      <h4 className="mt-1 truncate text-base font-black text-white group-hover:text-[#a5b4fc]">{item.title}</h4>
                      {item.reason && <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/52">{item.reason}</p>}
                    </div>
                    <ArrowRight size={18} className="text-white/25 transition group-hover:text-white" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
