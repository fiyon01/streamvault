'use client';

import { useState } from 'react';
import { Users, ArrowRight, Loader2, Copy, Check, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export default function WatchTogetherPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/watch-together/create', { method: 'POST' });
      const data = await res.json();
      if (data.code) {
        setSessionCode(data.code);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = () => {
    if (joinCode.trim()) {
      router.push(`/join/${joinCode.trim().toUpperCase()}`);
    }
  };

  const handleCopy = async () => {
    if (!sessionCode) return;
    await navigator.clipboard.writeText(`${window.location.origin}/join/${sessionCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToSession = () => {
    if (sessionCode) router.push(`/join/${sessionCode}`);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      {/* BG Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8B5CF6]/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 mx-auto">
            <Users size={36} className="text-[#8B5CF6]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white">Watch Together</h1>
          <p className="text-slate-400 text-lg">
            Find what <span className="text-white font-semibold">everyone</span> will actually enjoy.
          </p>
        </div>

        {/* Create Session Card */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 space-y-5">
          {!sessionCode ? (
            <>
              <div>
                <h2 className="text-xl font-black text-white mb-1">Create a Session</h2>
                <p className="text-slate-500 text-sm">Get a shareable link. Others join with one tap — no account needed.</p>
              </div>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
              >
                {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
                Create Session
              </button>
            </>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h2 className="text-xl font-black text-white mb-1">Session Created! 🎉</h2>
                <p className="text-slate-500 text-sm">Share this link with whoever you're watching with.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-slate-400 text-xs font-medium mb-1">Session Code</p>
                  <p className="text-3xl font-black text-white tracking-widest">{sessionCode}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    'shrink-0 p-3 rounded-xl border transition-all duration-300',
                    copied
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  )}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Link2 size={16} /> Copy Link
                </button>
                <button
                  onClick={handleGoToSession}
                  className="py-3 rounded-xl bg-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#7C3AED] transition-colors"
                >
                  Go to Session <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 text-slate-700 font-bold">
          <div className="h-px bg-white/10 flex-1" />
          OR JOIN A SESSION
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Join Card */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 space-y-5">
          <div>
            <h2 className="text-xl font-black text-white mb-1">Join a Session</h2>
            <p className="text-slate-500 text-sm">Got a code? Enter it below.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="MOVIE-42"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-lg font-bold tracking-widest placeholder:text-slate-700 focus:outline-none focus:border-white/30 transition-colors uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="px-6 py-4 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-40"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
