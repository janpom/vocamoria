import { describe, expect, it } from 'vitest';
import {
  EXERCISE_DELTA,
  NON_STREAK_CAP,
  STREAK_TARGET,
  applyExerciseResult,
  emptyWordMastery,
  masteryLabel,
  overallProgress,
} from './mastery';
import type { Vocab } from './types';

const vocab = (ids: string[]): Vocab => ({
  settings: { articlePrefixes: [] },
  words: ids.map((id) => ({ id, term: id, translation: id })),
});

describe('emptyWordMastery', () => {
  it('returns zeroed state', () => {
    expect(emptyWordMastery()).toEqual({
      progress: 0,
      typingNToLStreak: 0,
      attempts: 0,
      successes: 0,
    });
  });
});

describe('masteryLabel', () => {
  it.each([
    [0, 'Learning'],
    [0.59, 'Learning'],
    [0.6, 'Practicing'],
    [0.99, 'Practicing'],
    [1.0, 'Mastered'],
  ])('progress %f → %s', (p, label) => {
    expect(masteryLabel(p)).toBe(label);
  });
});

describe('applyExerciseResult', () => {
  it('increases progress by EXERCISE_DELTA on success', () => {
    const out = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    expect(out.progress).toBeCloseTo(EXERCISE_DELTA.pairs);
    expect(out.attempts).toBe(1);
    expect(out.successes).toBe(1);
  });

  it('decreases progress by EXERCISE_DELTA on failure', () => {
    const start = { ...emptyWordMastery(), progress: 0.5 };
    const out = applyExerciseResult(start, 'quiz-n-l', false);
    expect(out.progress).toBeCloseTo(0.5 - EXERCISE_DELTA['quiz-n-l']);
    expect(out.attempts).toBe(1);
    expect(out.successes).toBe(0);
  });

  it('floors progress at 0', () => {
    const start = { ...emptyWordMastery(), progress: 0.05 };
    const out = applyExerciseResult(start, 'typing-l-n', false);
    expect(out.progress).toBe(0);
  });

  it('caps non-typing-n-l progress at NON_STREAK_CAP', () => {
    let m = { ...emptyWordMastery(), progress: 0.95 };
    m = applyExerciseResult(m, 'hangman-n-l', true);
    m = applyExerciseResult(m, 'hangman-n-l', true);
    expect(m.progress).toBe(NON_STREAK_CAP);
    expect(m.typingNToLStreak).toBe(0);
  });

  it('typing-n-l first success bumps streak but not to mastery', () => {
    const out = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    expect(out.typingNToLStreak).toBe(1);
    expect(out.progress).toBeLessThan(1);
  });

  it('typing-n-l second consecutive success snaps progress to 1.0', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    m = applyExerciseResult(m, 'typing-n-l', true);
    expect(m.typingNToLStreak).toBe(STREAK_TARGET);
    expect(m.progress).toBe(1.0);
  });

  it('typing-n-l failure resets streak but other failures do not', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    expect(m.typingNToLStreak).toBe(1);

    m = applyExerciseResult(m, 'quiz-n-l', false);
    expect(m.typingNToLStreak).toBe(1);

    m = applyExerciseResult(m, 'typing-n-l', false);
    expect(m.typingNToLStreak).toBe(0);
  });

  it('failure on typing-n-l after mastery drops progress and resets streak', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    m = applyExerciseResult(m, 'typing-n-l', true);
    expect(m.progress).toBe(1.0);

    m = applyExerciseResult(m, 'typing-n-l', false);
    expect(m.typingNToLStreak).toBe(0);
    expect(m.progress).toBeCloseTo(1.0 - EXERCISE_DELTA['typing-n-l']);
  });
});

describe('overallProgress', () => {
  it('returns 0 for empty vocab', () => {
    expect(overallProgress(vocab([]), {})).toBe(0);
  });

  it('averages per-word progress', () => {
    const v = vocab(['a', 'b', 'c', 'd']);
    const out = overallProgress(v, {
      a: { ...emptyWordMastery(), progress: 1.0 },
      b: { ...emptyWordMastery(), progress: 0.5 },
    });
    expect(out).toBeCloseTo((1.0 + 0.5 + 0 + 0) / 4);
  });
});
