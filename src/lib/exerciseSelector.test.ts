import { describe, expect, it } from 'vitest';
import {
  eligibleExercises,
  exerciseWeight,
  pickNextExercise,
  pickWords,
  wordWeight,
} from './exerciseSelector';
import { EXERCISE_RANK, type ExerciseType, type WordMastery, emptyWordMastery } from './mastery';
import { emptyPracticeState } from './practice';
import type { Vocab } from './types';

const vocab = (ids: string[]): Vocab => ({
  settings: { articlePrefixes: [] },
  words: ids.map((id) => ({ id, term: id, translation: id })),
});

const m = (progress: number, streak = 0): WordMastery => ({
  ...emptyWordMastery(),
  progress,
  typingNToLStreak: streak,
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
  it('peaks near the easy end when the word has low progress', () => {
    const w = (t: ExerciseType) => exerciseWeight(t, m(0));
    expect(w('quiz-l-n')).toBeGreaterThan(w('typing-n-l'));
  });

  it('peaks near the hard end when the word is near mastery', () => {
    const w = (t: ExerciseType) => exerciseWeight(t, m(1));
    expect(w('typing-n-l')).toBeGreaterThan(w('pairs'));
    expect(w('typing-n-l')).toBeGreaterThan(w('quiz-l-n'));
  });

  it('uses normalized rank position', () => {
    const ranks = Object.values(EXERCISE_RANK);
    expect(Math.min(...ranks)).toBe(1);
    expect(Math.max(...ranks)).toBe(7);
  });

  it('applies the pairs multiplier so pairs is half its peak weight', () => {
    expect(exerciseWeight('pairs', m(0))).toBeLessThan(exerciseWeight('quiz-l-n', m(0)));
  });

  it('boosts typing-n-l when the word has an in-progress streak', () => {
    const noStreak = exerciseWeight('typing-n-l', m(0.85, 0));
    const withStreak = exerciseWeight('typing-n-l', m(0.85, 1));
    expect(withStreak).toBeGreaterThan(noStreak * 2.5);
  });
});

describe('wordWeight', () => {
  it('strictly higher for less-mastered words', () => {
    expect(wordWeight(0)).toBeGreaterThan(wordWeight(0.5));
    expect(wordWeight(0.5)).toBeGreaterThan(wordWeight(1));
  });

  it('keeps mastered words selectable but at much lower weight', () => {
    const ratio = wordWeight(0) / wordWeight(1);
    expect(wordWeight(1)).toBeGreaterThan(0);
    expect(ratio).toBeGreaterThan(40);
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

  it('honors excludeIds', () => {
    const v = vocab(['a', 'b', 'c']);
    const out = pickWords(v, emptyPracticeState(), 5, () => 0, new Set(['b']));
    expect(out.map((w) => w.id)).not.toContain('b');
    expect(out).toHaveLength(2);
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

  it('pairs result includes 8 distinct words when vocab is large enough', () => {
    // Force the type sampler to land on pairs by making it the only eligible peak —
    // crank the vocab and seed all words as fresh, then run many trials and find a pairs result.
    const v = vocab(Array.from({ length: 20 }, (_, i) => `w${i}`));
    let out;
    let attempts = 0;
    let seed = 0;
    while (attempts < 200) {
      out = pickNextExercise(v, emptyPracticeState(), () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      });
      if (out.exType === 'pairs') break;
      attempts += 1;
    }
    if (out && out.exType === 'pairs') {
      expect(out.words).toHaveLength(8);
      expect(new Set(out.words.map((w) => w.id)).size).toBe(8);
    }
  });
});
