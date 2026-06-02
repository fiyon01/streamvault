'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { InstallButton } from '@/components/pwa/install-button';
import {
  Home, Compass, Film, Tv, Heart,
  History, List, Palette, User,
  ChevronLeft, ChevronRight, Brain,
  Swords, Calendar, Star, Building2, ShieldCheck,
  Ghost, Skull, Baby, SlidersHorizontal, Globe2, Clapperboard
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Discover',
    items: [
      { label: 'Home',     href: '/dashboard', icon: Home },
      { label: 'Discover', href: '/discover',  icon: Compass },
    ],
  },
  {
    title: 'Library',
    items: [
      { label: 'Movies',    href: '/movies',    icon: Film },
      { label: 'TV Shows',  href: '/shows',     icon: Tv },
      { label: 'K-Drama',   href: '/kdrama',    icon: Tv },
      { label: 'Pinoy Drama', href: '/pinoy',    icon: Tv },
      { label: 'African Hub', href: '/africa',   icon: Globe2 },
      { label: 'Creator Hub', href: '/creators', icon: Clapperboard },
      { label: 'Watchlist', href: '/watchlist', icon: Heart },
      { label: 'History',   href: '/history',   icon: History },
      { label: 'My Lists',  href: '/lists',     icon: List },
    ],
  },
  {
    title: 'Anime',
    items: [
      { label: 'Anime Home', href: '/anime',             icon: Swords },
      { label: 'Advanced Filter', href: '/anime/discover', icon: SlidersHorizontal },
      { label: 'Seasonal',   href: '/anime/seasonal',    icon: Calendar },
      { label: 'Top Rated',  href: '/anime/top',         icon: Star },
      { label: 'By Studio',  href: '/anime/studios',     icon: Building2 },
      { label: 'Filler-Free',href: '/anime/filler-free', icon: ShieldCheck },
    ],
  },
  {
    title: 'Cartoons',
    items: [
      { label: 'Cartoons Home', href: '/cartoons',         icon: Ghost },
      { label: 'Advanced Filter', href: '/cartoons/discover', icon: SlidersHorizontal },
      { label: 'Classic',       href: '/cartoons/classic', icon: Star },
      { label: 'Adult Anim.',   href: '/cartoons/adult',   icon: Skull },
      { label: 'Kids',          href: '/cartoons/kids',    icon: Baby },
    ],
  },
  {
    title: 'Personalize',
    items: [
      { label: 'Calibrate VAULT', href: '/calibrate', icon: Brain },
      { label: 'Themes',  href: '/themes',  icon: Palette },
      { label: 'Profile', href: '/profile', icon: User },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  /* sync CSS variable so the rest of the layout can respond */
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-w',
      collapsed ? '72px' : '240px',
    );
  }, [collapsed]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', '240px');
  }, []);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col relative z-40',
        'bg-surface/90 backdrop-blur-xl',
        'border-r border-border/40',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      {/* ── Collapse toggle ─────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'absolute -right-[10px] top-20 z-50',
          'w-5 h-5 rounded-full',
          'bg-bg border border-border',
          'flex items-center justify-center',
          'text-muted hover:text-text',
          'transition-colors duration-200',
          'shadow-[0_2px_8px_rgba(0,0,0,0.6)]',
        )}
      >
        {collapsed
          ? <ChevronRight size={11} strokeWidth={2} />
          : <ChevronLeft  size={11} strokeWidth={2} />}
      </button>

      {/* ── Logo ────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-border/40',
          'transition-all duration-300',
          collapsed ? 'justify-center px-0' : 'px-5 gap-3',
        )}
      >
        <Link href="/" className="flex items-center gap-3 overflow-hidden group">
          {/* Icon mark — real logo */}
          <div
            className={cn(
              'w-7 h-7 flex-shrink-0 rounded-lg overflow-hidden',
              'group-hover:scale-105 transition-transform duration-200',
            )}
          >
            <Image src="/icon-192.png" alt="StreamVault" width={28} height={28} className="w-full h-full object-cover" priority />
          </div>

          {/* Wordmark */}
          <span
            className={cn(
              'font-black text-[11px] tracking-[0.15em] text-text',
              'transition-all duration-300 whitespace-nowrap overflow-hidden',
              collapsed ? 'w-0 opacity-0' : 'opacity-100',
            )}
          >
            STREAMVAULT
          </span>
        </Link>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>

        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {/* Group label — only when expanded */}
            <div
              className={cn(
                'px-4 mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted/60',
                'transition-all duration-200 whitespace-nowrap overflow-hidden',
                collapsed ? 'h-0 opacity-0 mb-0' : 'h-auto opacity-100',
              )}
            >
              {group.title}
            </div>

            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'relative flex items-center h-10 px-3 mx-2 rounded-xl gap-3',
                      'transition-all duration-200',
                      active
                        ? 'bg-accent/15 text-accent'
                        : 'text-muted hover:text-text hover:bg-white/5',
                      collapsed && 'justify-center px-0 mx-2',
                    )}
                  >
                    {/* Left accent bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                    )}

                    {/* Icon */}
                    <item.icon
                      size={18}
                      strokeWidth={1.5}
                      className="flex-shrink-0"
                    />

                    {/* Label */}
                    <span
                      className={cn(
                        'text-sm font-medium whitespace-nowrap overflow-hidden',
                        'transition-all duration-300',
                        collapsed ? 'w-0 opacity-0' : 'opacity-100',
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Install PWA — visible when expanded */}
        <div
          className={cn(
            'px-3 transition-all duration-300',
            collapsed ? 'hidden' : 'block',
          )}
        >
          <InstallButton />
        </div>
      </nav>

      {/* ── User mini-profile ───────────────────────────────────────── */}
      <div
        className={cn(
          'h-14 border-t border-border/40',
          'flex items-center gap-3 px-3 overflow-hidden',
          'transition-all duration-300',
          collapsed ? 'justify-center' : '',
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'w-8 h-8 flex-shrink-0 rounded-full',
            'bg-gradient-to-br from-accent to-accent-hover',
            'flex items-center justify-center',
          )}
        >
          <span className="text-white font-bold text-xs">U</span>
        </div>

        {/* Label */}
        <div
          className={cn(
            'flex-1 min-w-0 transition-all duration-300 whitespace-nowrap overflow-hidden',
            collapsed ? 'w-0 opacity-0' : 'opacity-100',
          )}
        >
          <div className="text-xs font-bold text-text truncate">Premium</div>
          <div className="text-[10px] text-muted truncate">View Profile →</div>
        </div>
      </div>
    </aside>
  );
}
