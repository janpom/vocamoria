import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { applyRoundResult, loadProgress, saveProgress } from '../lib/progress';
import { selectRound, shuffle } from '../lib/selection';
import { newWordStats, recordRecognition } from '../lib/srs';
import type { Progress, Word, WordStats } from '../lib/types';
import { loadVocab } from '../lib/vocab';
import RoundSummary, { type RoundResult } from '../screens/RoundSummary';

const PAIRS_ROUND_SIZE = 8;
const WRONG_FLASH_MS = 500;

type Side = 'left' | 'right';
type Selection = { side: Side; id: string };
type WrongFlash = { leftId: string; rightId: string };

type Finished = {
  progress: Progress;
  xpEarned: number;
  streakBumped: boolean;
  results: RoundResult[];
};

export default function Pairs() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const startingProgress = useMemo(() => loadProgress(localStorage), []);
  const round = useMemo(
    () => selectRound(vocab, startingProgress, new Date(), { size: PAIRS_ROUND_SIZE }),
    [vocab, startingProgress],
  );
  const leftCol = useMemo(() => shuffle(round), [round]);
  const rightCol = useMemo(() => shuffle(round), [round]);

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selection | null>(null);
  const [wrongFlash, setWrongFlash] = useState<WrongFlash | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
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

  const finishRound = (allMatched: Set<string>) => {
    const now = new Date();
    const updates: Record<string, WordStats> = {};
    const results: RoundResult[] = [];
    for (const id of allMatched) {
      const word = vocab.words.find((w) => w.id === id);
      if (!word) continue;
      const prev = startingProgress.words[id] ?? newWordStats(now);
      updates[id] = recordRecognition(prev, now);
      results.push({ word, correct: true });
    }
    const xpEarned = allMatched.size * 10 + 50;
    const newProgress = applyRoundResult(startingProgress, updates, xpEarned, now);
    saveProgress(localStorage, newProgress);
    setFinished({
      progress: newProgress,
      xpEarned,
      streakBumped: newProgress.streak.count > startingProgress.streak.count,
      results,
    });
  };

  const onTap = (side: Side, id: string) => {
    if (matched.has(id)) return;
    if (wrongFlash) return;
    if (!selected) {
      setSelected({ side, id });
      return;
    }
    if (selected.side === side) {
      setSelected({ side, id });
      return;
    }
    if (selected.id === id) {
      const next = new Set(matched);
      next.add(id);
      setMatched(next);
      setSelected(null);
      if (next.size === round.length) finishRound(next);
    } else {
      const leftId = side === 'left' ? id : selected.id;
      const rightId = side === 'right' ? id : selected.id;
      setWrongFlash({ leftId, rightId });
      const t = window.setTimeout(() => {
        setWrongFlash(null);
        setSelected(null);
      }, WRONG_FLASH_MS);
      timers.current.push(t);
    }
  };

  return (
    <main className="min-h-dvh p-4 bg-sky-50 text-slate-900 flex flex-col">
      <header className="max-w-md w-full mx-auto mb-4 flex items-center justify-between text-sm text-slate-600">
        <button type="button" onClick={() => navigate('/')} className="underline text-sky-700">
          Home
        </button>
        <span>
          {matched.size} / {round.length} pairs
        </span>
      </header>

      <div className="max-w-md w-full mx-auto grid grid-cols-2 gap-2 flex-1">
        <Column
          words={leftCol}
          side="left"
          field="term"
          matched={matched}
          selected={selected}
          wrongFlash={wrongFlash}
          onTap={onTap}
        />
        <Column
          words={rightCol}
          side="right"
          field="translation"
          matched={matched}
          selected={selected}
          wrongFlash={wrongFlash}
          onTap={onTap}
        />
      </div>
    </main>
  );
}

type ColumnProps = {
  words: Word[];
  side: Side;
  field: 'term' | 'translation';
  matched: Set<string>;
  selected: Selection | null;
  wrongFlash: WrongFlash | null;
  onTap: (side: Side, id: string) => void;
};

function Column({ words, side, field, matched, selected, wrongFlash, onTap }: ColumnProps) {
  return (
    <div className="space-y-2">
      {words.map((w) => {
        const isMatched = matched.has(w.id);
        const isSelected = selected?.side === side && selected.id === w.id;
        const isWrong =
          wrongFlash !== null && (side === 'left' ? wrongFlash.leftId : wrongFlash.rightId) === w.id;
        const baseStyle =
          'w-full min-h-12 px-3 py-2 rounded-xl text-sm font-medium transition active:scale-[0.97] text-center break-words';
        const stateStyle = isMatched
          ? 'bg-emerald-50 text-emerald-700 opacity-60 border-2 border-emerald-200'
          : isWrong
            ? 'bg-rose-100 text-rose-900 border-2 border-rose-400 animate-shake'
            : isSelected
              ? 'bg-sky-100 text-sky-900 border-2 border-sky-500'
              : 'bg-white text-slate-900 border-2 border-transparent shadow-sm';
        return (
          <button
            key={w.id}
            type="button"
            disabled={isMatched}
            onClick={() => onTap(side, w.id)}
            className={`${baseStyle} ${stateStyle}`}
          >
            {w[field]}
          </button>
        );
      })}
    </div>
  );
}
