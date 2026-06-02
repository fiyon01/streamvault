import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'StreamVault Terms of Service for using discovery, recommendations, creator content, watch parties, and playback surfaces.',
};

const sections = [
  {
    title: 'Use Of StreamVault',
    body: 'StreamVault is a streaming companion and discovery interface. You agree to use it responsibly, keep your account credentials secure, and avoid actions that disrupt the service or other users.',
  },
  {
    title: 'Content And Third-Party Sources',
    body: 'StreamVault indexes, recommends, embeds, links to, or organizes content from third-party services and metadata providers. StreamVault does not own third-party content and cannot guarantee availability, quality, subtitles, ads, or playback behavior on external providers.',
  },
  {
    title: 'User Data And Recommendations',
    body: 'You may provide watch history, calibration answers, ratings, creator follows, and other signals. These are used to personalize discovery and VAULT responses. Recommendation results are informational and may be imperfect.',
  },
  {
    title: 'Acceptable Use',
    body: 'Do not use StreamVault to upload illegal content, bypass access controls, attack services, abuse APIs, impersonate others, or distribute harmful material.',
  },
  {
    title: 'Availability',
    body: 'Features may change as StreamVault improves. External APIs, video servers, YouTube channels, and metadata sources can fail or change independently of StreamVault.',
  },
  {
    title: 'Limitation Of Liability',
    body: 'StreamVault is provided as-is. To the maximum extent allowed by law, the operator is not liable for losses caused by external content, service interruptions, inaccurate metadata, recommendation errors, or third-party playback behavior.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#05060a] px-5 py-10 text-white md:px-8 md:py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-black uppercase tracking-[0.18em] text-[#9ee493] transition hover:text-white">
          StreamVault
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">Terms of Service</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/62">
          Last updated: June 2, 2026. These terms govern your use of StreamVault, including VAULT AI, watch history, creator content, watch parties, and playback surfaces.
        </p>

        <div className="mt-10 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <h2 className="text-xl font-black">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/62">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/62">
          For application setup forms, use this public page as the Terms of Service link. Continued use of StreamVault means you accept these terms.
        </div>
      </div>
    </main>
  );
}
