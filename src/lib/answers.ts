import type { Direction, Vocab, Word } from './types';

const promptOf = (w: Word, direction: Direction) =>
  direction === 'l-n' ? w.term : w.translation;
const answerOf = (w: Word, direction: Direction) =>
  direction === 'l-n' ? w.translation : w.term;

export function acceptableAnswers(
  word: Word,
  vocab: Vocab,
  direction: Direction,
): { primary: string; alternates: string[] } {
  const promptText = promptOf(word, direction);
  const primary = answerOf(word, direction);
  const all = new Set<string>();
  for (const w of vocab.words) {
    if (promptOf(w, direction) !== promptText) continue;
    all.add(answerOf(w, direction));
    if (direction === 'n-l') {
      for (const alt of w.alternates ?? []) all.add(alt);
    }
  }
  all.delete(primary);
  return { primary, alternates: [...all] };
}

export function distractorPool(word: Word, vocab: Vocab, direction: Direction): Word[] {
  const correctAnswer = answerOf(word, direction);
  return vocab.words.filter(
    (w) => w.id !== word.id && answerOf(w, direction) !== correctAnswer,
  );
}

export function isValidPair(term: string, translation: string, vocab: Vocab): boolean {
  return vocab.words.some((w) => w.term === term && w.translation === translation);
}
