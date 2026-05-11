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
  it('uses normalized rank position', () => {
    const ranks = Object.values(EXERCISE_RANK);
    expect(Math.min(...ranks)).toBe(1);
    expect(Math.max(...ranks)).toBe(7);
  });

  it('peaks at typing-n-l when userSkill is 1', () => {
    const total = EXERCISE_TYPES.reduce((acc, t) => acc + exerciseWeight(t, 1), 0);
    const tnlShare = exerciseWeight('typing-n-l', 1) / total;
    expect(tnlShare).toBeGreaterThan(0.85);
  });

  it('peaks at pairs when userSkill is 0', () => {
    const total = EXERCISE_TYPES.reduce((acc, t) => acc + exerciseWeight(t, 0), 0);
    const pairsShare = exerciseWeight('pairs', 0) / total;
    expect(pairsShare).toBeGreaterThan(0.7);
  });

  it('applies the pairs multiplier (peak halved)', () => {
    // At a userSkill matching pairs (0), pairs peak is halved by the multiplier.
    // Compare pairs at its peak vs quiz-l-n at its own peak (skill matching its rank).
    expect(exerciseWeight('pairs', 0)).toBeLessThan(exerciseWeight('quiz-l-n', 0.167));
  });
});

describe('wordWeight', () => {
  it('strictly higher for less-mastered words', () => {
    expect(wordWeight(0)).toBeGreaterThan(wordWeight(0.5));
    expect(wordWeight(0.5)).toBeGreaterThan(wordWeight(1));
  });

  it('keeps mastered words selectable but at very low weight', () => {
    expect(wordWeight(1)).toBeGreaterThan(0);
    const ratio = wordWeight(0) / wordWeight(1);
    expect(ratio).toBeGreaterThan(100);
  });

  it('near-mastered (in-streak) words stay well above the mastered floor', () => {
    // A word at progress 0.85 (typing-n-l streak == 1) needs to be
    // pickable so the user can close out the streak.
    expect(wordWeight(0.85)).toBeGreaterThan(wordWeight(1) * 5);
  });

  it('drops sharply at the mastered cliff', () => {
    // Just before mastery vs at mastery: big gap.
    expect(wordWeight(0.99)).toBeGreaterThan(wordWeight(1) * 5);
  });
});

describe('chooseTypeForWord', () => {
  const eligible = EXERCISE_TYPES;

  it('promoted + warm user → deterministic typing-n-l', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    m = applyExerciseResult(m, 'pairs', true);
    expect(chooseTypeForWord(m, eligible, 0.9, () => 0)).toBe('typing-n-l');
    expect(chooseTypeForWord(m, eligible, 0.9, () => 0.5)).toBe('typing-n-l');
  });

  it('promoted + cold user → falls back to Gaussian (not always typing-n-l)', () => {
    let m = applyExerciseResult(emptyWordMastery(), 'pairs', true);
    m = applyExerciseResult(m, 'pairs', true);
    const seen = new Set<ExerciseType>();
    for (let i = 0; i < 50; i++) {
      seen.add(chooseTypeForWord(m, eligible, 0.2, () => i / 50));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('always closes typing-n-l streak when streak there is 1', () => {
    const m = applyExerciseResult(emptyWordMastery(), 'typing-n-l', true);
    // Even with a very cold user, the close-the-streak rule wins.
    expect(chooseTypeForWord(m, eligible, 0.05, () => 0)).toBe('typing-n-l');
  });

  it('falls back to weighted sampling for novice words', () => {
    const seen = new Set<ExerciseType>();
    for (let i = 0; i < 50; i++) {
      seen.add(chooseTypeForWord(emptyWordMastery(), eligible, 0.5, () => i / 50));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('hot user picks typing-n-l almost always for a fresh word', () => {
    let typingNLPicks = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const r = () => i / trials;
      if (chooseTypeForWord(emptyWordMastery(), eligible, 1.0, r) === 'typing-n-l') typingNLPicks++;
    }
    expect(typingNLPicks / trials).toBeGreaterThan(0.85);
  });

  it('cold user picks pairs almost always for a fresh word', () => {
    let pairsPicks = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const r = () => i / trials;
      if (chooseTypeForWord(emptyWordMastery(), eligible, 0.0, r) === 'pairs') pairsPicks++;
    }
    expect(pairsPicks / trials).toBeGreaterThan(0.7);
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
