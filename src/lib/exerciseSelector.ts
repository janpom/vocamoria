import {
  EXERCISE_RANK,
  EXERCISE_TYPES,
  type ExerciseType,
  overallProgress,
} from './mastery';
import type { PracticeState } from './practice';
import type { Vocab, Word } from './types';

export const PAIRS_EXERCISE_SIZE = 8;

export function exerciseWeight(exType: ExerciseType, progress: number): number {
  const normRank = (EXERCISE_RANK[exType] - 1) / (EXERCISE_TYPES.length - 1);
  return Math.exp(-Math.pow(normRank - progress, 2) * 8) + 0.1;
}

export function eligibleExercises(vocabSize: number): ExerciseType[] {
  return EXERCISE_TYPES.filter((t) => (t === 'pairs' ? vocabSize >= 2 : vocabSize >= 1));
}

export function wordWeight(progress: number): number {
  return Math.max(0.05, 1 - progress);
}

function weightedSampleIndex(weights: number[], random: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function pickExerciseType(
  vocab: Vocab,
  state: PracticeState,
  random: () => number = Math.random,
): ExerciseType {
  const overall = overallProgress(vocab, state.words);
  const eligible = eligibleExercises(vocab.words.length);
  const weights = eligible.map((t) => exerciseWeight(t, overall));
  return eligible[weightedSampleIndex(weights, random)];
}

export function pickWords(
  vocab: Vocab,
  state: PracticeState,
  count: number,
  random: () => number = Math.random,
): Word[] {
  const pool = vocab.words.map((w) => ({
    word: w,
    weight: wordWeight(state.words[w.id]?.progress ?? 0),
  }));
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
  const exType = pickExerciseType(vocab, state, random);
  const count = exType === 'pairs' ? Math.min(PAIRS_EXERCISE_SIZE, vocab.words.length) : 1;
  const words = pickWords(vocab, state, count, random);
  return { exType, words };
}
