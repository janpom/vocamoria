import type { Progress, WordStats } from './types';

export const PROGRESS_KEY = 'vocab-progress';

export function emptyProgress(): Progress {
  return {
    words: {},
    streak: { count: 0, lastPlayedDate: '' },
    totalXP: 0,
  };
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!data || typeof data !== 'object') return emptyProgress();
  const p = data as Partial<Progress>;
  if (
    !p.words ||
    typeof p.words !== 'object' ||
    !p.streak ||
    typeof p.streak !== 'object' ||
    typeof p.totalXP !== 'number'
  ) {
    return emptyProgress();
  }
  return p as Progress;
}

export function serializeProgress(p: Progress): string {
  return JSON.stringify(p);
}

export function applyRoundResult(
  p: Progress,
  wordUpdates: Record<string, WordStats>,
  xpEarned: number,
  now: Date,
): Progress {
  const today = formatDate(now);
  const previous = p.streak.lastPlayedDate;
  let count: number;
  if (!previous) {
    count = 1;
  } else if (previous === today) {
    count = p.streak.count;
  } else if (daysBetween(previous, today) === 1) {
    count = p.streak.count + 1;
  } else {
    count = 1;
  }
  return {
    words: { ...p.words, ...wordUpdates },
    streak: { count, lastPlayedDate: today },
    totalXP: p.totalXP + xpEarned,
  };
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const aD = new Date(`${a}T00:00:00`);
  const bD = new Date(`${b}T00:00:00`);
  return Math.round((bD.getTime() - aD.getTime()) / 86_400_000);
}

export function loadProgress(storage: Pick<Storage, 'getItem'>): Progress {
  return parseProgress(storage.getItem(PROGRESS_KEY));
}

export function saveProgress(storage: Pick<Storage, 'setItem'>, p: Progress): void {
  storage.setItem(PROGRESS_KEY, serializeProgress(p));
}
