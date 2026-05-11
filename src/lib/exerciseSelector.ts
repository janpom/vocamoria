import {
  EXERCISE_RANK,
  EXERCISE_TYPES,
  type ExerciseType,
  type WordMastery,
  emptyWordMastery,
  isMastered,
  isPromoted,
  progressOf,
  streakOf,
} from './mastery';
// progressOf is kept in scope for wordWeight (anchor selection).
import { USER_SKILL_DEFAULT, type PracticeState, userSkillOf } from './practice';
import type { Vocab, Word } from './types';

export const PAIRS_EXERCISE_SIZE = 8;

export const TYPE_WEIGHT_MULTIPLIER: Partial<Record<ExerciseType, number>> = {
  pairs: 0.5,
};

export const PROMOTION_SKILL_THRESHOLD = 0.5;
export const GAUSSIAN_SHARPNESS = 100;
export const WEIGHT_FLOOR = 0.01;

export function exerciseWeight(
  exType: ExerciseType,
  userSkill: number = USER_SKILL_DEFAULT,
): number {
  const normRank = (EXERCISE_RANK[exType] - 1) / (EXERCISE_TYPES.length - 1);
  const distance = normRank - userSkill;
  const base = Math.exp(-distance * distance * GAUSSIAN_SHARPNESS) + WEIGHT_FLOOR;
  return base * (TYPE_WEIGHT_MULTIPLIER[exType] ?? 1);
}

export function eligibleExercises(vocabSize: number): ExerciseType[] {
  return EXERCISE_TYPES.filter((t) => (t === 'pairs' ? vocabSize >= 2 : vocabSize >= 1));
}

export const MASTERED_WORD_WEIGHT = 0.005;
export const NON_MASTERED_FLOOR = 0.05;

export function wordWeight(progress: number): number {
  if (progress >= 1) return MASTERED_WORD_WEIGHT;
  const inv = 1 - progress;
  return inv * inv + NON_MASTERED_FLOOR;
}

export function weightedSampleIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function masteryOf(state: PracticeState, id: string): WordMastery {
  return state.words[id] ?? emptyWordMastery();
}

export function chooseTypeForWord(
  m: WordMastery,
  eligible: ExerciseType[],
  userSkill: number = USER_SKILL_DEFAULT,
  random: () => number = Math.random,
): ExerciseType {
  if (eligible.includes('typing-n-l') && !isMastered(m)) {
    // Always close out an in-progress typing-n-l streak — that's the only
    // path to mastery.
    if (streakOf(m, 'typing-n-l') >= 1) return 'typing-n-l';
    // Promote to typing-n-l only when the user is currently performing well
    // enough; cold-streak users get the gentler Gaussian fallback.
    if (isPromoted(m) && userSkill >= PROMOTION_SKILL_THRESHOLD) return 'typing-n-l';
  }
  const weights = eligible.map((t) => exerciseWeight(t, userSkill));
  return eligible[weightedSampleIndex(weights, random)];
}

export function pickWords(
  vocab: Vocab,
  state: PracticeState,
  count: number,
  random: () => number = Math.random,
  excludeIds: ReadonlySet<string> = new Set(),
): Word[] {
  const pool = vocab.words
    .filter((w) => !excludeIds.has(w.id))
    .map((w) => ({ word: w, weight: wordWeight(progressOf(masteryOf(state, w.id))) }));
  const out: Word[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = weightedSampleIndex(
      pool.map((p) => p.weight),
      random,
    );
    out.push(pool[idx].word);
    pool.splice(idx, 1);
  }
  return out;
}

export type PickedExercise = {
  exType: ExerciseType;
  words: Word[];
};

export function pickNextExercise(
  vocab: Vocab,
  state: PracticeState,
  random: () => number = Math.random,
): PickedExercise {
  if (vocab.words.length === 0) {
    throw new Error('Cannot pick an exercise from an empty vocab.');
  }

  const anchorWeights = vocab.words.map((w) =>
    wordWeight(progressOf(masteryOf(state, w.id))),
  );
  const anchor = vocab.words[weightedSampleIndex(anchorWeights, random)];
  const anchorMastery = masteryOf(state, anchor.id);

  const eligible = eligibleExercises(vocab.words.length);
  const userSkill = userSkillOf(state.recentScores);
  const exType = chooseTypeForWord(anchorMastery, eligible, userSkill, random);

  if (exType === 'pairs') {
    const more = pickWords(
      vocab,
      state,
      Math.min(PAIRS_EXERCISE_SIZE, vocab.words.length) - 1,
      random,
      new Set([anchor.id]),
    );
    return { exType, words: [anchor, ...more] };
  }

  return { exType, words: [anchor] };
}
