import { createClient } from '@/lib/supabase/server';
import type { ExternalMetadata } from '../types';

interface CommunityRating {
  pacing?: number;
  tone?: number;
  complexity?: number;
  ending_quality?: number;
  rewatchability?: number;
  emotional_weight?: number;
  binge_worthiness?: number;
  gets_good_at_episode?: number;
  tags?: string[];
  season_number?: number;
  rating?: number;
  review?: string;
  user_id?: string;
  helpful_count?: number;
}

interface ContentDnaMeta {
  community_ratings?: unknown;
  pacing_profile?: string | null;
  rewatchability_score?: number | null;
  ending_quality?: string | null;
  audience_consensus?: number | null;
  quality_trajectory?: 'improves' | 'consistent' | 'declines' | 'mixed';
  tone?: {
    cynical?: number;
    darkly_comic?: number;
  } | null;
  finale_satisfaction?: number | null;
  pacing?: {
    slow_burn?: number;
  } | null;
  momentum_score?: number | null;
  mood_tags?: string[] | null;
}

export async function enrichFromCommunity(
  tmdbId: string,
  mediaType: 'movie' | 'tv'
): Promise<Partial<ExternalMetadata>> {
  void mediaType;
  const supabase = createClient();

  try {
    // Check for existing community ratings
    const { data: existing } = await supabase
      .from('content_dna')
      .select('community_ratings, pacing_profile, rewatchability_score, ending_quality')
      .eq('tmdb_id', tmdbId)
      .maybeSingle();

    const communityMeta = existing as ContentDnaMeta | null;

    // Fetch community votes for this content
    const { data: votes } = await supabase
      .from('content_community_ratings')
      .select('*')
      .eq('tmdb_id', tmdbId);

    const ratingList = (votes ?? []) as CommunityRating[];
    const totalVotes = ratingList.length;

    if (totalVotes === 0 && !communityMeta?.community_ratings) {
      // Infer from AI-extracted content DNA if no community votes
      if (communityMeta) {
        return inferFromDNA(communityMeta);
      }
      return {};
    }

    const avgPacing = average(ratingList.map((r: CommunityRating) => r.pacing ?? 0));
    const avgTone = average(ratingList.map((r) => r.tone ?? 0));
    const avgComplexity = average(ratingList.map((r) => r.complexity ?? 0));
    const avgEnding = average(ratingList.map((r) => r.ending_quality ?? 0));
    const avgRewatch = average(ratingList.map((r) => r.rewatchability ?? 0));
    const avgEmotional = average(ratingList.map((r) => r.emotional_weight ?? 0));
    const avgBinge = average(ratingList.map((r) => r.binge_worthiness ?? 0));

    // Find episode where it gets good
    const goodEpisodes = ratingList
      .filter((r) => (r.gets_good_at_episode ?? 0) > 0)
      .map((r) => r.gets_good_at_episode ?? 1);

    const avgGetsGood = goodEpisodes.length > 0
      ? Math.round(average(goodEpisodes))
      : 1;

    // Tags from community
    const tagCounts: Record<string, number> = {};
    for (const r of ratingList) {
      for (const tag of (r.tags ?? []) as string[]) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    // Season ratings
    const seasonRatings: Record<number, number[]> = {};
    for (const r of ratingList) {
      const season = r.season_number ?? 0;
      if (season > 0 && r.rating) {
        if (!seasonRatings[season]) seasonRatings[season] = [];
        seasonRatings[season].push(r.rating);
      }
    }

    const bestSeasons = Object.entries(seasonRatings)
      .map(([season, ratings]) => ({
        seasonNumber: parseInt(season),
        averageRating: average(ratings),
      }))
      .sort((a, b) => b.averageRating - a.averageRating);

    const worstSeasons = [...bestSeasons].sort((a, b) => a.averageRating - b.averageRating);

    return {
      community: {
        rating: average(ratingList.map((r) => r.rating ?? 0).filter(Boolean)),
        filler_percentage: 0,
        quality_trajectory: undefined,
        pacing: avgPacing,
        tone: avgTone,
        complexity: avgComplexity,
        endingQuality: avgEnding,
        rewatchability: avgRewatch,
        episodeWhereItGetsGood: avgGetsGood,
        emotionalWeight: avgEmotional,
        slowBurnScore: 1 - avgPacing,
        bingeWorthiness: avgBinge,
        totalVotes,
        topTags,
        reviews: ratingList
          .filter((r) => r.review)
          .slice(0, 10)
          .map((r) => ({
            userId: r.user_id ?? '',
            text: r.review ?? '',
            rating: r.rating ?? 0,
            helpful: r.helpful_count ?? 0,
          })),
        bestSeasons: bestSeasons.slice(0, 3),
        worstSeasons: worstSeasons.slice(0, 3),
      },
    };
  } catch {
    return {};
  }
}

// ── Vote Recording ──

export async function submitCommunityRating(params: {
  tmdbId: string;
  mediaType: string;
  userId: string;
  pacing?: number;
  tone?: number;
  complexity?: number;
  endingQuality?: number;
  rewatchability?: number;
  emotionalWeight?: number;
  bingeWorthiness?: number;
  getsGoodAtEpisode?: number;
  seasonNumber?: number;
  tags?: string[];
  review?: string;
  rating?: number;
}): Promise<void> {
  const supabase = createClient();

  await supabase.from('content_community_ratings').upsert({
    tmdb_id: params.tmdbId,
    media_type: params.mediaType,
    user_id: params.userId,
    pacing: params.pacing ?? null,
    tone: params.tone ?? null,
    complexity: params.complexity ?? null,
    ending_quality: params.endingQuality ?? null,
    rewatchability: params.rewatchability ?? null,
    emotional_weight: params.emotionalWeight ?? null,
    binge_worthiness: params.bingeWorthiness ?? null,
    gets_good_at_episode: params.getsGoodAtEpisode ?? null,
    season_number: params.seasonNumber ?? null,
    tags: params.tags ?? [],
    review: params.review ?? null,
    rating: params.rating ?? null,
  }, { onConflict: 'tmdb_id,user_id' });
}

// ── Helpers ──

function average(nums: number[]): number {
  if (nums.length === 0) return 0.5;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function inferFromDNA(dna: ContentDnaMeta): Partial<ExternalMetadata> {
  const pacingVal = typeof dna.pacing_profile === 'string'
    ? ({ slow_burn: 0.8, balanced: 0.5, relentless: 0.2 } as Record<string, number>)[dna.pacing_profile] ?? 0.5
    : 0.5;

  return {
    community: {
      rating: dna.audience_consensus ?? 0.5,
      filler_percentage: 0,
      quality_trajectory: dna.quality_trajectory,
      pacing: pacingVal,
      tone: ((dna.tone?.cynical ?? 0.5) + (dna.tone?.darkly_comic ?? 0.5)) / 2,
      complexity: 0.5,
      endingQuality: dna.finale_satisfaction ?? 0.5,
      rewatchability: dna.rewatchability_score ?? 0.5,
      episodeWhereItGetsGood: 1,
      emotionalWeight: 0.5,
      slowBurnScore: dna.pacing?.slow_burn ?? 0.5,
      bingeWorthiness: dna.momentum_score ?? 0.5,
      totalVotes: 0,
      topTags: (dna.mood_tags ?? []).map((t) => ({ tag: t, count: 0 })),
      reviews: [],
      bestSeasons: [],
      worstSeasons: [],
    },
  };
}
