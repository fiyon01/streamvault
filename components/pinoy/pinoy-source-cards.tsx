import { ExternalLink, MonitorPlay, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { PinoySource } from '@/lib/pinoy/sources';
import { PINOY_COMMUNITY_FALLBACKS, PINOY_OFFICIAL_SOURCES } from '@/lib/pinoy/sources';

function SourceIcon({ source }: { source: PinoySource }) {
  if (source.sourceType === 'community') return <TriangleAlert size={17} />;
  if (source.hasAds) return <MonitorPlay size={17} />;
  return <ShieldCheck size={17} />;
}

export function PinoySourceCards({ title }: { title?: string }) {
  const sources = title
    ? [...PINOY_OFFICIAL_SOURCES, ...PINOY_COMMUNITY_FALLBACKS].map((source) => ({
        ...source,
        href: source.searchHref?.(title) || source.href,
      }))
    : PINOY_OFFICIAL_SOURCES;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Free resources</p>
        <h2 className="mt-1 text-xl font-black md:text-2xl">Official sources first</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {sources.map((source) => (
          <a
            key={source.name}
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-white/10 bg-surface/70 p-4 transition hover:border-accent/40 hover:bg-accent/10"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-accent">
                <SourceIcon source={source} />
              </div>
              <ExternalLink size={15} className="text-muted transition group-hover:text-accent" />
            </div>
            <h3 className="text-base font-black">{source.name}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{source.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
              <span className="rounded-full border border-white/10 bg-bg/60 px-2 py-1 text-white/55">
                {source.sourceType}
              </span>
              <span className="rounded-full border border-white/10 bg-bg/60 px-2 py-1 text-white/55">
                {source.hasAds ? 'free with ads' : 'no subscription'}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

