'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Brain, Captions, Clapperboard, Loader2, MessageCircle, Music2, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type IntelligenceMode =
  | 'scene_explainer'
  | 'content_warnings'
  | 'skip_intelligence'
  | 'binge_checkpoint'
  | 'character_actor'
  | 'watch_party';

type PlayerIntelligencePanelProps = {
  tmdbId: string;
  type: 'movie' | 'show';
  title: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  runtime?: number | null;
  synopsis?: string;
  requestedMode?: IntelligenceMode | null;
  requestKey?: number;
};

const TOOLS: Array<{ mode: IntelligenceMode; label: string; description: string; icon: typeof Brain }> = [
  { mode: 'scene_explainer', label: 'What just happened?', description: 'Spoiler-safe scene context', icon: Brain },
  { mode: 'content_warnings', label: 'Warnings', description: 'Specific viewer guidance', icon: AlertTriangle },
  { mode: 'skip_intelligence', label: 'Skip advice', description: 'Recap, intro, credits', icon: Captions },
  { mode: 'binge_checkpoint', label: 'Binge check', description: 'Should you keep going?', icon: Clapperboard },
  { mode: 'character_actor', label: 'Who is that?', description: 'Character and actor help', icon: Users },
  { mode: 'watch_party', label: 'Watch party', description: 'Conversation prompts', icon: MessageCircle },
];

export function PlayerIntelligencePanel(props: PlayerIntelligencePanelProps) {
  const {
    requestedMode,
    requestKey,
    ...payload
  } = props;
  const [activeMode, setActiveMode] = useState<IntelligenceMode>('scene_explainer');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const urlAutoRunRef = useRef(false);

  const runTool = useCallback(async (mode: IntelligenceMode) => {
    setActiveMode(mode);
    setLoading(true);
    setAnswer('');

    try {
      const response = await fetch('/api/player/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, mode }),
      });
      const data = await response.json();
      setAnswer(data.answer || data.error || 'VAULT could not read this scene yet.');
    } catch {
      setAnswer('VAULT could not reach the playback intelligence layer.');
    } finally {
      setLoading(false);
    }
  }, [payload.episode, payload.episodeTitle, payload.runtime, payload.season, payload.synopsis, payload.title, payload.tmdbId, payload.type]);

  useEffect(() => {
    if (!requestedMode) return;
    runTool(requestedMode);
  }, [requestKey, requestedMode, runTool]);

  useEffect(() => {
    if (urlAutoRunRef.current) return;
    const tool = searchParams.get('tool');
    if (tool !== 'watch_party') return;
    urlAutoRunRef.current = true;
    runTool('watch_party');
  }, [runTool, searchParams]);

  return (
    <section id="player-intelligence" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/35">Player Intelligence</p>
          <h2 className="mt-1 text-xl font-black text-white">AI on top of playback</h2>
        </div>
        <Music2 size={18} className="text-[#9ee493]" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {TOOLS.map(({ mode, label, description, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => runTool(mode)}
            className={cn(
              'rounded-xl border p-3 text-left transition',
              activeMode === mode
                ? 'border-[#6366f1]/60 bg-[#6366f1]/15'
                : 'border-white/10 bg-black/25 hover:bg-white/8'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon size={16} className={activeMode === mode ? 'text-[#a5b4fc]' : 'text-white/45'} />
              <span className="text-sm font-black text-white">{label}</span>
            </div>
            <p className="mt-1 text-xs text-white/42">{description}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-28 rounded-xl border border-white/10 bg-black/30 p-4">
        {loading ? (
          <div className="flex items-center gap-3 text-sm font-semibold text-white/45">
            <Loader2 size={16} className="animate-spin" />
            VAULT is reading the scene context...
          </div>
        ) : answer ? (
          <p className="whitespace-pre-line text-sm leading-6 text-white/72">{answer}</p>
        ) : (
          <p className="text-sm leading-6 text-white/42">
            Ask VAULT for scene context, skip guidance, content warnings, actor help, binge advice, or watch-party prompts without leaving playback.
          </p>
        )}
      </div>
    </section>
  );
}
