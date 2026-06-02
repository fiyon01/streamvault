import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Clapperboard,
  Clock3,
  Film,
  Play,
  Radar,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import { tmdb } from '@/lib/tmdb/api';

const FALLBACK_BACKDROPS = [
  '/8rpDcsfLJypbO6vtecsmEZz401.jpg',
  '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
  '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  '/4q2hz2m8hubgvijz8Ez0T2Os2Yv.jpg',
  '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
  '/zOpe0eHsq0A2NvNyBbtT6sj53qV.jpg',
];

const FALLBACK_POSTERS = [
  '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
  '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
  '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  '/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
  '/pB8O4LaSqruRUPEcxOco1ZfdiIN.jpg',
];

function imageUrl(path?: string | null, size: 'w500' | 'w780' | 'original' = 'original') {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function titleOf(item: any) {
  return item?.title || item?.name || item?.original_title || item?.original_name || 'Vault pick';
}

export default async function LandingPage() {
  const [trending, movies, animation] = await Promise.all([
    tmdb.getTrending('all', 'week').catch(() => null),
    tmdb.discoverMovies({ sort_by: 'popularity.desc', 'vote_count.gte': '800' }).catch(() => null),
    tmdb.discoverTv({
      with_genres: '16',
      without_original_language: 'ja',
      sort_by: 'popularity.desc',
      'vote_count.gte': '100',
    }).catch(() => null),
  ]);

  const hero = trending?.results?.find((item: any) => item.backdrop_path) || movies?.results?.[0];
  const heroBackdrop = imageUrl(hero?.backdrop_path || FALLBACK_BACKDROPS[0]);
  const posters = [
    ...(trending?.results || []),
    ...(movies?.results || []),
    ...(animation?.results || []),
  ].filter((item: any) => item.poster_path).slice(0, 10);
  const posterDeck = posters.length > 0
    ? posters
    : FALLBACK_POSTERS.map((poster_path, index) => ({ id: `fallback-${index}`, poster_path, title: 'StreamVault pick' }));
  const featured = [
    ...(animation?.results || []),
    ...(trending?.results || []),
  ].filter((item: any) => item.backdrop_path).slice(0, 3);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050506] text-white">
      <style>{`
        @keyframes svDrift {
          0% { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
        @keyframes svRise {
          0%, 100% { transform: translateY(0); opacity: .78; }
          50% { transform: translateY(-10px); opacity: 1; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .sv-poster-strip { animation: svDrift 34s linear infinite; }
          .sv-float { animation: svRise 4.8s ease-in-out infinite; }
        }
      `}</style>
      <section className="relative min-h-[92svh] overflow-hidden border-b border-white/10">
        <Image
          src={heroBackdrop}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#050506_0%,rgba(5,5,6,0.88)_30%,rgba(5,5,6,0.42)_68%,rgba(5,5,6,0.82)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.62)_0%,rgba(5,5,6,0.1)_42%,#050506_100%)]" />

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="StreamVault home">
            <Image
              src="/icon-192.png"
              alt=""
              width={44}
              height={44}
              priority
              className="h-11 w-11 rounded-lg object-cover shadow-[0_18px_60px_rgba(124,58,237,0.35)]"
            />
            <span className="text-base font-black uppercase tracking-[0.24em] text-white">StreamVault</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/72 md:flex">
            <Link href="/oneshot" className="transition hover:text-white">One Shot</Link>
            <Link href="/cartoons" className="transition hover:text-white">Animation</Link>
            <Link href="/anime" className="transition hover:text-white">Anime</Link>
            <Link href="/kdrama" className="transition hover:text-white">K-Drama</Link>
            <Link href="/pinoy" className="transition hover:text-white">Pinoy</Link>
            <Link href="/discover" className="transition hover:text-white">Discover</Link>
          </nav>
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:border-white/45 hover:bg-white/10"
          >
            Sign in
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(92svh-84px)] w-full max-w-7xl items-center gap-10 px-5 pb-12 pt-8 md:grid-cols-[minmax(0,1fr)_440px] md:px-8">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#9ee493] backdrop-blur">
              <Brain className="h-4 w-4" />
              AI-powered streaming intelligence
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-normal text-white sm:text-7xl lg:text-8xl">
              StreamVault
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-white/78 md:text-2xl md:leading-9">
              An AI-powered cinematic command center for movies, shows, anime, and animation, built around the exact mood you are in right now.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-3 rounded-lg bg-white px-6 py-4 text-base font-black text-black shadow-[0_24px_80px_rgba(255,255,255,0.18)] transition hover:bg-[#e8f7ff]"
              >
                Enter the vault <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/oneshot"
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/20 bg-black/35 px-6 py-4 text-base font-black text-white backdrop-blur transition hover:border-[#f9c74f]/70 hover:bg-[#f9c74f]/10"
              >
                <Wand2 className="h-5 w-5 text-[#f9c74f]" /> Try One Shot
              </Link>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3 text-sm text-white/70">
              {[
                ['Tonight Mode', 'pick faster by mood'],
                ['Global drama', 'K-drama and Pinoy hubs'],
                ['Trailer first', 'test before commitment'],
              ].map(([metric, label]) => (
                <div key={metric} className="border-l border-white/18 pl-4">
                  <div className="text-xl font-black text-white">{metric}</div>
                  <div className="mt-1 leading-5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="sv-float rounded-xl border border-white/14 bg-[#0b0d10]/82 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <Image
                  src={imageUrl(featured[0]?.backdrop_path || hero?.backdrop_path || FALLBACK_BACKDROPS[1], 'w780')}
                  alt=""
                  width={780}
                  height={439}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-2 py-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#f94144]">
                    <Sparkles className="h-4 w-4" /> VAULT AI is ranking
                  </div>
                  <h2 className="mt-2 text-2xl font-black leading-tight">{titleOf(featured[0] || hero)}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/62">
                    Trailer-led discovery with mood, pacing, and format tuned before the user presses play.
                  </p>
                </div>
                <button className="grid h-14 w-14 place-items-center self-center rounded-lg bg-[#f9c74f] text-black">
                  <Play className="h-6 w-6 fill-current" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {featured.slice(0, 3).map((item: any, index: number) => (
                  <div key={item.id || index} className="overflow-hidden rounded-md border border-white/10 bg-white/5">
                    <Image
                      src={imageUrl(item.backdrop_path, 'w500')}
                      alt=""
                      width={500}
                      height={281}
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 bg-black/45 px-5 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl gap-3 overflow-hidden">
            <div className="sv-poster-strip flex min-w-max gap-3">
            {[...posterDeck.slice(0, 8), ...posterDeck.slice(0, 8)].map((item: any, index: number) => (
              <div key={item.id || index} className="h-24 w-16 shrink-0 overflow-hidden rounded-md border border-white/12 bg-white/5 md:h-32 md:w-20">
                <Image
                  src={imageUrl(item.poster_path, 'w500')}
                  alt=""
                  width={160}
                  height={240}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
            </div>
            <div className="ml-auto hidden min-w-72 items-center justify-end gap-3 text-right text-sm text-white/62 md:flex">
              <BadgeCheck className="h-5 w-5 text-[#9ee493]" />
              <span>AI recommendations route movies, TV, anime, and western animation into separate taste lanes.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#08090b] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.22em] text-[#f9c74f]">Built around recommendation intelligence</div>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-normal md:text-5xl">
              Stop scrolling. Let VAULT AI rank the room.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/62">
              StreamVault treats discovery like a control room: intent comes in, taste DNA, mood, quality, freshness, and negative feedback compete, then trailers prove the pick before it reaches the watch page.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Brain, 'Taste DNA', 'Learns the patterns behind your repeats, skips, and saves.'],
              [Clapperboard, 'Trailer-first', 'One Shot prioritizes playable trailer picks over static posters.'],
              [Film, 'Global drama lanes', 'K-drama and Pinoy soaps get dedicated discovery, trailers, and watch pages.'],
              [Clock3, 'Watch-ready', 'Episodes, seasons, music cues, and feedback live near playback.'],
            ].map(([Icon, title, copy]: any) => (
              <article key={title} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                <Icon className="h-6 w-6 text-[#4cc9f0]" />
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#050506] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.22em] text-[#9ee493]">Animation lane</div>
              <h2 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">Cartoons should look like cartoons.</h2>
            </div>
            <Link href="/cartoons" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-white/72 transition hover:text-white">
              Browse animation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(featured.length > 0 ? featured : posterDeck.slice(0, 3)).map((item: any, index: number) => (
              <article key={item.id || index} className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
                <div className="relative aspect-[16/10] bg-black">
                  <Image
                    src={imageUrl(item.backdrop_path || item.poster_path, item.backdrop_path ? 'w780' : 'w500')}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#f9c74f]">
                      <Star className="h-4 w-4 fill-current" /> Animated match
                    </div>
                    <h3 className="line-clamp-1 text-2xl font-black">{titleOf(item)}</h3>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#08090b] px-5 py-18 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            ['Tonight Mode', 'Tell StreamVault the night you have: tired, date night, weekend binge, under two hours. It filters by real commitment, not just genre.', '/dashboard'],
            ['K-Drama Hub', 'Korean dramas open to detail pages with trailers, episode playback, Viki fallback links, and scoped Korean discovery.', '/kdrama'],
            ['Pinoy Drama Hub', 'Filipino soaps, official iWantTFC and BlastTV links, live Pinoy TV, English-friendly searches, and TMDB-matched playback.', '/pinoy'],
          ].map(([title, copy, href]) => (
            <Link key={title} href={href} className="group rounded-lg border border-white/10 bg-white/[0.035] p-6 transition hover:border-[#9ee493]/35 hover:bg-[#9ee493]/8">
              <h3 className="text-2xl font-black">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/58">{copy}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#9ee493] group-hover:text-white">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-5 py-8 text-sm text-white/45 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-black uppercase tracking-[0.18em] text-white/55">StreamVault</span>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="transition hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
