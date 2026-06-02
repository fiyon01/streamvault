'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { trackRecommendationEvent } from '@/lib/recommendations/events';
import {
  X,
  Send,
  Sparkles,
  ChevronRight,
  Menu,
  Plus,
  Trash2,
  StopCircle,
  Edit2,
  Brain,
  LibraryBig,
  ShieldCheck,
  Radar,
  Clapperboard,
  Compass,
  Play,
  Eye,
  AlertTriangle,
  SlidersHorizontal,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

type EnrichedTitle = { id: number; poster: string | null; type: string; year: string };
type EnrichedMap = Record<string, EnrichedTitle>;
type FilterValue = string | number | boolean | Array<string | number | boolean>;
type FilterPayload = Record<string, FilterValue | null | undefined>;
type ContentTag = { title: string; year: string; type: string };
type DecisionBlock = {
  mode?: string;
  title?: string;
  verdict?: string;
  confidence?: number;
  why?: string;
  skipReason?: string;
};
type InsightBlock = { label?: string; text?: string };
type ActionBlock = {
  label?: string;
  description?: string;
  href?: string;
  tone?: 'primary' | 'canon' | 'warning' | 'neutral';
  operation?: {
    type?: 'create_list' | 'follow_creator' | 'sync_youtube' | 'feedback';
    name?: string;
    shelf?: string;
    channelId?: string;
    feedback?: 'perfect' | 'good' | 'bad';
    tmdbId?: string | number;
    mediaType?: 'movie' | 'tv' | 'anime';
  };
};

function extractContentTags(text: string): ContentTag[] {
  return [...text.matchAll(/\[CONTENT:title="([^"]+)",year=(\d{4}),type=([a-z_]+)\]/g)]
    .map((match) => ({ title: match[1], year: match[2], type: match[3] }));
}

function parseFilterTag(line: string) {
  const match = line.match(/\[FILTERS:({[\s\S]*})\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function parseJsonBlock<T>(line: string, tag: 'DECISION' | 'INSIGHT' | 'ACTION'): T | null {
  const match = line.match(new RegExp(`\\[${tag}:({[\\s\\S]*})\\]`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

function filtersToUrl(filters: FilterPayload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) params.set(key, value.join(','));
    else params.set(key, String(value));
  }
  return `/discover?${params.toString()}`;
}

// ── TMDB Title Enricher ──
async function enrichTitles(text: string): Promise<Record<string, EnrichedTitle>> {
  const boldMatches = [...text.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1]);
  const tagMatches = extractContentTags(text).map((tag) => tag.title);
  const candidates = [...new Set([...boldMatches, ...tagMatches])].filter(t => t.length > 2 && t.length < 80);
  if (!candidates.length) return {};

  const map: Record<string, EnrichedTitle> = {};
  await Promise.all(
    candidates.map(async (title) => {
      try {
        const res = await fetch(`/api/ai/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: title, isAi: false, context: 'live-action' }),
        });
        const data = await res.json();
        const top = data.results?.[0];
        if (top) {
          map[title] = {
            id: top.id,
            poster: top.poster ? top.poster : null,
            type: top.media_type === 'tv' ? 'show' : 'movie',
            year: top.year || '',
          };
        }
      } catch { /* skip */ }
    })
  );
  return map;
}

// ── Markdown renderer ──
function InlineContentCard({ tag, meta }: { tag: ContentTag; meta?: EnrichedTitle }) {
  const type = meta?.type || (tag.type === 'show' || tag.type === 'tv_show' ? 'show' : 'movie');
  const detailHref = meta?.id ? `/${type === 'show' ? 'shows' : 'movies'}/${meta.id}` : '/discover';
  const watchHref = meta?.id ? `/watch/${type === 'show' ? 'show' : 'movie'}/${meta.id}` : detailHref;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
      <div className="flex gap-3 p-3">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
          {meta?.poster ? (
            <Image src={`https://image.tmdb.org/t/p/w200${meta.poster}`} alt={tag.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/25">
              <Sparkles size={18} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
            {type === 'show' ? 'Series' : 'Movie'} · {tag.year}
          </p>
          <h4 className="mt-1 line-clamp-2 text-sm font-black leading-tight text-white">{tag.title}</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={watchHref}
              onClick={() => {
                if (meta?.id) {
                  trackRecommendationEvent({
                    tmdbId: String(meta.id),
                    mediaType: type === 'show' ? 'tv' : 'movie',
                    eventType: 'watch_start',
                    source: 'vault_assistant_card',
                    metadata: { title: tag.title, year: tag.year },
                  });
                }
              }}
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black transition hover:bg-slate-200"
            >
              Watch
            </Link>
            <Link
              href={detailHref}
              onClick={() => {
                if (meta?.id) {
                  trackRecommendationEvent({
                    tmdbId: String(meta.id),
                    mediaType: type === 'show' ? 'tv' : 'movie',
                    eventType: 'detail_click',
                    source: 'vault_assistant_card',
                    metadata: { title: tag.title, year: tag.year },
                  });
                }
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterActivationCard({ filters }: { filters: FilterPayload }) {
  return (
    <Link
      href={filtersToUrl(filters)}
      className="mt-3 block rounded-2xl border border-[#6366f1]/25 bg-[#6366f1]/10 p-3 text-sm transition hover:border-[#6366f1]/50 hover:bg-[#6366f1]/15"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a5b4fc]">Discover filters</p>
          <p className="mt-1 text-white/75">Open these exact filters on Discover.</p>
        </div>
        <ChevronRight size={16} className="text-white/50" />
      </div>
    </Link>
  );
}

function VaultActionCard({ action }: { action: ActionBlock }) {
  const href = action.href || '/dashboard';
  const isPrimary = action.tone === 'primary' || action.tone === 'canon';
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const execute = async () => {
    const operation = action.operation;
    if (!operation?.type) return;
    setPending(true);
    setStatus(null);
    try {
      if (operation.type === 'create_list') {
        const raw = localStorage.getItem('streamvault-lists');
        const lists = raw ? JSON.parse(raw) as Array<{ id: string; name: string; emoji: string; items: unknown[]; createdAt: string }> : [];
        const name = operation.name || action.label || 'VAULT Shelf';
        if (!lists.some((list) => list.name.toLowerCase() === name.toLowerCase())) {
          lists.unshift({
            id: crypto.randomUUID(),
            name,
            emoji: operation.shelf || 'VAULT',
            items: [],
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('streamvault-lists', JSON.stringify(lists));
          window.dispatchEvent(new Event('streamvault-lists-updated'));
        }
        setStatus('List created.');
      } else if (operation.type === 'follow_creator' && operation.channelId) {
        const res = await fetch(`/api/creators/${operation.channelId}/follow`, { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Follow failed.');
        setStatus(body.following === false ? 'Creator unfollowed.' : 'Creator followed.');
      } else if (operation.type === 'sync_youtube') {
        const res = await fetch('/api/youtube/import', { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'YouTube sync failed.');
        setStatus(`Synced ${body.imported ?? 0} channels.`);
      } else if (operation.type === 'feedback') {
        if (operation.tmdbId && operation.mediaType) {
          const res = await fetch('/api/recommendations/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tmdbId: operation.tmdbId,
              mediaType: operation.mediaType === 'anime' ? 'tv' : operation.mediaType,
              feedback: operation.feedback ?? 'good',
            }),
          });
          if (!res.ok) throw new Error('Feedback failed.');
        } else {
          const raw = localStorage.getItem('streamvault-vault-feedback');
          const feedback = raw ? JSON.parse(raw) as unknown[] : [];
          feedback.unshift({ action, createdAt: new Date().toISOString() });
          localStorage.setItem('streamvault-vault-feedback', JSON.stringify(feedback.slice(0, 100)));
        }
        setStatus('Signal saved.');
      }
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  };

  const body = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border',
          isPrimary ? 'border-[#9ee493]/25 bg-[#9ee493]/10 text-[#9ee493]' : 'border-white/10 bg-black/25 text-white/55'
        )}>
          <Compass size={15} />
        </div>
        <div>
          <p className="text-sm font-black text-white">{action.label || 'Open in StreamVault'}</p>
          {action.description && <p className="mt-1 text-xs leading-relaxed text-white/52">{action.description}</p>}
          {status && <p className="mt-2 text-[11px] font-black text-[#9ee493]">{status}</p>}
        </div>
      </div>
      {action.operation?.type ? (
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-black text-black">
          {pending ? 'Running' : 'Run'}
        </span>
      ) : (
        <ChevronRight size={16} className="shrink-0 text-white/45" />
      )}
    </div>
  );

  const className = cn(
    'mt-3 block rounded-2xl border p-3 text-left text-sm transition',
    isPrimary
      ? 'border-[#9ee493]/25 bg-[#9ee493]/10 hover:border-[#9ee493]/45 hover:bg-[#9ee493]/15'
      : action.tone === 'warning'
        ? 'border-[#f9c74f]/25 bg-[#f9c74f]/10 hover:border-[#f9c74f]/45'
        : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'
  );

  if (action.operation?.type) {
    return (
      <button type="button" onClick={execute} disabled={pending} className={cn(className, pending && 'cursor-wait opacity-80')}>
        {body}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={className}
    >
      {body}
    </Link>
  );
}

function DecisionRevealCard({ decision, enriched }: { decision: DecisionBlock; enriched: Record<string, EnrichedTitle> }) {
  const title = decision.title || 'Tonight pick';
  const meta = decision.title ? enriched[decision.title] : undefined;
  const type = meta?.type || 'movie';
  const confidence = typeof decision.confidence === 'number'
    ? Math.round(Math.max(0, Math.min(1, decision.confidence)) * 100)
    : null;
  const watchHref = meta?.id ? `/watch/${type === 'show' ? 'show' : 'movie'}/${meta.id}` : '/discover';
  const detailHref = meta?.id ? `/${type === 'show' ? 'shows' : 'movies'}/${meta.id}` : '/discover';

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-[#9ee493]/25 bg-[linear-gradient(135deg,rgba(158,228,147,0.13),rgba(99,102,241,0.08)_48%,rgba(255,255,255,0.035))] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 p-3">
        <div className="relative h-24 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {meta?.poster ? (
            <Image src={`https://image.tmdb.org/t/p/w200${meta.poster}`} alt={title} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Sparkles size={18} className="text-[#9ee493]" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#9ee493]">
              Decision
            </span>
            {confidence !== null && (
              <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
                {confidence}% confidence
              </span>
            )}
          </div>
          <h4 className="mt-2 text-base font-black leading-tight text-white">{decision.verdict || `Watch ${title}`}</h4>
          {decision.why && <p className="mt-1.5 text-xs leading-relaxed text-white/65">{decision.why}</p>}
          {decision.skipReason && <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#f9c74f]">{decision.skipReason}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={watchHref}
              onClick={() => {
                if (meta?.id) {
                  trackRecommendationEvent({
                    tmdbId: String(meta.id),
                    mediaType: type === 'show' ? 'tv' : 'movie',
                    eventType: 'watch_start',
                    source: 'vault_decision_reveal',
                    recommendationScore: typeof decision.confidence === 'number' ? decision.confidence : undefined,
                    metadata: { title },
                  });
                }
              }}
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black transition hover:bg-slate-200"
            >
              Start now
            </Link>
            <Link
              href={detailHref}
              onClick={() => {
                if (meta?.id) {
                  trackRecommendationEvent({
                    tmdbId: String(meta.id),
                    mediaType: type === 'show' ? 'tv' : 'movie',
                    eventType: 'why_open',
                    source: 'vault_decision_reveal',
                    metadata: { title },
                  });
                }
              }}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              See why
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasteInsightCard({ insight }: { insight: InsightBlock }) {
  return (
    <div className="my-3 rounded-2xl border border-[#f9c74f]/25 bg-[#f9c74f]/10 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f9c74f]">
        {insight.label || 'Taste insight'}
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white/82">{insight.text}</p>
    </div>
  );
}

function VaultSignalLoader() {
  const steps = [
    { label: 'Reading taste memory', icon: Brain },
    { label: 'Checking StreamVault Canon', icon: LibraryBig },
    { label: 'Removing watched and rejected titles', icon: ShieldCheck },
    { label: 'Scanning blind spots', icon: Radar },
    { label: 'Committing to one pick', icon: Clapperboard },
  ];

  return (
    <div className="pl-7 py-2">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d14]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9ee493] to-transparent opacity-80" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">VAULT Signal Rail</p>
            <p className="mt-1 text-xs font-medium text-white/42">Making a watch decision, not generating filler.</p>
          </div>
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#9ee493]/20 bg-[#9ee493]/10">
            <div className="absolute inset-1 rounded-xl border border-[#9ee493]/20 animate-ping" />
            <Sparkles size={17} className="relative text-[#9ee493]" />
          </div>
        </div>

        <div className="relative space-y-0">
          <div className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-[#9ee493]/70 via-[#6366f1]/45 to-white/5" />
          {steps.map(({ label, icon: Icon }, index) => (
            <div key={label} className="relative flex gap-3 pb-3 last:pb-0">
              <div
                className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#111522] text-white/50 shadow-lg"
                style={{ animation: `vault-node 1.8s ease-in-out ${index * 180}ms infinite` }}
              >
                <Icon size={15} />
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-xs font-bold text-white/72">{label}</p>
                <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#9ee493] via-[#6366f1] to-[#a855f7]"
                    style={{ animation: `vault-scan 1.45s ease-in-out ${index * 160}ms infinite` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function chooseRailIcon(text: string): LucideIcon {
  const lower = text.toLowerCase();
  return lower.includes('skip') || lower.includes('warning') || lower.includes('but ')
    ? AlertTriangle
    : lower.includes('filter') || lower.includes('discover')
      ? SlidersHorizontal
      : lower.includes('seen') || lower.includes('watched') || lower.includes('memory')
        ? Eye
        : lower.includes('watch') || lower.includes('pick') || lower.includes('decision')
          ? Clapperboard
          : lower.includes('canon') || lower.includes('worth')
            ? CheckCircle2
            : Sparkles;
}

function VaultRailItem({
  children,
  text,
  icon,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  text?: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'decision' | 'warning' | 'action' | 'muted';
}) {
  const Icon = icon ?? chooseRailIcon(text ?? '');
  const toneClass = tone === 'decision'
    ? 'border-[#9ee493]/25 bg-[#9ee493]/10 text-[#9ee493]'
    : tone === 'warning'
      ? 'border-[#f9c74f]/25 bg-[#f9c74f]/10 text-[#f9c74f]'
      : tone === 'action'
        ? 'border-[#6366f1]/25 bg-[#6366f1]/10 text-[#a5b4fc]'
        : tone === 'muted'
          ? 'border-white/8 bg-white/[0.025] text-white/35'
          : 'border-white/10 bg-[#10131d] text-[#9ee493]/80';

  return (
    <div className="group relative flex gap-3 py-1.5 pl-0.5">
      <div className="absolute bottom-[-9px] left-[10px] top-7 w-px bg-gradient-to-b from-white/12 via-white/8 to-transparent group-last:hidden" />
      <span className={cn('relative z-10 mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border shadow-[0_0_20px_rgba(0,0,0,0.22)]', toneClass)}>
        <Icon size={11} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function renderText(text: string, enriched: EnrichedMap) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (!line.trim()) { elements.push(<div key={key++} className="h-2" />); continue; }

    const contentTag = extractContentTags(line)[0];
    if (contentTag) {
      elements.push(
        <VaultRailItem key={key++} text={contentTag.title} icon={Clapperboard} tone="decision">
          <InlineContentCard tag={contentTag} meta={enriched[contentTag.title]} />
        </VaultRailItem>
      );
      continue;
    }

    const filters = parseFilterTag(line);
    if (filters) {
      elements.push(
        <VaultRailItem key={key++} text="filters" icon={SlidersHorizontal} tone="action">
          <FilterActivationCard filters={filters} />
        </VaultRailItem>
      );
      continue;
    }

    const decision = parseJsonBlock<DecisionBlock>(line, 'DECISION');
    if (decision) {
      elements.push(
        <VaultRailItem key={key++} text={decision.verdict} icon={Clapperboard} tone="decision">
          <DecisionRevealCard decision={decision} enriched={enriched} />
        </VaultRailItem>
      );
      continue;
    }

    const insight = parseJsonBlock<InsightBlock>(line, 'INSIGHT');
    if (insight) {
      elements.push(
        <VaultRailItem key={key++} text={insight.text} icon={Brain} tone="warning">
          <TasteInsightCard insight={insight} />
        </VaultRailItem>
      );
      continue;
    }

    const action = parseJsonBlock<ActionBlock>(line, 'ACTION');
    if (action) {
      elements.push(
        <VaultRailItem key={key++} text={action.label} icon={Compass} tone="action">
          <VaultActionCard action={action} />
        </VaultRailItem>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <VaultRailItem key={key++} text={line} icon={LibraryBig} tone="muted">
          <p className="pt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            {line.replace('### ', '')}
          </p>
        </VaultRailItem>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <VaultRailItem key={key++} text={line} icon={LibraryBig}>
          <p className="pt-0.5 text-sm font-black text-white">
            {renderInline(line.replace('## ', ''), enriched)}
          </p>
        </VaultRailItem>
      );
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const body = line.slice(2);
      elements.push(
        <VaultRailItem key={key++} text={body}>
          <p className="text-sm leading-relaxed text-white/80">{renderInline(body, enriched)}</p>
        </VaultRailItem>
      );
      continue;
    }
    elements.push(
      <VaultRailItem key={key++} text={line}>
        <p className="text-sm leading-relaxed text-white/80">
          {renderInline(line, enriched)}
        </p>
      </VaultRailItem>
    );
  }
  return <div className="relative space-y-0.5">{elements}</div>;
}

function renderInline(text: string, enriched: EnrichedMap): React.ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const meta = enriched[part];
      if (meta) {
        return (
          <Link
            key={i}
            href={`/${meta.type === 'show' ? 'shows' : 'movies'}/${meta.id}`}
            className="inline-flex items-baseline gap-1 text-accent font-bold hover:text-white transition-colors group cursor-pointer"
          >
            {part}
            <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
          </Link>
        );
      }
      return <strong key={i} className="text-white font-bold">{part}</strong>;
    }
    return part;
  });
}

// ── Poster Card Strip ──
function PosterStrip({ text, enriched }: { text: string; enriched: EnrichedMap }) {
  const boldMatches = [...text.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1]);
  const unique = [...new Set(boldMatches)].filter(t => enriched[t]?.poster);
  if (!unique.length) return null;

  return (
    <div className="mt-4 -mx-1">
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none px-1">
        {unique.map(title => {
          const meta = enriched[title];
          return (
            <Link
              key={title}
              href={`/${meta.type === 'show' ? 'shows' : 'movies'}/${meta.id}`}
              className="group shrink-0 w-[88px]"
            >
              <div className="relative w-[88px] h-[132px] rounded-xl overflow-hidden border border-white/10 group-hover:border-accent/50 transition-all duration-300 group-hover:scale-105 shadow-lg">
                <Image
                  src={`https://image.tmdb.org/t/p/w200${meta.poster}`}
                  alt={title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-[9px] font-bold text-white leading-tight line-clamp-2">{title}</p>
                  {meta.year && <p className="text-[8px] text-white/50 mt-0.5">{meta.year}</p>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Types ──
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  enriched?: EnrichedMap;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
}

const SUGGESTIONS = [
  'Decide what I should watch tonight.',
  'Find the blind spot I keep missing.',
  'Only completed series with earned endings.',
  'Anime for a serious live-action watcher.',
];

const CALIBRATION_PROMPT = `Calibrate my taste like StreamVault depends on it. Ask me for exactly 5 titles I love, 3 I think are overrated, and 1 I abandoned. Then use those nine signals to give one confident first pick, one taste contradiction, and one filter preset I can run.`;

// ── Main Component ──
export function VaultAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/ai/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch { /* skip */ }
  };

  const loadSession = async (id: string) => {
    setActiveSessionId(id);
    setMessages([]);
    setShowSidebar(false);
    try {
      const res = await fetch(`/api/ai/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // Enrich any existing messages silently
        data.messages.forEach(async (m: Message) => {
          if (m.role === 'assistant') {
            const enriched = await enrichTitles(m.content);
            if (Object.keys(enriched).length > 0) {
              setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, enriched } : msg));
            }
          }
        });
      }
    } catch { /* skip */ }
  };

  const createNewSession = async () => {
    setActiveSessionId(null);
    setMessages([]);
    setShowSidebar(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        createNewSession();
      }
    } catch { /* skip */ }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleEdit = (msgId: string, content: string) => {
    // Find the message
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx !== -1) {
      // Truncate messages after this point
      setMessages(messages.slice(0, idx));
      setInput(content);
      inputRef.current?.focus();
    }
  };

  const sendMessage = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    let currentSessionId = activeSessionId;
    let sessionWarning: string | null = null;

    setIsLoading(true);
    setError(null);
    
    // Create session if it doesn't exist
    if (!currentSessionId) {
      try {
        const res = await fetch('/api/ai/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: userText.slice(0, 30) + '...' })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          sessionWarning = `Chat history unavailable: ${data.error || `server returned ${res.status}`}`;
        } else if (data.session) {
          currentSessionId = data.session.id;
          setActiveSessionId(data.session.id);
          loadSessions(); // refresh sidebar
        }
      } catch (e: unknown) {
        sessionWarning = `Chat history unavailable: ${e instanceof Error ? e.message : 'session could not be created'}`;
      }
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setError(sessionWarning);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          sessionId: currentSessionId,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream');

      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const token = JSON.parse(line.slice(2));
              fullText += token;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
            } catch { /* skip */ }
          }
        }
      }

      // Enrich titles after stream ends
      if (fullText) {
        const enriched = await enrichTitles(fullText);
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText, enriched } : m));
      } else {
        setMessages(prev => prev.map(m => m.id === assistantId
          ? { ...m, content: "I couldn't generate a response. Please try again." }
          : m
        ));
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Generation stopped.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <>
      {/* Floating Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open VAULT AI"
        style={{ transform: isOpen ? 'rotate(12deg) scale(0.95)' : undefined, opacity: isOpen ? 0 : undefined, pointerEvents: isOpen ? 'none' : undefined }}
        className="fixed bottom-20 right-5 lg:bottom-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#6366f1] to-[#a855f7] shadow-[0_0_32px_rgba(99,102,241,0.5)] hover:shadow-[0_0_48px_rgba(99,102,241,0.7)] hover:scale-110 transition-all duration-300"
      >
        <Sparkles size={22} className="text-white" />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className={cn(
          'fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6',
          'w-full sm:w-[440px]',
          'h-[88vh] sm:h-[calc(100vh-48px)] sm:max-h-[650px]',
          'bg-[#08080f] border-t sm:border border-white/[0.08]',
          'rounded-t-3xl sm:rounded-3xl',
          'shadow-[0_0_100px_rgba(0,0,0,0.8)]',
          'z-[100] flex flex-col overflow-hidden',
          'animate-in slide-in-from-bottom-6 duration-300'
        )}>
          
          {/* Header */}
          <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0 z-20 bg-[#08080f]">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6366f1]/10 via-transparent to-[#a855f7]/10 pointer-events-none" />
            
            <div className="flex items-center gap-4 relative">
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-xl transition-all",
                  showSidebar ? "bg-white/10 text-white" : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                )}
              >
                <Menu size={16} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white tracking-tight text-sm">VAULT</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-black uppercase tracking-widest border border-green-500/20">
                      INTELLIGENCE
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 relative">
              <button onClick={createNewSession} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                <Plus size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 relative overflow-hidden">
            
            {/* Sidebar (Session History) */}
            <div className={cn(
              "absolute inset-y-0 left-0 w-64 bg-[#0a0a12] border-r border-white/5 z-10 flex flex-col transition-transform duration-300 ease-in-out",
              showSidebar ? "translate-x-0" : "-translate-x-full"
            )}>
              <div className="p-4 border-b border-white/5">
                <button 
                  onClick={createNewSession}
                  className="w-full py-2.5 rounded-xl bg-[#6366f1] text-white text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.length === 0 ? (
                  <p className="text-xs text-white/30 text-center p-4">No recent chats</p>
                ) : (
                  sessions.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => loadSession(s.id)}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors",
                        activeSessionId === s.id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span className="text-sm truncate pr-2">{s.title}</span>
                      <button 
                        onClick={(e) => deleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none relative bg-[#08080f] z-0">
              
              {/* Empty State */}
              {messages.length === 0 && (
                <div className="p-6 space-y-6 m-auto">
                  <div className="text-center pt-4 pb-2">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#6366f1]/20 to-[#a855f7]/20 border border-white/10 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl animate-pulse" />
                      <Sparkles size={28} className="text-[#a855f7] relative z-10" />
                    </div>
                    <h3 className="text-white font-black text-xl mb-2 tracking-tight">VAULT Taste Engine</h3>
                    <p className="text-white/40 text-sm leading-relaxed max-w-[280px] mx-auto">
                      Not a chatbot. A watch decision system built from your taste, refusals, canon verdicts, and blind spots.
                    </p>
                  </div>
                  <button
                    onClick={() => sendMessage(CALIBRATION_PROMPT)}
                    className="group relative w-full overflow-hidden rounded-2xl border border-[#9ee493]/25 bg-[#9ee493]/10 p-4 text-left shadow-[0_18px_60px_rgba(0,0,0,0.28)] transition hover:border-[#9ee493]/45 hover:bg-[#9ee493]/15"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9ee493] to-transparent" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">Taste calibration</p>
                        <h4 className="mt-1 text-base font-black text-white">Calibrate VAULT in 30 seconds</h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                          5 loved, 3 overrated, 1 abandoned. Positive taste, negative taste, and standards before the first pick.
                        </p>
                      </div>
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-black transition group-hover:scale-105">
                        <Play size={15} className="fill-current" />
                      </div>
                    </div>
                  </button>
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="w-full text-left px-5 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-[#6366f1]/30 hover:scale-[1.02] transition-all group text-sm text-white/60 hover:text-white flex items-center justify-between"
                      >
                        <span>{s}</span>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#6366f1]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Thread */}
              {messages.length > 0 && (
                <div className="p-5 space-y-6">
                  {messages.map((m, idx) => (
                    <div key={m.id} className="group">
                      {m.role === 'user' ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-sm bg-gradient-to-br from-[#6366f1] to-[#7c3aed] text-white text-sm font-medium shadow-lg shadow-purple-900/20">
                            {m.content}
                          </div>
                          {/* Edit button (appears on hover) */}
                          <button 
                            onClick={() => handleEdit(m.id, m.content)}
                            className="text-[10px] text-white/30 hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                          >
                            <Edit2 size={10} /> Edit
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 w-full">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center">
                              <Sparkles size={10} className="text-white" />
                            </div>
                            <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">VAULT</span>
                          </div>

                          {m.content && (
                            <div className="pl-7 pr-2">
                              {renderText(m.content, m.enriched || {})}
                              {m.enriched && Object.keys(m.enriched).length > 0 && (
                                <PosterStrip text={m.content} enriched={m.enriched} />
                              )}
                            </div>
                          )}

                          {!m.content && isLoading && (
                            <VaultSignalLoader />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {error && (
                    <div className="text-center text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      ⚠️ {error}
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </div>
            
            {/* Dark overlay when sidebar is open on mobile */}
            {showSidebar && (
              <div 
                className="absolute inset-0 bg-black/50 z-0 sm:hidden"
                onClick={() => setShowSidebar(false)}
              />
            )}
          </div>

          {/* Input Bar */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[#08080f] px-4 py-4 z-20" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            {isLoading && (
              <div className="flex justify-center mb-3">
                <button 
                  onClick={stopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <StopCircle size={14} /> Stop generating
                </button>
              </div>
            )}
            
            <div className={cn(
              "flex items-end gap-2 bg-[#12121a] border rounded-2xl p-2 transition-all",
              input.trim() ? "border-[#6366f1]/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]" : "border-white/[0.08]"
            )}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { 
                  if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    sendMessage(); 
                  } 
                }}
                placeholder="Ask VAULT anything..."
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-40 resize-none py-2 px-3 max-h-32 min-h-[40px] overflow-y-auto"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
                  input.trim() && !isLoading
                    ? 'bg-[#6366f1] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:scale-105'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                )}
              >
                <Send size={16} className={cn(input.trim() && !isLoading && "translate-x-0.5")} />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[9px] text-white/20 font-medium">Verdicts are guidance, not gospel. Your taste trains the system.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
