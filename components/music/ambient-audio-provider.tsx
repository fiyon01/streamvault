'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { get, set } from 'idb-keyval';

interface AmbientAudioContextType {
  currentMood: string;
  setMood: (mood: string) => void;
  isEnabled: boolean;
  toggle: () => void;
}

const AmbientAudioContext = createContext<AmbientAudioContextType | undefined>(undefined);

export function AmbientAudioProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isEnabled, setIsEnabled] = useState(true); // Default to ON for first-time users
  const [currentMood, setCurrentMood] = useState('cinematic-neutral');
  const [isClient, setIsClient] = useState(false);

  // Audio Context and Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track currently playing mood to prevent re-triggering
  const playingMoodRef = useRef<string | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('sv_ambient_music');
    if (stored !== null) {
      setIsEnabled(stored === 'true');
    } else {
      // If it's a first-time user, keep it ON and save to local storage
      localStorage.setItem('sv_ambient_music', 'true');
    }
  }, []);

  const toggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('sv_ambient_music', String(newState));
    
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended' && newState) {
      audioCtxRef.current.resume();
    }
  };

  // ── Determine Mood from Pathname ──
  useEffect(() => {
    let targetMood = 'cinematic-neutral';
    
    if (pathname.includes('/anime')) targetMood = 'epic-orchestral';
    else if (pathname.includes('/movies') || pathname.includes('/shows')) {
      // Very basic URL heuristic if we don't have deeper context here
      // Ideally, specific genre pages would push the mood down via the setMood function
      targetMood = 'cinematic-neutral'; 
    }
    
    if (targetMood !== currentMood) {
      setCurrentMood(targetMood);
    }
  }, [pathname, currentMood]);

  // ── Audio Engine ──
  const playMood = useCallback(async (mood: string) => {
    if (!isEnabled || !isClient) return;
    
    // Prevent re-playing the same track
    if (playingMoodRef.current === mood) return;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      // 1. Fetch from IndexedDB Cache
      const cacheKey = `sv_music_${mood}`;
      let audioBufferData = await get<ArrayBuffer>(cacheKey);

      // 2. Generate if not cached
      if (!audioBufferData) {
        // Optimistically set playing mood so we don't spam requests
        playingMoodRef.current = mood;
        
        const res = await fetch('/api/music/ambient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood })
        });
        
        if (res.status === 501) {
          // No API key configured, silently fail
          return;
        }
        
        if (!res.ok) throw new Error('Failed to fetch ambient music');
        
        audioBufferData = await res.arrayBuffer();
        
        // Cache for 7 days (or indefinitely, handled by idb quota)
        await set(cacheKey, audioBufferData);
      }

      // If the user quickly switched off or changed mood while fetching
      if (!isEnabled || currentMood !== mood) return;

      const audioBuffer = await ctx.decodeAudioData(audioBufferData.slice(0));

      // 3. Crossfade out old track
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
        const oldSource = sourceNodeRef.current;
        setTimeout(() => {
          if (oldSource) {
            try { oldSource.stop(); oldSource.disconnect(); } catch (e) { /* ignore */ }
          }
        }, 2600);
      }

      // 4. Setup new track
      const newSource = ctx.createBufferSource();
      const newGain = ctx.createGain();
      
      newSource.buffer = audioBuffer;
      newSource.loop = true;
      
      newGain.gain.setValueAtTime(0, ctx.currentTime);
      // Volume default: 18% (0.18) as specified
      newGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 3.0);

      newSource.connect(newGain);
      newGain.connect(ctx.destination);
      
      newSource.start(0);

      sourceNodeRef.current = newSource;
      gainNodeRef.current = newGain;
      playingMoodRef.current = mood;

    } catch (err) {
      console.error("Ambient Audio Error:", err);
      playingMoodRef.current = null;
    }
  }, [isEnabled, isClient, currentMood]);

  // Trigger playback when mood or enabled state changes
  useEffect(() => {
    if (isEnabled) {
      playMood(currentMood);
    } else {
      // Stop playback smoothly if disabled
      if (gainNodeRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
        playingMoodRef.current = null;
        
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = setTimeout(() => {
          if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); sourceNodeRef.current.disconnect(); } catch(e) {}
            sourceNodeRef.current = null;
            gainNodeRef.current = null;
          }
        }, 1100);
      }
    }
  }, [currentMood, isEnabled, playMood]);

  // Pause ambient audio when video playback begins (via global event listener)
  useEffect(() => {
    const handleVideoPlay = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
    };
    
    const handleVideoPause = () => {
      if (isEnabled && audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    window.addEventListener('sv-video-play', handleVideoPlay);
    window.addEventListener('sv-video-pause', handleVideoPause);
    
    return () => {
      window.removeEventListener('sv-video-play', handleVideoPlay);
      window.removeEventListener('sv-video-pause', handleVideoPause);
    };
  }, [isEnabled]);

  return (
    <AmbientAudioContext.Provider value={{ currentMood, setMood: setCurrentMood, isEnabled, toggle }}>
      {children}
    </AmbientAudioContext.Provider>
  );
}

export const useAmbientAudio = () => {
  const context = useContext(AmbientAudioContext);
  if (context === undefined) {
    throw new Error('useAmbientAudio must be used within an AmbientAudioProvider');
  }
  return context;
};
