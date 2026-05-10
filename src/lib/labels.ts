import type { Vocab } from './types';

export const IMPORT_PREFS_KEY = 'vocab-import-prefs';

export type Labels = {
  source: string;
  target: string;
};

export const FALLBACK_LABELS: Labels = { source: 'Term', target: 'Translation' };

export function readLabels(vocab: Vocab, storage: Pick<Storage, 'getItem'>): Labels {
  if (vocab.settings.sourceLang && vocab.settings.targetLang) {
    return {
      source: vocab.settings.sourceLang,
      target: vocab.settings.targetLang,
    };
  }
  try {
    const raw = storage.getItem(IMPORT_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { sourceLang?: unknown; targetLang?: unknown };
      const src = typeof parsed.sourceLang === 'string' ? parsed.sourceLang.trim() : '';
      const tgt = typeof parsed.targetLang === 'string' ? parsed.targetLang.trim() : '';
      if (src && tgt) return { source: src, target: tgt };
    }
  } catch {
    // fall through
  }
  return FALLBACK_LABELS;
}
