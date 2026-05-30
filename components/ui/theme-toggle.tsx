'use client';

import { useThemeStore } from '@/store/theme-store';
import { useEffect } from 'react';

const themes = [
  { id: 'midnight', label: 'Midnight (Default)' },
  { id: 'oled', label: 'OLED Pure Black' },
  { id: 'ocean', label: 'Deep Ocean' },
  { id: 'forest', label: 'Dark Forest' },
  { id: 'crimson', label: 'Crimson Night' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'glass', label: 'Glassmorphism' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    // Apply theme to document body
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted">Theme</label>
      <select 
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </div>
  );
}
