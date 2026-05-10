import { describe, expect, it } from 'vitest';
import {
  applyRoundResult,
  emptyProgress,
  formatDate,
  parseProgress,
  serializeProgress,
} from './progress';
import type { WordStats } from './types';

const stats = (over: Partial<WordStats> = {}): WordStats => ({
  seen: 1,
  correct: 1,
  lastSeen: '2026-05-10T10:00:00.000Z',
  nextDue: '2026-05-11T10:00:00.000Z',
  box: 1,
  ...over,
});

describe('parseProgress', () => {
  it('returns empty on null/garbage', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress('not json')).toEqual(emptyProgress());
    expect(parseProgress('null')).toEqual(emptyProgress());
    expect(parseProgress('[]')).toEqual(emptyProgress());
    expect(parseProgress('{"words":{}}')).toEqual(emptyProgress());
  });

  it('round-trips through serializeProgress', () => {
    const p = emptyProgress();
    p.totalXP = 42;
    p.streak = { count: 3, lastPlayedDate: '2026-05-10' };
    p.words['hund'] = stats();
    expect(parseProgress(serializeProgress(p))).toEqual(p);
  });
});

describe('formatDate', () => {
  it('formats local date as YYYY-MM-DD with zero padding', () => {
    expect(formatDate(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05');
    expect(formatDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('applyRoundResult', () => {
  const NOW = new Date(2026, 4, 10, 10, 0);
  const TODAY = '2026-05-10';

  it('first ever round sets streak to 1', () => {
    const out = applyRoundResult(emptyProgress(), {}, 50, NOW);
    expect(out.streak).toEqual({ count: 1, lastPlayedDate: TODAY });
    expect(out.totalXP).toBe(50);
  });

  it('same-day second round leaves streak unchanged but adds XP', () => {
    const start = { ...emptyProgress(), streak: { count: 4, lastPlayedDate: TODAY }, totalXP: 100 };
    const out = applyRoundResult(start, {}, 30, NOW);
    expect(out.streak).toEqual({ count: 4, lastPlayedDate: TODAY });
    expect(out.totalXP).toBe(130);
  });

  it('next-day round increments streak', () => {
    const start = {
      ...emptyProgress(),
      streak: { count: 4, lastPlayedDate: '2026-05-09' },
      totalXP: 0,
    };
    const out = applyRoundResult(start, {}, 0, NOW);
    expect(out.streak).toEqual({ count: 5, lastPlayedDate: TODAY });
  });

  it('gap of more than one day resets streak to 1', () => {
    const start = {
      ...emptyProgress(),
      streak: { count: 9, lastPlayedDate: '2026-05-01' },
      totalXP: 0,
    };
    const out = applyRoundResult(start, {}, 0, NOW);
    expect(out.streak).toEqual({ count: 1, lastPlayedDate: TODAY });
  });

  it('merges word updates over existing stats', () => {
    const start = { ...emptyProgress() };
    start.words['hund'] = stats({ box: 2 });
    start.words['katze'] = stats({ box: 1 });
    const out = applyRoundResult(start, { hund: stats({ box: 3 }) }, 10, NOW);
    expect(out.words['hund'].box).toBe(3);
    expect(out.words['katze'].box).toBe(1);
  });
});
