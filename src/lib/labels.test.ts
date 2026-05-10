import { describe, expect, it } from 'vitest';
import { FALLBACK_LABELS, IMPORT_PREFS_KEY, readLabels } from './labels';
import type { Vocab } from './types';

const baseVocab: Vocab = {
  settings: { articlePrefixes: [] },
  words: [{ id: 'a', term: 'A', translation: 'a' }],
};

const memStorage = (initial: Record<string, string> = {}) => {
  const data: Record<string, string> = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

describe('readLabels', () => {
  it('prefers vocab.settings labels when present', () => {
    const v: Vocab = {
      ...baseVocab,
      settings: { articlePrefixes: [], sourceLang: 'German', targetLang: 'Czech' },
    };
    expect(readLabels(v, memStorage())).toEqual({ source: 'German', target: 'Czech' });
  });

  it('falls back to import prefs when vocab settings are missing', () => {
    const s = memStorage({
      [IMPORT_PREFS_KEY]: JSON.stringify({ sourceLang: 'Spanish', targetLang: 'English' }),
    });
    expect(readLabels(baseVocab, s)).toEqual({ source: 'Spanish', target: 'English' });
  });

  it('vocab settings win even when prefs are also set', () => {
    const v: Vocab = {
      ...baseVocab,
      settings: { articlePrefixes: [], sourceLang: 'French', targetLang: 'English' },
    };
    const s = memStorage({
      [IMPORT_PREFS_KEY]: JSON.stringify({ sourceLang: 'X', targetLang: 'Y' }),
    });
    expect(readLabels(v, s)).toEqual({ source: 'French', target: 'English' });
  });

  it('returns fallback when neither source is available', () => {
    expect(readLabels(baseVocab, memStorage())).toEqual(FALLBACK_LABELS);
  });

  it('ignores partially-filled prefs', () => {
    const s = memStorage({
      [IMPORT_PREFS_KEY]: JSON.stringify({ sourceLang: 'German', targetLang: '' }),
    });
    expect(readLabels(baseVocab, s)).toEqual(FALLBACK_LABELS);
  });

  it('survives malformed prefs JSON', () => {
    const s = memStorage({ [IMPORT_PREFS_KEY]: 'not json' });
    expect(readLabels(baseVocab, s)).toEqual(FALLBACK_LABELS);
  });
});
