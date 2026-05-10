import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { checkAnswer } from '../lib/normalize';
import { applyRoundResult, loadProgress, saveProgress } from '../lib/progress';
import { selectRound } from '../lib/selection';
import { newWordStats, recordCorrect, recordWrong } from '../lib/srs';
import type { Progress, Word, WordStats } from '../lib/types';
import { loadVocab } from '../lib/vocab';
import RoundSummary, { type RoundResult } from '../screens/RoundSummary';

const FEEDBACK_MS = 700;

type Phase =
  | { kind: 'asking' }
  | { kind: 'feedback'; correct: boolean; close: boolean; submitted: string };

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

export default function Typing() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const startingProgress = useMemo(() => loadProgress(localStorage), []);
  const round = useMemo(
    () => selectRound(vocab, startingProgress, new Date()),
    [vocab, startingProgress],
  );

  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'asking' });
  const [finished, setFinished] = useState<Finished | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase.kind === 'asking') inputRef.current?.focus();
  }, [phase.kind, idx]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

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
      setInput('');
      setPhase({ kind: 'asking' });
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase.kind !== 'asking' || !input.trim()) return;
    const result = checkAnswer(input, current.term, current.alternates ?? [], {
      articlePrefixes: vocab.settings.articlePrefixes,
    });
    const newResults = [...results, { word: current, correct: result.correct }];
    setResults(newResults);
    setPhase({
      kind: 'feedback',
      correct: result.correct,
      close: result.close,
      submitted: input.trim(),
    });
    if (result.correct && !result.close) {
      timerRef.current = window.setTimeout(() => advance(newResults), FEEDBACK_MS);
    }
  };

  const onNext = () => {
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
          {idx + 1} / {round.length}
        </span>
      </header>

      <section className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="text-center mb-8 mt-4">
          <div className="text-sm text-slate-500 mb-2">Type in the original language</div>
          <div className="text-4xl font-bold">{current.translation}</div>
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
                Close — correct: <strong>{current.term}</strong>
              </div>
            )}
            {!phase.correct && (
              <div className="text-center text-rose-700">
                Correct answer: <strong>{current.term}</strong>
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
    </main>
  );
}
