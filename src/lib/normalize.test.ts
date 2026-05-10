import { describe, expect, it } from 'vitest';
import { checkAnswer, levenshtein, normalize } from './normalize';

describe('normalize', () => {
  it('lowercases and trims', () => {
    expect(normalize('  Hund  ')).toBe('hund');
  });

  it('strips trailing punctuation', () => {
    expect(normalize('Hund!')).toBe('hund');
    expect(normalize('Hund...')).toBe('hund');
    expect(normalize('Hund?')).toBe('hund');
  });

  it('strips a configured article prefix when present', () => {
    expect(normalize('der Hund', { articlePrefixes: ['der', 'die', 'das'] })).toBe('hund');
    expect(normalize('die Katze', { articlePrefixes: ['der', 'die', 'das'] })).toBe('katze');
  });

  it('does nothing when no prefix list given', () => {
    expect(normalize('der Hund')).toBe('der hund');
  });

  it('does not strip a prefix mid-word', () => {
    expect(normalize('derby', { articlePrefixes: ['der'] })).toBe('derby');
  });

  it('only strips one prefix', () => {
    expect(normalize('der die hund', { articlePrefixes: ['der', 'die'] })).toBe('die hund');
  });
});

describe('levenshtein', () => {
  it('zero for identical strings', () => {
    expect(levenshtein('hund', 'hund')).toBe(0);
  });

  it('one for single substitution', () => {
    expect(levenshtein('hund', 'hand')).toBe(1);
  });

  it('one for single insertion', () => {
    expect(levenshtein('hund', 'hunde')).toBe(1);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('checkAnswer', () => {
  const opts = { articlePrefixes: ['der', 'die', 'das'] };

  it('accepts an exact match', () => {
    expect(checkAnswer('der Hund', 'der Hund', [], opts)).toEqual({ correct: true, close: false });
  });

  it('accepts the term without its article', () => {
    expect(checkAnswer('Hund', 'der Hund', [], opts)).toEqual({ correct: true, close: false });
  });

  it('accepts an explicit alternate', () => {
    expect(checkAnswer('puppy', 'der Hund', ['puppy'], opts)).toEqual({
      correct: true,
      close: false,
    });
  });

  it('marks a one-letter typo as close (only for length > 4)', () => {
    expect(checkAnswer('Hunde', 'Hunden', [], opts)).toEqual({ correct: true, close: true });
  });

  it('rejects a one-letter typo on short words (length <= 4)', () => {
    expect(checkAnswer('cab', 'cat', [], opts)).toEqual({ correct: false, close: false });
    expect(checkAnswer('hous', 'haus', [], opts)).toEqual({ correct: false, close: false });
  });

  it('rejects empty input', () => {
    expect(checkAnswer('   ', 'der Hund', [], opts)).toEqual({ correct: false, close: false });
  });

  it('rejects unrelated answer', () => {
    expect(checkAnswer('cat', 'der Hund', [], opts)).toEqual({ correct: false, close: false });
  });
});
