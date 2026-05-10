import { describe, expect, it } from 'vitest';
import {
  INTERVAL_DAYS,
  MAX_BOX,
  isDue,
  masteryLabel,
  newWordStats,
  recordCorrect,
  recordWrong,
} from './srs';

const NOW = new Date('2026-05-10T10:00:00Z');

describe('newWordStats', () => {
  it('starts in box 0, due immediately', () => {
    const s = newWordStats(NOW);
    expect(s).toEqual({
      seen: 0,
      correct: 0,
      lastSeen: NOW.toISOString(),
      nextDue: NOW.toISOString(),
      box: 0,
    });
  });
});

describe('recordCorrect', () => {
  it('increments box and schedules using INTERVAL_DAYS', () => {
    const s = recordCorrect(newWordStats(NOW), NOW);
    expect(s.box).toBe(1);
    expect(s.seen).toBe(1);
    expect(s.correct).toBe(1);
    const expectedDue = new Date(NOW.getTime() + INTERVAL_DAYS[1] * 86_400_000);
    expect(s.nextDue).toBe(expectedDue.toISOString());
  });

  it('caps box at MAX_BOX', () => {
    let s = newWordStats(NOW);
    for (let i = 0; i < 20; i++) s = recordCorrect(s, NOW);
    expect(s.box).toBe(MAX_BOX);
    expect(s.seen).toBe(20);
    expect(s.correct).toBe(20);
  });
});

describe('recordWrong', () => {
  it('demotes box, resets to 1-day delay, does not bump correct', () => {
    let s = recordCorrect(newWordStats(NOW), NOW);
    s = recordCorrect(s, NOW);
    expect(s.box).toBe(2);

    const w = recordWrong(s, NOW);
    expect(w.box).toBe(1);
    expect(w.correct).toBe(2);
    expect(w.seen).toBe(3);
    const expectedDue = new Date(NOW.getTime() + 86_400_000);
    expect(w.nextDue).toBe(expectedDue.toISOString());
  });

  it('floors box at 0', () => {
    const s = recordWrong(newWordStats(NOW), NOW);
    expect(s.box).toBe(0);
  });
});

describe('isDue', () => {
  it('true for new word at exact now', () => {
    expect(isDue(newWordStats(NOW), NOW)).toBe(true);
  });

  it('false right after a correct answer', () => {
    const s = recordCorrect(newWordStats(NOW), NOW);
    const slightlyLater = new Date(NOW.getTime() + 1000);
    expect(isDue(s, slightlyLater)).toBe(false);
  });

  it('true after the interval elapses', () => {
    const s = recordCorrect(newWordStats(NOW), NOW);
    const muchLater = new Date(NOW.getTime() + 2 * 86_400_000);
    expect(isDue(s, muchLater)).toBe(true);
  });
});

describe('masteryLabel', () => {
  it('maps boxes to labels per spec', () => {
    expect(masteryLabel(0)).toBe('Learning');
    expect(masteryLabel(1)).toBe('Learning');
    expect(masteryLabel(2)).toBe('Practicing');
    expect(masteryLabel(3)).toBe('Practicing');
    expect(masteryLabel(4)).toBe('Mastered');
    expect(masteryLabel(5)).toBe('Mastered');
  });
});
