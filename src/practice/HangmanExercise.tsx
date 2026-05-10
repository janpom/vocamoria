import { useEffect, useRef, useState } from 'react';
import { isGuessableLetter, normalizeLetter } from '../lib/normalize';
import type { SingleExerciseProps } from './types';

const FEEDBACK_MS = 900;
const MAX_MISTAKES = 2;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type Phase = { kind: 'asking' } | { kind: 'won' } | { kind: 'lost' };

function targetLetters(target: string): Set<string> {
  const out = new Set<string>();
  for (const c of target) {
    if (isGuessableLetter(c)) out.add(normalizeLetter(c));
  }
  return out;
}

export default function HangmanExercise({ word, direction, onComplete }: SingleExerciseProps) {
  const target = direction === 'l-n' ? word.translation : word.term;
  const prompt = direction === 'l-n' ? word.term : word.translation;
  const requiredLetters = targetLetters(target);

  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'asking' });
  const timerRef = useRef<number | null>(null);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const guess = (letter: string) => {
    if (phase.kind !== 'asking') return;
    const norm = normalizeLetter(letter);
    if (guessed.has(norm)) return;

    const newGuessed = new Set(guessed);
    newGuessed.add(norm);
    setGuessed(newGuessed);

    const isHit = requiredLetters.has(norm);
    if (!isHit) {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      if (newMistakes > MAX_MISTAKES - 1) {
        setPhase({ kind: 'lost' });
      }
      return;
    }

    const stillMissing = [...requiredLetters].some((l) => !newGuessed.has(l));
    if (!stillMissing) {
      setPhase({ kind: 'won' });
      timerRef.current = window.setTimeout(
        () => onComplete([{ wordId: word.id, success: true }]),
        FEEDBACK_MS,
      );
    }
  };

  const onNext = () => {
    if (phase.kind !== 'lost') return;
    onComplete([{ wordId: word.id, success: false }]);
  };

  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' && phase.kind === 'lost') {
      e.preventDefault();
      onNext();
      return;
    }
    if (e.key.length !== 1) return;
    if (!isGuessableLetter(e.key)) return;
    e.preventDefault();
    guess(e.key);
  };

  const reveal = phase.kind !== 'asking';
  type Cell = { i: number; char: string; visible: boolean; guessable: boolean };
  const cells: Cell[] = [...target].map((c, i) => {
    const guessable = isGuessableLetter(c);
    const isGuessed = guessable && guessed.has(normalizeLetter(c));
    const visible = !guessable || isGuessed || reveal;
    return { i, char: c, visible, guessable };
  });

  const cellGroups: Cell[][] = [];
  let pending: Cell[] = [];
  for (const cell of cells) {
    if (/\s/.test(cell.char)) {
      if (pending.length) cellGroups.push(pending);
      pending = [];
    } else {
      pending.push(cell);
    }
  }
  if (pending.length) cellGroups.push(pending);

  const letterButtonState = (letter: string): 'idle' | 'hit' | 'miss' => {
    const norm = normalizeLetter(letter);
    if (!guessed.has(norm)) return 'idle';
    return requiredLetters.has(norm) ? 'hit' : 'miss';
  };

  return (
    <section className="max-w-md w-full mx-auto flex-1 flex flex-col">
      <div className="text-center mb-6">
        <div className="text-sm text-slate-500 mb-1">
          Hangman · {direction === 'l-n' ? 'guess the translation of' : 'guess the original of'}
        </div>
        <div className="text-2xl font-bold">{prompt}</div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mb-6">
        {cellGroups.map((group, gi) => (
          <div key={gi} className="flex flex-nowrap gap-1.5">
            {group.map((cell) => {
              const isLetterCell = cell.guessable;
              const baseStyle =
                'min-w-7 h-10 flex items-center justify-center text-xl font-bold border-b-2';
              const stateStyle = !isLetterCell
                ? 'border-transparent text-slate-400'
                : cell.visible
                  ? phase.kind === 'lost' && !guessed.has(normalizeLetter(cell.char))
                    ? 'border-rose-400 text-rose-700'
                    : 'border-slate-400 text-slate-900'
                  : 'border-slate-400 text-transparent';
              return (
                <span key={cell.i} className={`${baseStyle} ${stateStyle}`}>
                  {cell.visible ? cell.char : '·'}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div
        className="flex justify-center gap-1.5 text-2xl mb-4"
        aria-label={`${MAX_MISTAKES - mistakes} mistakes left`}
      >
        {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
          <span key={i}>{i < mistakes ? '🖤' : '❤️'}</span>
        ))}
      </div>

      {phase.kind === 'won' && (
        <div className="text-center text-emerald-700 font-semibold mb-4">Got it!</div>
      )}
      {phase.kind === 'lost' && (
        <div className="text-center text-rose-700 mb-4">
          Out of guesses. Answer: <strong>{target}</strong>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 mt-auto">
        {ALPHABET.map((letter) => {
          const state = letterButtonState(letter);
          const disabled = phase.kind !== 'asking' || state !== 'idle';
          const stateStyle =
            state === 'hit'
              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
              : state === 'miss'
                ? 'bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-white text-slate-900 border-slate-200 active:scale-95';
          return (
            <button
              key={letter}
              type="button"
              onClick={() => guess(letter)}
              disabled={disabled}
              className={`min-h-11 rounded-lg border font-semibold text-base transition disabled:opacity-70 disabled:cursor-not-allowed ${stateStyle}`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {phase.kind === 'lost' && (
        <button
          type="button"
          onClick={onNext}
          className="mt-4 w-full min-h-12 py-3 rounded-xl bg-sky-600 text-white font-semibold"
        >
          Next
        </button>
      )}
    </section>
  );
}
