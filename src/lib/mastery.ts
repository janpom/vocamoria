import type { Vocab } from './types';

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

export const STREAK_TARGET = 2;

export type WordMastery = {
  streaks: Partial<Record<ExerciseType, number>>;
  attempts: number;
  successes: number;
};

export type Mastery = 'Learning' | 'Practicing' | 'Mastered';

export function emptyWordMastery(): WordMastery {
  return { streaks: {}, attempts: 0, successes: 0 };
}

export function streakOf(m: WordMastery, t: ExerciseType): number {
  return m.streaks?.[t] ?? 0;
}

export function isMastered(m: WordMastery): boolean {
  return streakOf(m, 'typing-n-l') >= STREAK_TARGET;
}

export function isPromoted(m: WordMastery): boolean {
  return EXERCISE_TYPES.some(
    (t) => t !== 'typing-n-l' && streakOf(m, t) >= STREAK_TARGET,
  );
}

export function progressOf(m: WordMastery): number {
  if (isMastered(m)) return 1.0;
  if (streakOf(m, 'typing-n-l') >= 1) return 0.85;
  if (isPromoted(m)) return 0.6;
  const total = EXERCISE_TYPES.reduce((acc, t) => acc + streakOf(m, t), 0);
  return Math.min(0.55, total * 0.08);
}

export function masteryLabel(progress: number): Mastery {
  if (progress >= 1.0) return 'Mastered';
  if (progress >= 0.6) return 'Practicing';
  return 'Learning';
}

export function applyExerciseResult(
  m: WordMastery,
  exType: ExerciseType,
  success: boolean,
): WordMastery {
  const streaks: Partial<Record<ExerciseType, number>> = { ...(m.streaks ?? {}) };

  if (success) {
    streaks[exType] = Math.min(STREAK_TARGET, streakOf(m, exType) + 1);
  } else {
    streaks[exType] = 0;
    if (exType === 'typing-n-l') {
      // Failure on the hardest exercise demotes: knock every other streak down by 1.
      for (const t of EXERCISE_TYPES) {
        if (t === 'typing-n-l') continue;
        const cur = streaks[t] ?? 0;
        if (cur > 0) streaks[t] = cur - 1;
      }
    }
  }

  return {
    streaks,
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
    const m = words[w.id];
    total += m ? progressOf(m) : 0;
  }
  return total / vocab.words.length;
}
