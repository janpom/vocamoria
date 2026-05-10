import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { buildOptions } from '../lib/distractors';
import { applyRoundResult, loadProgress, saveProgress } from '../lib/progress';
import { selectRound } from '../lib/selection';
import { newWordStats, recordCorrect, recordWrong } from '../lib/srs';
import type { Progress, Word, WordStats } from '../lib/types';
import { loadVocab } from '../lib/vocab';
import RoundSummary, { type RoundResult } from '../screens/RoundSummary';

const FEEDBACK_MS = 600;

type Question = {
  word: Word;
  options: Word[];
};

type Phase =
  | { kind: 'asking' }
  | { kind: 'feedback'; pickedId: string; correct: boolean };

type Finished = {
  newProgress: Progress;
  xpEarned: number;
  streakBumped: boolean;
  results: RoundResult[];
};

function buildQuestions(round: Word[], pool: Word[]): Question[] {
  return round.map((w) => ({ word: w, options: buildOptions(w, pool) }));
}

function computeXP(results: RoundResult[]): number {
  const correct = results.filter((r) => r.correct).length;
  let xp = correct * 10 + 50;
  if (correct === results.length && results.length > 0) xp += 20;
  return xp;
}

export default function Quiz() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const startingProgress = useMemo(() => loadProgress(localStorage), []);
  const round = useMemo(
    () => selectRound(vocab, startingProgress, new Date()),
    [vocab, startingProgress],
  );
  const questions = useMemo(() => buildQuestions(round, vocab.words), [round, vocab.words]);

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'asking' });
  const [finished, setFinished] = useState<Finished | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  if (vocab.words.length === 0) {
    return <Navigate to="/import" replace />;
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-dvh p-6 flex items-center justify-center bg-sky-50 text-slate-900">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">No words to play</h1>
          <p className="text-slate-600">
            Your vocab list is empty. Import some words first.
          </p>
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
        streakCount={finished.newProgress.streak.count}
        streakBumped={finished.streakBumped}
        onPlayAgain={() => navigate(0)}
        onHome={() => navigate('/')}
      />
    );
  }

  const current = questions[idx];

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
      newProgress,
      xpEarned,
      streakBumped: newProgress.streak.count > startingProgress.streak.count,
      results: allResults,
    });
  };

  const advance = (allResults: RoundResult[]) => {
    if (idx + 1 >= questions.length) {
      finishRound(allResults);
    } else {
      setResults(allResults);
      setIdx(idx + 1);
      setPhase({ kind: 'asking' });
    }
  };

  const pick = (optionId: string) => {
    if (phase.kind !== 'asking') return;
    const correct = optionId === current.word.id;
    const newResults = [...results, { word: current.word, correct }];
    setResults(newResults);
    setPhase({ kind: 'feedback', pickedId: optionId, correct });
    if (correct) {
      timerRef.current = window.setTimeout(() => advance(newResults), FEEDBACK_MS);
    }
  };

  const next = () => {
    if (phase.kind !== 'feedback') return;
    advance(results);
  };

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900 flex flex-col">
      <header className="max-w-md w-full mx-auto mb-6 flex items-center justify-between text-sm text-slate-600">
        <button type="button" onClick={() => navigate('/')} className="underline text-sky-700">
          Home
        </button>
        <span>
          {idx + 1} / {questions.length}
        </span>
      </header>

      <section className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="text-center mb-8 mt-4">
          <div className="text-sm text-slate-500 mb-2">Translate</div>
          <div className="text-4xl font-bold">{current.word.term}</div>
        </div>

        <div className="space-y-3 flex-1">
          {current.options.map((opt) => {
            const isPicked = phase.kind === 'feedback' && phase.pickedId === opt.id;
            const isCorrectAnswer = opt.id === current.word.id;
            const showAsCorrect =
              phase.kind === 'feedback' && (isCorrectAnswer || isPicked) && isCorrectAnswer;
            const showAsWrong = isPicked && !isCorrectAnswer;
            const baseStyle = 'w-full min-h-14 px-4 py-4 rounded-xl text-lg font-medium text-left transition active:scale-[0.99]';
            const stateStyle = showAsCorrect
              ? 'bg-emerald-100 border-2 border-emerald-500 text-emerald-900'
              : showAsWrong
                ? 'bg-rose-100 border-2 border-rose-500 text-rose-900'
                : 'bg-white border-2 border-transparent text-slate-900 shadow-sm';
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => pick(opt.id)}
                disabled={phase.kind !== 'asking'}
                className={`${baseStyle} ${stateStyle} disabled:cursor-default`}
              >
                {opt.translation}
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
    </main>
  );
}
