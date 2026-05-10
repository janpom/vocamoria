import type { WordMastery } from './mastery';

export const PRACTICE_KEY = 'vocab-practice';

export const USER_SKILL_DEFAULT = 0.5;
export const RECENT_WINDOW = 5;

export type PracticeState = {
  words: Record<string, WordMastery>;
  recentScores: number[];
};

export function emptyPracticeState(): PracticeState {
  return { words: {}, recentScores: [] };
}

function clampScore(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return n;
}

export function parsePracticeState(raw: string | null): PracticeState {
  if (!raw) return emptyPracticeState();
  try {
    const parsed = JSON.parse(raw) as Partial<PracticeState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.words || typeof parsed.words !== 'object') {
      return emptyPracticeState();
    }
    const recentScores = Array.isArray(parsed.recentScores)
      ? (parsed.recentScores
          .map(clampScore)
          .filter((n): n is number => n !== null)
          .slice(-RECENT_WINDOW))
      : [];
    return {
      words: parsed.words as Record<string, WordMastery>,
      recentScores,
    };
  } catch {
    return emptyPracticeState();
  }
}

export function pushRecentScore(scores: readonly number[], score: number): number[] {
  const next = [...scores, score];
  return next.length > RECENT_WINDOW ? next.slice(next.length - RECENT_WINDOW) : next;
}

export function userSkillOf(scores: readonly number[]): number {
  const window = scores.slice(-RECENT_WINDOW);
  const sum = window.reduce((a, b) => a + b, 0) + (RECENT_WINDOW - window.length) * USER_SKILL_DEFAULT;
  return sum / RECENT_WINDOW;
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

export function dropWordMastery(state: PracticeState, id: string): PracticeState {
  if (!(id in state.words)) return state;
  const next = { ...state.words };
  delete next[id];
  return { ...state, words: next };
}
