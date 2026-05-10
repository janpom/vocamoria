import { describe, expect, it } from 'vitest';
import {
  STREAK_TARGET,
  applyExerciseResult,
  emptyWordMastery,
  isMastered,
  isPromoted,
  masteryLabel,
  overallProgress,
  progressOf,
  streakOf,
} from './mastery';
import type { Vocab } from './types';

const vocab = (ids: string[]): Vocab => ({
  settings: { articlePrefixes: [] },
  words: ids.map((id) => ({ id, term: id, translation: id })),
});

describe('emptyWordMastery / streakOf', () => {
  it('starts with all streaks zero', () => {
    const m = emptyWordMastery();
    expect(streakOf(m, 'pairs')).toBe(0);
    expect(streakOf(m, 'typing-n-l')).toBe(0);
    expect(m.attempts).toBe(0);
    expect(m.successes).toBe(0);
  });

  it('survives undefined streaks (back-compat)', () => {
    const m = { attempts: 0, successes: 0 } as never;
    expect(streakOf(m, 'pairs')).toBe(0);
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
  it('successful pairs bumps that type streak', () => {
    const m = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    expect(streakOf(m, 'pairs')).toBe(1);
    expect(m.attempts).toBe(1);
    expect(m.successes).toBe(1);
  });

  it('streak caps at STREAK_TARGET', () => {
    let m = emptyWordMastery();
    for (let i = 0; i < 10; i++) m = applyExerciseResult(m, 'pairs', true);
    expect(streakOf(m, 'pairs')).toBe(STREAK_TARGET);
  });

  it('two streaks on a non-typing-n-l type promote the word', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'quiz-l-n', true);
    m = applyExerciseResult(m, 'quiz-l-n', true);
    expect(isPromoted(m)).toBe(true);
    expect(isMastered(m)).toBe(false);
  });

  it('two streaks on typing-n-l master the word', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    m = applyExerciseResult(m, 'typing-n-l', true);
    expect(isMastered(m)).toBe(true);
    expect(progressOf(m)).toBe(1.0);
  });

  it('failure on a type only resets that type', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    m = applyExerciseResult(m, 'quiz-l-n', true);
    m = applyExerciseResult(m, 'pairs', false);
    expect(streakOf(m, 'pairs')).toBe(0);
    expect(streakOf(m, 'quiz-l-n')).toBe(1);
  });

  it('failure on typing-n-l demotes by knocking every other streak down by 1', () => {
    let m = emptyWordMastery();
    m = applyExerciseResult(m, 'pairs', true);
    m = applyExerciseResult(m, 'pairs', true);
    m = applyExerciseResult(m, 'quiz-n-l', true);
    expect(streakOf(m, 'pairs')).toBe(2);
    expect(streakOf(m, 'quiz-n-l')).toBe(1);

    m = applyExerciseResult(m, 'typing-n-l', false);
    expect(streakOf(m, 'typing-n-l')).toBe(0);
    expect(streakOf(m, 'pairs')).toBe(1);
    expect(streakOf(m, 'quiz-n-l')).toBe(0);
  });

  it('typing-n-l failure after mastery drops back to non-mastered', () => {
    let m = emptyWordMastery();
    m = applyExerciseResult(m, 'typing-n-l', true);
    m = applyExerciseResult(m, 'typing-n-l', true);
    expect(isMastered(m)).toBe(true);
    m = applyExerciseResult(m, 'typing-n-l', false);
    expect(isMastered(m)).toBe(false);
    expect(progressOf(m)).toBeLessThan(1);
  });
});

describe('progressOf', () => {
  it('mastered → 1.0', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    m = applyExerciseResult(m, 'typing-n-l', true);
    expect(progressOf(m)).toBe(1.0);
  });

  it('typing-n-l streak of 1 → 0.85 (close to mastery)', () => {
    const m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    expect(progressOf(m)).toBe(0.85);
  });

  it('promoted (any non-typing-n-l streak >= 2) → 0.6', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    m = applyExerciseResult(m, 'pairs', true);
    expect(progressOf(m)).toBe(0.6);
  });

  it('novice partial credit scales with sum of streaks', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    expect(progressOf(m)).toBeCloseTo(0.08);
    m = applyExerciseResult(m, 'quiz-l-n', true);
    expect(progressOf(m)).toBeCloseTo(0.16);
  });
});

describe('overallProgress', () => {
  it('returns 0 for empty vocab', () => {
    expect(overallProgress(vocab([]), {})).toBe(0);
  });

  it('averages per-word progress (with one mastered word)', () => {
    const v = vocab(['a', 'b', 'c', 'd']);
    let mA = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    mA = applyExerciseResult(mA, 'typing-n-l', true);
    expect(overallProgress(v, { a: mA })).toBeCloseTo(0.25);
  });
});
