import type { Viewport, Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://streamvault.app';
const APP_NAME = 'StreamVault';
const APP_DESC = 'The world\'s most intelligent streaming companion. AI-powered recommendations, anime discovery, mood-based browsing, and cross-device sync — all in one place.';

export const viewport: Viewport = {
  themeColor: '#030508',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} — AI-Powered Streaming Discovery`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESC,
  keywords: [
    'streaming', 'movies', 'TV shows', 'anime', 'AI recommendations',
    'watch tracker', 'streaming platform', 'content discovery', 'watchlist',
    'film discovery', 'anime discovery', 'mood based recommendations',
  ],
  authors: [{ name: 'StreamVault Team' }],
  creator: 'StreamVault',
  publisher: 'StreamVault',
  manifest: '/manifest.json',
  category: 'entertainment',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── Favicon chain ─────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icon.png',
  },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp previews) ────────────────────
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — AI-Powered Streaming Discovery`,
    description: APP_DESC,
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'StreamVault Logo',
        type: 'image/png',
      },
    ],
  },

  // ── Twitter / X cards ─────────────────────────────────────────────────────
  twitter: {
    card: 'summary',
    site: '@streamvault',
    creator: '@streamvault',
    title: `${APP_NAME} — AI-Powered Streaming Discovery`,
    description: APP_DESC,
    images: ['/icon-512.png'],
  },
};

// ── JSON-LD structured data (makes Google show brand icon + sitelinks) ───────
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: APP_NAME,
      description: APP_DESC,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${APP_URL}/discover?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: APP_NAME,
      url: APP_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${APP_URL}/icon-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [],
      description: APP_DESC,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${APP_URL}/#app`,
      name: APP_NAME,
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: APP_DESC,
      screenshot: `${APP_URL}/icon-512.png`,
    },
  ],
};

import NextTopLoader from 'nextjs-toploader';
import { AmbientAudioProvider } from '@/components/music/ambient-audio-provider';
import { AmbientAudioToggle } from '@/components/music/ambient-audio-toggle';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="midnight" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data for Google rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Preconnect to external image CDNs for faster loads */}
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://cdn.myanimelist.net" />
        <link rel="dns-prefetch" href="https://api.groq.com" />
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://api-inference.huggingface.co" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <AmbientAudioProvider>
          <NextTopLoader color="#3b82f6" showSpinner={false} height={3} shadow="0 0 10px #3b82f6,0 0 5px #3b82f6" />
          {/* Apply saved theme before hydration to avoid flash */}
          <Script id="theme-init" strategy="beforeInteractive">{`
            try {
              const t = localStorage.getItem('streamvault_theme');
              if (t) document.documentElement.setAttribute('data-theme', t);
              const raw = localStorage.getItem('streamvault-settings');
              if (raw) {
                const s = JSON.parse(raw);
                document.documentElement.dataset.ambientAudio = s.ambientAudio === false ? 'off' : 'on';
                document.documentElement.dataset.dataSaver = s.dataSaver === true ? 'on' : 'off';
                document.documentElement.dataset.cardDensity = s.cardDensity === 'compact' ? 'compact' : 'comfortable';
                document.documentElement.dataset.vaultTone = ['cinematic','brief'].includes(s.vaultTone) ? s.vaultTone : 'decisive';
                document.documentElement.dataset.spoilerGuard = ['strict','open'].includes(s.spoilerGuard) ? s.spoilerGuard : 'balanced';
              }
            } catch(e) {}
          `}</Script>
          {children}
          <AmbientAudioToggle />
        </AmbientAudioProvider>
      </body>
    </html>
  );
}
