'use client';

import { useRouter } from 'next/navigation';
import { Wand2 } from 'lucide-react';

const ANIME_MOODS = [
  { id: 'hype',       label: '⚔️ Hype',           prompt: 'high octane action anime with intense battles and hype moments' },
  { id: 'cozy',       label: '🍜 Cozy',            prompt: 'cozy slice of life anime, relaxing and wholesome' },
  { id: 'dark',       label: '🔪 Dark',            prompt: 'dark psychological anime with complex themes and moral ambiguity' },
  { id: 'romance',    label: '❤️ Romance',         prompt: 'romantic anime with emotional relationships and great chemistry' },
  { id: 'psych',      label: '🧠 Psychological',   prompt: 'psychological thriller anime that messes with your mind' },
  { id: 'film',       label: '🎬 Film Night',      prompt: 'critically acclaimed anime film or movie' },
  { id: 'short',      label: '⚡ Short & Complete', prompt: 'short completed anime under 13 episodes with satisfying ending' },
  { id: 'rated',      label: '🌟 Highly Rated',    prompt: 'highly rated anime with MAL score above 8.5' },
  { id: 'isekai',     label: '🎭 Isekai',          prompt: 'isekai anime where the protagonist is transported to another world' },
  { id: 'martial',    label: '👊 Martial Arts',    prompt: 'martial arts anime with great fight choreography' },
];

export function AnimeMoodChips() {
  const router = useRouter();

  const handleMoodClick = (prompt: string) => {
    router.push(`/oneshot?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 size={16} className="text-[#8B5CF6]" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">One-Shot Anime Moods</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {ANIME_MOODS.map((mood) => (
          <button
            key={mood.id}
            onClick={() => handleMoodClick(mood.prompt)}
            className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-[#8B5CF6]/15 hover:text-white hover:border-[#8B5CF6]/40 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
          >
            {mood.label}
          </button>
        ))}
      </div>
    </div>
  );
}
