import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isGuessableLetter, normalizeLetter } from '../lib/normalize';
import { getDirection } from '../lib/preferences';
import { applyRoundResult, loadProgress, saveProgress } from '../lib/progress';
import { selectRound } from '../lib/selection';
import { newWordStats, recordCorrect, recordWrong } from '../lib/srs';
import type { Progress, Word, WordStats } from '../lib/types';
import { loadVocab } from '../lib/vocab';
import RoundSummary, { type RoundResult } from '../screens/RoundSummary';

const FEEDBACK_MS = 900;
const MAX_MISTAKES = 2;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type Phase = { kind: 'asking' } | { kind: 'won' } | { kind: 'lost' };

type Finished = {
  progress: Progress;
  xpEarned: number;
  streakBumped: boolean;
  results: RoundResult[];
};

function computeXP(results: RoundResult[]): number {
  const correct = results.filter((r) => r.correct).length;
  let xp = correct * 10 + 50;
  if (correct === results.length && results.length > 0) xp += 20;
  return xp;
}

function targetLetters(target: string): Set<string> {
  const out = new Set<string>();
  for (const c of target) {
    if (isGuessableLetter(c)) out.add(normalizeLetter(c));
  }
  return out;
}

export default function Hangman() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const startingProgress = useMemo(() => loadProgress(localStorage), []);
  const direction = useMemo(() => getDirection('hangman', localStorage), []);
  const round = useMemo(
    () => selectRound(vocab, startingProgress, new Date()),
    [vocab, startingProgress],
  );

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'asking' });
  const [finished, setFinished] = useState<Finished | null>(null);
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

  if (vocab.words.length === 0) return <Navigate to="/import" replace />;

  if (round.length === 0) {
    return (
      <main className="min-h-dvh p-6 flex items-center justify-center bg-sky-50 text-slate-900">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">No words to play</h1>
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white font-medium"
          >
            Import vocab
          </button>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <RoundSummary
        results={finished.results}
        xpEarned={finished.xpEarned}
        streakCount={finished.progress.streak.count}
        streakBumped={finished.streakBumped}
        onPlayAgain={() => navigate(0)}
        onHome={() => navigate('/')}
      />
    );
  }

  const current: Word = round[idx];
  const target =
    direction === 'term-to-translation' ? current.translation : current.term;
  const prompt = direction === 'term-to-translation' ? current.term : current.translation;
  const requiredLetters = targetLetters(target);

  const finishRound = (allResults: RoundResult[]) => {
    const now = new Date();
    const updates: Record<string, WordStats> = {};
    for (const r of allResults) {
      const prev = startingProgress.words[r.word.id] ?? newWordStats(now);
      updates[r.word.id] = r.correct ? recordCorrect(prev, now) : recordWrong(prev, now);
    }
    const xpEarned = computeXP(allResults);
    const newProgress = applyRoundResult(startingProgress, updates, xpEarned, now);
    saveProgress(localStorage, newProgress);
    setFinished({
      progress: newProgress,
      xpEarned,
      streakBumped: newProgress.streak.count > startingProgress.streak.count,
      results: allResults,
    });
  };

  const advance = (allResults: RoundResult[]) => {
    if (idx + 1 >= round.length) {
      finishRound(allResults);
    } else {
      setResults(allResults);
      setIdx(idx + 1);
      setGuessed(new Set());
      setMistakes(0);
      setPhase({ kind: 'asking' });
    }
  };

  const recordResult = (correct: boolean): RoundResult[] => {
    const next = [...results, { word: current, correct }];
    setResults(next);
    return next;
  };

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
        const next = recordResult(false);
        setPhase({ kind: 'lost' });
        // wait for user to tap Next so they can read the answer
        void next;
      }
      return;
    }

    // hit — check completion
    const stillMissing = [...requiredLetters].some((l) => !newGuessed.has(l));
    if (!stillMissing) {
      const next = recordResult(true);
      setPhase({ kind: 'won' });
      timerRef.current = window.setTimeout(() => advance(next), FEEDBACK_MS);
    }
  };

  const onNext = () => {
    if (phase.kind !== 'lost') return;
    advance(results);
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

  const mistakesLeft = MAX_MISTAKES - mistakes;

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900 flex flex-col">
      <header className="max-w-md w-full mx-auto mb-4 flex items-center justify-between text-sm text-slate-600">
        <button type="button" onClick={() => navigate('/')} className="underline text-sky-700">
          Home
        </button>
        <span>
          {idx + 1} / {round.length}
        </span>
      </header>

      <section className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="text-sm text-slate-500 mb-1">Guess the translation of</div>
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

        <div className="flex justify-center gap-1.5 text-2xl mb-4" aria-label={`${mistakesLeft} mistakes left`}>
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
    </main>
  );
}
