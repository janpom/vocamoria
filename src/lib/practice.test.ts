import { describe, expect, it } from 'vitest';
import { dropWordMastery, emptyPracticeState, parsePracticeState } from './practice';

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
    });
    const out = parsePracticeState(stored);
    expect(out.words.hund.streaks?.['pairs']).toBe(2);
    expect(out.words.hund.streaks?.['typing-n-l']).toBe(1);
    expect(out.words.hund.attempts).toBe(3);
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
