import { describe, expect, it } from 'vitest';
import { acceptableAnswers, distractorPool, isValidPair } from './answers';
import type { Vocab } from './types';

const vocab: Vocab = {
  settings: { articlePrefixes: ['der', 'die', 'das'] },
  words: [
    { id: 'heidelbeere', term: 'die Heidelbeere', translation: 'borůvka' },
    { id: 'blaubeere', term: 'die Blaubeere', translation: 'borůvka' },
    { id: 'apfel', term: 'der Apfel', translation: 'jablko' },
    { id: 'see-lake', term: 'der See', translation: 'jezero' },
    { id: 'see-sea', term: 'der See', translation: 'moře' },
    { id: 'pes', term: 'der Hund', translation: 'pes', alternates: ['Hund'] },
  ],
};

describe('acceptableAnswers', () => {
  it('n-l: returns the term for a unique-translation word', () => {
    const out = acceptableAnswers(vocab.words[2], vocab, 'n-l'); // apfel
    expect(out.primary).toBe('der Apfel');
    expect(out.alternates).toEqual([]);
  });

  it('n-l: returns the OTHER term as an alternate when two words share the translation', () => {
    const out = acceptableAnswers(vocab.words[0], vocab, 'n-l'); // heidelbeere prompt = "borůvka"
    expect(out.primary).toBe('die Heidelbeere');
    expect(out.alternates).toContain('die Blaubeere');
  });

  it('n-l: keeps per-word alternates from the original word', () => {
    const out = acceptableAnswers(vocab.words[5], vocab, 'n-l'); // pes -> der Hund (+ "Hund")
    expect(out.primary).toBe('der Hund');
    expect(out.alternates).toContain('Hund');
  });

  it('l-n: returns the OTHER translation as an alternate when two words share the term', () => {
    const out = acceptableAnswers(vocab.words[3], vocab, 'l-n'); // see-lake, term "der See"
    expect(out.primary).toBe('jezero');
    expect(out.alternates).toContain('moře');
  });

  it('l-n: ignores per-word alternates (they are source-language only)', () => {
    const out = acceptableAnswers(vocab.words[5], vocab, 'l-n'); // pes
    expect(out.alternates).not.toContain('Hund');
  });
});

describe('distractorPool', () => {
  it('n-l: excludes other words with the same term', () => {
    const pool = distractorPool(vocab.words[3], vocab, 'n-l'); // see-lake, answer "der See"
    expect(pool.find((w) => w.id === 'see-sea')).toBeUndefined();
    expect(pool.find((w) => w.id === 'apfel')).toBeDefined();
  });

  it('l-n: excludes other words with the same translation', () => {
    const pool = distractorPool(vocab.words[0], vocab, 'l-n'); // heidelbeere, answer "borůvka"
    expect(pool.find((w) => w.id === 'blaubeere')).toBeUndefined();
    expect(pool.find((w) => w.id === 'apfel')).toBeDefined();
  });

  it('always excludes the correct word itself', () => {
    const pool = distractorPool(vocab.words[2], vocab, 'l-n');
    expect(pool.find((w) => w.id === 'apfel')).toBeUndefined();
  });
});

describe('isValidPair', () => {
  it('true for a real (term, translation) pair', () => {
    expect(isValidPair('die Heidelbeere', 'borůvka', vocab)).toBe(true);
  });

  it('true for the cross pair when translation is shared', () => {
    expect(isValidPair('die Blaubeere', 'borůvka', vocab)).toBe(true);
  });

  it('true for either translation of a shared term', () => {
    expect(isValidPair('der See', 'jezero', vocab)).toBe(true);
    expect(isValidPair('der See', 'moře', vocab)).toBe(true);
  });

  it('false for a (term, translation) combo that does not exist', () => {
    expect(isValidPair('die Heidelbeere', 'jablko', vocab)).toBe(false);
    expect(isValidPair('der Apfel', 'borůvka', vocab)).toBe(false);
  });
});
