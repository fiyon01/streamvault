'use client';
import { useState, useEffect } from 'react';

export function SubDubToggle({ value: defaultValue = 'either' }: { value?: 'sub' | 'dub' | 'either' }) {
  const [value, setValue] = useState<'sub' | 'dub' | 'either'>(defaultValue);

  useEffect(() => {
    const saved = localStorage.getItem('anime_audio_pref') as 'sub' | 'dub' | 'either' | null;
    if (saved) setValue(saved);
  }, []);

  const handleChange = (val: 'sub' | 'dub' | 'either') => {
    setValue(val);
    localStorage.setItem('anime_audio_pref', val);
  };

  const options = [
    { label: 'SUB', val: 'sub' as const },
    { label: 'DUB', val: 'dub' as const },
    { label: 'EITHER', val: 'either' as const },
  ];

  return (
    <div className="inline-flex items-center rounded-2xl bg-white/5 border border-white/10 p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.val}
          onClick={() => handleChange(opt.val)}
          className={`px-5 py-2.5 rounded-xl text-sm font-black tracking-widest uppercase transition-all duration-300 ${
            value === opt.val
              ? 'bg-gradient-to-r from-[#00BFFF] to-[#8B5CF6] text-white shadow-[0_0_20px_rgba(0,191,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
