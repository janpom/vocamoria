import { describe, expect, it } from 'vitest';
import { shuffle } from './selection';

describe('shuffle', () => {
  it('preserves elements regardless of random source', () => {
    const out = shuffle([1, 2, 3, 4, 5], () => 0);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3];
    shuffle(input, () => 0);
    expect(input).toEqual([1, 2, 3]);
  });
});
