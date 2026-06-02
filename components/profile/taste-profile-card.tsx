'use client';

import { useState, useEffect } from 'react';
import { Loader2, Brain, Fingerprint, Settings2, Radar, Search } from 'lucide-react';

interface TasteProfile {
  pacing_preference: Record<string, number>;
  protagonist_affinity: Record<string, number>;
  moral_complexity: Record<string, number>;
  tone_affinity: Record<string, number>;
  world_type_affinity: Record<string, number>;
  theme_scores: Record<string, number>;
  profile_summary: string;
  confidence_score: number;
  data_points: number;
}

interface ClusterInfo {
  cluster: {
    cluster_name: string;
    member_count: number;
  };
  similarity: number;
}

interface CoverageEntry {
  dimension: string;
  label: string;
  covered: number;
  totalAvailable: number;
  coveragePct: number;
  tasteAffinity: number;
}

interface BlindSpot {
  dimension: string;
  label: string;
  coveragePct: number;
  tasteAffinity: number;
  sampleTitles: string[];
  reason: string;
}

function DnaBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-white font-mono">{Math.round(value * 100)}%</span>
    </div>
  );
}

export function TasteProfileCard({ userId }: { userId?: string }) {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [cluster, setCluster] = useState<ClusterInfo | null>(null);
  const [coverage, setCoverage] = useState<CoverageEntry[]>([]);
  const [blindSpots, setBlindSpots] = useState<BlindSpot[]>([]);
  const [coverageSummary, setCoverageSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [profileRes, coverageRes, blindSpotRes] = await Promise.all([
          fetch(`/api/recommendations/profile/${userId}`),
          fetch('/api/vault/coverage'),
          fetch('/api/vault/blind-spot'),
        ]);

        const data = await profileRes.json();
        setProfile(data.profile);
        setCluster(data.cluster);

        if (coverageRes.ok) {
          const coverageData = await coverageRes.json();
          setCoverage((coverageData.coverage ?? []).slice(0, 6));
          setCoverageSummary(coverageData.summary ?? '');
        }

        if (blindSpotRes.ok) {
          const blindSpotData = await blindSpotRes.json();
          setBlindSpots((blindSpotData.blindSpots ?? []).slice(0, 3));
        }
      } catch (e) {
        console.error('Failed to load profile', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!profile || profile.data_points < 3) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
          <Brain className="w-8 h-8 text-muted" />
        </div>
        <h3 className="text-lg font-bold text-white">Your Viewing DNA is calibrating</h3>
        <p className="text-sm text-muted max-w-md mx-auto">
          We need a few more ratings or completions to build your unique psychological taste profile. Keep watching!
        </p>
        <div className="h-1.5 w-48 bg-bg rounded-full overflow-hidden mx-auto mt-4">
          <div className="h-full bg-accent transition-all" style={{ width: `${((profile?.data_points ?? 0) / 3) * 100}%` }} />
        </div>
      </div>
    );
  }

  const themes = Object.entries(profile.theme_scores || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([t]) => t);

  return (
    <div className="bg-gradient-to-br from-[#0c0a1a] to-[#0f111a] border border-accent/20 rounded-2xl overflow-hidden relative shadow-[0_0_40px_rgba(139,92,246,0.1)]">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3" />

      <div className="relative z-10 p-6 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
            <Fingerprint size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">Your Viewing DNA</h2>
            <div className="text-xs text-white/40 flex items-center gap-2">
              <span>Confidence: {Math.round(profile.confidence_score * 100)}%</span>
              <span>/</span>
              <span>Based on {profile.data_points} signals</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <p className="text-sm md:text-base text-white/90 leading-relaxed font-medium italic border-l-2 border-accent pl-4">
            &ldquo;{profile.profile_summary}&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* DNA Dimensions */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
              <Settings2 size={14} /> Core Dimensions
            </h3>
            <DnaBar label="Slow Burn" value={profile.pacing_preference?.slow_burn ?? 0} color="bg-orange-500" />
            <DnaBar label="Dark Tone" value={((profile.tone_affinity?.cynical ?? 0) + (profile.tone_affinity?.tragic ?? 0)) / 2} color="bg-slate-500" />
            <DnaBar label="Anti-Hero" value={profile.protagonist_affinity?.antihero ?? 0} color="bg-red-500" />
            <DnaBar label="Max Grey" value={profile.moral_complexity?.grey ?? 0} color="bg-purple-500" />
            <DnaBar label="Real World" value={profile.world_type_affinity?.real_world ?? 0} color="bg-blue-500" />
          </div>

          {/* Themes & Cluster */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                <Brain size={14} /> Top Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {themes.map(t => (
                  <span key={t} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/80">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {cluster && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Your Taste Cluster</h3>
                <p className="text-sm font-bold text-white mb-1">{cluster.cluster.cluster_name}</p>
                <p className="text-xs text-white/50">
                  You share this exact profile with {cluster.cluster.member_count.toLocaleString()} other StreamVault viewers.
                </p>
              </div>
            )}
          </div>
        </div>

        {(coverage.length > 0 || blindSpots.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {coverage.length > 0 && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                  <Radar size={14} /> Coverage Map
                </h3>
                <div className="space-y-3">
                  {coverage.map((entry) => (
                    <div key={`${entry.dimension}-${entry.label}`} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-white/80 font-medium truncate">
                          {entry.label}
                          <span className="text-white/35 ml-2 uppercase">{entry.dimension}</span>
                        </span>
                        <span className="text-white font-mono">{Math.round(entry.coveragePct)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, entry.coveragePct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {coverageSummary && <p className="text-xs text-white/50 mt-4 leading-relaxed">{coverageSummary}</p>}
              </div>
            )}

            {blindSpots.length > 0 && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                  <Search size={14} /> Blind Spots
                </h3>
                <div className="space-y-3">
                  {blindSpots.map((spot) => (
                    <div key={`${spot.dimension}-${spot.label}`} className="border-b border-white/10 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">{spot.label}</p>
                          <p className="text-xs text-white/45 uppercase">{spot.dimension}</p>
                        </div>
                        <span className="text-xs font-mono text-accent">{Math.round(spot.tasteAffinity * 100)}% match</span>
                      </div>
                      <p className="text-xs text-white/55 mt-2 leading-relaxed">{spot.reason}</p>
                      {spot.sampleTitles.length > 0 && (
                        <p className="text-xs text-white/40 mt-1">Try: {spot.sampleTitles.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
