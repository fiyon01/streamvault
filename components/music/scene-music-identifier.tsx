'use client';

import { useState, useEffect, useRef } from 'react';
import { Music, X } from 'lucide-react';

interface IdentifyResult {
  found: boolean;
  song_title?: string;
  artist_name?: string;
  spotify_url?: string;
  apple_music_url?: string;
}

interface SceneMusicIdentifierProps {
  contentId: string;
  contentType: 'movie' | 'tv';
  timestamp?: number;
}

export function SceneMusicIdentifier({ contentId, contentType, timestamp = 0 }: SceneMusicIdentifierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const dismissTimeout = useRef<NodeJS.Timeout | null>(null);

  const identify = async () => {
    if (isOpen) { setIsOpen(false); return; }
    setIsOpen(true);
    setIsLoading(true);
    setResult(null);
    setShowAddForm(false);
    setSubmitted(false);

    try {
      const res = await fetch('/api/music/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, timestamp }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false });
    } finally {
      setIsLoading(false);
    }

    // Auto-dismiss after 8 seconds
    if (dismissTimeout.current) clearTimeout(dismissTimeout.current);
    dismissTimeout.current = setTimeout(() => setIsOpen(false), 8000);
  };

  const handleContribute = async () => {
    if (!songTitle || !artistName) return;
    try {
      await fetch('/api/music/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, timestamp, song_title: songTitle, artist_name: artistName }),
      });
      setSubmitted(true);
    } catch { /* silent fail */ }
  };

  useEffect(() => {
    return () => { if (dismissTimeout.current) clearTimeout(dismissTimeout.current); };
  }, []);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={identify}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/80 hover:bg-white/15 hover:text-white transition-all text-xs font-medium backdrop-blur-sm"
        title="Identify this song"
      >
        <Music size={14} />
        <span className="hidden sm:inline">What&apos;s playing?</span>
      </button>

      {/* Popover panel */}
      {isOpen && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 z-50 bg-[#10101a] border border-white/10 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/50 font-medium flex items-center gap-1.5">
              🎵 Now playing in this scene
            </p>
            <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2.5">
              <div className="h-4 bg-white/8 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
              <div className="flex gap-2 mt-3">
                <div className="h-7 w-24 bg-white/5 rounded-full animate-pulse" />
                <div className="h-7 w-24 bg-white/5 rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Found result */}
          {!isLoading && result?.found && (
            <div className="space-y-3">
              <div>
                <p className="font-bold text-white text-base leading-snug">{result.song_title}</p>
                <p className="text-sm text-white/50 mt-0.5">{result.artist_name}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {result.spotify_url && (
                  <a
                    href={result.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/25 hover:bg-[#1DB954]/25 transition-colors"
                  >
                    Open in Spotify
                  </a>
                )}
                {result.apple_music_url && (
                  <a
                    href={result.apple_music_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/25 hover:bg-pink-500/25 transition-colors"
                  >
                    Apple Music
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Not found */}
          {!isLoading && result && !result.found && (
            <div className="space-y-3">
              {!showAddForm && !submitted && (
                <>
                  <p className="text-sm text-white/50">No song identified for this moment yet.</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="text-xs font-bold text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                  >
                    + Add it for others ›
                  </button>
                </>
              )}

              {showAddForm && !submitted && (
                <div className="space-y-2">
                  <p className="text-xs text-white/40 font-medium">Know what this is?</p>
                  <input
                    type="text"
                    placeholder="Song title"
                    value={songTitle}
                    onChange={e => setSongTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-accent/40 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Artist name"
                    value={artistName}
                    onChange={e => setArtistName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-accent/40 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleContribute}
                      disabled={!songTitle || !artistName}
                      className="flex-1 py-2 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-2 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {submitted && (
                <p className="text-sm text-green-400 flex items-center gap-1.5">
                  ✓ Thanks! Your contribution helps everyone.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
