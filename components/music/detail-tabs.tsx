'use client';

import { useState } from 'react';
import { SoundtrackTab } from '@/components/music/soundtrack-tab';

interface DetailTabsProps {
  contentId: string;
  contentType: 'movie' | 'tv';
  title: string;
  isAnime?: boolean;
  totalTracks?: number;
  castSection?: React.ReactNode;
  infoSection?: React.ReactNode;
}

export function DetailTabs({
  contentId,
  contentType,
  title,
  isAnime = false,
  castSection,
  infoSection,
}: DetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'soundtrack'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'soundtrack' as const, label: 'Soundtrack' },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-bold transition-all relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div>
          {castSection}
          {infoSection}
        </div>
      )}

      {/* Soundtrack tab — lazy mount */}
      {activeTab === 'soundtrack' && (
        <SoundtrackTab
          contentId={contentId}
          contentType={contentType}
          title={title}
          isAnime={isAnime}
        />
      )}
    </div>
  );
}
