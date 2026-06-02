import type { ExternalMetadata } from '../types';

const WD_SPARQL = 'https://query.wikidata.org/sparql';
const WD_SEARCH = 'https://www.wikidata.org/w/api.php';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface WikidataAward {
  award: string;
  awardId: string;
  year: number;
  category: string;
  won: boolean;
}

interface WikidataNomination {
  award: string;
  awardId: string;
  year: number;
  category: string;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// Wikidata SPARQL endpoint asks for max 1 request/second from bots.
// Queue-based limiter safe under concurrent calls.

const REQUEST_INTERVAL = 1200;
const requestQueue: Array<() => void> = [];
let isProcessing = false;

function scheduleRequest(): Promise<void> {
  return new Promise((resolve) => {
    requestQueue.push(resolve);
    if (!isProcessing) processQueue();
  });
}

async function processQueue() {
  isProcessing = true;
  while (requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) next();
    if (requestQueue.length > 0) {
      await new Promise((r) => setTimeout(r, REQUEST_INTERVAL));
    }
  }
  isProcessing = false;
}

interface WikidataSearchResult {
  id?: string;
  label?: string;
  description?: string;
}

interface WikidataSearchResponse {
  search?: WikidataSearchResult[];
}

interface WikidataBindingValue {
  value?: string;
}

type WikidataBinding = Record<string, WikidataBindingValue | undefined>;

interface WikidataSparqlResponse {
  results?: {
    bindings?: WikidataBinding[];
  };
}

async function rateLimitedFetch<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  await scheduleRequest();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'StreamVault/1.0 (recommendations@streamvault.app)',
        'Accept': 'application/json',
        ...headers,
      },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

// ─── Step 1: Entity ID Lookup ─────────────────────────────────────────────────

/**
 * Uses the Wikidata search API to find the entity ID for a title.
 * This is far more reliable than SPARQL label matching which requires
 * exact case-sensitive matches and fails on punctuation differences.
 *
 * Returns the best matching Wikidata entity ID (e.g. "Q83495") or null.
 */
async function findEntityId(
  title: string,
  mediaType: 'movie' | 'tv',
  year?: number
): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: title,
    language: 'en',
    type: 'item',
    limit: '10',
    format: 'json',
  });

  const data = await rateLimitedFetch<WikidataSearchResponse>(`${WD_SEARCH}?${params.toString()}`);
  if (!data?.search?.length) return null;

  const results = data.search;

  // Try to find the best match using description hints
  const mediaHints =
    mediaType === 'movie'
      ? ['film', 'movie', 'motion picture', 'animated film']
      : ['television series', 'tv series', 'television show', 'anime', 'series'];

  // Score each result: prefer ones whose description matches media type and year
  const scored = results.map((r) => {
    const desc = (r.description ?? '').toLowerCase();
    let score = 0;

    for (const hint of mediaHints) {
      if (desc.includes(hint)) score += 2;
    }

    if (year && desc.includes(String(year))) score += 3;

    // Exact label match gets a big boost
    if (r.label?.toLowerCase() === title.toLowerCase()) score += 5;

    return { id: r.id, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.id ?? null;
}

// ─── Step 2: SPARQL Query Against Known Entity ID ─────────────────────────────

/**
 * Runs a SPARQL query scoped to a specific Wikidata entity ID.
 * Using wd:Q{id} directly is reliable — no label matching issues.
 */
async function sparqlQuery(query: string): Promise<WikidataBinding[]> {
  const url = `${WD_SPARQL}?format=json&query=${encodeURIComponent(query)}`;
  const data = await rateLimitedFetch<WikidataSparqlResponse>(url, {
    'Accept': 'application/sparql-results+json',
  });
  return data?.results?.bindings ?? [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bindingStr(binding: WikidataBinding, key: string): string {
  return binding[key]?.value ?? '';
}

function bindingInt(binding: WikidataBinding, key: string): number {
  const val = binding[key]?.value;
  return val ? parseInt(val, 10) || 0 : 0;
}

function bindingFloat(binding: WikidataBinding, key: string): number {
  const val = binding[key]?.value;
  return val ? parseFloat(val) || 0 : 0;
}

function entityIdFromUri(uri: string): string {
  return uri.split('/').pop() ?? '';
}

/**
 * Deduplicates an array of objects by a key field.
 */
function dedupeBy<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set();
  return arr.filter((item: T) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Enriches a film or TV show with Wikidata metadata.
 *
 * Strategy:
 * 1. Use Wikidata search API to find the entity ID reliably (not label SPARQL)
 * 2. Run targeted SPARQL queries against that entity ID
 * 3. Extract awards, nominations, financials, franchise, and series data
 *
 * Returns empty object if no entity found — never throws.
 */
export async function enrichFromWikidata(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  title: string,
  year?: number
): Promise<Partial<ExternalMetadata>> {
  try {
    // ── Step 1: Find entity ID ────────────────────────────────────────────────
    const entityId = await findEntityId(title, mediaType, year);
    if (!entityId) return {};

    const entityUri = `wd:${entityId}`;

    // ── Step 2: Fetch core metadata ───────────────────────────────────────────
    // Split into two queries to avoid SPARQL timeout from too many OPTIONALs
    const coreQuery = `
      SELECT DISTINCT
        ?budget ?boxOffice
        ?collection ?collectionLabel
        ?followedBy ?followedByLabel
        ?precededBy ?precededByLabel
        ?basedOn ?basedOnLabel
        ?country ?countryLabel
        ?network ?networkLabel
        ?seasons ?episodes
        ?publicationDate
        ?setIn ?setInLabel
      WHERE {
        BIND(${entityUri} AS ?item)
        OPTIONAL { ?item wdt:P2130 ?budget . }
        OPTIONAL { ?item wdt:P2142 ?boxOffice . }
        OPTIONAL { ?item wdt:P179  ?collection . }
        OPTIONAL { ?item wdt:P156  ?followedBy . }
        OPTIONAL { ?item wdt:P155  ?precededBy . }
        OPTIONAL { ?item wdt:P144  ?basedOn . }
        OPTIONAL { ?item wdt:P495  ?country . }
        OPTIONAL { ?item wdt:P449  ?network . }
        OPTIONAL { ?item wdt:P2437 ?seasons . }
        OPTIONAL { ?item wdt:P1113 ?episodes . }
        OPTIONAL { ?item wdt:P577  ?publicationDate . }
        OPTIONAL { ?item wdt:P2408 ?setIn . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 20
    `;

    // ── Step 3: Fetch awards separately ──────────────────────────────────────
    // Awards use complex qualifiers (P585 = point in time, P518 = applies to part)
    // Splitting avoids query complexity limits
    const awardsQuery = `
      SELECT DISTINCT
        ?award ?awardLabel
        ?awardYear
        ?nominated ?nominatedLabel
        ?nominatedYear
      WHERE {
        BIND(${entityUri} AS ?item)
        OPTIONAL {
          ?item p:P166 ?awardStmt .
          ?awardStmt ps:P166 ?award .
          OPTIONAL { ?awardStmt pq:P585 ?awardYear . }
        }
        OPTIONAL {
          ?item p:P1411 ?nomStmt .
          ?nomStmt ps:P1411 ?nominated .
          OPTIONAL { ?nomStmt pq:P585 ?nominatedYear . }
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 50
    `;

    const [coreResults, awardsResults] = await Promise.all([
      sparqlQuery(coreQuery),
      sparqlQuery(awardsQuery),
    ]);

    // ── Step 4: Parse core data ───────────────────────────────────────────────
    const first = coreResults[0] ?? {};

    // Budget and box office — Wikidata stores these in USD as plain numbers
    const budget = bindingFloat(first, 'budget');
    const boxOffice = bindingFloat(first, 'boxOffice');

    // Countries of origin — deduplicate across all result rows
    const countryOfOrigin = dedupeBy(
      coreResults
        .filter((r) => bindingStr(r, 'countryLabel'))
        .map((r) => ({ label: bindingStr(r, 'countryLabel') })),
      'label'
    ).map((c: { label: string }) => c.label);

    // Networks — deduplicate across all result rows
    const networks = dedupeBy(
      coreResults
        .filter((r) => bindingStr(r, 'networkLabel'))
        .map((r) => ({ label: bindingStr(r, 'networkLabel') })),
      'label'
    ).map((n: { label: string }) => n.label);

    // Publication date — take the earliest if multiple
    const publicationDates = coreResults
      .filter((r) => bindingStr(r, 'publicationDate'))
      .map((r) => bindingStr(r, 'publicationDate'))
      .sort();
    const publicationDate = publicationDates[0] ?? '';

    // ── Step 5: Parse awards ──────────────────────────────────────────────────

    const awards: WikidataAward[] = dedupeBy(
      awardsResults
        .filter((r) => bindingStr(r, 'award'))
        .map((r) => {
          const yearStr = bindingStr(r, 'awardYear');
          const year = yearStr
            ? new Date(yearStr).getFullYear()
            : 0;

          return {
            award: bindingStr(r, 'awardLabel'),
            awardId: entityIdFromUri(bindingStr(r, 'award')),
            year,
            category: '',
            won: true,
          };
        }),
      'awardId'
    );

    const nominatedFor: WikidataNomination[] = dedupeBy(
      awardsResults
        .filter((r) => bindingStr(r, 'nominated'))
        .map((r) => {
          const yearStr = bindingStr(r, 'nominatedYear');
          const year = yearStr
            ? new Date(yearStr).getFullYear()
            : 0;

          return {
            award: bindingStr(r, 'nominatedLabel'),
            awardId: entityIdFromUri(bindingStr(r, 'nominated')),
            year,
            category: '',
          };
        }),
      'awardId'
    );

    // ── Step 6: Assemble result ───────────────────────────────────────────────
    return {
      wikidata: {
        wikidataId: entityId,
        awards,
        nominatedFor,
        budget,
        boxOffice,
        collection: bindingStr(first, 'collectionLabel'),
        franchise: '',
        followedBy: bindingStr(first, 'followedByLabel'),
        precededBy: bindingStr(first, 'precededByLabel'),
        basedOn: bindingStr(first, 'basedOnLabel'),
        inspiredBy: '',
        publicationDate,
        countryOfOrigin,
        originalNetwork: networks[0] ?? '',
        numberOfSeasons: bindingInt(first, 'seasons'),
        numberOfEpisodes: bindingInt(first, 'episodes'),
        setInPeriod: bindingStr(first, 'setInLabel'),
        historicalEvent: '',
        realPersonPortrayed: [],
      },
    };
  } catch (err) {
    console.error(`[wikidata] Unexpected error for title="${title}":`, err);
    return {};
  }
}

// ─── Utility: Wikidata Entity URL ─────────────────────────────────────────────

/**
 * Returns the public Wikidata URL for an entity ID.
 * Useful for attribution links in the UI.
 */
export function wikidataUrl(entityId: string): string {
  if (!entityId) return '';
  return `https://www.wikidata.org/wiki/${entityId}`;
}

// ─── Utility: Has Awards ──────────────────────────────────────────────────────

/**
 * Returns true if the title has won at least one award.
 * Use for the "Award-winning" filter badge in StreamVault's discover filters.
 */
export function hasWonAward(
  wikidata: ExternalMetadata['wikidata'] | undefined
): boolean {
  return (wikidata?.awards?.length ?? 0) > 0;
}

// ─── Utility: Franchise Name ──────────────────────────────────────────────────

/**
 * Returns the franchise/collection name if the title belongs to one.
 * Use for "Part of the X franchise" display on detail pages.
 */
export function getFranchiseName(
  wikidata: ExternalMetadata['wikidata'] | undefined
): string {
  return wikidata?.franchise || wikidata?.collection || '';
}
