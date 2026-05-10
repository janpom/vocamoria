import { describe, expect, it } from 'vitest';
import {
  VocabValidationError,
  emptyVocab,
  importVocab,
  mergeVocab,
  parseVocab,
  validateVocab,
} from './vocab';

const minimal = {
  words: [
    { id: 'hund', term: 'der Hund', translation: 'pes' },
    { id: 'katze', term: 'die Katze', translation: 'kočka' },
  ],
};

describe('validateVocab', () => {
  it('accepts a minimal valid object and defaults settings', () => {
    const v = validateVocab(minimal);
    expect(v.settings.articlePrefixes).toEqual([]);
    expect(v.words).toHaveLength(2);
    expect(v.words[0]).toEqual({ id: 'hund', term: 'der Hund', translation: 'pes' });
  });

  it('keeps articlePrefixes when provided', () => {
    const v = validateVocab({ ...minimal, settings: { articlePrefixes: ['der', 'die', 'das'] } });
    expect(v.settings.articlePrefixes).toEqual(['der', 'die', 'das']);
  });

  it('keeps sourceLang and targetLang when provided', () => {
    const v = validateVocab({
      ...minimal,
      settings: { articlePrefixes: [], sourceLang: 'German', targetLang: 'Czech' },
    });
    expect(v.settings.sourceLang).toBe('German');
    expect(v.settings.targetLang).toBe('Czech');
  });

  it('drops sourceLang/targetLang that are not non-empty strings', () => {
    const v = validateVocab({
      ...minimal,
      settings: { articlePrefixes: [], sourceLang: '   ', targetLang: 42 },
    });
    expect(v.settings.sourceLang).toBeUndefined();
    expect(v.settings.targetLang).toBeUndefined();
  });

  it('preserves optional lesson and alternates', () => {
    const v = validateVocab({
      words: [
        { id: 'hund', term: 'der Hund', translation: 'pes', lesson: 'unit-1', alternates: ['Hund'] },
      ],
    });
    expect(v.words[0].lesson).toBe('unit-1');
    expect(v.words[0].alternates).toEqual(['Hund']);
  });

  it.each([
    [null, /object/],
    [[], /object/],
    [{}, /words/],
    [{ words: 'no' }, /words/],
    [{ words: [{ id: 'X', term: 'a', translation: 'b' }] }, /id/],
    [{ words: [{ id: 'with space', term: 'a', translation: 'b' }] }, /id/],
    [{ words: [{ id: 'ok', term: '', translation: 'b' }] }, /term/],
    [{ words: [{ id: 'ok', term: 'a', translation: '' }] }, /translation/],
    [
      {
        words: [
          { id: 'dup', term: 'a', translation: 'b' },
          { id: 'dup', term: 'c', translation: 'd' },
        ],
      },
      /Duplicate/,
    ],
  ])('rejects %j with matching error', (input, pattern) => {
    expect(() => validateVocab(input)).toThrow(VocabValidationError);
    expect(() => validateVocab(input)).toThrow(pattern as RegExp);
  });
});

describe('parseVocab', () => {
  it('returns empty on null and on invalid JSON', () => {
    expect(parseVocab(null)).toEqual(emptyVocab());
    expect(parseVocab('not json')).toEqual(emptyVocab());
    expect(parseVocab('{}')).toEqual(emptyVocab());
  });

  it('parses a stored valid blob', () => {
    const stored = JSON.stringify(minimal);
    expect(parseVocab(stored).words).toHaveLength(2);
  });
});

describe('importVocab', () => {
  it('throws VocabValidationError on bad JSON, with context', () => {
    expect(() => importVocab('{ not json')).toThrow(VocabValidationError);
    expect(() => importVocab('{ not json')).toThrow(/Not valid JSON/);
  });

  it('throws on schema violation', () => {
    expect(() => importVocab(JSON.stringify({ words: [{}] }))).toThrow(VocabValidationError);
  });

  it('returns a Vocab on success', () => {
    expect(importVocab(JSON.stringify(minimal)).words).toHaveLength(2);
  });
});

describe('mergeVocab', () => {
  it('keeps words from existing that are not in incoming', () => {
    const existing = validateVocab(minimal);
    const incoming = validateVocab({
      words: [{ id: 'haus', term: 'das Haus', translation: 'dům' }],
    });
    const merged = mergeVocab(existing, incoming);
    expect(merged.words.map((w) => w.id).sort()).toEqual(['hund', 'katze', 'haus'].sort());
  });

  it('lets incoming override term/translation for matching ids', () => {
    const existing = validateVocab(minimal);
    const incoming = validateVocab({
      words: [{ id: 'hund', term: 'der Hund (m.)', translation: 'pes (samec)' }],
    });
    const merged = mergeVocab(existing, incoming);
    const hund = merged.words.find((w) => w.id === 'hund')!;
    expect(hund.term).toBe('der Hund (m.)');
    expect(hund.translation).toBe('pes (samec)');
  });

  it('uses incoming.settings (so prefixes can be updated on re-import)', () => {
    const existing = validateVocab({ ...minimal, settings: { articlePrefixes: ['der'] } });
    const incoming = validateVocab({ ...minimal, settings: { articlePrefixes: ['der', 'die'] } });
    expect(mergeVocab(existing, incoming).settings.articlePrefixes).toEqual(['der', 'die']);
  });
});
