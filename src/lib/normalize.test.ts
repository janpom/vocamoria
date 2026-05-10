import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  isGuessableLetter,
  lettersEqual,
  levenshtein,
  normalize,
  normalizeLetter,
  stripAccents,
} from './normalize';

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

describe('stripAccents', () => {
  it.each([
    ['café', 'cafe'],
    ['Über', 'Uber'],
    ['naïve', 'naive'],
    ['čeština', 'cestina'],
    ['São Paulo', 'Sao Paulo'],
    ['hund', 'hund'],
  ])('strips accents from %s -> %s', (input, expected) => {
    expect(stripAccents(input)).toBe(expected);
  });
});

describe('normalizeLetter / lettersEqual', () => {
  it('matches case-insensitively', () => {
    expect(lettersEqual('o', 'O')).toBe(true);
    expect(lettersEqual('A', 'a')).toBe(true);
  });

  it('matches across accents in either direction', () => {
    expect(lettersEqual('o', 'Ö')).toBe(true);
    expect(lettersEqual('Ö', 'o')).toBe(true);
    expect(lettersEqual('c', 'č')).toBe(true);
    expect(lettersEqual('Č', 'c')).toBe(true);
  });

  it('does not match unrelated letters', () => {
    expect(lettersEqual('o', 'a')).toBe(false);
    expect(lettersEqual('ö', 'a')).toBe(false);
  });

  it('normalizeLetter is the canonical form', () => {
    expect(normalizeLetter('Ö')).toBe('o');
    expect(normalizeLetter('Č')).toBe('c');
  });
});

describe('isGuessableLetter', () => {
  it('returns true for any Unicode letter', () => {
    expect(isGuessableLetter('a')).toBe(true);
    expect(isGuessableLetter('Z')).toBe(true);
    expect(isGuessableLetter('ö')).toBe(true);
    expect(isGuessableLetter('č')).toBe(true);
  });

  it('returns false for spaces, punctuation, digits', () => {
    expect(isGuessableLetter(' ')).toBe(false);
    expect(isGuessableLetter('-')).toBe(false);
    expect(isGuessableLetter("'")).toBe(false);
    expect(isGuessableLetter('.')).toBe(false);
    expect(isGuessableLetter('1')).toBe(false);
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
