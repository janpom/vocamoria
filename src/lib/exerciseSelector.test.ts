import { describe, expect, it } from 'vitest';
import {
  eligibleExercises,
  exerciseWeight,
  pickNextExercise,
  pickWords,
  wordWeight,
} from './exerciseSelector';
import { EXERCISE_RANK, type ExerciseType } from './mastery';
import { emptyPracticeState } from './practice';
import type { Vocab } from './types';

const vocab = (ids: string[]): Vocab => ({
  settings: { articlePrefixes: [] },
  words: ids.map((id) => ({ id, term: id, translation: id })),
});

describe('eligibleExercises', () => {
  it('excludes pairs when vocab is too small', () => {
    expect(eligibleExercises(1)).not.toContain('pairs');
    expect(eligibleExercises(2)).toContain('pairs');
  });

  it('returns all 7 exercises for a normal-sized vocab', () => {
    expect(eligibleExercises(50)).toHaveLength(7);
  });
});

describe('exerciseWeight', () => {
  it('peaks near the easy end at progress 0', () => {
    const w = (t: ExerciseType) => exerciseWeight(t, 0);
    expect(w('pairs')).toBeGreaterThan(w('typing-n-l'));
    expect(w('pairs')).toBeGreaterThan(w('hangman-n-l'));
  });

  it('peaks near the hard end at progress 1', () => {
    const w = (t: ExerciseType) => exerciseWeight(t, 1);
    expect(w('typing-n-l')).toBeGreaterThan(w('pairs'));
  });

  it('uses normalized rank position', () => {
    const ranks = Object.values(EXERCISE_RANK);
    expect(Math.min(...ranks)).toBe(1);
    expect(Math.max(...ranks)).toBe(7);
  });

  it('applies the pairs multiplier so pairs is half its peak weight', () => {
    // At progress=0, pairs and quiz-l-n are both near the easy end.
    // pairs is rank 1 (peak), quiz-l-n is rank 2 (slightly off-peak).
    // With the 0.5 multiplier on pairs, quiz-l-n should outweigh pairs at p=0.
    expect(exerciseWeight('pairs', 0)).toBeLessThan(exerciseWeight('quiz-l-n', 0));
  });
});

describe('wordWeight', () => {
  it('strictly higher for less-mastered words', () => {
    expect(wordWeight(0)).toBeGreaterThan(wordWeight(0.5));
    expect(wordWeight(0.5)).toBeGreaterThan(wordWeight(1));
  });

  it('keeps a floor so mastered words remain selectable', () => {
    expect(wordWeight(1)).toBeGreaterThan(0);
  });
});

describe('pickWords', () => {
  it('returns the requested number, no duplicates', () => {
    const v = vocab(['a', 'b', 'c', 'd', 'e']);
    const out = pickWords(v, emptyPracticeState(), 3, () => 0);
    expect(out).toHaveLength(3);
    expect(new Set(out.map((w) => w.id)).size).toBe(3);
  });

  it('returns fewer if vocab is smaller than count', () => {
    const v = vocab(['a', 'b']);
    expect(pickWords(v, emptyPracticeState(), 5, () => 0)).toHaveLength(2);
  });
});

describe('pickNextExercise', () => {
  it('returns a non-pairs exercise with 1 word for a 1-word vocab', () => {
    const v = vocab(['only']);
    const out = pickNextExercise(v, emptyPracticeState(), () => 0);
    expect(out.exType).not.toBe('pairs');
    expect(out.words).toHaveLength(1);
    expect(out.words[0].id).toBe('only');
  });

  it('throws on empty vocab', () => {
    expect(() => pickNextExercise(vocab([]), emptyPracticeState())).toThrow();
  });
});
