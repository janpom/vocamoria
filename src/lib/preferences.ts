export type Direction = 'term-to-translation' | 'translation-to-term';
export type DirectionGame = 'quiz' | 'typing';

const KEYS: Record<DirectionGame, string> = {
  quiz: 'quiz-direction',
  typing: 'typing-direction',
};

const DEFAULTS: Record<DirectionGame, Direction> = {
  quiz: 'term-to-translation',
  typing: 'translation-to-term',
};

function isDirection(s: string | null): s is Direction {
  return s === 'term-to-translation' || s === 'translation-to-term';
}

export function getDirection(game: DirectionGame, storage: Pick<Storage, 'getItem'>): Direction {
  const stored = storage.getItem(KEYS[game]);
  return isDirection(stored) ? stored : DEFAULTS[game];
}

export function setDirection(
  game: DirectionGame,
  dir: Direction,
  storage: Pick<Storage, 'setItem'>,
): void {
  storage.setItem(KEYS[game], dir);
}

export function flipDirection(d: Direction): Direction {
  return d === 'term-to-translation' ? 'translation-to-term' : 'term-to-translation';
}
