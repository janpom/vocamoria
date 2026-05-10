import { describe, expect, it } from 'vitest';
import { flipDirection, getDirection, setDirection } from './preferences';

const memStorage = (initial: Record<string, string> = {}) => {
  const data: Record<string, string> = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    _data: data,
  };
};

describe('getDirection', () => {
  it('returns the per-game default when nothing is stored', () => {
    const s = memStorage();
    expect(getDirection('quiz', s)).toBe('term-to-translation');
    expect(getDirection('typing', s)).toBe('translation-to-term');
    expect(getDirection('hangman', s)).toBe('translation-to-term');
  });

  it('returns the stored value when set', () => {
    const s = memStorage();
    setDirection('quiz', 'translation-to-term', s);
    setDirection('typing', 'term-to-translation', s);
    expect(getDirection('quiz', s)).toBe('translation-to-term');
    expect(getDirection('typing', s)).toBe('term-to-translation');
  });

  it('falls back to default on garbage value', () => {
    const s = memStorage({ 'quiz-direction': 'sideways' });
    expect(getDirection('quiz', s)).toBe('term-to-translation');
  });
});

describe('flipDirection', () => {
  it('swaps the two values', () => {
    expect(flipDirection('term-to-translation')).toBe('translation-to-term');
    expect(flipDirection('translation-to-term')).toBe('term-to-translation');
  });
});
