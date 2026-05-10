import type { Progress, Vocab, Word } from './types';
import { isDue } from './srs';

export const ROUND_SIZE = 10;
export const MAX_DUE_PER_ROUND = 7;

export type SelectionOpts = {
  size?: number;
  maxDue?: number;
  random?: () => number;
};

export function selectRound(vocab: Vocab, progress: Progress, now: Date, opts: SelectionOpts = {}): Word[] {
  const size = opts.size ?? ROUND_SIZE;
  const maxDue = opts.maxDue ?? MAX_DUE_PER_ROUND;
  const random = opts.random ?? Math.random;

  const due: Word[] = [];
  const fresh: Word[] = [];
  for (const w of vocab.words) {
    const stats = progress.words[w.id];
    if (!stats || stats.seen === 0) {
      fresh.push(w);
    } else if (isDue(stats, now)) {
      due.push(w);
    }
  }

  due.sort((a, b) => {
    const sa = progress.words[a.id].lastSeen;
    const sb = progress.words[b.id].lastSeen;
    return sa.localeCompare(sb);
  });

  const picked: Word[] = [];
  const seen = new Set<string>();
  const take = (w: Word) => {
    if (picked.length >= size || seen.has(w.id)) return;
    picked.push(w);
    seen.add(w.id);
  };

  for (const w of due.slice(0, maxDue)) take(w);
  for (const w of fresh) take(w);

  if (picked.length < size) {
    const remaining = vocab.words.filter((w) => !seen.has(w.id));
    const byBox = new Map<number, Word[]>();
    for (const w of remaining) {
      const box = progress.words[w.id]?.box ?? 0;
      const bucket = byBox.get(box) ?? [];
      bucket.push(w);
      byBox.set(box, bucket);
    }
    const boxes = [...byBox.keys()].sort((a, b) => a - b);
    for (const b of boxes) {
      for (const w of shuffle(byBox.get(b)!, random)) take(w);
      if (picked.length >= size) break;
    }
  }

  return shuffle(picked, random);
}

export function shuffle<T>(arr: readonly T[], random: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
