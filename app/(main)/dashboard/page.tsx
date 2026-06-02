import { OneShotHero } from '@/components/oneshot/one-shot-hero';
import PersonalizedRows from '@/components/recommendations/personalized-rows';
import { MoodEngineCard } from '@/components/recommendations/mood-engine-card';
import { CreatorCatchUpCard } from '@/components/creators/creator-catch-up-card';
import { FirstSessionCalibrationCard } from '@/components/vault/first-session-calibration-card';
import { TonightDecisionCard } from '@/components/vault/tonight-decision-card';
import { TonightModePanel } from '@/components/vault/tonight-mode-panel';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your personalised AI streaming hub. Discover trending movies, must-see TV, and anime curated for your taste.',
  openGraph: {
    title: 'Home | StreamVault',
    description: 'Your personalised AI streaming hub. Discover trending movies, must-see TV, and anime curated for your taste.',
  },
};

export default async function DashboardPage() {
  return (
    <div className="min-h-screen overflow-x-hidden pb-24" style={{ background: 'var(--color-bg)' }}>
      <TonightDecisionCard />

      <TonightModePanel />

      <MoodEngineCard />

      <FirstSessionCalibrationCard />

      <div className="px-6 pt-5 md:px-8 lg:px-12">
        <OneShotHero />
      </div>

      <div className="mt-8">
        <CreatorCatchUpCard />
      </div>

      <section className="mt-10 border-t border-white/8 pt-8">
        <PersonalizedRows />
      </section>
    </div>
  );
}
