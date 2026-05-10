import type { WordStats } from './types';

export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;
export const MAX_BOX = INTERVAL_DAYS.length - 1;
export const WRONG_DELAY_DAYS = 1;
const MS_PER_DAY = 86_400_000;

export type Mastery = 'Learning' | 'Practicing' | 'Mastered';

export function newWordStats(now: Date): WordStats {
  const iso = now.toISOString();
  return { seen: 0, correct: 0, lastSeen: iso, nextDue: iso, box: 0 };
}

export function recordCorrect(stats: WordStats, now: Date): WordStats {
  const box = Math.min(stats.box + 1, MAX_BOX);
  return {
    seen: stats.seen + 1,
    correct: stats.correct + 1,
    lastSeen: now.toISOString(),
    nextDue: addDays(now, INTERVAL_DAYS[box]).toISOString(),
    box,
  };
}

export function recordWrong(stats: WordStats, now: Date): WordStats {
  const box = Math.max(stats.box - 1, 0);
  return {
    seen: stats.seen + 1,
    correct: stats.correct,
    lastSeen: now.toISOString(),
    nextDue: addDays(now, WRONG_DELAY_DAYS).toISOString(),
    box,
  };
}

export function isDue(stats: WordStats, now: Date): boolean {
  return stats.nextDue <= now.toISOString();
}

export function masteryLabel(box: number): Mastery {
  if (box <= 1) return 'Learning';
  if (box <= 3) return 'Practicing';
  return 'Mastered';
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}
