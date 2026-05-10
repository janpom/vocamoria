import { describe, expect, it } from 'vitest';
import {
  RECENT_WINDOW,
  USER_SKILL_DEFAULT,
  dropWordMastery,
  emptyPracticeState,
  parsePracticeState,
  pushRecentScore,
  userSkillOf,
} from './practice';

describe('parsePracticeState', () => {
  it('returns empty on null/garbage', () => {
    expect(parsePracticeState(null)).toEqual(emptyPracticeState());
    expect(parsePracticeState('not json')).toEqual(emptyPracticeState());
    expect(parsePracticeState('null')).toEqual(emptyPracticeState());
    expect(parsePracticeState('[]')).toEqual(emptyPracticeState());
    expect(parsePracticeState('{"words":42}')).toEqual(emptyPracticeState());
  });

  it('parses a stored valid state', () => {
    const stored = JSON.stringify({
      words: {
        hund: { streaks: { 'pairs': 2, 'typing-n-l': 1 }, attempts: 3, successes: 2 },
      },
      recentScores: [1, 1, 0, 1, 0.5],
    });
    const out = parsePracticeState(stored);
    expect(out.words.hund.streaks?.['pairs']).toBe(2);
    expect(out.words.hund.streaks?.['typing-n-l']).toBe(1);
    expect(out.words.hund.attempts).toBe(3);
    expect(out.recentScores).toEqual([1, 1, 0, 1, 0.5]);
  });

  it('defaults recentScores to [] when missing or invalid', () => {
    expect(parsePracticeState('{"words":{}}').recentScores).toEqual([]);
    expect(parsePracticeState('{"words":{},"recentScores":"bad"}').recentScores).toEqual([]);
  });

  it('clamps recentScores to RECENT_WINDOW and drops out-of-range entries', () => {
    const stored = JSON.stringify({ words: {}, recentScores: [0, 1, 2, 'x', 0.7, 0.4, 0.9] });
    const out = parsePracticeState(stored);
    expect(out.recentScores.length).toBeLessThanOrEqual(RECENT_WINDOW);
    expect(out.recentScores.every((n) => n >= 0 && n <= 1)).toBe(true);
  });
});

describe('pushRecentScore', () => {
  it('appends to the array', () => {
    expect(pushRecentScore([], 1)).toEqual([1]);
    expect(pushRecentScore([0.5, 1], 0)).toEqual([0.5, 1, 0]);
  });

  it('caps at RECENT_WINDOW by dropping the oldest', () => {
    const five = [1, 1, 1, 1, 1];
    const out = pushRecentScore(five, 0);
    expect(out).toHaveLength(RECENT_WINDOW);
    expect(out).toEqual([1, 1, 1, 1, 0]);
  });
});

describe('userSkillOf', () => {
  it('empty history returns the neutral default', () => {
    expect(userSkillOf([])).toBe(USER_SKILL_DEFAULT);
  });

  it('full window of successes returns 1', () => {
    expect(userSkillOf([1, 1, 1, 1, 1])).toBe(1);
  });

  it('full window of failures returns 0', () => {
    expect(userSkillOf([0, 0, 0, 0, 0])).toBe(0);
  });

  it('partial history pads missing slots with the neutral default', () => {
    // 1 success, 4 missing → (1 + 4 * 0.5) / 5 = 0.6
    expect(userSkillOf([1])).toBeCloseTo(0.6);
    // 1 fail, 4 missing → (0 + 4 * 0.5) / 5 = 0.4
    expect(userSkillOf([0])).toBeCloseTo(0.4);
  });

  it('only considers the last RECENT_WINDOW entries', () => {
    expect(userSkillOf([0, 0, 0, 1, 1, 1, 1, 1])).toBe(1);
  });
});

describe('dropWordMastery', () => {
  it('removes the named word', () => {
    const state = {
      words: {
        a: { streaks: {}, attempts: 1, successes: 1 },
        b: { streaks: {}, attempts: 0, successes: 0 },
      },
      recentScores: [],
    };
    const out = dropWordMastery(state, 'a');
    expect(out.words).not.toHaveProperty('a');
    expect(out.words).toHaveProperty('b');
  });

  it('is a no-op when the id is missing', () => {
    const state = emptyPracticeState();
    expect(dropWordMastery(state, 'nope')).toBe(state);
  });
});
