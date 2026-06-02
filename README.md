This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.











# STREAMVAULT — MASTER BUILD PROMPT
### A $1,000,000,000 Streaming Platform
**Stack: Next.js 15 · Supabase · HuggingFace / DeepSeek · Stripe · Tailwind CSS**

---

> **READ THIS FIRST — HOW TO USE THIS DOCUMENT**
> This is a complete, opinionated system prompt. Feed it to your AI coding assistant (Cursor, Claude Code, Copilot, etc.) section by section, or as a whole. Every section is deliberately specific. Do not skip sections. The platform you are building solves REAL user pain points from Netflix, Prime Video, Hulu, Disney+, and HBO Max — documented through public user research, Reddit threads, and product feedback forums.

---

## PART 1 — PRODUCT VISION & NORTH STAR

You are building **StreamVault** — a next-generation movies and TV shows streaming discovery, management, and viewing platform. The core thesis is simple:

> *"Every other streaming platform is built around content libraries. StreamVault is built around the viewer's brain."*

The platform's unfair advantage is its **hyper-intelligent filtering engine** — solving the #1 complaint across all major streaming services: *"I can never find what I actually want to watch."*

Users can filter by criteria that NO other major platform supports natively:
- TV shows with **20+ episodes per season**
- TV shows with **6+ completed seasons**
- Movies under **90 minutes** (perfect for a quick watch)
- Shows where **every season has a 8.0+ IMDb rating** (no bad seasons)
- Completed series only (no more falling in love with a cancelled show)
- Shows with **no filler episodes** (high episode rating consistency)
- Content where the **finale rated higher than the pilot** (satisfying endings)

This is the product. Everything else — the AI, the themes, the player, the payments — serves this core truth.

---

## PART 2 — TECHNOLOGY STACK & ARCHITECTURE

### 2.1 Full Stack
```
Frontend:        Next.js 15 (App Router, RSC, Server Actions)
Database:        Supabase (PostgreSQL + Row Level Security + Realtime)
Auth:            Supabase Auth (email, Google OAuth, Apple OAuth)
Storage:         Supabase Storage (thumbnails, avatars, HLS video segments)
AI/ML:           HuggingFace Inference API + DeepSeek-V3 (via OpenRouter or direct)
Payments:        Stripe (subscriptions + one-time rentals)
Styling:         Tailwind CSS v4 + CSS custom properties (12 themes)
Video Player:    HLS.js (custom-built player component, NOT a third-party embed)
Search:          Supabase full-text search + pgvector for semantic search
Metadata API:    TMDB API (The Movie Database) for all content metadata
Email:           Resend (transactional emails)
Deployment:      Vercel (Edge Functions for AI routes) + Supabase Cloud
State:           Zustand (client) + React Query / TanStack Query v5 (server state)
Analytics:       Posthog (self-hosted events for user behavior)
```

### 2.2 Database Schema (Supabase PostgreSQL)

Design the following tables. Use UUID primary keys everywhere. Enable RLS on all user-facing tables.

```sql
-- Core content tables
profiles           -- extends Supabase auth.users
content            -- movies AND shows (type: 'movie' | 'show')
seasons            -- belongs to content where type='show'
episodes           -- belongs to seasons
genres             -- many-to-many through content_genres
content_genres     -- junction table
cast_members       -- actors/directors linked to content
content_cast       -- junction table with role field

-- User interaction tables
watchlist          -- user's saved content
watch_history      -- what user has watched + progress (timestamp)
ratings            -- user's 1-5 star ratings
reviews            -- user's text reviews
continue_watching  -- denormalized for fast homepage query

-- Filtering & metadata (the crown jewel)
content_metadata   -- extended stats: episode_count_per_season (jsonb),
                   -- season_count, avg_episode_rating, lowest_season_rating,
                   -- finale_rating, pilot_rating, has_filler (bool),
                   -- is_completed (bool), avg_runtime_minutes, 
                   -- content_rating (PG, R, etc.), decade, country_of_origin

-- AI tables
ai_conversations   -- chat history per user per content item
ai_recommendations -- cached AI recommendation sets per user
search_embeddings  -- pgvector embeddings for semantic search

-- Subscription/payments
subscriptions      -- Stripe subscription status per user
rental_history     -- one-time rentals
plans              -- Free / Basic / Premium / Family

-- Social
follows            -- user follows user
user_lists         -- custom lists ("Best Heist Movies", etc.)
list_items         -- items in user lists
```

### 2.3 Environment Variables Required
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
TMDB_ACCESS_TOKEN=
HUGGINGFACE_API_KEY=
OPENROUTER_API_KEY=           # for DeepSeek access
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
POSTHOG_API_KEY=
```

---

## PART 3 — THE FILTERING ENGINE (Core Feature — Build This First)

This is StreamVault's soul. Every other feature supports this.

### 3.1 Filter Categories

Build a `FilterEngine` component that supports ALL of the following simultaneously. Filters combine with AND logic by default, switchable to OR.

#### CONTENT TYPE FILTERS
- [ ] Movies only / TV Shows only / Both
- [ ] Animation / Live Action / Documentary / Reality / Anime / Mini-series

#### EPISODE & SEASON FILTERS (TV Shows — This is the USP)
```
Season Count:
  - Minimum seasons: [1] [2] [3] [4] [5] [6] [7] [8] [10+]
  - Maximum seasons (avoid bloat): [3] [5] [7] [custom]
  - Completed series only (toggle)
  - Currently airing (toggle)
  - Cancelled — resolve before watching (toggle, warns user)

Episodes per Season:
  - At least [10] [13] [20] [22] [24] episodes per season
  - Consistent episode count (within 20% variance across seasons)
  - Short-form: under 30 min episodes
  - Standard: 40-50 min episodes
  - Long-form: 50+ min episodes
  
Quality Consistency Filters (UNIQUE):
  - Every season rated 7.0+ on IMDb
  - No season below 6.5 (no "bad seasons")
  - Show improved over time (ascending season ratings)
  - Strong finale (finale episode rating > pilot rating)
  - Low filler percentage (<10% filler episodes)
```

#### QUALITY & RATING FILTERS
```
IMDb Rating:       slider [0.0 — 10.0], min/max
Rotten Tomatoes:   slider [0% — 100%]
Audience Score:    slider [0% — 100%]
Number of Votes:   min votes (avoids obscure low-vote items)
  Options: 1K+ / 10K+ / 50K+ / 100K+ / 500K+
Decade:            [1970s] [1980s] [1990s] [2000s] [2010s] [2020s]
Year Range:        custom year slider
```

#### TIME & COMMITMENT FILTERS
```
For Movies:
  Runtime: Under 80 min / 80-110 min / 110-150 min / Epic (150+)
  
For Shows (Total Commitment Time — UNIQUE):
  Calculate: avg_episode_runtime × total_episodes
  Show: "This series = ~47 hours total"
  Filter: Under 10 hrs / 10-30 hrs / 30-60 hrs / 60-100 hrs / 100+ hrs
  
Binge-ability Score (UNIQUE AI Feature):
  AI rates each show 1-10 on cliffhanger density, pacing, episode endings
  Filter: Only show highly bingeable content (8+)
```

#### CONTENT FILTERS
```
Genre (multi-select, with exclusion support — "I want Thriller but NOT Horror")
Subgenre (e.g., "Psychological Thriller", "Nordic Noir", "Space Opera")
Country of Origin (multi-select)
Language (with subtitle/dub availability filter)
Content Rating: G / PG / PG-13 / R / TV-MA (multi-select)
Themes (AI-generated tags): Redemption / Found Family / Anti-hero / Time Loop /
  Unreliable Narrator / Slow Burn / Mind-bending / Feel-good / Dark & Gritty / etc.
Mood (AI-powered): Comfort watch / Edge of seat / Brain workout / 
  Good cry / Laugh out loud / Conversation starter
```

#### AVAILABILITY FILTERS
```
Where to watch: Netflix / Prime / Hulu / Disney+ / HBO Max / Apple TV+ / Peacock
  (deep link to platform if not on StreamVault)
Free with ads / Subscription / Rental / Purchase
Available in my country (uses IP geolocation)
```

#### SOCIAL PROOF FILTERS (UNIQUE)
```
Watched by [X]+ StreamVault users
Trending this week on StreamVault
Hidden gems (high rating, low view count ratio)
Staff picks
User-curated lists
Similar to [content I've rated 4+ stars] — AI-powered
```

### 3.2 Filter UI Implementation

```typescript
// /components/filters/FilterEngine.tsx

// The filter panel slides in from the right (desktop) or 
// bottom sheet (mobile). Uses Framer Motion for animation.

// Filter state lives in Zustand:
interface FilterState {
  contentType: 'all' | 'movie' | 'show'
  minSeasons?: number
  maxSeasons?: number
  completedOnly: boolean
  minEpisodesPerSeason?: number
  minImdb?: number
  maxImdb?: number
  runtimeRange?: [number, number]
  genres: string[]
  excludeGenres: string[]
  mood?: string[]
  themes?: string[]
  countries?: string[]
  decadeRange?: [number, number]
  minVotes?: number
  minSeasonConsistencyScore?: number  // all seasons above this IMDb score
  hasStrongFinale?: boolean
  totalCommitmentMax?: number  // in hours
  platforms?: string[]
  activeLogic: 'AND' | 'OR'
}

// Supabase query builder (server action):
async function buildFilterQuery(filters: FilterState) {
  let query = supabase
    .from('content')
    .select(`
      *,
      content_metadata(*),
      genres:content_genres(genre:genres(name))
    `)
  
  // Dynamic filter application
  if (filters.minSeasons) {
    query = query.gte('content_metadata.season_count', filters.minSeasons)
  }
  if (filters.completedOnly) {
    query = query.eq('content_metadata.is_completed', true)
  }
  if (filters.minEpisodesPerSeason) {
    // Use jsonb query on episode_count_per_season array
    query = query.filter(
      'content_metadata.min_episodes_per_season', 
      'gte', 
      filters.minEpisodesPerSeason
    )
  }
  // ... etc for all filters
  
  return query
}
```

### 3.3 Smart Filter Presets (Saved & Shareable)

Users can save filter combinations as named presets:
- "Long-running quality dramas" (6+ seasons, all rated 7.5+, completed)
- "Quick movie night" (runtime under 90 min, IMDb 7.0+)
- "Full commitment binge" (8+ seasons, binge score 8+)
- "Hidden gem hunt" (IMDb 7.5+, votes under 50K)

Presets are shareable via URL (`/discover?preset=xyz123`) and can be published to a community preset library.

---

## PART 4 — APPLICATION ROUTES & PAGE ARCHITECTURE

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── onboarding/          # 3-step taste profile setup
│
├── (main)/
│   ├── page.tsx             # Home / Dashboard
│   ├── discover/            # The filter engine lives here
│   ├── movies/
│   │   ├── page.tsx         # Movies browse
│   │   └── [id]/            # Movie detail + player
│   ├── shows/
│   │   ├── page.tsx         # Shows browse
│   │   ├── [id]/            # Show detail
│   │   └── [id]/season/[s]/episode/[e]/  # Episode player
│   ├── search/              # Global search (semantic + keyword)
│   ├── watchlist/           # User's saved content
│   ├── history/             # Watch history
│   ├── lists/               # User-curated lists
│   │   ├── page.tsx
│   │   └── [id]/
│   ├── profile/
│   │   ├── page.tsx
│   │   └── settings/
│   ├── ai-assistant/        # Standalone AI page
│   └── themes/              # Theme picker page
│
├── (subscription)/
│   ├── plans/
│   ├── checkout/
│   └── billing/
│
├── api/
│   ├── webhooks/stripe/
│   ├── ai/chat/             # AI streaming endpoint
│   ├── ai/recommend/        # AI recommendation generation
│   ├── ai/embed/            # Generate search embeddings
│   ├── tmdb/sync/           # TMDB metadata sync (cron)
│   └── health/
```

---

## PART 5 — HOME PAGE / DASHBOARD

The home page is personalized. For logged-out users, show a curated editorial layout. For logged-in users, show:

### 5.1 Sections (in order)

1. **Continue Watching** — resumable content with exact timestamp, % progress ring around thumbnail. Shows "3 episodes left in Season 2" for shows.

2. **Your Filters Saved Results** — if user has saved filter presets, show "37 new matches for 'Long-running quality dramas'" with direct link to filtered view.

3. **Because You Watched [X]** — AI-generated row. Uses DeepSeek to explain WHY each recommendation was made. Example: *"You loved The Wire's slow-burn realism and ensemble cast → The Shield matches on 7 signals"*

4. **Almost Done** — shows with 1-2 episodes left this season or 1 episode left in series. High completion incentive.

5. **Trending on StreamVault** — real-time trending based on watch starts in last 48 hours (Supabase Realtime).

6. **New This Week** — freshly added content.

7. **Top Rated: Zero Bad Seasons** — curated row using the `minSeasonConsistencyScore` filter at 7.5. This IS a filter preset made visible on the homepage.

8. **Hidden Gems** — IMDb 7.5+, under 50K votes. These are underseen quality picks.

9. **Under 90 Minutes** — movie row with runtime badge visible on card.

10. **Mood Board** — 6 mood tiles (Comfort, Intense, Funny, Cry, Think, Chill). Tapping one instantly applies a mood filter and shows results.

11. **Your Taste Map** — small visualization (radar chart) showing user's genre preferences built from watch history.

### 5.2 Content Card Design

Every content card has:
```
- Hover: expand slightly, show trailer (muted autoplay after 800ms hover)
- Top-left badge: runtime (movies) or "S6 · 22ep" (shows)  
- Top-right: "✓ Completed" or "● Airing" or "✗ Cancelled" status pill
- Bottom: progress bar if in watch history
- IMDb score chip (only if 7.0+, shown as a quality signal, not noise)
- Quick-add to watchlist button (heart icon, optimistic UI update)
- Long-press/right-click context menu: 
    Add to watchlist / Mark as watched / Not interested / Add to list
```

---

## PART 6 — CONTENT DETAIL PAGES

### 6.1 Movie Detail Page (`/movies/[id]`)

**Layout** (not a standard grid — use a cinematic layout):
- Full-bleed backdrop image with a cinematic dark gradient overlay (left side darker for text)
- Title in a large, editorial font
- Metadata row: Year · Runtime · Rating · Genre pills
- Action buttons: ▶ Play Now / + Watchlist / ⭐ Rate / Share / 🔔 Notify
- AI Summary Panel (see Part 8)
- Cast horizontally scrollable
- Similar Movies (AI-matched, not just genre-based)
- User Reviews with helpful/not helpful voting
- "StreamVault Score" — composite of IMDb + RT + user ratings, shown as a single number

### 6.2 TV Show Detail Page (`/shows/[id]`)

**Unique to StreamVault — the Season Quality Dashboard:**

Above the episode list, show a horizontal bar chart: one bar per season, height = average season rating. Colored green (8+), yellow (6.5-8), red (<6.5). This answers "are there bad seasons I should skip?" in 1 second.

Also show:
- **Commitment Calculator**: "Based on your average watch speed, this show = ~3 months of evening watching"
- **Episode Count Table**: Each season with episode count, year, and avg rating
- **"Worth Completing?"** — AI verdict on whether the finale was satisfying
- **Skip Guide** (Premium feature): AI-generated list of filler episodes users can skip without losing plot

Season/Episode selector:
- Seasons as tabs
- Episodes as cards showing: thumbnail, runtime, rating, brief synopsis
- "Previously watched" visual state
- Download button (if offline viewing is enabled)

---

## PART 7 — VIDEO PLAYER

Build a fully custom HLS.js player. Do NOT use Video.js or Plyr. Build from scratch.

### 7.1 Player Features

```typescript
// /components/player/StreamVaultPlayer.tsx

interface PlayerProps {
  src: string               // HLS manifest URL
  contentId: string
  episodeId?: string
  startAt?: number          // seconds (from watch history)
  subtitleTracks: Track[]
  audioTracks: Track[]
  nextEpisode?: EpisodeRef
  skipSegments?: TimeSegment[]   // intro/outro/recap/filler markers
}
```

**Controls (custom-designed, not browser defaults):**
- Progress bar: thick (6px), scrubable, shows chapter markers as tick marks
- Hover on progress bar: thumbnail preview (VTT sprite sheet)
- Skip Intro button (appears automatically at correct timestamp, auto-dismisses in 5s)
- Skip Recap / Skip Credits buttons
- Next Episode button appears in final 20 seconds (dismissable)
- **Auto-continue next episode** with 10-second countdown (cancelable, or disable in settings)
- Volume: scroll wheel on player changes volume
- Keyboard shortcuts panel (? key shows overlay)

**Quality Menu:**
- Auto (recommended) / 4K / 1080p / 720p / 480p / 360p
- Show current bandwidth and buffer status in developer mode

**Subtitle Options:**
- Size: Small / Medium / Large / XL
- Position: Bottom (default) / Top / Custom Y position
- Background opacity: None / 25% / 50% / 75% / Solid
- Font: Rounded / Mono / Serif (accessibility)
- Color: White / Yellow / Cyan

**Audio Options:**
- Audio track selection (English, dubbed languages)
- Audio sync offset (for subtitle sync issues): -2s to +2s slider

**Playback Speed:** 0.5 / 0.75 / 1.0 / 1.25 / 1.5 / 1.75 / 2.0

**AI Commentary Mode (Premium):** 
- Toggle: "AI Commentary" — plays AI-generated trivia and behind-the-scenes facts at relevant timestamps as overlay toasts. Uses DeepSeek to generate these from TMDB data.

**Picture-in-Picture:** Native PiP API support

**Cast to TV:** Chromecast + AirPlay support via browser APIs

**Watch Party (Premium):**
- Synced playback URL with real-time chat overlay
- Uses Supabase Realtime for sub-100ms sync
- Emoji reactions that float up the screen

### 7.2 Progress Persistence

```typescript
// Save progress via Server Action every 10 seconds while playing
// and on pause/close
async function saveProgress(contentId: string, episodeId: string | null, position: number) {
  await supabase
    .from('watch_history')
    .upsert({
      user_id: userId,
      content_id: contentId,
      episode_id: episodeId,
      position_seconds: position,
      updated_at: new Date()
    })
}
```

Resume prompt: On navigating back to content, show a subtle bottom toast: "Resume from 42:17?" with Resume and Start Over options.

---

## PART 8 — AI FEATURES (HuggingFace + DeepSeek)

### 8.1 AI Models Used

```
DeepSeek-V3:     Main conversational AI, recommendations, content analysis
                 Via OpenRouter API: openai/deepseek-chat
                 
HuggingFace:     Semantic search embeddings
                 Model: sentence-transformers/all-MiniLM-L6-v2
                 Mood/theme classification
                 Model: facebook/bart-large-mnli (zero-shot classification)
```

### 8.2 AI Assistant — "VAULT" (the AI companion)

VAULT is an always-accessible AI assistant (floating button, bottom-right). It is NOT a generic chatbot. It's a deeply context-aware film/TV companion.

**Context VAULT always has:**
- User's entire watch history
- User's ratings and reviews
- User's active filter presets
- Currently viewed content
- User's taste profile (generated from history)

**What VAULT can do:**

```
🎬 Content Q&A:
"Is Breaking Bad worth watching if I loved The Wire?"
"Does Succession have any bad seasons?"
"What's the tone of Severance? Is it scary?"
"How many episodes is it and does it have a satisfying ending?"

🔍 Advanced Discovery:
"Find me shows like Dark but shorter, completed, and no cancelled season cliffhangers"
"I want something I can finish in a weekend that'll make me think"
"Show me movies under 90 minutes with a plot twist"
→ VAULT translates these into filter queries and shows results inline

📊 Content Analysis:
"Give me a spoiler-free breakdown of whether The Walking Dead is worth finishing"
"Which season of Game of Thrones is considered the worst and why?"
→ Uses DeepSeek with TMDB data context

🧠 Taste Analysis:
"What patterns do you notice in what I like?"
"Why do you keep recommending crime dramas?"
"Surprise me with something completely outside my comfort zone"

📝 List Building:
"Create a watchlist of every Oscar Best Picture winner from the 2000s available here"
"Build me a 'Best of 2023' list sorted by Rotten Tomatoes"
```

**VAULT UI:**
- Floating button: animated gradient orb, bottom-right
- Opens as a drawer (desktop) or full-screen (mobile)
- Chat UI: clean, dark, monospaced font for VAULT responses
- Inline content cards inside chat (clickable)
- Streaming responses (SSE from `/api/ai/chat`)
- Context pill at top: "Talking about: The Sopranos" when on a content page

### 8.3 Semantic Search

```typescript
// /api/ai/embed/route.ts

// On search:
// 1. Get embedding for search query via HuggingFace
// 2. Cosine similarity search against content_embeddings in Supabase pgvector
// 3. Combine with full-text search results
// 4. Re-rank with DeepSeek for relevance

// Search inputs that semantic search handles:
// "shows about grief and found family in sci-fi settings"
// "something like Black Mirror but less bleak"
// "a comfort food show for when I'm sad"
// "Italian crime drama with historical setting"
```

### 8.4 Personalized Recommendation Engine

Run daily (cron job via Vercel Cron):
```
1. Pull user's top 20 rated + completed content
2. Extract themes, tones, genres via DeepSeek analysis
3. Generate "Taste Profile" text description
4. Find content that matches via pgvector similarity
5. Score and rank candidates
6. Store in ai_recommendations table with reasoning
7. Reasoning stored: "Because you loved X's slow burn pacing 
   and morally complex lead, Y matches on 8/10 signals"
```

### 8.5 Skip Guide Generator (Premium)

For any TV show, generate a filler episode guide:
```typescript
async function generateSkipGuide(showId: string) {
  // Pull all episode summaries from TMDB
  // Ask DeepSeek: "For [show], which episodes are considered filler 
  //   (don't advance main plot or character development)? 
  //   Return JSON: [{episode: "S02E04", reason: "...", skip_safe: true}]"
  // Cache result in Supabase
  // Display in show detail page under "Streamlined Watch Guide"
}
```

---

## PART 9 — SEARCH SYSTEM

### 9.1 Search UI

Global search bar (CMD+K shortcut, or click header search):
- Full-screen overlay with dark backdrop
- Instant results as you type (debounced 200ms)
- Results grouped: Movies | TV Shows | People | Lists | Users
- Recent searches (stored locally)
- Trending searches (Supabase real-time aggregation)
- Keyboard-navigable results

### 9.2 Search Architecture

```
Layer 1: Supabase full-text search (title, description) — fast, <50ms
Layer 2: TMDB search fallback for content not in local DB — async
Layer 3: Semantic/vector search for natural language queries — 200ms
Layer 4: AI query interpretation for complex queries (VAULT) — 1-2s
```

Natural language search examples that MUST work:
- "that movie where a guy wakes up reliving the same day" → Groundhog Day
- "Korean show about rich kids in an elite school" → various matches
- "the one with the lawyer who has perfect memory" → Suits
- "dark comedy about a funeral home" → Six Feet Under

---

## PART 10 — SUBSCRIPTION & PAYMENTS (Stripe)

### 10.1 Plans

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | Browse, discover, watchlist. No streaming. 5 AI queries/day. |
| **Basic** | $6.99/mo | Stream in HD. 2 screens. Full filtering. 20 AI queries/day. |
| **Premium** | $12.99/mo | Stream in 4K. 4 screens. Unlimited AI. Skip Guide. Watch Party. Downloads. |
| **Family** | $19.99/mo | Premium + 6 profiles, parental controls, kids mode. |

Annual discount: 20% off (show monthly equivalent prominently).

### 10.2 Rentals

Non-subscribed users can rent new releases:
- Standard rental: $3.99 (48-hour window)
- HD rental: $4.99
- 4K rental: $5.99
- Purchase (permanent library): from $9.99

### 10.3 Stripe Integration

```typescript
// Subscriptions: Stripe Checkout + Customer Portal
// Webhooks handle: subscription.created, subscription.updated, 
//   subscription.deleted, invoice.payment_failed, invoice.paid

// Store subscription state in Supabase subscriptions table
// Use Supabase RLS to gate content based on plan tier

// Middleware checks subscription on protected routes
// Graceful degradation: show upsell modal, not error page
```

### 10.4 Upsell Design (Non-Annoying)

- Never interrupt playback with upsell prompts
- Upsell appears contextually: "This is a Premium feature" with a "Try Premium Free for 7 days" CTA
- Free trial: 7 days Premium for new users
- Show upsell inline in filters for Premium-only filter options (e.g., Skip Guide filter, Binge Score filter) — greyed out with lock icon

---

## PART 11 — 12 THEMES

Themes are stored as CSS custom property sets. User selection saved to `profiles.theme` in Supabase. Applied via `data-theme` attribute on `<html>`.

Implement these 12 themes:

```css
/* 1. MIDNIGHT (default dark — deep navy + electric blue) */
[data-theme="midnight"] { --bg: #080d1a; --surface: #0f1729; --accent: #3b82f6; --text: #e2e8f0; }

/* 2. AMOLED (true black + neon green — battery saver) */
[data-theme="amoled"] { --bg: #000000; --surface: #0a0a0a; --accent: #00ff88; --text: #ffffff; }

/* 3. CRIMSON (dark red + gold — prestige cinema feel) */
[data-theme="crimson"] { --bg: #0d0608; --surface: #1a0810; --accent: #dc2626; --text: #fef2f2; }

/* 4. OBSIDIAN (charcoal + purple — modern streaming) */
[data-theme="obsidian"] { --bg: #0c0b0f; --surface: #16141d; --accent: #8b5cf6; --text: #ede9fe; }

/* 5. ARCTIC (light — ice white + deep blue) */
[data-theme="arctic"] { --bg: #f0f4ff; --surface: #ffffff; --accent: #1d4ed8; --text: #0f172a; }

/* 6. SAKURA (light — soft pink + charcoal) */
[data-theme="sakura"] { --bg: #fff5f7; --surface: #ffffff; --accent: #ec4899; --text: #1e1b1d; }

/* 7. FOREST (dark green — earthy, calm) */
[data-theme="forest"] { --bg: #050e08; --surface: #0d1f12; --accent: #22c55e; --text: #dcfce7; }

/* 8. AMBER (warm dark — like a dim lamp) */
[data-theme="amber"] { --bg: #0d0800; --surface: #1a1200; --accent: #f59e0b; --text: #fef3c7; }

/* 9. SLATE (neutral grey + white — minimal, editorial) */
[data-theme="slate"] { --bg: #0f172a; --surface: #1e293b; --accent: #94a3b8; --text: #f1f5f9; }

/* 10. ROSE GOLD (premium warm — rose gold + cream) */
[data-theme="rose-gold"] { --bg: #1a0f0f; --surface: #2d1a1a; --accent: #f43f5e; --text: #fff1f2; }

/* 11. CYBERPUNK (neon yellow + dark) */
[data-theme="cyberpunk"] { --bg: #05050a; --surface: #0d0d1a; --accent: #fde047; --text: #fefce8; }

/* 12. FILM (sepia tone — classic cinema nostalgia) */
[data-theme="film"] { --bg: #0d0a07; --surface: #1a1408; --accent: #d97706; --text: #fef3c7; }
```

Every theme must also define: `--border`, `--muted`, `--card`, `--hover`, `--danger`, `--success`, `--text-muted`, `--overlay`.

**Theme Picker UI:**
- Route: `/themes` 
- Live preview: click a theme and the entire page instantly re-renders (no page load, just `document.documentElement.setAttribute('data-theme', theme)`)
- Show a mini-preview card for each theme with a sample content card
- Animated transition between themes (CSS transitions on all custom properties)

---

## PART 12 — UI/UX DESIGN SYSTEM

### 12.1 Layout Principles

- **Navigation**: Sidebar (desktop, collapsible to icons), Bottom nav bar (mobile, 5 tabs)
- **Responsive breakpoints**: 
  - Mobile: 0-640px (single column, full-screen player)
  - Tablet: 641-1024px (2 columns)
  - Desktop: 1025px+ (sidebar + main content)
  - Wide: 1440px+ (wider content rows)

- **Content grid**: CSS Grid with `auto-fill` and `minmax(180px, 1fr)` for cards
  - Mobile: 2 columns
  - Tablet: 3 columns  
  - Desktop: 4-5 columns (denser = more content browsing)
  - Discover page: optional list view with more metadata per row

### 12.2 Typography

Use Google Fonts. Pick from:
- Display headings: **Syne** (geometric, distinctive)
- Body text: **DM Sans** (clean, readable)
- Monospace (for VAULT AI chat): **JetBrains Mono**
- Metadata/numbers: **DM Mono** (for ratings, timestamps)

Scale:
```
xs: 11px / sm: 13px / base: 15px / lg: 17px / xl: 20px / 2xl: 24px / 
3xl: 30px / 4xl: 36px / 5xl: 48px / 6xl: 64px
```

### 12.3 Loading States — Best in Class

NEVER use spinner wheels. Use:

```
Skeleton screens:  Content cards load as animated shimmer skeletons
                   (same shape as actual card — aspect ratio preserved)
                   
Optimistic UI:     Watchlist add/remove, rating, reactions — instant UI 
                   update, sync in background
                   
Progressive load:  Show content metadata first, then images, then trailers
                   Images use blur placeholder (Supabase returns blur hash)
                   
Streaming SSR:     Use Next.js Suspense boundaries to stream each section
                   independently — page feels instant even on slow connection
                   
AI responses:      Stream token-by-token (SSE). Show animated typing cursor.
                   Don't wait for full response.
                   
Route transitions: Shared element transitions between content card and detail
                   page (using View Transitions API)
                   
Pull-to-refresh:   Custom animation (mobile) — not browser default
```

### 12.4 Motion & Micro-interactions

- Content cards: `transform: translateY(-4px) scale(1.02)` on hover with `transition: 150ms ease`
- Trailer autoplay: fades in smoothly at 0.8s hover delay
- Filter panel: slides in with spring physics (Framer Motion `spring` with `damping: 20`)
- Watchlist heart: morphs from outline to filled with a pop animation
- Rating stars: hover fills stars left-to-right with a ripple
- Theme switch: smooth color transition (200ms on all `--var` properties via `transition: all 200ms`)
- VAULT button: subtle pulsing glow animation (CSS keyframes)
- Notification toast: slides in from bottom-right, auto-dismisses with progress bar

### 12.5 Accessibility

- All interactive elements keyboard-navigable
- Focus rings: styled, not removed
- ARIA labels on all icon-only buttons
- Color contrast: WCAG AA minimum, AAA for body text
- `prefers-reduced-motion`: disable all non-essential animations
- Screen reader announcements for dynamic content updates
- Subtitle and audio controls keyboard-accessible in player

---

## PART 13 — ONBOARDING

3-step onboarding (after registration, before home page):

**Step 1: "What do you love watching?"**
Genre multi-select with large illustrated tiles (not just text chips).
Pick at least 3.

**Step 2: "How do you watch?"**
Single-choice cards:
- "Binge entire series in a weekend"
- "One episode at a time, savoring it"  
- "Movie nights 2-3x per week"
- "Background watch while doing other things"

**Step 3: "Any dealbreakers?"**
- Shows that got cancelled without ending ❌
- Extreme violence / gore
- Shows longer than 8 seasons
- Content with no subtitles in English
- Non-English content

This data seeds the initial AI recommendation engine and pre-configures relevant filter defaults.

Skip option always visible (small link, "I'll set this up later").

---

## PART 14 — NOTIFICATION SYSTEM

**In-app notifications** (bell icon in header):
- New episode of a show in your watchlist
- A cancelled show just got a movie sequel/revival
- "You're 2 episodes from finishing [Show]"  
- New content matching your saved filter presets
- Friend/follower activity (if social features enabled)

**Email notifications** (via Resend):
- Weekly: "7 new matches for your saved filters"
- Monthly: "Your StreamVault rewind" (personalized stats)
- Transactional: payment confirmations, password reset

**Push notifications** (Web Push API):
- Optional, permission requested after 3rd session
- Only for high-value events (new episode, show revival)

---

## PART 15 — REAL PAIN POINTS ADDRESSED

This section documents every decision driven by documented user complaints on Reddit (r/Netflix, r/television, r/cordcutters), Twitter/X, and app store reviews.

| Pain Point | Platform | StreamVault Solution |
|------------|----------|---------------------|
| "Can't filter by episode count or seasons" | All platforms | Season/episode filters (Part 3) |
| "Keep starting shows that got cancelled" | All | Completed-only filter + cancel warning badge |
| "No way to see if a show has bad seasons" | All | Season Quality Dashboard (Part 6.2) |
| "Trailers are spoiler-filled" | All | Trailer type filter: Teaser / Official / Featurette. Default to teaser. |
| "Autoplay starts before I'm ready" | Netflix | Hover autoplay has 0.8s delay + can be disabled globally in settings |
| "Can't sort my watchlist meaningfully" | All | Sort watchlist by: Added date / IMDb / Runtime / Season count / AI match score |
| "Subtitle font is unreadable" | Netflix, Prime | 6 subtitle style options (Part 7.1) |
| "Can't tell if a show is still airing" | All | Status badge on every card (Airing / Completed / Cancelled) |
| "No skip recap button" | All | Skip Recap + Skip Intro + Skip Credits (Part 7.1) |
| "Can't filter content by total time commitment" | All | Total Commitment Time filter in hours (Part 3.2) |
| "Recommendations ignore what I've already seen" | All | VAULT knows your full history; never recommends watched content |
| "Can't export my watchlist" | All | Export as CSV/JSON from profile settings |
| "Profiles don't have granular taste settings" | Netflix | Per-profile taste configuration, each profile has own AI model |
| "Can't find where to watch a specific thing" | All | Platform availability filter with deep links (Part 3.1) |
| "Rating shown is Rotten Tomatoes but I want IMDb" | Some | Show both, user can configure primary rating displayed |
| "No way to track watch parties with friends" | All | Watch Party feature with invite links (Part 7.1) |
| "Content disappears without warning" | All | "Leaving soon" badge on content expiring in <30 days |

---

## PART 16 — PERFORMANCE REQUIREMENTS

```
Core Web Vitals targets:
  LCP (Largest Contentful Paint): < 1.5s
  FID (First Input Delay): < 50ms  
  CLS (Cumulative Layout Shift): < 0.05

Image optimization:
  - All images via Next.js <Image> with lazy loading
  - Blur placeholder from Supabase Storage (blurhash)
  - WebP format, multiple sizes via srcset
  - Poster images: 300w, 500w, 780w sizes

Data fetching:
  - Home page: parallel data fetching (Promise.all in RSC)
  - Infinite scroll on browse pages (Intersection Observer)
  - SWR/React Query for client-side with stale-while-revalidate
  - Critical data: server components (no JS cost)
  - Interactive data: client components with optimistic updates

Caching strategy:
  - TMDB metadata: cache 24h (Next.js revalidate: 86400)
  - User data: no cache (always fresh)
  - AI recommendations: cache 6h per user
  - Search results: cache 5 min
  - Content pages: ISR (Incremental Static Regeneration, revalidate: 3600)
```

---

## PART 17 — SECURITY & COMPLIANCE

```
Authentication:
  - Supabase Auth with JWT
  - All API routes validate session via middleware
  - Rate limiting on auth endpoints (10 attempts per 15 min)
  - AI endpoints rate-limited by plan tier

Row Level Security (Supabase RLS):
  - Users can only read/write their own data
  - Content: readable by all, writable only by admins
  - Subscription check via RLS policies

Content Protection:
  - HLS streams are signed URLs (expire in 6h)
  - Supabase Storage signed URLs for media
  - DRM: Widevine L1/L3 for Premium tier (via third-party DRM provider)

Privacy:
  - GDPR compliant: data export + deletion in settings
  - No third-party tracking pixels
  - Analytics via self-hosted PostHog
  - AI conversations: user can clear history
```

---

## PART 18 — IMPLEMENTATION ORDER

Build in this exact order. Each phase is a working, deployable product.

### Phase 1 — Foundation (Week 1-2)
1. Supabase setup: schema, RLS, auth
2. Next.js project structure + Tailwind + theme system
3. Auth pages (login, register, onboarding)
4. TMDB API integration + content ingestion script
5. Basic home page with static content rows

### Phase 2 — Core Browse (Week 3-4)
1. Content card component with all states
2. Movie + Show detail pages
3. Basic search (full-text, no semantic yet)
4. Watchlist (add/remove, view)
5. 12 themes fully working

### Phase 3 — The Filter Engine (Week 5-6)
1. Filter state management (Zustand)
2. Filter UI components (all filter types)
3. Supabase query builder
4. Discover page
5. Saved filter presets
6. Season Quality Dashboard on show pages

### Phase 4 — Video Player (Week 7)
1. Custom HLS.js player
2. Progress saving/resume
3. Skip intro/recap/credits
4. Subtitle and audio controls
5. Next episode auto-continue

### Phase 5 — AI Features (Week 8-9)
1. DeepSeek integration (OpenRouter)
2. VAULT chat UI + streaming responses
3. AI recommendations (cron job)
4. HuggingFace semantic search embeddings
5. Natural language search
6. Skip Guide generator

### Phase 6 — Payments (Week 10)
1. Stripe subscriptions + webhook handler
2. Plan comparison page
3. Billing portal
4. Plan-gated features (RLS + middleware)
5. Rental system

### Phase 7 — Polish & Social (Week 11-12)
1. Watch Party
2. User lists
3. Notification system
4. Profile + settings
5. Data export
6. Performance optimization + Core Web Vitals pass

---

## PART 19 — CODE STYLE & CONVENTIONS

```typescript
// File naming: kebab-case for files, PascalCase for components
// /components/filters/filter-engine.tsx → exports FilterEngine

// Server Actions in dedicated files:
// /actions/content.ts, /actions/user.ts, /actions/ai.ts

// API routes follow REST:
// GET    /api/content          → list
// GET    /api/content/[id]     → single item
// POST   /api/content          → create (admin)
// PATCH  /api/content/[id]     → update (admin)
// DELETE /api/content/[id]     → delete (admin)

// Error handling: always use Result type pattern
type Result<T> = { data: T; error: null } | { data: null; error: string }

// Loading states: every async operation has 3 states
// loading / success / error — never omit error state

// Component structure:
// 1. Types/interfaces
// 2. Component function
// 3. Hooks (useState, useEffect, custom hooks)
// 4. Handlers
// 5. Derived state
// 6. Return JSX

// Tailwind: use cn() utility (clsx + tailwind-merge) for conditional classes
```

---

## FINAL NOTE TO THE DEVELOPER

This platform is built on a simple promise to users: **"We understand how you actually watch."**

Every filter, every AI feature, every loading state, every theme — it all comes back to that promise. When in doubt, ask: *does this feature make it easier for a user to find and enjoy exactly what they're in the mood to watch tonight?*

If yes: build it.
If no: cut it.

The filtering engine is your moat. The AI is your delight. The design is your trust.

Build it like a billion dollars depends on it — because it does.

---
*StreamVault Master Prompt v1.0 — Built for Next.js 15 + Supabase + HuggingFace + DeepSeek + Stripe*      the vidsrc is okey ,,dont add payment,,also dont use imdb tmdb is okey 






# VAULT - INTELLIGENCE ROADMAP
### From Recommendation Assistant To Power-User Discovery Engine

> **North Star**
> "You have seen the obvious 300. Here are the 7 you actually missed."

That sentence defines the next phase of VAULT. VAULT is already StreamVault's AI recommendation brain: it reads watch history, ratings, negative signals, currently watching state, long-term memory, and recent sessions. It can shape answers around real user context and avoid obvious generic mistakes.

The remaining gap is specific and important: VAULT must reliably serve the power user, the person who has seen almost everything good and needs to be shown what they genuinely missed, not what everyone already knows.

Power users are the hardest users to satisfy and the most valuable users to win. They are tastemakers. If VAULT can satisfy them, it can satisfy anyone.

---

## Pillar 1 - Richer Catalogue Metadata

TMDB alone is not enough. VAULT's recommendations are only as strong as the metadata it can reason over.

Required source stack:

| Source | Contribution |
| --- | --- |
| TMDB | Core metadata, ratings, cast, crew, posters |
| TVDb | Deeper TV and episode-level data |
| AniList / AniDB | Anime metadata, studios, OP/ED, air dates |
| MusicBrainz | Soundtrack and OST data |
| Wikidata | Awards, historical context, real-world connections |
| Fanart.tv | Premium artwork and backgrounds |
| JustWatch | Cross-platform streaming availability |
| Letterboxd-style signals | Long-tail film culture and niche appreciation |
| Community contributions | Pacing, tone, ending quality, episode where it gets good |

AI-interpreted metadata must sit on top of raw metadata:

- Pacing profile: slow burn, balanced, relentless.
- Tonal position: dark/light, serious/playful, grounded/fantastical.
- Complexity level: casual, moderate, demands full attention.
- Emotional weight: heavy, balanced, light.
- Narrative structure: episodic, serialized, anthology, hybrid.
- Cultural specificity: deeply local vs broadly accessible.
- Rewatchability score.
- Ending quality: satisfying, divisive, unresolved, open.
- Quality trajectory: improves, consistent, declines.
- Hidden gem score: high quality relative to low popularity.

This is what separates a recommendation engine from a search engine. VAULT must reason over attributes, not just match tags.

---

## Pillar 2 - Blind Spot Analysis Engine

VAULT must map everything a user has watched against the full catalogue and identify structured gaps by country, decade, genre, director, language, network, studio, animation style, and popularity tier.

Example output:

```text
Your Coverage Map

US Prestige Crime Drama        82%
UK Crime Thriller              41%
French Crime Series            14%
Korean Thriller                23%
Japanese Crime Drama            9%
Nordic Noir                    19%
Italian Crime                   4%
```

The point is not merely to show the chart. The point is for VAULT to draw the insight:

> "You have seen almost everything strong in US crime drama. Your next discovery is probably international. Based on your taste DNA, French crime series is your highest-probability blind spot: you have seen 14% of a category that maps 91% to what you already love."

Tracked blind spot dimensions:

- Country of origin.
- Decade of release.
- Genre and subgenre.
- Director filmography completion.
- Original language.
- Network and platform of origin.
- Vote-count range: mainstream vs niche.
- Anime and animation studio.
- Animation style.
- Budget tier: blockbuster, mid-budget, independent, micro-budget.

This is the feature that makes users feel understood in a way no normal streaming platform can match.

---

## Pillar 3 - Deterministic Unseen-Only Filtering

Before VAULT recommends anything, a hard deterministic filter must run before AI reasoning:

```text
IF title.id EXISTS IN user.watch_history
OR title.id EXISTS IN user.rejected_list
OR title.id EXISTS IN user.not_interested_list
THEN exclude completely
```

Extended exclusion logic:

- Exclude anything rated below 3 stars by the user.
- Exclude anything abandoned before episode 3 unless explicitly re-added.
- Exclude anything marked "not interested."
- Exclude anything VAULT recommended in the last 30 days that the user ignored.
- Exclude anything VAULT recommended and the user rejected with explicit negative feedback.

VAULT must keep a recommendation log:

```text
recommendation_log
- title_id
- recommended_at
- recommendation_context
- user_response: watched | ignored | rejected | added_to_watchlist
- rejection_reason
```

This enables responses like:

> "I recommended Spiral last month. You ignored it, so I will not push it again unless you ask for French crime specifically or your taste profile shifts."

This is non-negotiable. A recommendation engine that repeats watched or rejected titles loses trust immediately.

---

## Pillar 4 - Long Tail Ranking System

The obvious recommendations are easy. The valuable recommendations are the ones users would not have found themselves.

VAULT must surface titles that are:

- High quality by multiple signals.
- Low popularity by view count and cultural visibility.
- Highly compatible with the user's taste DNA.
- Deterministically unseen by the user.

Long-tail score:

```text
long_tail_score = (quality_score * taste_compatibility) / popularity_index

quality_score =
  TMDB rating
  + vote-count credibility adjustment
  + community Content DNA score
  + award recognition
  + critical/cultural consensus

taste_compatibility =
  similarity between title metadata and user Taste DNA, 0.0 to 1.0

popularity_index =
  mainstream visibility, where higher popularity lowers long-tail priority
```

When VAULT detects a power user, it should prioritize long-tail score over popularity.

Power-user output should include:

- Why it matches this user's taste DNA.
- Why it is genuinely overlooked despite quality.
- One honest reason some viewers may not connect with it.
- Community long-tail score.

---

## Pillar 5 - Taste DNA Engine

Genre and rating are not enough. VAULT must build a multidimensional Taste DNA profile that evolves with every watch, rating, rejection, skip, and ignored recommendation.

Structural preferences:

- Preferred episode length.
- Preferred season count.
- Serialized vs episodic preference.
- Completed vs ongoing tolerance.
- Binge-friendly vs slow-consumption pattern.

Tonal preferences:

- Dark/light position.
- Cerebral vs accessible complexity.
- Emotional weight tolerance.
- Humor style.
- Violence and intensity threshold.

Origin preferences:

- Country and cultural affinity.
- Language comfort, including sub vs dub behavior.
- Era and decade affinity.
- Network and studio affinity.

Narrative preferences:

- Protagonist type patterns.
- Repeated themes in highly rated watches.
- Ending preference.
- Pacing tolerance.
- Slow-burn abandonment behavior.

Negative signals must count as strongly as positive signals:

- What the user abandoned and when.
- What they rated low despite high external ratings.
- What recommendations they repeatedly ignored.
- What genres they avoid despite broad catalogue coverage.

Taste DNA should not become a public label like "dark drama fan." It should work invisibly under every recommendation. Users should feel understood, not categorized.

---

## Pillar 6 - Power User Retrieval Mode

VAULT needs two retrieval modes.

Standard user mode:

```text
Recommend from the top 20% of catalogue by quality and popularity,
filtered by taste compatibility.
```

Power user mode:

```text
Recommend from the full catalogue,
ranked by long-tail score,
filtered by deterministic unseen-only rules,
then sorted by taste compatibility.
```

Power-user triggers:

- Watch history contains more than 200 titles.
- Coverage score exceeds 65% in a major category.
- User says they have seen everything good.
- User repeatedly rejects mainstream recommendations.
- User's average rated title has lower popularity than platform median.

Power-user retrieval flow:

```text
1. Run deterministic unseen filter.
2. Remove watched, rejected, not-interested, recently ignored, and recently repeated titles.
3. Apply Taste DNA compatibility to the remaining catalogue.
4. Apply long-tail ranking.
5. Remove recently suggested titles from recommendation_log.
6. Return final ranked list with specific reasoning.
```

The output should feel like:

> "Based on your coverage map, you have seen 84% of the titles most people in your taste profile would recommend. Here is what you have not seen that you should have by now, ranked by how well they match specifically you, not everyone."

This is the $100M recommendation intelligence: not because it is expensive to build, but because it creates trust and word of mouth that would otherwise cost $100M to acquire.

---

## Honest Roadmap

VAULT today:

- Strong foundation.
- Reads context, history, ratings, negative signals, currently watching, and memory.
- Avoids obvious generic mistakes.
- Serves casual and moderate users well.

VAULT in 3 months:

- Blind spot analysis live.
- Deterministic unseen filtering hardened.
- Recommendation log operational.
- First long-tail ranking version.
- Taste DNA expanded beyond genre/rating.

VAULT in 6 months:

- Coverage scoring visible to users.
- Power-user mode fully active.
- Recommendation memory mature.
- Rich metadata stack integrated.
- Community Content DNA signals feeding rankings.

VAULT at full build:

> "You have seen the obvious 300. Here are the 7 you actually missed. And I know you have not seen them because I have been paying attention."

That is not a feature. That is the product users build their evenings around.
