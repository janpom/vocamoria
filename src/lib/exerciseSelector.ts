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
import type { PracticeState } from './practice';
import type { Vocab, Word } from './types';

export const PAIRS_EXERCISE_SIZE = 8;

export const TYPE_WEIGHT_MULTIPLIER: Partial<Record<ExerciseType, number>> = {
  pairs: 0.5,
};

export function exerciseWeight(exType: ExerciseType, mastery: WordMastery): number {
  const normRank = (EXERCISE_RANK[exType] - 1) / (EXERCISE_TYPES.length - 1);
  const base = Math.exp(-Math.pow(normRank - progressOf(mastery), 2) * 8) + 0.1;
  return base * (TYPE_WEIGHT_MULTIPLIER[exType] ?? 1);
}

export function eligibleExercises(vocabSize: number): ExerciseType[] {
  return EXERCISE_TYPES.filter((t) => (t === 'pairs' ? vocabSize >= 2 : vocabSize >= 1));
}

export function wordWeight(progress: number): number {
  const inv = 1 - progress;
  return inv * inv + 0.02;
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
  random: () => number = Math.random,
): ExerciseType {
  // Deterministic typing-n-l in two cases:
  //   1. First typing-n-l success landed → close out the streak.
  //   2. Word is promoted (any non-typing-n-l streak hit STREAK_TARGET).
  if (
    eligible.includes('typing-n-l') &&
    !isMastered(m) &&
    (streakOf(m, 'typing-n-l') >= 1 || isPromoted(m))
  ) {
    return 'typing-n-l';
  }
  const weights = eligible.map((t) => exerciseWeight(t, m));
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
  const exType = chooseTypeForWord(anchorMastery, eligible, random);

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
