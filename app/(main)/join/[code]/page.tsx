'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, CheckCircle2, Loader2, Zap, Play, ChevronRight, Clock } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

type Step = 'waiting' | 'preferences' | 'computing' | 'results';

export default function JoinSessionPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [step, setStep] = useState<Step>('waiting');
  const [contentType, setContentType] = useState<'movie' | 'show' | 'either'>('either');
  const [runtimeMax, setRuntimeMax] = useState<number | undefined>(undefined);
  const [intersection, setIntersection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRecIdx, setCurrentRecIdx] = useState(0);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/watch-together/${code}`);
      const data = await res.json();
      setSession(data.session);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchSession();
    // Poll for new participants every 5 seconds while waiting
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [fetchSession]);

  const handleStartMatch = async () => {
    setStep('computing');
    try {
      const res = await fetch(`/api/watch-together/${code}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, runtimeMax })
      });
      const data = await res.json();
      setIntersection(data.intersection);
      setStep('results');
    } catch (e) {
      console.error(e);
      setStep('waiting');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  const participants: any[] = session?.participants || [];
  const joinedCount = participants.filter((p: any) => p.joined).length;
  const recs = intersection?.recommendations || [];

  return (
    <div className="min-h-screen bg-bg p-6 md:p-12 max-w-4xl mx-auto pb-32">
      {/* Fixed Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#8B5CF6]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6]">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Session: <span className="text-[#8B5CF6] tracking-widest">{code}</span></h1>
            <p className="text-slate-400">{joinedCount} participant{joinedCount !== 1 ? 's' : ''} joined</p>
          </div>
        </div>

        {/* STEP: WAITING ROOM */}
        {(step === 'waiting' || step === 'preferences') && (
          <div className="space-y-6 animate-in fade-in">
            {/* Participants List */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 space-y-4">
              <h2 className="text-lg font-black text-white">Who's here</h2>
              <div className="space-y-3">
                {participants.length > 0 ? participants.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                      p.joined ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-white/5 text-slate-500'
                    )}>
                      {p.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{p.name || 'Guest'}</p>
                      <p className="text-xs text-slate-500">{p.profileLoaded ? 'Taste profile loaded ✓' : 'Loading profile...'}</p>
                    </div>
                    {p.joined
                      ? <CheckCircle2 size={18} className="text-green-400" />
                      : <Loader2 size={18} className="animate-spin text-slate-500" />
                    }
                  </div>
                )) : (
                  <p className="text-slate-500 text-sm">Share the code <span className="text-white font-bold tracking-widest">{code}</span> to invite others.</p>
                )}
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 space-y-6">
              <h2 className="text-lg font-black text-white">What are you watching tonight?</h2>

              <div>
                <p className="text-slate-400 text-sm font-medium mb-3">Format</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['movie', 'show', 'either'] as const).map((type) => (
                    <button key={type} onClick={() => setContentType(type)}
                      className={cn(
                        'py-3 rounded-xl font-bold capitalize text-sm transition-all border',
                        contentType === type
                          ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      )}>
                      {type === 'movie' ? '🎬 Movies' : type === 'show' ? '📺 TV Shows' : '⚡ Either'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-sm font-medium mb-3">How long do you have?</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '< 2 hrs', val: 120 },
                    { label: '2–3 hrs', val: 180 },
                    { label: 'All night', val: undefined },
                  ].map((opt) => (
                    <button key={opt.label} onClick={() => setRuntimeMax(opt.val)}
                      className={cn(
                        'py-3 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2',
                        runtimeMax === opt.val
                          ? 'bg-[#00BFFF]/20 border-[#00BFFF]/50 text-[#00BFFF]'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      )}>
                      <Clock size={14} /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartMatch}
                disabled={joinedCount < 1}
                className="w-full py-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
              >
                <Zap size={20} /> Find Our Match
              </button>
            </div>
          </div>
        )}

        {/* STEP: COMPUTING */}
        {step === 'computing' && (
          <div className="flex flex-col items-center justify-center py-32 gap-6 animate-in fade-in">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-[#8B5CF6]" />
              </div>
              <div className="absolute inset-0 rounded-full bg-[#8B5CF6]/20 animate-ping" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-white mb-2">Analyzing your DNA...</h2>
              <p className="text-slate-400">Comparing 9 taste dimensions across all profiles</p>
            </div>
          </div>
        )}

        {/* STEP: RESULTS */}
        {step === 'results' && intersection && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8">

            {/* DNA Overlap Visualization */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 space-y-6">
              <h2 className="text-xl font-black text-white">Where you meet</h2>

              {/* Strong Matches */}
              {intersection.strongMatches?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-green-400 uppercase tracking-widest">You Agree On</p>
                  {intersection.strongMatches.slice(0, 4).map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-32 shrink-0">
                        <p className="text-slate-300 text-sm font-semibold capitalize">{m.dimension}</p>
                      </div>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                          style={{ width: `${(m.score || 0.7) * 100}%` }} />
                      </div>
                      <span className="text-green-400 text-xs font-bold shrink-0">★ Match</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tensions */}
              {intersection.tensions?.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">The Tension</p>
                  {intersection.tensions.slice(0, 2).map((t: any, i: number) => (
                    <div key={i} className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                      <p className="text-white font-semibold text-sm">{t.description}</p>
                      {t.resolution && <p className="text-slate-400 text-xs mt-1">→ {t.resolution}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">Your perfect picks</h2>
              {recs.map((rec: any, i: number) => (
                <div
                  key={i}
                  className={cn(
                    'bg-[#0a0a0a] border rounded-3xl p-5 flex gap-5 transition-all',
                    currentRecIdx === i ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/5' : 'border-white/10 hover:border-white/20'
                  )}
                  onClick={() => setCurrentRecIdx(i)}
                >
                  <div className="relative w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-slate-900">
                    {rec.content?.poster_path && (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${rec.content.poster_path}`}
                        alt={rec.content.title || rec.content.name || ''}
                        fill className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center space-y-2">
                    <div>
                      <h3 className="text-white font-black text-lg leading-tight">{rec.content?.title || rec.content?.name}</h3>
                      <p className="text-slate-500 text-sm">{(rec.content?.release_date || rec.content?.first_air_date || '').split('-')[0]}</p>
                    </div>
                    <p className="text-slate-300 text-sm">{rec.explanation}</p>
                    {currentRecIdx === i && rec.perPersonRationale && (
                      <div className="space-y-1 pt-2 animate-in fade-in">
                        {Object.entries(rec.perPersonRationale).map(([name, reason]: [string, any]) => (
                          <p key={name} className="text-xs text-slate-400">
                            <span className="text-[#8B5CF6] font-bold">For {name}:</span> {reason}
                          </p>
                        ))}
                      </div>
                    )}
                    <button className="mt-2 self-start bg-white text-black px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors">
                      <Play size={14} /> Watch This Together
                    </button>
                  </div>
                </div>
              ))}

              {recs.length > 1 && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setCurrentRecIdx((currentRecIdx + 1) % recs.length)}
                    className="text-[#8B5CF6] hover:text-white text-sm font-bold flex items-center gap-2 transition-colors"
                  >
                    Next suggestion <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
