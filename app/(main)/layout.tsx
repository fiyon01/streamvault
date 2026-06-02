'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Home, Compass, Heart, User, Film, Tv, Swords, Globe2, Clapperboard, Brain } from 'lucide-react';

import { VaultAssistant } from '@/components/ai/vault-assistant';
import { GlobalSearch } from '@/components/ui/global-search';
import { SearchTrigger } from '@/components/ui/search-trigger';
import { AppSidebar } from '@/components/ui/app-sidebar';
import { cn } from '@/lib/utils/cn';

const MOBILE_NAV = [
  { href: '/dashboard', icon: Home,    label: 'Home'     },
  { href: '/movies',    icon: Film,    label: 'Movies'   },
  { href: '/shows',     icon: Tv,      label: 'Shows'    },
  { href: '/kdrama',    icon: Tv,      label: 'K-Drama'  },
  { href: '/pinoy',     icon: Tv,      label: 'Pinoy'    },
  { href: '/anime',     icon: Swords,  label: 'Anime'    },
  { href: '/africa',    icon: Globe2,  label: 'Africa'   },
  { href: '/creators',  icon: Clapperboard, label: 'Creators' },
  { href: '/discover',  icon: Compass, label: 'Discover' },
  { href: '/watchlist', icon: Heart,   label: 'Watchlist'},
  { href: '/calibrate', icon: Brain,   label: 'Taste'    },
  { href: '/profile',   icon: User,    label: 'Profile'  },
] as const;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text transition-colors duration-200">
      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <AppSidebar />

      {/* ── Main Content Area ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative pb-24 lg:pb-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-border p-4 flex justify-between items-center lg:justify-end gap-4">
          {/* Mobile logo with real icon */}
          <div className="lg:hidden flex items-center gap-2">
            <Image src="/icon-192.png" alt="StreamVault" width={28} height={28} className="w-7 h-7 rounded-lg object-cover" priority />
            <span className="font-black text-[13px] tracking-[0.15em] bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              STREAMVAULT
            </span>
          </div>
          <SearchTrigger />
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* ── Premium Floating Mobile Nav ─────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-bg/95 backdrop-blur-2xl border-t border-border/50 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] px-2 pb-5 pt-2 flex overflow-x-auto hide-scrollbar gap-1 snap-x touch-pan-x">
        {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 snap-center shrink-0 min-w-[64px]',
                active ? 'text-accent bg-accent/10' : 'text-muted hover:text-text',
              )}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="text-[9px] font-bold tracking-wide">{label}</span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-accent absolute bottom-1" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Floating Overlay Components ─────────────────────────────── */}
      <GlobalSearch />
      <VaultAssistant />
    </div>
  );
}
