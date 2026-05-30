import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerState {
  source: 'vidsrc' | 'vidsrc-pro' | 'superembed' | 'auto';
  setSource: (source: 'vidsrc' | 'vidsrc-pro' | 'superembed' | 'auto') => void;
  autoplayNext: boolean;
  setAutoplayNext: (val: boolean) => void;
  skipIntro: boolean;
  setSkipIntro: (val: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      source: 'auto',
      setSource: (source) => set({ source }),
      autoplayNext: true,
      setAutoplayNext: (autoplayNext) => set({ autoplayNext }),
      skipIntro: true,
      setSkipIntro: (skipIntro) => set({ skipIntro }),
    }),
    {
      name: 'streamvault-player',
    }
  )
);
