'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Link as LinkIcon, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Status = {
  configured: boolean;
  connected: boolean;
  channelTitle?: string | null;
  lastImportedAt?: string | null;
  importedCount?: number;
  importCount?: number;
};

export function YouTubeImportPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    const res = await fetch('/api/youtube/status', { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    setStatus(body);
  };

  useEffect(() => {
    loadStatus().catch(() => setStatus({ configured: false, connected: false, importedCount: 0 }));
  }, []);

  const importAgain = async () => {
    setPending(true);
    setMessage('Importing followed channels...');
    try {
      const res = await fetch('/api/youtube/import', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof body.error === 'string' ? body.error : 'Import failed.');
        return;
      }
      setMessage(`Imported ${body.imported ?? 0} followed channels.`);
      await loadStatus();
      window.setTimeout(() => window.location.reload(), 700);
    } finally {
      setPending(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect YouTube import from StreamVault? Your creator history inside StreamVault will remain.')) return;
    setPending(true);
    setMessage('Disconnecting YouTube...');
    try {
      const res = await fetch('/api/youtube/disconnect', { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(typeof body.error === 'string' ? body.error : 'Disconnect failed.');
        return;
      }
      setMessage('YouTube disconnected.');
      await loadStatus();
      window.setTimeout(() => window.location.reload(), 500);
    } finally {
      setPending(false);
    }
  };

  const connected = status?.connected ?? false;
  const configured = status?.configured ?? false;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#9ee493]">
            <ShieldCheck size={13} />
            YouTube import
          </div>
          <h2 className="text-lg font-black text-white">
            {connected ? `Connected${status?.channelTitle ? ` as ${status.channelTitle}` : ''}` : 'Bring in the creators you already follow'}
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/48">
            StreamVault imports your YouTube subscriptions, follows those creators here, and turns them into an unseen-first watch queue. YouTube does not expose your full personal watch history through this API, so StreamVault tracks creator progress from the moment you play or mark videos here.
          </p>
          {connected && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-white/45">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1">
                <CheckCircle2 size={12} />
                {status?.importedCount ?? 0} imported channels
              </span>
              {status?.lastImportedAt && (
                <span className="rounded-full border border-white/10 px-2 py-1">
                  Last import {new Date(status.lastImportedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          {message && <p className="mt-3 text-xs font-bold text-[#9ee493]/85">{message}</p>}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {!configured ? (
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs font-bold leading-relaxed text-amber-100/85">
              Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable YouTube import.
            </div>
          ) : connected ? (
            <>
              <button
                type="button"
                onClick={importAgain}
                disabled={pending}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-slate-200',
                  pending && 'cursor-wait opacity-70'
                )}
              >
                <RefreshCw size={14} className={pending ? 'animate-spin' : ''} />
                Sync again
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <Unplug size={14} />
                Disconnect
              </button>
            </>
          ) : (
            <a
              href="/api/youtube/connect"
              className="inline-flex items-center gap-2 rounded-full bg-[#9ee493] px-4 py-2 text-xs font-black text-black transition hover:bg-[#b7f1ad]"
            >
              <LinkIcon size={14} />
              Connect YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
