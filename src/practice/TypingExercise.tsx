import { useEffect, useRef, useState } from 'react';
import { checkAnswer } from '../lib/normalize';
import type { SingleExerciseProps } from './types';

const FEEDBACK_MS = 700;

type Phase =
  | { kind: 'asking' }
  | { kind: 'feedback'; correct: boolean; close: boolean; submitted: string };

export default function TypingExercise({ word, vocab, direction, onComplete }: SingleExerciseProps) {
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'asking' });
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase.kind === 'asking') inputRef.current?.focus();
  }, [phase.kind]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const promptText = direction === 'l-n' ? word.term : word.translation;
  const expectedText = direction === 'l-n' ? word.translation : word.term;
  const expectedAlternates = direction === 'n-l' ? word.alternates ?? [] : [];
  const checkOpts =
    direction === 'n-l'
      ? { articlePrefixes: vocab.settings.articlePrefixes }
      : { articlePrefixes: [] };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase.kind !== 'asking' || !input.trim()) return;
    const result = checkAnswer(input, expectedText, expectedAlternates, checkOpts);
    setPhase({
      kind: 'feedback',
      correct: result.correct,
      close: result.close,
      submitted: input.trim(),
    });
    if (result.correct && !result.close) {
      timerRef.current = window.setTimeout(
        () => onComplete([{ wordId: word.id, success: true }]),
        FEEDBACK_MS,
      );
    }
  };

  const onNext = () => {
    if (phase.kind !== 'feedback') return;
    onComplete([{ wordId: word.id, success: phase.correct }]);
  };

  return (
    <section className="max-w-md w-full mx-auto flex-1 flex flex-col">
      <div className="text-center mb-8 mt-4">
        <div className="text-sm text-slate-500 mb-2">
          Typing · {direction === 'n-l' ? 'type the original' : 'type the translation'}
        </div>
        <div className="text-4xl font-bold">{promptText}</div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={phase.kind !== 'asking'}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full min-h-12 px-4 py-3 text-xl rounded-xl border-2 bg-white focus:outline-none disabled:opacity-100 ${
            phase.kind === 'feedback' && phase.correct && !phase.close
              ? 'border-emerald-500 bg-emerald-50 animate-pop'
              : phase.kind === 'feedback' && phase.correct && phase.close
                ? 'border-amber-400 bg-amber-50'
                : phase.kind === 'feedback' && !phase.correct
                  ? 'border-rose-500 bg-rose-50 animate-shake'
                  : 'border-sky-300 focus:border-sky-500'
          }`}
          placeholder="your answer"
        />
        {phase.kind === 'asking' && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full min-h-12 py-3 rounded-xl bg-sky-600 text-white font-semibold disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </form>

      {phase.kind === 'feedback' && (
        <div className="mt-4 space-y-3">
          {phase.correct && !phase.close && (
            <div className="text-center text-emerald-700 font-semibold text-lg">Correct!</div>
          )}
          {phase.correct && phase.close && (
            <div className="text-center text-amber-700">
              Close — correct: <strong>{expectedText}</strong>
            </div>
          )}
          {!phase.correct && (
            <div className="text-center text-rose-700">
              Correct answer: <strong>{expectedText}</strong>
            </div>
          )}
          {!(phase.correct && !phase.close) && (
            <button
              type="button"
              onClick={onNext}
              className="w-full min-h-12 py-3 rounded-xl bg-sky-600 text-white font-semibold"
            >
              Next
            </button>
          )}
        </div>
      )}
    </section>
  );
}
