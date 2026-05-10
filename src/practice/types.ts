import type { Direction, Vocab, Word } from '../lib/types';

export type { Direction };

export type ExerciseOutcome = Array<{ wordId: string; success: boolean }>;

export type SingleExerciseProps = {
  word: Word;
  vocab: Vocab;
  direction: Direction;
  onComplete: (out: ExerciseOutcome) => void;
};

export type PairsExerciseProps = {
  words: Word[];
  vocab: Vocab;
  onComplete: (out: ExerciseOutcome) => void;
};
