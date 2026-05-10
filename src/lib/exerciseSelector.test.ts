import { describe, expect, it } from 'vitest';
import {
  chooseTypeForWord,
  eligibleExercises,
  exerciseWeight,
  pickNextExercise,
  pickWords,
  wordWeight,
} from './exerciseSelector';
import {
  EXERCISE_RANK,
  EXERCISE_TYPES,
  type ExerciseType,
  applyExerciseResult,
  emptyWordMastery,
} from './mastery';
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
  it('peaks at the easy end for a fresh word', () => {
    const w = (t: ExerciseType) => exerciseWeight(t, emptyWordMastery());
    expect(w('quiz-l-n')).toBeGreaterThan(w('typing-n-l'));
  });

  it('uses normalized rank position', () => {
    const ranks = Object.values(EXERCISE_RANK);
    expect(Math.min(...ranks)).toBe(1);
    expect(Math.max(...ranks)).toBe(7);
  });

  it('applies the pairs multiplier so pairs is half its peak weight', () => {
    expect(exerciseWeight('pairs', emptyWordMastery())).toBeLessThan(
      exerciseWeight('quiz-l-n', emptyWordMastery()),
    );
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

describe('chooseTypeForWord', () => {
  const eligible = EXERCISE_TYPES;

  it('returns typing-n-l deterministically when the word is promoted', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    m = applyExerciseResult(m, 'pairs', true);
    expect(chooseTypeForWord(m, eligible, () => 0)).toBe('typing-n-l');
    expect(chooseTypeForWord(m, eligible, () => 0.5)).toBe('typing-n-l');
    expect(chooseTypeForWord(m, eligible, () => 0.999)).toBe('typing-n-l');
  });

  it('returns typing-n-l deterministically when the streak there is 1', () => {
    const m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    expect(chooseTypeForWord(m, eligible, () => 0)).toBe('typing-n-l');
  });

  it('falls back to weighted sampling for novice words', () => {
    // A fresh word should not deterministically pick typing-n-l.
    const seen = new Set<ExerciseType>();
    for (let i = 0; i < 50; i++) {
      seen.add(chooseTypeForWord(emptyWordMastery(), eligible, () => i / 50));
    }
    expect(seen.size).toBeGreaterThan(1);
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
});
