import type { EnrichmentResult, ExternalMetadata, MetadataSource } from './types';
import { METADATA_SOURCES } from './types';
import { enrichFromTVDb } from './sources/tvdb';
import { enrichFromAniList } from './sources/anilist';
import { enrichFromMusicBrainz } from './sources/musicbrainz';
import { enrichFromWikidata } from './sources/wikidata';
import { enrichFromFanart } from './sources/fanart';
import { enrichFromJustWatch } from './sources/justwatch';
import { enrichFromCommunity } from './sources/community';
import { enrichFromLetterboxdStyle } from './sources/letterboxd';

export interface PipelineOptions {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  year?: number;
  voteAverage?: number;
  voteCount?: number;
  sources?: MetadataSource[];
}

const SOURCE_FN: Record<MetadataSource, (opts: PipelineOptions) => Promise<Partial<ExternalMetadata>>> = {
  tvdb: (opts) => enrichFromTVDb(opts.tmdbId, opts.mediaType, opts.title),
  anilist: (opts) => enrichFromAniList(opts.tmdbId, opts.mediaType, opts.title, opts.year),
  musicbrainz: (opts) => enrichFromMusicBrainz(opts.tmdbId, opts.mediaType, opts.title),
  wikidata: (opts) => enrichFromWikidata(opts.tmdbId, opts.mediaType, opts.title, opts.year),
  fanart: (opts) => enrichFromFanart(opts.tmdbId, opts.mediaType),
  justwatch: (opts) => enrichFromJustWatch(opts.tmdbId, opts.mediaType, opts.title),
  community: (opts) => enrichFromCommunity(opts.tmdbId, opts.mediaType),
  letterboxd: (opts) => enrichFromLetterboxdStyle(opts.tmdbId, opts.mediaType, opts.title, opts.voteAverage, opts.voteCount),
};

function mergeMetadata(target: ExternalMetadata, partial: Partial<ExternalMetadata>): void {
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined || value === null) continue;
    const k = key as keyof ExternalMetadata;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      (target[k] as Record<string, unknown>) = { ...(target[k] as Record<string, unknown> ?? {}), ...value as Record<string, unknown> };
    } else {
      (target[k] as unknown) = value;
    }
  }
}

export async function enrichContent(opts: PipelineOptions): Promise<EnrichmentResult> {
  const activeSources = opts.sources ?? METADATA_SOURCES;
  const metadata: ExternalMetadata = {};
  const succeeded: string[] = [];

  const results = await Promise.allSettled(
    activeSources.map(async (source) => {
      const fn = SOURCE_FN[source];
      const partial = await fn(opts);
      return { source, partial };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, partial } = result.value;
      if (partial && Object.keys(partial).length > 0) {
        mergeMetadata(metadata, partial);
        succeeded.push(source);
      }
    }
  }

  return {
    tmdbId: opts.tmdbId,
    mediaType: opts.mediaType,
    title: opts.title,
    sources: succeeded,
    metadata,
    enrichedAt: new Date().toISOString(),
  };
}

/**
 * Synchronizes external metadata to the 'content_metadata' table.
 * Fills technical columns (episode counts, runtimes, status) from sources like TVDb and JustWatch.
 */
import { createClient } from '@/lib/supabase/server';

export async function syncContentMetadata(enrichment: EnrichmentResult): Promise<void> {
  const supabase = createClient();
  const { tmdbId, metadata } = enrichment;

  const update: any = {
    content_id: tmdbId,
    updated_at: new Date().toISOString(),
    last_enriched_at: enrichment.enrichedAt,
    external_metadata: metadata,
  };

  // 1. Technical stats from TVDb
  if (metadata.tvdb) {
    if (metadata.tvdb.episodeCount) update.total_episode_count = metadata.tvdb.episodeCount;
    if (metadata.tvdb.seasonCount) update.season_count = metadata.tvdb.seasonCount;
    if (metadata.tvdb.network) update.network = metadata.tvdb.network;
    if (metadata.tvdb.runtime) update.avg_episode_runtime = metadata.tvdb.runtime;
    if (metadata.tvdb.status) {
      update.status = metadata.tvdb.status;
      update.is_completed = ['ended', 'completed'].includes(metadata.tvdb.status.toLowerCase());
      update.is_airing = ['continuing', 'ongoing'].includes(metadata.tvdb.status.toLowerCase());
    }
    if (metadata.tvdb.rating) update.content_rating = metadata.tvdb.rating;
  }

  // 2. Anime-specific from AniList
  if (metadata.anilist) {
    update.anime_source = metadata.anilist.source;
    update.studio = metadata.anilist.studios?.filter(s => s.isMain).map(s => s.name);
    update.content_subtype = metadata.anilist.format;
    if (metadata.anilist.episodes) update.total_episode_count = metadata.anilist.episodes;
    if (metadata.anilist.duration) update.avg_episode_runtime = metadata.anilist.duration;
    if (metadata.anilist.status) {
      update.status = metadata.anilist.status;
      update.is_completed = metadata.anilist.status === 'FINISHED';
      update.is_airing = ['RELEASING', 'NOT_YET_RELEASED'].includes(metadata.anilist.status);
    }
  }

  // 3. Availability from JustWatch
  const jw = metadata.justwatch as any;
  if (jw) {
    update.has_sub = jw.isOnSubscription || false;
    update.has_free = jw.isOnFree || false;
    update.total_runtime_hours = jw.runtime ? (jw.runtime / 60) : 0;
    update.availability_providers = jw.availableProviders ?? [];
    if (jw.ageRating) update.content_rating = jw.ageRating;
    if (jw.productionCountries?.length) update.country_of_origin = jw.productionCountries;
    if (jw.originalReleaseYear) update.decade = Math.floor(jw.originalReleaseYear / 10) * 10;
    if (jw.seasons?.length) {
      update.season_count = jw.seasons.length;
      const episodeCounts = jw.seasons
        .map((season: { episodeCount?: number | null }) => Number(season.episodeCount ?? 0))
        .filter((count: number) => count > 0);
      if (episodeCounts.length > 0) {
        update.min_episodes_per_season = Math.min(...episodeCounts);
        update.max_episodes_per_season = Math.max(...episodeCounts);
        update.avg_episodes_per_season = episodeCounts.reduce((sum: number, count: number) => sum + count, 0) / episodeCounts.length;
        update.total_episode_count = episodeCounts.reduce((sum: number, count: number) => sum + count, 0);
      }
    }
  }

  // 4. Quality signals for filters
  if (metadata.community) {
    update.avg_episode_rating = metadata.community.rating || 0;
    update.filler_percentage = metadata.community.filler_percentage || 0;
    update.quality_trajectory = metadata.community.quality_trajectory;
  }

  if (metadata.wikidata) {
    if (metadata.wikidata.countryOfOrigin?.length && !update.country_of_origin) {
      update.country_of_origin = metadata.wikidata.countryOfOrigin;
    }
    if (metadata.wikidata.originalNetwork && !update.network) update.network = metadata.wikidata.originalNetwork;
    if (metadata.wikidata.numberOfSeasons && !update.season_count) update.season_count = metadata.wikidata.numberOfSeasons;
    if (metadata.wikidata.numberOfEpisodes && !update.total_episode_count) update.total_episode_count = metadata.wikidata.numberOfEpisodes;
  }

  await supabase.from('content_metadata').upsert(update);
}
