import { describe, expect, it } from 'vitest';
import { selectRound, shuffle } from './selection';
import type { Progress, Vocab, Word, WordStats } from './types';

const NOW = new Date('2026-05-10T10:00:00Z');

const vocabOf = (ids: string[]): Vocab => ({
  settings: { articlePrefixes: [] },
  words: ids.map((id): Word => ({ id, term: id, translation: id })),
});

const stats = (over: Partial<WordStats>): WordStats => ({
  seen: 1,
  correct: 1,
  lastSeen: '2026-05-09T10:00:00.000Z',
  nextDue: '2026-05-09T10:00:00.000Z',
  box: 1,
  ...over,
});

const ids = (ws: Word[]) => ws.map((w) => w.id).sort();

const noShuffle = <T,>(a: readonly T[]) => [...a];

describe('shuffle', () => {
  it('preserves elements regardless of random source', () => {
    const out = shuffle([1, 2, 3, 4, 5], () => 0);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('selectRound', () => {
  it('takes new words when nothing is due', () => {
    const v = vocabOf(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']);
    const p: Progress = { words: {}, streak: { count: 0, lastPlayedDate: '' }, totalXP: 0 };
    const out = selectRound(v, p, NOW, { random: () => 0 });
    expect(out).toHaveLength(10);
  });

  it('caps due words at 7 per round and fills the rest with new', () => {
    const dueIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'];
    const newIds = ['n1', 'n2', 'n3', 'n4', 'n5'];
    const v = vocabOf([...dueIds, ...newIds]);
    const p: Progress = {
      words: Object.fromEntries(
        dueIds.map((id) => [id, stats({ nextDue: '2026-05-09T10:00:00.000Z' })]),
      ),
      streak: { count: 0, lastPlayedDate: '' },
      totalXP: 0,
    };
    const out = selectRound(v, p, NOW, { random: () => 0 });
    expect(out).toHaveLength(10);
    const dueCount = out.filter((w) => dueIds.includes(w.id)).length;
    const newCount = out.filter((w) => newIds.includes(w.id)).length;
    expect(dueCount).toBe(7);
    expect(newCount).toBe(3);
  });

  it('prioritizes oldest lastSeen among due words', () => {
    const v = vocabOf(['old', 'mid', 'new']);
    const p: Progress = {
      words: {
        old: stats({ lastSeen: '2026-05-01T00:00:00.000Z', nextDue: '2026-05-02T00:00:00.000Z' }),
        mid: stats({ lastSeen: '2026-05-05T00:00:00.000Z', nextDue: '2026-05-06T00:00:00.000Z' }),
        new: stats({ lastSeen: '2026-05-09T00:00:00.000Z', nextDue: '2026-05-09T01:00:00.000Z' }),
      },
      streak: { count: 0, lastPlayedDate: '' },
      totalXP: 0,
    };
    const out = selectRound(v, p, NOW, { size: 2, maxDue: 2, random: () => 0 });
    expect(ids(out)).toEqual(['mid', 'old']);
  });

  it('falls back to lowest non-empty box when nothing due and no new words', () => {
    const v = vocabOf(['a', 'b', 'c']);
    const p: Progress = {
      words: {
        a: stats({ box: 5, nextDue: '2027-01-01T00:00:00.000Z' }),
        b: stats({ box: 3, nextDue: '2027-01-01T00:00:00.000Z' }),
        c: stats({ box: 2, nextDue: '2027-01-01T00:00:00.000Z' }),
      },
      streak: { count: 0, lastPlayedDate: '' },
      totalXP: 0,
    };
    const out = selectRound(v, p, NOW, { size: 2, random: () => 0 });
    expect(ids(out)).toEqual(['b', 'c']);
  });

  it('never returns more words than the vocab contains', () => {
    const v = vocabOf(['a', 'b']);
    const p: Progress = { words: {}, streak: { count: 0, lastPlayedDate: '' }, totalXP: 0 };
    const out = selectRound(v, p, NOW, { random: () => 0 });
    expect(out).toHaveLength(2);
  });

  it('never duplicates a word inside one round', () => {
    const v = vocabOf(['a', 'b', 'c']);
    const p: Progress = {
      words: { a: stats({ nextDue: '2026-05-09T00:00:00.000Z' }) },
      streak: { count: 0, lastPlayedDate: '' },
      totalXP: 0,
    };
    const out = selectRound(v, p, NOW, { random: () => 0 });
    expect(new Set(out.map((w) => w.id)).size).toBe(out.length);
  });

  // ensure helper compiles (and document the contract for components: pass a stable random for deterministic flows)
  void noShuffle;
});
