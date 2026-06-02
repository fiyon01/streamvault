import { Suspense } from 'react';
import { OneShotPlayer } from '@/components/oneshot/one-shot-player';

export const metadata = {
  title: 'Vault One-Shot Play | StreamVault',
  description: 'AI-Powered instant play',
};

export default function OneShotPage() {
  return (
    <main className="bg-black min-h-screen">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Loading One-Shot...</div>}>
        <OneShotPlayer />
      </Suspense>
    </main>
  );
}
