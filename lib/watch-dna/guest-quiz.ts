/**
 * Watch DNA Match — Guest Quiz
 *
 * Provides a 5-question quiz for unauthenticated guests to generate a lightweight
 * DNA profile. Covers: pacing, tone, morality, focus, stakes.
 */

import { createClient } from '@/lib/supabase/server';
import type { GuestQuizAnswer } from './types';

// ---------------------------------------------------------------------------
// Quiz question bank
// ---------------------------------------------------------------------------

export interface QuizOption {
  label: string;
  /** DNA signal deltas contributed when this option is selected (0–1 scale). */
  dnaSignal: Record<string, number>;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
}

/**
 * Five canonical questions for the guest DNA quiz.
 *
 * Each option carries `dnaSignal` values that map directly to the named
 * dimension used by the intersection engine. Values are additive and will
 * be averaged across all answers by `computeGuestDNA`.
 *
 * Dimensions covered: pacing, tone, morality, focus, stakes.
 */
export const GUEST_QUIZ_QUESTIONS: QuizQuestion[] = [
  // ── Question 1: PACING ───────────────────────────────────────────────────
  {
    id: 1,
    question: 'How do you like your stories to unfold?',
    options: [
      {
        label: 'Slow and atmospheric — I love when tension builds over time.',
        dnaSignal: { pacing: 0.1 },
      },
      {
        label: 'A measured pace — some breathing room, but always moving forward.',
        dnaSignal: { pacing: 0.4 },
      },
      {
        label: 'Brisk and propulsive — I want twists, reveals, and constant momentum.',
        dnaSignal: { pacing: 0.75 },
      },
      {
        label: 'Lightning fast — non-stop action from the first scene.',
        dnaSignal: { pacing: 1.0 },
      },
    ],
  },

  // ── Question 2: TONE ─────────────────────────────────────────────────────
  {
    id: 2,
    question: 'Which viewing experience sounds most appealing right now?',
    options: [
      {
        label: 'Something dark and intense that stays with me long after the credits.',
        dnaSignal: { tone: 0.05 },
      },
      {
        label: 'A gripping drama with moments of levity sprinkled in.',
        dnaSignal: { tone: 0.35 },
      },
      {
        label: 'A fun, optimistic story that leaves me feeling good.',
        dnaSignal: { tone: 0.75 },
      },
      {
        label: 'Pure comedy — I want to laugh out loud from start to finish.',
        dnaSignal: { tone: 1.0 },
      },
    ],
  },

  // ── Question 3: MORALITY ─────────────────────────────────────────────────
  {
    id: 3,
    question: 'How do you feel about morally ambiguous characters?',
    options: [
      {
        label: 'I love them — the best stories blur the line between hero and villain.',
        dnaSignal: { morality: 0.05 },
      },
      {
        label: 'I enjoy a flawed protagonist, as long as there is some redemption arc.',
        dnaSignal: { morality: 0.35 },
      },
      {
        label: 'I prefer clear good guys and bad guys — I want someone to root for.',
        dnaSignal: { morality: 0.75 },
      },
      {
        label: 'Strictly heroes vs villains — the cleaner the better.',
        dnaSignal: { morality: 1.0 },
      },
    ],
  },

  // ── Question 4: FOCUS ────────────────────────────────────────────────────
  {
    id: 4,
    question: 'What captivates you most in a story?',
    options: [
      {
        label: 'A sprawling ensemble with many interwoven storylines.',
        dnaSignal: { focus: 0.1 },
      },
      {
        label: 'A small group of characters caught in a high-stakes situation.',
        dnaSignal: { focus: 0.4 },
      },
      {
        label: 'One central character whose inner world I can really dive into.',
        dnaSignal: { focus: 0.75 },
      },
      {
        label: 'An intimate two-hander — I love watching two people bounce off each other.',
        dnaSignal: { focus: 0.95 },
      },
    ],
  },

  // ── Question 5: STAKES ───────────────────────────────────────────────────
  {
    id: 5,
    question: 'What kind of stakes get your heart racing?',
    options: [
      {
        label: "Personal, emotional stakes — a character's inner transformation.",
        dnaSignal: { stakes: 0.05 },
      },
      {
        label: 'Relationship or family drama where the wrong choice changes everything.',
        dnaSignal: { stakes: 0.35 },
      },
      {
        label: 'Lives are on the line — survival, justice, or a life-changing decision.',
        dnaSignal: { stakes: 0.7 },
      },
      {
        label: 'World-ending, civilisation-at-stake tension — nothing less will do.',
        dnaSignal: { stakes: 1.0 },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// DNA computation
// ---------------------------------------------------------------------------

/**
 * Aggregate the guest's quiz answers into a single DNA vector.
 *
 * For each dimension that appears in at least one answer, the values are
 * averaged to produce a 0–1 score. Dimensions not covered remain absent
 * from the returned object (the caller may default them to 0.5).
 *
 * @param answers Array of answers submitted by the guest.
 * @returns       A plain object mapping dimension name → average score.
 */
export function computeGuestDNA(answers: GuestQuizAnswer[]): Record<string, number> {
  const accumulator: Record<string, { total: number; count: number }> = {};

  for (const answer of answers) {
    const signals = answer.dnaSignal;
    for (const [dimension, value] of Object.entries(signals)) {
      if (!accumulator[dimension]) {
        accumulator[dimension] = { total: 0, count: 0 };
      }
      accumulator[dimension].total += value;
      accumulator[dimension].count += 1;
    }
  }

  const dna: Record<string, number> = {};
  for (const [dimension, { total, count }] of Object.entries(accumulator)) {
    dna[dimension] = count > 0 ? total / count : 0.5;
  }

  return dna;
}

// ---------------------------------------------------------------------------
// Supabase persistence
// ---------------------------------------------------------------------------

/**
 * Persist a guest's computed DNA profile in the `guest_taste_profiles` table.
 *
 * The table is expected to have at least these columns:
 *   - guest_token TEXT PRIMARY KEY
 *   - session_id  TEXT NOT NULL
 *   - dna_vector  JSONB NOT NULL
 *   - raw_answers JSONB NOT NULL
 *   - created_at  TIMESTAMPTZ DEFAULT now()
 *
 * An existing row for the same `guest_token` is upserted so that retaking
 * the quiz always produces an up-to-date profile.
 *
 * @param guestToken A unique identifier for the unauthenticated guest (e.g. a UUID stored in localStorage).
 * @param sessionId  The Watch Together session the guest is joining.
 * @param answers    The raw answers submitted during the quiz.
 */
export async function saveGuestProfile(
  guestToken: string,
  sessionId: string,
  answers: GuestQuizAnswer[],
): Promise<void> {
  const dnaVector = computeGuestDNA(answers);

  const supabase = await createClient();

  const { error } = await supabase
    .from('guest_taste_profiles')
    .upsert(
      {
        guest_token: guestToken,
        session_id: sessionId,
        dna_vector: dnaVector,
        raw_answers: answers,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'guest_token' },
    );

  if (error) {
    throw new Error(`saveGuestProfile: failed to persist guest DNA — ${error.message}`);
  }
}
