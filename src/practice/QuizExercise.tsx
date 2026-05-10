import { useEffect, useMemo, useRef, useState } from 'react';
import { buildOptions } from '../lib/distractors';
import type { Word } from '../lib/types';
import type { SingleExerciseProps } from './types';

const FEEDBACK_MS = 600;

type Phase = { kind: 'asking' } | { kind: 'feedback'; pickedId: string; correct: boolean };

export default function QuizExercise({ word, vocab, direction, onComplete }: SingleExerciseProps) {
  const options = useMemo(() => buildOptions(word, vocab.words), [word, vocab.words]);
  const [phase, setPhase] = useState<Phase>({ kind: 'asking' });
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const promptOf = (w: Word) => (direction === 'l-n' ? w.term : w.translation);
  const optionTextOf = (w: Word) => (direction === 'l-n' ? w.translation : w.term);

  const pick = (optionId: string) => {
    if (phase.kind !== 'asking') return;
    const correct = optionId === word.id;
    setPhase({ kind: 'feedback', pickedId: optionId, correct });
    if (correct) {
      timerRef.current = window.setTimeout(
        () => onComplete([{ wordId: word.id, success: true }]),
        FEEDBACK_MS,
      );
    }
  };

  const next = () => {
    if (phase.kind !== 'feedback' || phase.correct) return;
    onComplete([{ wordId: word.id, success: false }]);
  };

  return (
    <section className="max-w-md w-full mx-auto flex-1 flex flex-col">
      <div className="text-center mb-8 mt-4">
        <div className="text-sm text-slate-500 mb-2">
          Quiz · {direction === 'l-n' ? 'choose the translation' : 'choose the original'}
        </div>
        <div className="text-4xl font-bold">{promptOf(word)}</div>
      </div>
      <div className="space-y-3 flex-1">
        {options.map((opt) => {
          const isPicked = phase.kind === 'feedback' && phase.pickedId === opt.id;
          const isCorrectAnswer = opt.id === word.id;
          const showAsCorrect = phase.kind === 'feedback' && isCorrectAnswer;
          const showAsWrong = isPicked && !isCorrectAnswer;
          const baseStyle =
            'w-full min-h-14 px-4 py-4 rounded-xl text-lg font-medium text-left transition active:scale-[0.99]';
          const stateStyle = showAsCorrect
            ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-900 animate-pop'
            : showAsWrong
              ? 'bg-rose-100 border-2 border-rose-500 text-rose-900 animate-shake'
              : 'bg-white border-2 border-transparent text-slate-900 shadow-sm';
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => pick(opt.id)}
              disabled={phase.kind !== 'asking'}
              className={`${baseStyle} ${stateStyle} disabled:cursor-default`}
            >
              {optionTextOf(opt)}
            </button>
          );
        })}
      </div>
      {phase.kind === 'feedback' && !phase.correct && (
        <button
          type="button"
          onClick={next}
          className="mt-6 w-full min-h-12 py-3 rounded-xl bg-sky-600 text-white font-semibold"
        >
          Next
        </button>
      )}
    </section>
  );
}
