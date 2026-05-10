import type { WordMastery } from './mastery';

export const PRACTICE_KEY = 'vocab-practice';

export type PracticeState = {
  words: Record<string, WordMastery>;
};

export function emptyPracticeState(): PracticeState {
  return { words: {} };
}

export function parsePracticeState(raw: string | null): PracticeState {
  if (!raw) return emptyPracticeState();
  try {
    const parsed = JSON.parse(raw) as Partial<PracticeState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.words || typeof parsed.words !== 'object') {
      return emptyPracticeState();
    }
    return { words: parsed.words as Record<string, WordMastery> };
  } catch {
    return emptyPracticeState();
  }
}

export function loadPracticeState(storage: Pick<Storage, 'getItem'>): PracticeState {
  return parsePracticeState(storage.getItem(PRACTICE_KEY));
}

export function savePracticeState(
  storage: Pick<Storage, 'setItem'>,
  state: PracticeState,
): void {
  storage.setItem(PRACTICE_KEY, JSON.stringify(state));
}
