import type { Vocab } from './types';

export type WordMastery = {
  progress: number;
  typingNToLStreak: number;
  attempts: number;
  successes: number;
};

export type ExerciseType =
  | 'pairs'
  | 'quiz-l-n'
  | 'quiz-n-l'
  | 'hangman-l-n'
  | 'typing-l-n'
  | 'hangman-n-l'
  | 'typing-n-l';

export const EXERCISE_TYPES: ExerciseType[] = [
  'pairs',
  'quiz-l-n',
  'quiz-n-l',
  'hangman-l-n',
  'typing-l-n',
  'hangman-n-l',
  'typing-n-l',
];

export const EXERCISE_RANK: Record<ExerciseType, number> = {
  pairs: 1,
  'quiz-l-n': 2,
  'quiz-n-l': 3,
  'hangman-l-n': 4,
  'typing-l-n': 5,
  'hangman-n-l': 6,
  'typing-n-l': 7,
};

export const EXERCISE_DELTA: Record<ExerciseType, number> = {
  pairs: 0.05,
  'quiz-l-n': 0.08,
  'quiz-n-l': 0.10,
  'hangman-l-n': 0.13,
  'typing-l-n': 0.16,
  'hangman-n-l': 0.20,
  'typing-n-l': 0.25,
};

export const STREAK_TARGET = 2;
export const NON_STREAK_CAP = 0.99;

export type Mastery = 'Learning' | 'Practicing' | 'Mastered';

export function masteryLabel(progress: number): Mastery {
  if (progress >= 1.0) return 'Mastered';
  if (progress >= 0.6) return 'Practicing';
  return 'Learning';
}

export function emptyWordMastery(): WordMastery {
  return { progress: 0, typingNToLStreak: 0, attempts: 0, successes: 0 };
}

export function applyExerciseResult(
  m: WordMastery,
  exType: ExerciseType,
  success: boolean,
): WordMastery {
  const delta = success ? EXERCISE_DELTA[exType] : -EXERCISE_DELTA[exType];
  let progress = clamp(m.progress + delta, 0, NON_STREAK_CAP);
  let streak = m.typingNToLStreak;

  if (exType === 'typing-n-l') {
    if (success) {
      streak = Math.min(streak + 1, STREAK_TARGET);
      if (streak >= STREAK_TARGET) progress = 1.0;
    } else {
      streak = 0;
    }
  }

  return {
    progress,
    typingNToLStreak: streak,
    attempts: m.attempts + 1,
    successes: m.successes + (success ? 1 : 0),
  };
}

export function overallProgress(
  vocab: Vocab,
  words: Record<string, WordMastery>,
): number {
  if (vocab.words.length === 0) return 0;
  let total = 0;
  for (const w of vocab.words) {
    total += words[w.id]?.progress ?? 0;
  }
  return total / vocab.words.length;
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}
