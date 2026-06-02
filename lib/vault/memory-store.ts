import type { SupabaseClient } from '@supabase/supabase-js';
import { callDeepSeek, hasLLMProvider } from '@/lib/recommendations/deepseek';
import type { VaultChatMessage } from './types';

type ExtractedMemory = {
  memory: string;
  category?: 'preference' | 'restriction' | 'fact' | 'outcome' | 'inferred';
  confidence?: number;
  expires?: null | 'short_term';
};

function parseMemoryArray(raw: string): ExtractedMemory[] {
  try {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start < 0 || end < start) return [];
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        memory: String(item?.memory ?? '').trim(),
        category: item?.category,
        confidence: Number(item?.confidence ?? 0.7),
        expires: item?.expires ?? null,
      }))
      .filter((item) => item.memory.length > 8)
      .slice(0, 8);
  } catch {
    return [];
  }
}

function mergeMemoryText(existing: string, memories: ExtractedMemory[]) {
  const current = existing
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  const next = memories.map((item) => item.memory);
  const seen = new Set<string>();

  return [...next, ...current]
    .filter((memory) => {
      const key = memory.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40)
    .map((memory) => `- ${memory}`)
    .join('\n');
}

export async function extractAndStoreMemories(
  admin: SupabaseClient,
  userId: string,
  conversation: VaultChatMessage[]
) {
  const usefulConversation = conversation
    .filter((message) => message.content?.trim())
    .slice(-10);

  if (!usefulConversation.length || !hasLLMProvider()) return;

  try {
    const raw = await callDeepSeek(
      [
        {
          role: 'system',
          content: `You extract durable memory for VAULT, a streaming recommendation assistant.
Return only JSON array. Extract useful entertainment preferences, restrictions, viewing facts, group context, and outcomes. Skip small talk.`,
        },
        {
          role: 'user',
          content: usefulConversation.map((message) => `${message.role}: ${message.content}`).join('\n'),
        },
      ],
      { max_tokens: 400, temperature: 0.1 }
    );

    const memories = parseMemoryArray(raw);
    if (!memories.length) return;

    const { data: existing } = await admin
      .from('vault_memory')
      .select('learned_context')
      .eq('user_id', userId)
      .maybeSingle();

    const learnedContext = mergeMemoryText(existing?.learned_context ?? '', memories);

    await admin
      .from('vault_memory')
      .upsert({ user_id: userId, learned_context: learnedContext, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    await admin.from('vault_memories').insert(
      memories.map((item) => ({
        user_id: userId,
        memory: item.memory,
        category: item.category ?? 'preference',
        confidence: Math.max(0, Math.min(1, item.confidence ?? 0.7)),
        source: 'explicit',
        expires_at: item.expires === 'short_term' ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null,
      }))
    );
  } catch {
    // Memory is a background enhancement. Chat should never fail because it could not be updated.
  }
}
