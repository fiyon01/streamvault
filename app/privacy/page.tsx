import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'StreamVault privacy policy for account data, watch history, recommendations, and third-party content surfaces.',
};

const sections = [
  {
    title: 'What StreamVault Collects',
    body: 'StreamVault may collect account details, profile settings, watch history, watchlist activity, creator follows, recommendation feedback, calibration answers, and technical logs needed to keep playback, discovery, and VAULT recommendations working.',
  },
  {
    title: 'How We Use Data',
    body: 'We use this information to personalize recommendations, remember watch progress, improve source reliability, power creator catch-up, protect accounts, debug product issues, and make the experience faster and more relevant.',
  },
  {
    title: 'AI And Recommendation Signals',
    body: 'VAULT uses your saved signals, calibration answers, watch outcomes, and explicit feedback to make better recommendations. The goal is to reduce generic suggestions, not to sell or expose your taste profile.',
  },
  {
    title: 'Third-Party Services',
    body: 'StreamVault may connect to services such as Supabase, TMDB, YouTube, AniList/Jikan, and external video providers. When you open third-party content, those services may process data according to their own policies.',
  },
  {
    title: 'Your Choices',
    body: 'You can update profile settings, clear watch history, disconnect integrations, and choose what feedback you give VAULT. If you want account data deleted, contact the StreamVault operator for manual removal.',
  },
  {
    title: 'Security',
    body: 'We use reasonable technical measures to protect account and product data. No system is perfect, so sensitive credentials and service keys should never be shared in chat, comments, or public pages.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#05060a] px-5 py-10 text-white md:px-8 md:py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-black uppercase tracking-[0.18em] text-[#9ee493] transition hover:text-white">
          StreamVault
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">Privacy Policy</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/62">
          Last updated: June 2, 2026. This policy explains how StreamVault handles data for discovery, playback, watch history, VAULT AI, creator content, and account preferences.
        </p>

        <div className="mt-10 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-xl font-black">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/62">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-[#9ee493]/20 bg-[#9ee493]/8 p-5 text-sm leading-7 text-white/68">
          Questions about privacy, deletion, or account data should be sent to the StreamVault operator. For application setup forms, use this public page as the privacy policy link.
        </div>
      </div>
    </main>
  );
}
