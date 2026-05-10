import { describe, expect, it } from 'vitest';
import { buildOptions, pickDistractors } from './distractors';
import type { Word } from './types';

const w = (id: string, lesson?: string): Word => ({
  id,
  term: id,
  translation: id,
  ...(lesson ? { lesson } : {}),
});

const fixedRandom = () => 0;

describe('pickDistractors', () => {
  it('never includes the correct word', () => {
    const pool = [w('a'), w('b'), w('c'), w('d')];
    const out = pickDistractors(w('a'), pool, 3, fixedRandom);
    expect(out.find((x) => x.id === 'a')).toBeUndefined();
  });

  it('returns up to `count` items', () => {
    const pool = [w('a'), w('b'), w('c'), w('d'), w('e')];
    expect(pickDistractors(w('a'), pool, 3, fixedRandom)).toHaveLength(3);
  });

  it('returns fewer if pool is too small', () => {
    const pool = [w('a'), w('b')];
    expect(pickDistractors(w('a'), pool, 3, fixedRandom)).toHaveLength(1);
  });

  it('prefers same-lesson distractors when correct word has a lesson', () => {
    const pool = [
      w('a', 'unit-1'),
      w('b', 'unit-1'),
      w('c', 'unit-1'),
      w('d', 'unit-2'),
      w('e', 'unit-2'),
    ];
    const out = pickDistractors(w('a', 'unit-1'), pool, 2, fixedRandom);
    expect(out.map((x) => x.id).sort()).toEqual(['b', 'c']);
  });

  it('falls back to other lessons if same-lesson pool is too small', () => {
    const pool = [w('a', 'unit-1'), w('b', 'unit-1'), w('c', 'unit-2'), w('d', 'unit-2')];
    const out = pickDistractors(w('a', 'unit-1'), pool, 3, fixedRandom);
    expect(out.map((x) => x.id).sort()).toEqual(['b', 'c', 'd']);
  });
});

describe('buildOptions', () => {
  it('always contains the correct word', () => {
    const pool = [w('a'), w('b'), w('c'), w('d')];
    const out = buildOptions(w('a'), pool, 4, fixedRandom);
    expect(out.find((x) => x.id === 'a')).toBeDefined();
  });

  it('returns `count` options when pool is large enough', () => {
    const pool = [w('a'), w('b'), w('c'), w('d'), w('e')];
    expect(buildOptions(w('a'), pool, 4, fixedRandom)).toHaveLength(4);
  });
});
