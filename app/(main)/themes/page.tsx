'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

const THEMES = [
  { id: 'midnight', name: 'Midnight', desc: 'Deep navy & electric blue' },
  { id: 'amoled', name: 'AMOLED', desc: 'True black & neon green' },
  { id: 'crimson', name: 'Crimson', desc: 'Dark red & gold' },
  { id: 'obsidian', name: 'Obsidian', desc: 'Charcoal & purple' },
  { id: 'arctic', name: 'Arctic', desc: 'Ice white & deep blue' },
  { id: 'sakura', name: 'Sakura', desc: 'Soft pink & charcoal' },
  { id: 'forest', name: 'Forest', desc: 'Earthy green & calm' },
  { id: 'amber', name: 'Amber', desc: 'Warm dark lamp' },
  { id: 'slate', name: 'Slate', desc: 'Neutral grey & minimal' },
  { id: 'rose-gold', name: 'Rose Gold', desc: 'Premium warm cream' },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon yellow & dark' },
  { id: 'film', name: 'Film', desc: 'Classic cinema nostalgia' },
];

export default function ThemesPage() {
  const [activeTheme, setActiveTheme] = useState('midnight');

  useEffect(() => {
    // Read from DOM on mount
    const current = document.documentElement.getAttribute('data-theme') || 'midnight';
    setActiveTheme(current);
  }, []);

  const setTheme = (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('streamvault_theme', themeId);
    // Future: Save to Supabase profile
  };

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Theme Gallery</h1>
        <p className="text-muted">Personalize your StreamVault experience. Changes apply instantly.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {THEMES.map((theme) => {
          const isActive = activeTheme === theme.id;
          
          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={cn(
                "group relative text-left rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                isActive ? "border-accent scale-[1.02] shadow-lg shadow-accent/20" : "border-border hover:border-accent/50"
              )}
            >
              {/* Preview Window rendering using CSS variables - forces theme scope for preview */}
              <div 
                data-theme={theme.id} 
                className="h-32 bg-bg p-4 flex flex-col gap-3 transition-colors duration-500"
              >
                {/* Mock Header */}
                <div className="flex justify-between items-center">
                  <div className="w-16 h-4 rounded bg-surface border border-border" />
                  <div className="w-6 h-6 rounded-full bg-accent" />
                </div>
                {/* Mock Content */}
                <div className="flex-1 rounded-lg bg-surface border border-border flex items-end p-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
                  <div className="w-1/2 h-2 rounded bg-text relative z-10" />
                </div>
              </div>

              {/* Theme Info */}
              <div className="p-4 bg-surface border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-text">{theme.name}</h3>
                  {isActive && <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
                </div>
                <p className="text-xs text-muted">{theme.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
