import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Baby, Church, Clapperboard, Drama, Globe2, Languages, Laugh, Music2, Trophy, Tv } from 'lucide-react';
import { tmdb } from '@/lib/tmdb/api';
import { ContentRow } from '@/components/ui/content-row';

export const metadata: Metadata = {
  title: 'African Hub',
  description: 'Nollywood, Kenyan series, African comedy, Afrobeats, football, faith, kids, and local-language discovery.',
};

const LANES = [
  {
    title: 'Nollywood',
    description: 'New Nollywood, classics, Yoruba, Hausa, Igbo, diaspora, award winners, and hidden gems.',
    href: '/discover?originCountry=NG&is_nollywood=true&contentType=both',
    icon: Clapperboard,
  },
  {
    title: 'East Africa',
    description: 'Kenyan series, Swahili availability, Maisha Magic, Citizen TV, family drama, and local comedy.',
    href: '/discover?originCountry=KE&east_african_content=true&contentType=tv',
    icon: Globe2,
  },
  {
    title: 'African Comedy',
    description: 'Stand-up specials, skits, long-form creator comedy, and official YouTube deep links.',
    href: '/creators?category=nigerian_comedy',
    icon: Laugh,
  },
  {
    title: 'Afrobeats & Music',
    description: 'Concert films, documentaries, music videos, artist context, and soundtrack discovery.',
    href: '/discover?africanOnly=true&africanRegion=west_africa&is_music_content=true',
    icon: Music2,
  },
  {
    title: 'Football & Sports',
    description: 'AFCON, team stories, club documentaries, player films, and official highlight surfaces.',
    href: '/discover?africanOnly=true&is_sports_content=true',
    icon: Trophy,
  },
  {
    title: 'Faith & Inspiration',
    description: 'Opt-in faith films and inspirational content with family-safety context.',
    href: '/discover?africanOnly=true&is_faith_content=true',
    icon: Church,
  },
  {
    title: 'Kids & Family',
    description: 'Parent-friendly African kids content, educational tags, age ranges, and family filters.',
    href: '/discover?africanOnly=true&is_kids_content=true',
    icon: Baby,
  },
  {
    title: 'Telenovelas',
    description: 'Latin drama and telenovela lanes for audiences who want long-running emotional storytelling.',
    href: '/discover?content_subtype=telenovela',
    icon: Drama,
  },
];

const CANON_STARTERS = [
  { title: 'Gangs of Lagos', lane: 'New Nollywood', note: 'Crime, loyalty, street politics, Lagos texture.' },
  { title: 'A Tribe Called Judah', lane: 'New Nollywood', note: 'Mainstream crowd-pleaser with strong local pull.' },
  { title: 'Breath of Life', lane: 'Award Winner', note: 'Faith, grief, redemption, and premium production values.' },
  { title: 'Living in Bondage', lane: 'Classic Nollywood', note: 'A foundational reference point for the canon.' },
  { title: 'Jagun Jagun', lane: 'Yoruba', note: 'Epic scale, folklore energy, and language-specific discovery value.' },
  { title: 'Crime and Justice Kenya', lane: 'Kenyan Series', note: 'A clean entry point for Kenyan crime drama.' },
];

async function settled<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

export default async function AfricaPage() {
  const [nigerianMovies, nigerianTv, kenyanTv, southAfricanTv, egyptianTv] = await Promise.all([
    settled(tmdb.discoverMovies({ with_origin_country: 'NG', sort_by: 'popularity.desc' })),
    settled(tmdb.discoverTv({ with_origin_country: 'NG', sort_by: 'popularity.desc' })),
    settled(tmdb.discoverTv({ with_origin_country: 'KE|TZ|UG', sort_by: 'popularity.desc' })),
    settled(tmdb.discoverTv({ with_origin_country: 'ZA', sort_by: 'popularity.desc' })),
    settled(tmdb.discoverTv({ with_origin_country: 'EG', with_original_language: 'ar', sort_by: 'popularity.desc' })),
  ]);

  return (
    <div className="min-h-screen pb-24">
      <section className="px-6 py-8 md:px-12 lg:px-16">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(158,228,147,0.12),rgba(255,255,255,0.035)_38%,rgba(99,102,241,0.08))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] md:p-7">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">
              <Globe2 size={13} />
              Built for the market, not adapted later
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
              African content treated like canon, not a side shelf.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60 md:text-base">
              Nollywood, Kenyan series, African comedy, Afrobeats, football, faith, kids, and local-language viewing belong in the main product. VAULT treats them as canon, creator catalogues, and watch decisions.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/creators" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-slate-200">
              Open Creator Hub
              <ArrowRight size={15} />
            </Link>
            <Link href="/discover?africanOnly=true&is_african_content=true" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white">
              Run African filters
              <Languages size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-16">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {LANES.map(({ title, description, href, icon: Icon }) => (
            <Link key={title} href={href} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#9ee493]/30 hover:bg-white/[0.06]">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/25 text-[#9ee493]">
                <Icon size={18} />
              </div>
              <h2 className="text-base font-black text-white">{title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-white/48">{description}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/35 transition group-hover:text-[#9ee493]">
                Explore
                <ArrowRight size={12} />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 px-6 md:px-12 lg:px-16">
        <div className="rounded-3xl border border-white/10 bg-[#0b0d14] p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">Canon starter map</p>
              <h2 className="mt-1 text-xl font-black text-white">Manual judgment fills the metadata gap</h2>
            </div>
            <Tv className="hidden text-white/20 md:block" size={24} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CANON_STARTERS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{item.lane}</p>
                <h3 className="mt-1 text-base font-black text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/48">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-14 space-y-14">
        <ContentRow title="Nollywood movies surfaced from TMDB" items={nigerianMovies?.results || []} type="movie" />
        <ContentRow title="Nigerian series" items={nigerianTv?.results || []} type="tv" />
        <ContentRow title="Kenyan and East African series" items={kenyanTv?.results || []} type="tv" />
        <ContentRow title="South African series" items={southAfricanTv?.results || []} type="tv" />
        <ContentRow title="Egyptian Arabic drama" items={egyptianTv?.results || []} type="tv" />
      </div>
    </div>
  );
}
