import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildVaultContext } from '@/lib/vault/context';
import { extractAndStoreMemories } from '@/lib/vault/memory-store';
import { buildVaultSystemPrompt } from '@/lib/vault/system-prompt';
import { getUserTasteProfile } from '@/lib/recommendations/taste-dna';
import { computeExpandedTasteDNA } from '@/lib/recommendations/taste-dna-enhanced';
import { buildMoodContext, getMoodWeights } from '@/lib/recommendations/mood-engine';
import { retrieveCandidates, generatePowerUserSummary } from '@/lib/recommendations/power-user';
import { callDeepSeek, hasLLMProvider } from '@/lib/recommendations/deepseek';
import { getUnseenAcrossFollowedCreators, listCreators } from '@/lib/youtube/creators';
import type { UserTasteProfile } from '@/lib/recommendations/types';
import type { VaultChatMessage, VaultContentRef, VaultContext } from '@/lib/vault/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, sessionId } = await req.json();
    const incomingMessages = normalizeMessages(messages);

    const supabase = createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    let canPersistSession = false;
    if (user && sessionId) {
      const { data: session } = await admin
        .from('vault_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      canPersistSession = Boolean(session);
    }

    const lastMsg = incomingMessages[incomingMessages.length - 1];
    if (canPersistSession && lastMsg) {
      await admin.from('vault_messages').insert({
        session_id: sessionId,
        role: lastMsg.role,
        content: lastMsg.content,
      });
    }

    const context = user
      ? await buildVaultContext(admin, user, incomingMessages)
      : buildAnonymousVaultContext(incomingMessages);
    const retrievalContext = user && lastMsg && isRecommendationRequest(lastMsg.content)
      ? await buildRetrievalContext(user.id, admin).catch(() => null)
      : null;
    const creatorContext = user && lastMsg && isAfricanOrCreatorRequest(lastMsg.content)
      ? await buildCreatorVaultContext(user.id, admin).catch(() => null)
      : null;
    const systemPrompt = buildVaultSystemPrompt(context);

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...(retrievalContext ? [{ role: 'system', content: retrievalContext }] : []),
      ...(creatorContext ? [{ role: 'system', content: creatorContext }] : []),
      ...incomingMessages.map((message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
      })),
    ];

    const rawContent = isBareGreeting(lastMsg?.content || '', incomingMessages)
      ? buildGreetingResponse(context)
      : isAnimeBridgeRequest(lastMsg?.content || '')
        ? buildAnimeBridgeResponse()
        : await askVault(formattedMessages, {
          context,
          lastUserMessage: lastMsg?.content ?? '',
          retrievalContext,
          creatorContext,
        });
    const content = lastMsg && isRecommendationRequest(lastMsg.content)
      ? ensureDecisionBlock(rawContent)
      : rawContent;

    if (canPersistSession && content && !isOfflineResponse(content)) {
      const { error: assistantInsertError } = await admin.from('vault_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content,
        content_refs: extractContentRefs(content),
        filter_activations: extractFilterActivations(content),
      });

      if (assistantInsertError) {
        await admin.from('vault_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content,
        });
      }

      await admin
        .from('vault_sessions')
        .update({ message_count: incomingMessages.length + 1 })
        .eq('id', sessionId);

      if (incomingMessages.length === 1) {
        generateTitle(incomingMessages[0].content)
          .then((title) => {
            if (title) {
              return admin.from('vault_sessions').update({ title }).eq('id', sessionId);
            }
            return null;
          })
          .catch(() => {});
      }

      if (user) {
        extractAndStoreMemories(admin, user.id, [
          ...incomingMessages,
          { role: 'assistant', content },
        ]).catch(() => {});
      }
    }

    return buildStreamResponse(content);
  } catch (error: unknown) {
    console.error('Chat route error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function askVault(
  messages: Array<{ role: string; content: string }>,
  fallback: {
    context: VaultContext;
    lastUserMessage: string;
    retrievalContext: string | null;
    creatorContext: string | null;
  },
) {
  if (!hasLLMProvider()) {
    return buildLocalVaultFallback(fallback);
  }

  try {
    return await callDeepSeek(messages, { max_tokens: 750, temperature: 0.65 });
  } catch (error) {
    console.warn('VAULT provider fallback:', error instanceof Error ? error.message : error);
    return buildLocalVaultFallback(fallback);
  }
}

function buildLocalVaultFallback({
  context,
  lastUserMessage,
  retrievalContext,
  creatorContext,
}: {
  context: VaultContext;
  lastUserMessage: string;
  retrievalContext: string | null;
  creatorContext: string | null;
}) {
  const text = lastUserMessage.toLowerCase();
  const isCalibration = text.includes('calibrate') || text.includes('taste');

  if (isAnimeBridgeRequest(lastUserMessage)) {
    return buildAnimeBridgeResponse();
  }

  if (isCalibration && context.user.totalTitlesWatched < 3) {
    return `Good. No quiz theatre. Use the calibration screen: 5 loved, 3 overrated, 1 abandoned.\n\n[INSIGHT:{"label":"Calibration","text":"Those nine signals tell VAULT what earns your trust, what gets overpraised, and where you personally bail."}]\n[ACTION:{"label":"Open calibration","description":"Lock the nine signals that make VAULT personal from the first session.","href":"/calibrate","tone":"canon"}]`;
  }

  const candidate = parseFirstRetrievalCandidate(retrievalContext);
  if (candidate) {
    const decision = {
      mode: 'local_signal_pick',
      title: candidate.title,
      verdict: `Watch ${candidate.title}`,
      confidence: 0.72,
      why: candidate.reason || 'This is the strongest local retrieval match after watched and rejected titles were removed.',
      skipReason: 'Skip only if tonight needs a different mood or shorter commitment.',
    };

    return `[DECISION:${JSON.stringify(decision)}]\nWatch **${candidate.title}**. It wins because the retrieval layer already removed watched, rejected, and recently ignored titles before ranking what is left.\n${candidate.card}\n[INSIGHT:{"label":"Why this is not generic","text":"VAULT is using your StreamVault signals first: history, exclusions, mood, canon, and blind spots. The model is only the voice."}]\n[ACTION:{"label":"Tune future picks","description":"Tell VAULT if this was right, wrong, too obvious, or the wrong mood.","href":"/profile","tone":"canon"}]`;
  }

  if (creatorContext && isAfricanOrCreatorRequest(lastUserMessage)) {
    return `For African and creator content, I will not bluff with random YouTube popularity. StreamVault should index the creator, mark what you have seen, then surface the best unseen video first.\n\n[INSIGHT:{"label":"Creator logic","text":"The valuable question is not 'what is popular?' It is 'what did you miss from creators you already trust?'. That is the Creator Hub job."}]\n[ACTION:{"label":"Sync YouTube creators","description":"Import followed YouTube channels into Creator Hub, then sort them unseen-first inside StreamVault.","href":"/creators","tone":"canon","operation":{"type":"sync_youtube"}}]`;
  }

  const active = context.currentlyWatching.active[0];
  if (active) {
    return `You're already inside **${active.title}**. Best next move is not another recommendation; it is one of three calls: keep going, spoiler-safe recap, or clean pivot.\n[INSIGHT:{"label":"Current signal","text":"Active watching is stronger than a cold prompt. VAULT should solve the immediate viewing decision first."}]`;
  }

  if (isRecommendationRequest(lastUserMessage)) {
    const starter = pickLocalStarter(lastUserMessage);
    const decision = {
      mode: 'starter_canon_pick',
      title: starter.title,
      verdict: `Watch ${starter.title}`,
      confidence: starter.confidence,
      why: starter.why,
      skipReason: starter.skipReason,
    };

    return `[DECISION:${JSON.stringify(decision)}]\nWatch **${starter.title}** tonight.\n\n${starter.pitch}\n${starter.card}\n[INSIGHT:{"label":"Confidence","text":"This is a starter decision because VAULT has thin personal history here. It still makes one call, then learns from your response instead of dumping options."}]\n[ACTION:{"label":"Create Tonight Queue","description":"Make a list shelf for VAULT's current watch decision and nearby candidates.","href":"/lists","tone":"canon","operation":{"type":"create_list","name":"Tonight Queue","shelf":"Queue"}}]\n[ACTION:{"label":"Already seen it","description":"Tell VAULT this signal missed and it will move deeper into long-tail retrieval.","href":"/discover","tone":"warning","operation":{"type":"feedback","feedback":"bad"}}]`;
  }

  return `I won't fake knowing you from "${lastUserMessage || 'that'}". Give me one sharp signal and I will make the call: mood, commitment, or one title you want to orbit around.\n[INSIGHT:{"label":"Taste before titles","text":"The first useful VAULT answer should learn your standard, not spray familiar posters at you."}]\n[ACTION:{"label":"Calibrate VAULT","description":"Use 5 loved, 3 overrated, and 1 abandoned title to build your first real taste signal.","href":"/calibrate","tone":"canon"}]`;
}

function buildAnimeBridgeResponse() {
  const decision = {
    mode: 'anime_bridge_for_live_action',
    title: 'Pluto',
    verdict: 'Watch Pluto',
    confidence: 0.82,
    why: 'It is the cleanest anime bridge for a serious live-action watcher: prestige sci-fi crime, adult grief, political texture, and eight completed episodes.',
    skipReason: 'Skip only if you want something lighter, shorter than a series, or visually maximal rather than restrained.',
  };

  return `[DECISION:${JSON.stringify(decision)}]\nWatch **Pluto**.\n\nYou are not looking for “entry-level anime.” You are looking for animation that behaves like serious television: patient investigation, moral injury, geopolitical dread, and characters who carry consequences. **Pluto** is the right bridge because it asks for the same attention you would give *Mindhunter*, *Severance*, or a slow-burn HBO crime drama, but it uses animation where live action would flatten the scale.\n\n[CONTENT:title="Pluto",year=2023,type=anime]\n[INSIGHT:{"label":"Why this is the bridge","text":"Completed, eight episodes, no filler culture homework, adult tone, and a story that rewards live-action instincts: performance, pacing, motive, consequence."}]\n[ACTION:{"label":"Open serious anime lane","description":"Run the anime filter toward completed, adult-toned, low-filler titles for live-action viewers.","href":"/anime/discover?status=complete&demographic=seinen&minScore=8","tone":"canon"}]`;
}

function pickLocalStarter(message: string) {
  const text = message.toLowerCase();
  const starters = [
    {
      title: 'Giri/Haji',
      year: 2019,
      type: 'show',
      confidence: 0.64,
      why: 'It is compact, completed, stylish, and sits in the blind spot between UK crime and Japanese family tragedy.',
      skipReason: 'Skip if you need something light or purely plot-driven tonight.',
      pitch: 'It is the kind of completed crime series StreamVault should protect: eight episodes, no filler sprawl, morally bruised characters, and enough formal style to feel discovered rather than assigned.',
    },
    {
      title: 'The Vast of Night',
      year: 2019,
      type: 'movie',
      confidence: 0.61,
      why: 'It is a small, precise sci-fi mystery with craft, atmosphere, and a short commitment.',
      skipReason: 'Skip if slow-build dialogue will annoy you tonight.',
      pitch: 'A 90-minute late-night signal flare: intimate, eerie, and handmade in a way most algorithm picks are not. It is a better first trust test than another famous title.',
    },
    {
      title: 'Gangs of Lagos',
      year: 2023,
      type: 'movie',
      confidence: 0.66,
      why: 'It gives StreamVault a local-canon pick instead of defaulting to Western prestige.',
      skipReason: 'Skip if tonight needs quiet or family-safe viewing.',
      pitch: 'A Nigerian crime pick with street texture, loyalty, violence, and enough cultural specificity to prove the platform is not treating African content as a checkbox.',
    },
  ];

  const starter = text.includes('africa') || text.includes('nollywood') || text.includes('nigeria') || text.includes('kenya')
    ? starters[2]
    : text.includes('movie') || text.includes('short') || text.includes('late')
      ? starters[1]
      : starters[0];

  return {
    ...starter,
    card: `[CONTENT:title="${starter.title}",year=${starter.year},type=${starter.type}]`,
  };
}

function parseFirstRetrievalCandidate(retrievalContext: string | null) {
  if (!retrievalContext) return null;
  const match = retrievalContext.match(/\d+\.\s+(.+?)(?:\s+\((\d{4})\))?\s+\[([^\]]+)\][^\n]*?reason=([^\n]*?)(\s+\[CONTENT:title="([^"]+)",year=(\d{4}),type=([a-z_]+)\])?$/m);
  if (!match) return null;

  const title = match[6] || match[1].trim();
  const year = match[7] || match[2];
  const type = match[8] || (match[3] === 'tv' ? 'show' : match[3]);
  const card = year ? `[CONTENT:title="${title}",year=${year},type=${type}]` : '';

  return {
    title,
    reason: match[4]?.trim(),
    card,
  };
}

async function generateTitle(prompt: string) {
  if (!hasLLMProvider()) return null;

  const title = (await callDeepSeek(
    [
      { role: 'system', content: 'Summarize the user input into a 3 to 5 word chat title. Return only the title, no quotes.' },
      { role: 'user', content: prompt },
    ],
    { max_tokens: 12, temperature: 0.3 }
  ))
    ?.trim()
    .replace(/["']/g, '')
    .trim();

  return title || null;
}

function normalizeMessages(messages: unknown): VaultChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: String(message?.content ?? '').trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-16);
}

function extractContentRefs(text: string) {
  return [...text.matchAll(/\[CONTENT:title="([^"]+)",year=(\d{4}),type=([a-z_]+)\]/g)]
    .map((match) => `${match[3]}:${match[1]}:${match[2]}`)
    .slice(0, 12);
}

function extractFilterActivations(text: string) {
  return [...text.matchAll(/\[FILTERS:({[\s\S]*?})\]/g)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, 4);
}

function ensureDecisionBlock(content: string) {
  if (content.includes('[DECISION:')) return content;
  const firstContent = content.match(/\[CONTENT:title="([^"]+)",year=(\d{4}),type=([a-z_]+)\]/);
  if (!firstContent) return content;

  const title = firstContent[1];
  const leadSentence = content
    .replace(/\[[A-Z]+:[\s\S]*?\]/g, '')
    .split(/[.!?]\s/)
    .find((sentence) => sentence.trim().length > 24)
    ?.trim();

  const decision = {
    mode: 'tonight_pick',
    title,
    verdict: `Watch ${title}`,
    confidence: 0.78,
    why: leadSentence || 'This is the strongest fit from VAULT retrieval, not a random list item.',
    skipReason: 'Skip only if you want a different mood or commitment level tonight.',
  };

  return `[DECISION:${JSON.stringify(decision)}]\n${content}`;
}

function isOfflineResponse(content: string) {
  return content.includes('offline') || content.includes('trouble connecting');
}

function isRecommendationRequest(content: string) {
  const text = content.toLowerCase();
  return [
    'recommend',
    'suggest',
    'suggest me',
    'pick',
    'pick me',
    'surprise me',
    'what should i watch',
    'what to watch',
    'find me',
    'show me',
    'seen everything',
    'seen almost',
    'watched everything',
    'missed',
    'hidden gem',
    'blind spot',
    'something like',
    'movie',
    'show',
    'anime',
    'cartoon',
  ].some((phrase) => text.includes(phrase));
}

function isAnimeBridgeRequest(content: string) {
  const text = content.toLowerCase();
  return text.includes('anime') && (
    text.includes('live-action') ||
    text.includes('live action') ||
    text.includes('serious') ||
    text.includes('adult') ||
    text.includes('prestige') ||
    text.includes('people who don') ||
    text.includes('don’t like anime') ||
    text.includes("don't like anime")
  );
}

function isAfricanOrCreatorRequest(content: string) {
  const text = content.toLowerCase();
  return [
    'africa',
    'african',
    'nollywood',
    'nigeria',
    'nigerian',
    'kenya',
    'kenyan',
    'swahili',
    'yoruba',
    'hausa',
    'igbo',
    'youtube',
    'creator',
    'channel',
    'kalistus',
    'mark angel',
    'churchill',
    'beard meets food',
    'afrobeats',
    'football',
    'afcon',
  ].some((phrase) => text.includes(phrase));
}

async function buildRetrievalContext(userId: string, admin: ReturnType<typeof createAdminClient>) {
  let profile: UserTasteProfile | null = await getUserTasteProfile(userId);
  if (!profile || profile.confidence_score < 0.1) {
    const built = await computeExpandedTasteDNA(userId);
    if (built) profile = built;
  }
  if (!profile) return null;

  const mood = buildMoodContext();
  const weights = getMoodWeights(mood);
  const result = await retrieveCandidates(userId, profile, mood, weights, 12);
  if (!result.candidates.length) return null;

  const ids = result.candidates.map((candidate) => candidate.tmdb_id);
  const { data: contentRows } = await admin
    .from('content')
    .select('id, release_date')
    .in('id', ids);

  type ContentYearRow = { id: string | number; release_date?: string | null };
  const yearById = new Map((contentRows as ContentYearRow[] | null ?? []).map((row) => [
    String(row.id),
    row.release_date ? String(row.release_date).slice(0, 4) : '',
  ]));

  const candidates = result.candidates.slice(0, 10).map((candidate, index) => {
    const year = yearById.get(candidate.tmdb_id);
    const type = candidate.media_type === 'tv' ? 'show' : candidate.media_type;
    const card = year && /^\d{4}$/.test(year)
      ? ` [CONTENT:title="${candidate.title}",year=${year},type=${type}]`
      : '';
    return `${index + 1}. ${candidate.title}${year ? ` (${year})` : ''} [${type}] score=${candidate.finalScore.toFixed(2)} confidence=${candidate.confidence.toFixed(2)} signals=${candidate.signals.join(',') || 'none'} reason=${candidate.explanation || 'Matched by VAULT retrieval.'}${card}`;
  }).join('\n');

  const blindSpots = result.blindSpots.slice(0, 5).map((spot) =>
    `- ${spot.label} (${spot.dimension}): ${Math.round(spot.coveragePct)}% covered, ${Math.round(spot.tasteAffinity * 100)}% taste affinity. ${spot.reason}`
  ).join('\n') || 'No blind spots computed yet.';

  return `VAULT RETRIEVAL RESULTS - USE THESE BEFORE GENERAL MODEL MEMORY
Mode: ${result.mode}
Summary: ${generatePowerUserSummary(result, profile)}
Filtered out by deterministic unseen/rejection rules: ${result.totalFiltered}

Blind spots:
${blindSpots}

Candidate set:
${candidates}

Rules for this response:
- If recommending, prefer this candidate set.
- Do not recommend watched, rejected, hidden, low-rated, recently ignored, or recently rejected titles.
- If the user claims they have seen everything, lead with the coverage/blind-spot insight.
- If a candidate includes a [CONTENT] tag above, you may reuse that exact tag. Do not invent years.`;
}

async function buildCreatorVaultContext(userId: string, admin: ReturnType<typeof createAdminClient>) {
  const [creators, unseen] = await Promise.all([
    listCreators(admin, { limit: 20 }),
    getUnseenAcrossFollowedCreators(admin, userId, { limit: 12, longFormOnly: false }),
  ]);

  const creatorLines = creators.slice(0, 12).map((creator) =>
    `- ${creator.name} (${creator.category ?? 'creator'}, ${creator.country ?? 'unknown'}): ${creator.isCanon ? 'canon creator' : 'indexed creator'}`
  ).join('\n') || 'No indexed creators yet.';

  const unseenLines = unseen.slice(0, 8).map((video) => {
    const minutes = video.durationSeconds ? `${Math.round(video.durationSeconds / 60)} min` : 'duration unknown';
    const score = typeof video.streamvaultScore === 'number' ? `, score ${video.streamvaultScore.toFixed(2)}` : '';
    return `- "${video.title}" by ${video.creatorName ?? video.channelId} - ${minutes}${score} - ${video.youtubeUrl}`;
  }).join('\n') || 'No followed-creator unseen videos yet.';

  return `AFRICAN + CREATOR CONTENT CONTEXT
StreamVault treats African content and YouTube creators as first-class content, not leftovers.

Indexed African/creator surfaces:
${creatorLines}

Top unseen videos from followed creators:
${unseenLines}

Rules:
- For African content requests, prioritize country, language, broadcaster, canon quality, and cultural entry point.
- For YouTube creator requests, answer with unseen-first logic: creator loyalty, category discovery, and long-form creator content.
- YouTube is a legal deep-link surface. Do not describe it as a competitor.
- If data is missing, say what StreamVault needs to index rather than hallucinating exact channel/video facts.`;
}

function isBareGreeting(content: string, messages: VaultChatMessage[]) {
  const normalized = content
    .toLowerCase()
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return false;
  if (normalized.length > 24) return false;

  const greetings = new Set([
    'hi',
    'ey',
    'hey',
    'heyy',
    'hello',
    'yo',
    'sup',
    'whats up',
    "what's up",
    'good morning',
    'good afternoon',
    'good evening',
  ]);

  return greetings.has(normalized) && messages.filter((message) => message.role === 'user').length <= 1;
}

function buildGreetingResponse(context: VaultContext) {
  const active = context.currentlyWatching.active[0];
  const recent = context.watchHistory.recent[0];
  const name = context.user.name && context.user.name !== 'friend' ? `, ${context.user.name}` : '';

  if (active) {
    const decision = {
      mode: 'active_watch_decision',
      title: active.title,
      verdict: `Resolve ${active.title} first`,
      confidence: 0.78,
      why: 'An active watch is stronger than a cold recommendation. VAULT should protect momentum before opening another shelf.',
      skipReason: 'Pivot only if the current title is draining you or the next episode is too heavy for tonight.',
    };

    return `[DECISION:${JSON.stringify(decision)}]\nHey${name}. Stay with **${active.title}** unless tonight needs a clean pivot.\n\nThe useful move is not another list. It is a verdict on the thing already competing for your attention: keep going, recap safely, or cut it loose before it steals another night.\n${contentBlockFor(active)}\n[INSIGHT:{"label":"Current signal","text":"VAULT is reading active viewing as intent, not small talk. Momentum beats generic discovery."}]\n[ACTION:{"label":"Give me the verdict","description":"Ask VAULT: keep going, recap me, or pivot me out of this.","href":"/dashboard","tone":"canon"}]`;
  }

  if (recent) {
    const bridge = pickGreetingBridge(recent);
    const decision = {
      mode: 'recent_signal_bridge',
      title: bridge.title,
      verdict: `Tonight: ${bridge.title}`,
      confidence: bridge.confidence,
      why: bridge.why,
      skipReason: bridge.skipReason,
    };

    return `[DECISION:${JSON.stringify(decision)}]\nHey${name}. Your last real signal is **${recent.title}**${recent.rating ? ` at ${recent.rating}/5` : ''}. I am not treating that as trivia; I am using it as a pressure mark.\n\nWatch **${bridge.title}**. ${bridge.pitch}\n${bridge.card}\n[INSIGHT:{"label":"Why this move","text":"The pick is built from the last observed signal, then narrowed to one watch decision. No menu, no pile, no assistant theatre."}]\n[ACTION:{"label":"Teach VAULT from this","description":"Reply with seen, too obvious, wrong mood, or nailed it. VAULT will adjust the next decision instead of restarting from zero.","href":"/dashboard","tone":"canon"}]`;
  }

  const starter = pickLocalStarter('starter canon');
  const decision = {
    mode: 'first_session_trust_pick',
    title: starter.title,
    verdict: `Start with ${starter.title}`,
    confidence: starter.confidence,
    why: starter.why,
    skipReason: starter.skipReason,
  };

  return `[DECISION:${JSON.stringify(decision)}]\nHey${name}. I am going to make the first trust move instead of asking you to fill a form.\n\nWatch **${starter.title}**. ${starter.pitch}\n${starter.card}\n[INSIGHT:{"label":"First signal","text":"If this misses, say why in one sentence. That single correction is more useful than a long onboarding quiz."}]\n[ACTION:{"label":"Calibrate sharper","description":"Give VAULT 5 loved, 3 overrated, and 1 abandoned title when you want the full taste map.","href":"/calibrate","tone":"canon"}]`;
}

function pickGreetingBridge(recent: VaultContentRef) {
  const title = recent.title.toLowerCase();
  const isHistoricalPressure = ['last kingdom', 'vikings', 'game of thrones', 'rome', 'spartacus', 'medici']
    .some((needle) => title.includes(needle));

  if (isHistoricalPressure) {
    return {
      title: 'Kingdom',
      year: 2019,
      type: 'show',
      confidence: 0.74,
      why: 'It keeps the oath, succession, bloodline, and political pressure signals, but pivots into a tighter Korean historical thriller instead of repeating the same Western medieval lane.',
      skipReason: 'Skip if you want grounded history with no horror element tonight.',
      pitch: 'Same appetite for power, loyalty, and bodies in the mud; sharper hook, stranger texture, and less algorithm dust.',
      card: '[CONTENT:title="Kingdom",year=2019,type=show]',
    };
  }

  const starter = pickLocalStarter(recent.type === 'movie' ? 'movie late' : 'starter canon');
  return {
    title: starter.title,
    year: starter.year,
    type: starter.type,
    confidence: starter.confidence,
    why: starter.why,
    skipReason: starter.skipReason,
    pitch: starter.pitch,
    card: starter.card,
  };
}

function contentBlockFor(ref: VaultContentRef) {
  const type = ref.type === 'movie' ? 'movie' : ref.type === 'anime' ? 'anime' : 'show';
  const safeTitle = ref.title.replace(/"/g, '\\"');
  const year = ref.year && /^\d{4}$/.test(ref.year) ? Number(ref.year) : new Date().getFullYear();
  return `[CONTENT:title="${safeTitle}",year=${year},type=${type}]`;
}

function buildAnonymousVaultContext(conversationHistory: VaultChatMessage[]): VaultContext {
  return {
    user: {
      id: 'anonymous',
      name: 'friend',
      memberSince: null,
      totalWatchHours: 0,
      totalTitlesWatched: 0,
      profileSummary: 'No signed-in profile is available. Ask one sharp preference question only if needed.',
      tasteCluster: 'Unknown',
    },
    watchHistory: {
      recent: [],
      topRated: { movies: [], shows: [], anime: [] },
      genreBreakdown: {},
      countryBreakdown: {},
      decadeBreakdown: {},
      moviesWatched: 0,
      showsWatched: 0,
      animeWatched: 0,
      isPowerUser: false,
    },
    preferences: {
      loved: [],
      disliked: [],
      neverRecommend: [],
      savedPresets: [],
      longTermMemory: [],
    },
    currentlyWatching: {
      active: [],
      recentlyFinished: null,
      almostDone: [],
    },
    session: {
      timeOfDay: 'unknown',
      dayOfWeek: 'unknown',
      inferredMood: 'unknown',
      conversationHistory,
      previousSessions: [],
    },
    database: {
      canQuery: false,
      totalTitles: 0,
    },
  };
}

function buildStreamResponse(text: string) {
  const encoder = new TextEncoder();
  let streamInterval: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stop = () => {
    closed = true;
    if (streamInterval) {
      clearInterval(streamInterval);
      streamInterval = null;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const words = text.split(' ');
      let i = 0;
      streamInterval = setInterval(() => {
        if (closed) return;
        try {
          if (i < words.length) {
            const token = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(encoder.encode(`0:${JSON.stringify(token)}\n`));
            i++;
          } else {
            controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'));
            stop();
            controller.close();
          }
        } catch {
          stop();
        }
      }, 24);
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}
