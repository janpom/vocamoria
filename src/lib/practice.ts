import type { WordMastery } from './mastery';

export const PRACTICE_KEY = 'vocab-practice';

export const USER_SKILL_DEFAULT = 0.5;
export const USER_SKILL_ALPHA = 0.15;

export type PracticeState = {
  words: Record<string, WordMastery>;
  userSkill: number;
};

export function emptyPracticeState(): PracticeState {
  return { words: {}, userSkill: USER_SKILL_DEFAULT };
}

export function parsePracticeState(raw: string | null): PracticeState {
  if (!raw) return emptyPracticeState();
  try {
    const parsed = JSON.parse(raw) as Partial<PracticeState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.words || typeof parsed.words !== 'object') {
      return emptyPracticeState();
    }
    const userSkill =
      typeof parsed.userSkill === 'number' && parsed.userSkill >= 0 && parsed.userSkill <= 1
        ? parsed.userSkill
        : USER_SKILL_DEFAULT;
    return {
      words: parsed.words as Record<string, WordMastery>,
      userSkill,
    };
  } catch {
    return emptyPracticeState();
  }
}

export function updateUserSkill(skill: number, exerciseScore: number): number {
  const next = skill + USER_SKILL_ALPHA * (exerciseScore - skill);
  return Math.max(0, Math.min(1, next));
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
