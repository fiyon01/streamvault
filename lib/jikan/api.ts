const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class JikanRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsThisMinute = 0;
  private lastResetTime = Date.now();

  async fetch(endpoint: string, params: Record<string, string> = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Reset the minute counter if 60 seconds have passed
          if (Date.now() - this.lastResetTime > 60000) {
            this.requestsThisMinute = 0;
            this.lastResetTime = Date.now();
          }

          // If we hit 55 requests in a minute, wait until the minute is up
          if (this.requestsThisMinute >= 55) {
            const timeToWait = 60000 - (Date.now() - this.lastResetTime);
            if (timeToWait > 0) {
              await sleep(timeToWait);
            }
            this.requestsThisMinute = 0;
            this.lastResetTime = Date.now();
          }

          // 350ms between requests ensures we stay well under 3 requests/second
          await sleep(350);
          this.requestsThisMinute++;

          const url = new URL(`${JIKAN_API_BASE}${endpoint}`);
          Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
          });

          const res = await fetch(url.toString(), {
            // Next.js caching: revalidate every hour for anime data
            next: { revalidate: 3600 }
          });

          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Jikan API Error: ${res.status} ${res.statusText}${body ? ` - ${body.slice(0, 180)}` : ''}`);
          }

          resolve(await res.json());
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }
    this.processing = false;
  }
}

const limiter = new JikanRateLimiter();

export const jikan = {
  getTopAnime: (limit = 25) => {
    return limiter.fetch('/top/anime', { filter: 'bypopularity', limit: limit.toString() });
  },

  getCurrentSeason: (limit = 25) => {
    return limiter.fetch('/seasons/now', { filter: 'tv', limit: limit.toString() });
  },

  getSeason: (year: string, season: 'spring' | 'summer' | 'fall' | 'winter', limit = 25) => {
    return limiter.fetch(`/seasons/${year}/${season}`, { limit: limit.toString() });
  },

  getAnimeById: (id: string) => {
    return limiter.fetch(`/anime/${id}/full`);
  },

  getEpisodes: (id: string, page = 1) => {
    return limiter.fetch(`/anime/${id}/episodes`, { page: page.toString() });
  },

  getRecommendations: (id: string) => {
    return limiter.fetch(`/anime/${id}/recommendations`);
  },

  searchAnime: (query: string, params: Record<string, string> = {}) => {
    const trimmedQuery = query.trim();
    return limiter.fetch('/anime', {
      ...(trimmedQuery.length >= 3 ? { q: trimmedQuery } : {}),
      ...params
    });
  },

  getAnimeByProducer: (producerId: string, limit = 24) => {
    return limiter.fetch('/anime', {
      producers: producerId,
      order_by: 'score',
      sort: 'desc',
      limit: limit.toString(),
    });
  }
};
