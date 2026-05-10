import type { Vocab, VocabSettings, Word } from './types';

export const VOCAB_KEY = 'vocab-list';

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export class VocabValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VocabValidationError';
  }
}

export function emptyVocab(): Vocab {
  return { settings: { articlePrefixes: [] }, words: [] };
}

export function validateVocab(input: unknown): Vocab {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new VocabValidationError('Top-level value must be an object.');
  }
  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.words)) {
    throw new VocabValidationError('Missing "words" array.');
  }

  const settings = parseSettings(obj.settings);
  const words: Word[] = [];
  const ids = new Set<string>();

  for (let i = 0; i < obj.words.length; i++) {
    const raw = obj.words[i];
    if (!raw || typeof raw !== 'object') {
      throw new VocabValidationError(`words[${i}] must be an object.`);
    }
    const w = raw as Record<string, unknown>;
    if (typeof w.id !== 'string' || !ID_RE.test(w.id)) {
      throw new VocabValidationError(
        `words[${i}].id must be lowercase ASCII letters/digits/hyphens (got ${JSON.stringify(w.id)}).`,
      );
    }
    if (ids.has(w.id)) {
      throw new VocabValidationError(`Duplicate id "${w.id}" at words[${i}].`);
    }
    if (typeof w.term !== 'string' || !w.term.trim()) {
      throw new VocabValidationError(`words[${i}].term must be a non-empty string.`);
    }
    if (typeof w.translation !== 'string' || !w.translation.trim()) {
      throw new VocabValidationError(`words[${i}].translation must be a non-empty string.`);
    }
    ids.add(w.id);

    const word: Word = {
      id: w.id,
      term: w.term.trim(),
      translation: w.translation.trim(),
    };
    if (typeof w.lesson === 'string' && w.lesson.trim()) {
      word.lesson = w.lesson.trim();
    }
    if (Array.isArray(w.alternates)) {
      const alts = w.alternates.filter((a): a is string => typeof a === 'string' && a.trim() !== '');
      if (alts.length) word.alternates = alts;
    }
    words.push(word);
  }

  return { settings, words };
}

function parseSettings(raw: unknown): VocabSettings {
  const settings: VocabSettings = { articlePrefixes: [] };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const s = raw as Record<string, unknown>;
    if (Array.isArray(s.articlePrefixes)) {
      settings.articlePrefixes = s.articlePrefixes
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.trim())
        .filter(Boolean);
    }
    if (typeof s.sourceLang === 'string' && s.sourceLang.trim()) {
      settings.sourceLang = s.sourceLang.trim();
    }
    if (typeof s.targetLang === 'string' && s.targetLang.trim()) {
      settings.targetLang = s.targetLang.trim();
    }
  }
  return settings;
}

export function parseVocab(raw: string | null): Vocab {
  if (!raw) return emptyVocab();
  try {
    return validateVocab(JSON.parse(raw));
  } catch {
    return emptyVocab();
  }
}

export function importVocab(raw: string): Vocab {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new VocabValidationError(`Not valid JSON: ${(e as Error).message}`);
  }
  return validateVocab(parsed);
}

export function mergeVocab(existing: Vocab, incoming: Vocab): Vocab {
  const map = new Map<string, Word>();
  for (const w of existing.words) map.set(w.id, w);
  for (const w of incoming.words) map.set(w.id, w);
  return { settings: incoming.settings, words: Array.from(map.values()) };
}

export function loadVocab(storage: Pick<Storage, 'getItem'>): Vocab {
  return parseVocab(storage.getItem(VOCAB_KEY));
}

export function saveVocab(storage: Pick<Storage, 'setItem'>, vocab: Vocab): void {
  storage.setItem(VOCAB_KEY, JSON.stringify(vocab));
}
