import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'midnight' | 'oled' | 'ocean' | 'forest' | 'crimson' | 'sunset' | 'lavender' | 'cyberpunk' | 'retro' | 'minimal' | 'glass' | 'neon';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'midnight',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'streamvault-theme',
    }
  )
);
