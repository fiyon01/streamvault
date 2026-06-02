import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildVaultContext } from '@/lib/vault/context';
import type { VaultContext } from '@/lib/vault/types';
import { callDeepSeek, hasLLMProvider } from '@/lib/recommendations/deepseek';

type IntelligenceMode =
  | 'scene_explainer'
  | 'content_warnings'
  | 'skip_intelligence'
  | 'binge_checkpoint'
  | 'character_actor'
  | 'watch_party';

type PlayerPayload = {
  mode?: IntelligenceMode;
  tmdbId?: string;
  type?: 'movie' | 'show';
  title?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  runtime?: number | null;
  synopsis?: string;
  overview?: string;
};

function compactSynopsis(synopsis?: string) {
  if (!synopsis) return 'the central conflict';
  const cleaned = synopsis.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'the central conflict';
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
}

function fallback(mode: IntelligenceMode, title: string, episodeLabel: string, synopsis?: string) {
  switch (mode) {
    case 'scene_explainer':
      return `For **${title}${episodeLabel}**, use the current scene as character context: what matters is who gained leverage, who lost trust, and what new information changes the next decision. If the scene felt confusing, replay the last two minutes and watch who reacts instead of who speaks.`;
    case 'content_warnings':
      return `No precise timestamped warnings are available yet. General note for **${title}**: check the rating and episode synopsis before watching with kids or sensitive viewers.`;
    case 'skip_intelligence':
      return `Skip only recaps and credits unless the player offers a clear marker. For **${title}${episodeLabel}**, avoid skipping early scenes on a first watch because setup often pays off later.`;
    case 'binge_checkpoint':
      return `Checkpoint: if it is late, stop after this one unless the next episode is already queued for a planned session. No guilt, just clean information.`;
    case 'character_actor':
      return `Use the detail page cast section for confirmed actor names. If you describe the character or scene to VAULT, it can help identify likely roles without leaving the player.`;
    case 'watch_party':
      return [
        `1. In **${title}${episodeLabel}**, who has the most leverage right now, and what would make that power collapse?`,
        `2. Based on ${compactSynopsis(synopsis)}, which character decision feels most expensive if it goes wrong?`,
        `3. What is the show asking you to trust in this moment, and who benefits if that trust is misplaced?`,
      ].join('\n\n');
  }
}

function userContextBlock(context: VaultContext | null) {
  if (!context) {
    return `Signed-in user context: unavailable. Do not pretend to know their history.`;
  }

  const recent = context.watchHistory.recent
    .slice(0, 6)
    .map((item) => `${item.title}${item.rating ? ` (${item.rating}/5)` : ''}`)
    .join(', ') || 'none';
  const loved = context.preferences.loved
    .slice(0, 5)
    .map((item) => `${item.title}${item.rating ? ` (${item.rating}/5)` : ''}`)
    .join(', ') || 'none';
  const disliked = context.preferences.disliked
    .slice(0, 5)
    .map((item) => item.title)
    .join(', ') || 'none';

  return `Signed-in user context:
Name: ${context.user.name}
Taste summary: ${context.user.profileSummary}
Recent watches: ${recent}
Loved: ${loved}
Disliked/negative signals: ${disliked}
Inferred session mood: ${context.session.inferredMood}`;
}

function promptFor(mode: IntelligenceMode, payload: PlayerPayload, context: VaultContext | null) {
  const title = payload.title || 'this title';
  const episodeLabel = payload.type === 'show' ? ` S${payload.season || 1}E${payload.episode || 1}${payload.episodeTitle ? ` "${payload.episodeTitle}"` : ''}` : '';
  const synopsis = payload.synopsis || payload.overview || 'No synopsis provided.';

  const base = `Title: ${title}${episodeLabel}
TMDB ID: ${payload.tmdbId || 'unknown'}
Content type: ${payload.type || 'unknown'}
Runtime: ${payload.runtime || 'unknown'} minutes
Synopsis/context: ${synopsis}
${userContextBlock(context)}

Rules:
- Be direct, useful, spoiler-safe unless the user explicitly asks for spoilers.
- Do not write generic fandom questions that could fit any show.
- Use only the title, episode label, synopsis, runtime, and user context above. If the data is too thin, say what is missing instead of pretending.
- Do not mention exact timestamps unless one was supplied.
- No preamble. 2-4 short sentences unless the mode asks for 3 prompts.`;

  switch (mode) {
    case 'scene_explainer':
      return `${base}
Explain "what just happened?" in a spoiler-safe way for someone currently watching. Focus on stakes, character motivation, and why the scene matters.`;
    case 'content_warnings':
      return `${base}
Give practical real-time style content warnings without inventing exact timestamps. Mention likely warning categories and whether the viewer should check before continuing.`;
    case 'skip_intelligence':
      return `${base}
Give skip guidance: recap/intro/credits/cold open advice, and whether first-time viewers should skip anything.`;
    case 'binge_checkpoint':
      return `${base}
Give an honest binge checkpoint for this exact episode/title. Weigh runtime, likely cliffhanger energy from synopsis, current time-of-day/user context, and whether this is a sensible next-episode decision. End with one clear verdict: stop, continue, or only continue if planned.`;
    case 'character_actor':
      return `${base}
Explain how to identify a character/actor from this scene without leaving playback. Mention what information to look for and what VAULT can answer if the user describes the person.`;
    case 'watch_party':
      return `${base}
Generate exactly 3 spoiler-safe watch party prompts anchored to this exact title/episode context. Each prompt must be specific enough that it would sound wrong on a different show. Avoid generic "first impression" prompts unless this is episode 1.`;
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const mode = (payload.mode || 'scene_explainer') as IntelligenceMode;
    const title = payload.title || 'this title';
    const episodeLabel = payload.type === 'show' ? ` S${payload.season || 1}E${payload.episode || 1}` : '';
    const context = await getSignedInVaultContext().catch(() => null);

    if (!hasLLMProvider()) {
      return NextResponse.json({ mode, answer: fallback(mode, title, episodeLabel, payload.synopsis || payload.overview) });
    }

    const answer = await callDeepSeek(
      [
        {
          role: 'system',
          content: 'You are VAULT inside the StreamVault player. You are concise, cinematic, honest, spoiler-safe, and allergic to generic streaming-app filler. If context is thin, be transparent and ask for the missing scene detail.',
        },
        { role: 'user', content: promptFor(mode, payload, context) },
      ],
      { max_tokens: 220, temperature: 0.55 }
    ).catch(() => fallback(mode, title, episodeLabel, payload.synopsis || payload.overview));

    return NextResponse.json({ mode, answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Player intelligence failed' },
      { status: 500 }
    );
  }
}

async function getSignedInVaultContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  return buildVaultContext(admin, user, []);
}
