'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Film, X } from 'lucide-react';

function TrailerModal({ youtubeKey, onClose }: { youtubeKey: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-y-0 left-0 right-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-2xl sm:p-6 lg:left-[var(--sidebar-w,0px)]"
    >
      <div
        className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-black shadow-[0_0_80px_rgba(0,0,0,0.8)] sm:h-auto sm:max-w-5xl sm:aspect-video sm:rounded-2xl sm:border sm:border-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close trailer"
          className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/75 text-white transition hover:bg-white/20"
        >
          <X size={20} />
        </button>
        <iframe
          key={youtubeKey}
          src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&modestbranding=1&rel=0`}
          className="aspect-video w-full border-0 sm:h-full"
          allowFullScreen
          allow="autoplay; fullscreen"
          title="Trailer"
        />
      </div>
    </div>,
    document.body
  );
}

export function TrailerButton({
  youtubeKey,
  className = '',
  label = 'Watch Trailer',
}: {
  youtubeKey?: string | null;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!youtubeKey) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className || 'inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10'}
      >
        <Film size={16} />
        {label}
      </button>
      {open ? <TrailerModal youtubeKey={youtubeKey} onClose={close} /> : null}
    </>
  );
}

