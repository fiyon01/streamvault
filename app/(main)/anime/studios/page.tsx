import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';

export const metadata = {
  title: 'Anime Studios | StreamVault',
  description: 'Browse anime by studio — MAPPA, Ufotable, Wit Studio, Bones, and more.',
};

const STUDIOS = [
  { name: 'MAPPA',           slug: 'mappa',            known: 'Jujutsu Kaisen, Chainsaw Man, AoT Final Season', founded: 2011, color: 'from-red-600/20 to-rose-900/20', border: 'border-red-500/20', accent: 'text-red-400', glow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]' },
  { name: 'Ufotable',        slug: 'ufotable',          known: 'Demon Slayer, Fate/Zero, Fate/stay night UBW', founded: 2000, color: 'from-purple-700/20 to-violet-900/20', border: 'border-purple-500/20', accent: 'text-purple-400', glow: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]' },
  { name: 'Wit Studio',      slug: 'wit-studio',        known: 'Vinland Saga, Spy x Family, AoT S1–S3', founded: 2012, color: 'from-blue-700/20 to-cyan-900/20', border: 'border-blue-500/20', accent: 'text-blue-400', glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]' },
  { name: 'Bones',           slug: 'bones',             known: 'Fullmetal Alchemist: Brotherhood, My Hero Academia', founded: 1998, color: 'from-orange-600/20 to-amber-900/20', border: 'border-orange-500/20', accent: 'text-orange-400', glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]' },
  { name: 'Pierrot',         slug: 'pierrot',           known: 'Naruto, Bleach, Tokyo Ghoul, Black Clover', founded: 1979, color: 'from-indigo-700/20 to-blue-900/20', border: 'border-indigo-500/20', accent: 'text-indigo-400', glow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]' },
  { name: 'Kyoto Animation', slug: 'kyoto-animation',   known: 'Violet Evergarden, K-On!, A Silent Voice', founded: 1981, color: 'from-pink-600/20 to-rose-900/20', border: 'border-pink-500/20', accent: 'text-pink-400', glow: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]' },
  { name: 'Madhouse',        slug: 'madhouse',          known: 'Death Note, Hunter x Hunter, One Punch Man S1', founded: 1972, color: 'from-slate-600/20 to-zinc-900/20', border: 'border-slate-500/20', accent: 'text-slate-300', glow: 'hover:shadow-[0_0_30px_rgba(100,116,139,0.15)]' },
  { name: 'A-1 Pictures',    slug: 'a-1-pictures',      known: 'Sword Art Online, Kaguya-sama, Fairy Tail', founded: 2005, color: 'from-teal-600/20 to-cyan-900/20', border: 'border-teal-500/20', accent: 'text-teal-400', glow: 'hover:shadow-[0_0_30px_rgba(20,184,166,0.15)]' },
  { name: 'TRIGGER',         slug: 'trigger',           known: 'Kill la Kill, Promare, Darling in the FranXX', founded: 2011, color: 'from-yellow-600/20 to-amber-900/20', border: 'border-yellow-500/20', accent: 'text-yellow-400', glow: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]' },
  { name: 'PA Works',        slug: 'pa-works',          known: 'Angel Beats!, Your Lie in April, Charlotte', founded: 2000, color: 'from-emerald-600/20 to-green-900/20', border: 'border-emerald-500/20', accent: 'text-emerald-400', glow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]' },
  { name: 'Studio Ghibli',   slug: 'studio-ghibli',     known: 'Spirited Away, My Neighbor Totoro, Princess Mononoke', founded: 1985, color: 'from-green-600/20 to-teal-900/20', border: 'border-green-500/20', accent: 'text-green-400', glow: 'hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]' },
  { name: 'Science SARU',    slug: 'science-saru',      known: 'Japan Sinks 2020, Heike Story, Scott Pilgrim', founded: 2013, color: 'from-fuchsia-600/20 to-purple-900/20', border: 'border-fuchsia-500/20', accent: 'text-fuchsia-400', glow: 'hover:shadow-[0_0_30px_rgba(217,70,239,0.15)]' },
];

export default function StudiosPage() {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-6 md:px-14 pt-10 pb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
            <Building2 className="text-[#8B5CF6]" size={20} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Animation Studios</h1>
            <p className="text-slate-400 text-sm mt-0.5">Every legendary studio — browse their complete catalogue</p>
          </div>
        </div>
      </div>

      {/* Studios Grid */}
      <div className="px-6 md:px-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STUDIOS.map((studio) => (
            <Link
              key={studio.slug}
              href={`/anime/studios/${studio.slug}`}
              className={`group relative p-7 rounded-3xl bg-gradient-to-br ${studio.color} border ${studio.border} ${studio.glow} hover:scale-[1.02] transition-all duration-400 overflow-hidden`}
            >
              {/* Ambient bg overlay */}
              <div className="absolute inset-0 bg-[#050505]/60" />

              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className={`text-2xl font-black ${studio.accent} group-hover:scale-105 transition-transform inline-block`}>
                      {studio.name}
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Est. {studio.founded}</p>
                  </div>
                  <div className={`${studio.accent} opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-2`}>
                    <ChevronRight size={24} />
                  </div>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed">{studio.known}</p>

                <div className={`text-xs font-black uppercase tracking-widest ${studio.accent} flex items-center gap-1`}>
                  Browse Catalogue <ChevronRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
