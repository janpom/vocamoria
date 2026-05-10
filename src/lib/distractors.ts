import { shuffle } from './selection';
import type { Word } from './types';

export function pickDistractors(
  correct: Word,
  pool: readonly Word[],
  count = 3,
  random: () => number = Math.random,
): Word[] {
  const others = pool.filter((w) => w.id !== correct.id);
  const sameLesson = correct.lesson
    ? others.filter((w) => w.lesson === correct.lesson)
    : [];
  const rest = correct.lesson
    ? others.filter((w) => w.lesson !== correct.lesson)
    : others;
  const ordered = [...shuffle(sameLesson, random), ...shuffle(rest, random)];
  return ordered.slice(0, count);
}

export function buildOptions(
  correct: Word,
  pool: readonly Word[],
  count = 4,
  random: () => number = Math.random,
): Word[] {
  const distractors = pickDistractors(correct, pool, count - 1, random);
  return shuffle([correct, ...distractors], random);
}
