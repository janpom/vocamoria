import { describe, expect, it } from 'vitest';
import {
  USER_SKILL_DEFAULT,
  dropWordMastery,
  emptyPracticeState,
  parsePracticeState,
  updateUserSkill,
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
      userSkill: 0.8,
    });
    const out = parsePracticeState(stored);
    expect(out.words.hund.streaks?.['pairs']).toBe(2);
    expect(out.words.hund.streaks?.['typing-n-l']).toBe(1);
    expect(out.words.hund.attempts).toBe(3);
    expect(out.userSkill).toBe(0.8);
  });

  it('defaults userSkill when missing or invalid', () => {
    expect(parsePracticeState('{"words":{}}').userSkill).toBe(USER_SKILL_DEFAULT);
    expect(parsePracticeState('{"words":{},"userSkill":"bad"}').userSkill).toBe(USER_SKILL_DEFAULT);
    expect(parsePracticeState('{"words":{},"userSkill":2}').userSkill).toBe(USER_SKILL_DEFAULT);
  });
});

describe('updateUserSkill', () => {
  it('moves toward 1 on success', () => {
    const out = updateUserSkill(0.5, 1);
    expect(out).toBeGreaterThan(0.5);
    expect(out).toBeLessThan(1);
  });

  it('moves toward 0 on failure', () => {
    const out = updateUserSkill(0.5, 0);
    expect(out).toBeLessThan(0.5);
    expect(out).toBeGreaterThan(0);
  });

  it('moves proportionally on partial scores (pairs)', () => {
    expect(updateUserSkill(0.5, 0.5)).toBeCloseTo(0.5);
  });

  it('clamps to [0, 1]', () => {
    expect(updateUserSkill(0.99, 1)).toBeLessThanOrEqual(1);
    expect(updateUserSkill(0.01, 0)).toBeGreaterThanOrEqual(0);
  });

  it('converges toward 1 with repeated successes', () => {
    let s = USER_SKILL_DEFAULT;
    for (let i = 0; i < 30; i++) s = updateUserSkill(s, 1);
    expect(s).toBeGreaterThan(0.95);
  });

  it('converges toward 0 with repeated failures', () => {
    let s = USER_SKILL_DEFAULT;
    for (let i = 0; i < 30; i++) s = updateUserSkill(s, 0);
    expect(s).toBeLessThan(0.05);
  });
});

describe('dropWordMastery', () => {
  it('removes the named word', () => {
    const state = {
      words: {
        a: { streaks: {}, attempts: 1, successes: 1 },
        b: { streaks: {}, attempts: 0, successes: 0 },
      },
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
