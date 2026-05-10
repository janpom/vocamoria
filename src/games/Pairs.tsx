import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { applyRoundResult, loadProgress, saveProgress } from '../lib/progress';
import { selectRound, shuffle } from '../lib/selection';
import { newWordStats, recordRecognition } from '../lib/srs';
import type { Progress, Word, WordStats } from '../lib/types';
import { loadVocab } from '../lib/vocab';
import RoundSummary, { type RoundResult } from '../screens/RoundSummary';

const PAIRS_ROUND_SIZE = 8;

type Finished = {
  progress: Progress;
  xpEarned: number;
  streakBumped: boolean;
  results: RoundResult[];
};

function shuffleAvoidingIdentity(round: Word[], reference: Word[]): Word[] {
  if (round.length < 2) return shuffle(round);
  let out = shuffle(round);
  let attempts = 0;
  while (attempts < 8 && out.every((w, i) => w.id === reference[i].id)) {
    out = shuffle(round);
    attempts += 1;
  }
  return out;
}

export default function Pairs() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const startingProgress = useMemo(() => loadProgress(localStorage), []);
  const round = useMemo(
    () => selectRound(vocab, startingProgress, new Date(), { size: PAIRS_ROUND_SIZE }),
    [vocab, startingProgress],
  );
  const leftCol = useMemo(() => shuffle(round), [round]);
  const initialRight = useMemo(
    () => shuffleAvoidingIdentity(round, leftCol),
    [round, leftCol],
  );

  const [rightCol, setRightCol] = useState<Word[]>(() => initialRight);
  const [picked, setPicked] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState<Finished | null>(null);

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

  const onPickRight = (i: number) => {
    if (submitted) return;
    if (picked === null) {
      setPicked(i);
      return;
    }
    if (picked === i) {
      setPicked(null);
      return;
    }
    const next = [...rightCol];
    [next[picked], next[i]] = [next[i], next[picked]];
    setRightCol(next);
    setPicked(null);
  };

  const onSubmit = () => {
    setSubmitted(true);
  };

  const onContinue = () => {
    const now = new Date();
    const updates: Record<string, WordStats> = {};
    const results: RoundResult[] = [];
    let correctCount = 0;
    for (let i = 0; i < leftCol.length; i++) {
      const leftWord = leftCol[i];
      const right = rightCol[i];
      const isCorrect = right?.id === leftWord.id;
      results.push({ word: leftWord, correct: isCorrect });
      const prev = startingProgress.words[leftWord.id] ?? newWordStats(now);
      if (isCorrect) {
        updates[leftWord.id] = recordRecognition(prev, now);
        correctCount += 1;
      } else {
        updates[leftWord.id] = {
          ...prev,
          seen: prev.seen + 1,
          lastSeen: now.toISOString(),
        };
      }
    }
    const xpEarned = correctCount * 10 + 50;
    const newProgress = applyRoundResult(startingProgress, updates, xpEarned, now);
    saveProgress(localStorage, newProgress);
    setFinished({
      progress: newProgress,
      xpEarned,
      streakBumped: newProgress.streak.count > startingProgress.streak.count,
      results,
    });
  };

  const correctSoFar = submitted
    ? leftCol.reduce((acc, w, i) => acc + (rightCol[i]?.id === w.id ? 1 : 0), 0)
    : 0;

  return (
    <main className="min-h-dvh p-4 bg-sky-50 text-slate-900 flex flex-col">
      <header className="max-w-md w-full mx-auto mb-3 flex items-center justify-between text-sm text-slate-600">
        <button type="button" onClick={() => navigate('/')} className="underline text-sky-700">
          Home
        </button>
        <span>
          {submitted ? `${correctSoFar} / ${leftCol.length} correct` : `Reorder right column`}
        </span>
      </header>

      <p className="max-w-md w-full mx-auto mb-3 text-xs text-slate-500 text-center">
        {submitted
          ? 'Submitted. Green rows are correct, red rows are wrong.'
          : 'Tap two cells in the right column to swap them. Match each row to the term on the left, then Submit.'}
      </p>

      <div className="max-w-md w-full mx-auto flex-1 space-y-2">
        {leftCol.map((left, i) => {
          const right = rightCol[i];
          const isPicked = !submitted && picked === i;
          const isCorrect = submitted && right?.id === left.id;
          const isWrong = submitted && !isCorrect;
          const rowBaseLeft =
            'flex-1 min-h-12 px-3 py-2 rounded-xl text-sm font-medium border-2 flex items-center justify-center text-center break-words';
          const rowBaseRight = `${rowBaseLeft} transition active:scale-[0.97]`;
          const leftStyle = isCorrect
            ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
            : isWrong
              ? 'bg-rose-50 border-rose-400 text-rose-900'
              : 'bg-white border-transparent shadow-sm';
          const rightStyle = isCorrect
            ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
            : isWrong
              ? 'bg-rose-50 border-rose-400 text-rose-900 animate-shake'
              : isPicked
                ? 'bg-sky-100 border-sky-500 text-sky-900'
                : 'bg-white border-transparent shadow-sm';
          return (
            <div key={left.id} className="flex gap-2">
              <div className={`${rowBaseLeft} ${leftStyle}`}>{left.term}</div>
              <button
                type="button"
                disabled={submitted}
                onClick={() => onPickRight(i)}
                className={`${rowBaseRight} ${rightStyle}`}
              >
                {right?.translation ?? ''}
              </button>
            </div>
          );
        })}
      </div>

      <div className="max-w-md w-full mx-auto mt-4">
        {!submitted ? (
          <button
            type="button"
            onClick={onSubmit}
            className="w-full min-h-12 py-3 rounded-xl bg-sky-600 text-white font-semibold"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            className="w-full min-h-12 py-3 rounded-xl bg-emerald-600 text-white font-semibold"
          >
            Continue
          </button>
        )}
      </div>
    </main>
  );
}
