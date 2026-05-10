import {
  EXERCISE_RANK,
  EXERCISE_TYPES,
  type ExerciseType,
  type WordMastery,
  emptyWordMastery,
} from './mastery';
import type { PracticeState } from './practice';
import type { Vocab, Word } from './types';

export const PAIRS_EXERCISE_SIZE = 8;

export const TYPE_WEIGHT_MULTIPLIER: Partial<Record<ExerciseType, number>> = {
  pairs: 0.5,
};

const STREAK_BOOST = 2;

export function exerciseWeight(exType: ExerciseType, mastery: WordMastery): number {
  const normRank = (EXERCISE_RANK[exType] - 1) / (EXERCISE_TYPES.length - 1);
  const base = Math.exp(-Math.pow(normRank - mastery.progress, 2) * 8) + 0.1;
  let weight = base * (TYPE_WEIGHT_MULTIPLIER[exType] ?? 1);
  if (exType === 'typing-n-l' && mastery.typingNToLStreak > 0) {
    weight *= 1 + STREAK_BOOST * mastery.typingNToLStreak;
  }
  return weight;
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

export function pickWords(
  vocab: Vocab,
  state: PracticeState,
  count: number,
  random: () => number = Math.random,
  excludeIds: ReadonlySet<string> = new Set(),
): Word[] {
  const pool = vocab.words
    .filter((w) => !excludeIds.has(w.id))
    .map((w) => ({ word: w, weight: wordWeight(masteryOf(state, w.id).progress) }));
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

  // 1. Pick the anchor word by per-word weight.
  const anchorWeights = vocab.words.map((w) => wordWeight(masteryOf(state, w.id).progress));
  const anchor = vocab.words[weightedSampleIndex(anchorWeights, random)];
  const anchorMastery = masteryOf(state, anchor.id);

  // 2. Pick the exercise type by Gaussian centered on THIS word's progress
  //    (so high-progress words pull harder exercises, including typing-n-l for graduation).
  const eligible = eligibleExercises(vocab.words.length);
  const typeWeights = eligible.map((t) => exerciseWeight(t, anchorMastery));
  const exType = eligible[weightedSampleIndex(typeWeights, random)];

  // 3. For pairs, fill the remaining 7 slots from the rest of the vocab.
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
