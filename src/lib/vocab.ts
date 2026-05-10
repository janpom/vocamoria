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

function slugifyId(s: string): string {
  const cleaned = s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'word';
}

export function generateWordId(term: string, existingIds: ReadonlySet<string>): string {
  const base = slugifyId(term);
  if (!existingIds.has(base)) return base;
  let i = 2;
  while (existingIds.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export type WordInput = {
  term: string;
  translation: string;
  lesson?: string;
  alternates?: string[];
};

function buildWord(id: string, input: WordInput): Word {
  const term = input.term.trim();
  const translation = input.translation.trim();
  if (!term) throw new VocabValidationError('Term is required.');
  if (!translation) throw new VocabValidationError('Translation is required.');
  const word: Word = { id, term, translation };
  const lesson = input.lesson?.trim();
  if (lesson) word.lesson = lesson;
  const alternates = (input.alternates ?? [])
    .map((a) => a.trim())
    .filter(Boolean);
  if (alternates.length) word.alternates = alternates;
  return word;
}

export function addWord(vocab: Vocab, input: WordInput): Vocab {
  const ids = new Set(vocab.words.map((w) => w.id));
  const id = generateWordId(input.term, ids);
  const word = buildWord(id, input);
  return { ...vocab, words: [...vocab.words, word] };
}

export function updateWord(
  vocab: Vocab,
  id: string,
  updates: Partial<Omit<WordInput, never>>,
): Vocab {
  const idx = vocab.words.findIndex((w) => w.id === id);
  if (idx < 0) return vocab;
  const current = vocab.words[idx];
  const merged: WordInput = {
    term: updates.term ?? current.term,
    translation: updates.translation ?? current.translation,
    lesson: updates.lesson ?? current.lesson,
    alternates: updates.alternates ?? current.alternates,
  };
  const next = buildWord(current.id, merged);
  const words = [...vocab.words];
  words[idx] = next;
  return { ...vocab, words };
}

export function removeWord(vocab: Vocab, id: string): Vocab {
  return { ...vocab, words: vocab.words.filter((w) => w.id !== id) };
}
