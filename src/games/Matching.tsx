import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { applyRoundResult, loadProgress, saveProgress } from '../lib/progress';
import { selectRound, shuffle } from '../lib/selection';
import { newWordStats, recordRecognition } from '../lib/srs';
import type { Progress, Word, WordStats } from '../lib/types';
import { loadVocab } from '../lib/vocab';
import RoundSummary, { type RoundResult } from '../screens/RoundSummary';

const MATCH_PAUSE_MS = 350;
const FLIP_BACK_MS = 700;

type Card = {
  uid: string;
  wordId: string;
  side: 'term' | 'translation';
  text: string;
};

type Finished = {
  progress: Progress;
  xpEarned: number;
  streakBumped: boolean;
  results: RoundResult[];
};

function buildCards(words: Word[]): Card[] {
  const cards: Card[] = [];
  for (const w of words) {
    cards.push({ uid: `t-${w.id}`, wordId: w.id, side: 'term', text: w.term });
    cards.push({ uid: `r-${w.id}`, wordId: w.id, side: 'translation', text: w.translation });
  }
  return shuffle(cards);
}

export default function Matching() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const startingProgress = useMemo(() => loadProgress(localStorage), []);
  const round = useMemo(
    () => selectRound(vocab, startingProgress, new Date()),
    [vocab, startingProgress],
  );
  const cards = useMemo(() => buildCards(round), [round]);

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [flipped, setFlipped] = useState<Card[]>([]);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
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

  const onCardClick = (card: Card) => {
    if (matched.has(card.wordId)) return;
    if (wrongPair) return;
    if (flipped.length >= 2) return;
    if (flipped.length === 1 && flipped[0].uid === card.uid) return;

    if (flipped.length === 0) {
      setFlipped([card]);
      return;
    }

    const first = flipped[0];
    const second = card;
    setFlipped([first, second]);

    if (first.wordId === second.wordId) {
      const t = window.setTimeout(() => {
        const next = new Set(matched);
        next.add(first.wordId);
        setMatched(next);
        setFlipped([]);
        if (next.size === round.length) finishRound(next);
      }, MATCH_PAUSE_MS);
      timers.current.push(t);
    } else {
      setWrongPair([first.uid, second.uid]);
      const t = window.setTimeout(() => {
        setFlipped([]);
        setWrongPair(null);
      }, FLIP_BACK_MS);
      timers.current.push(t);
    }
  };

  return (
    <main className="min-h-dvh p-4 bg-sky-50 text-slate-900 flex flex-col">
      <header className="max-w-2xl w-full mx-auto mb-4 flex items-center justify-between text-sm text-slate-600">
        <button type="button" onClick={() => navigate('/')} className="underline text-sky-700">
          Home
        </button>
        <span>
          {matched.size} / {round.length} pairs
        </span>
      </header>
      <div className="max-w-2xl w-full mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map((card) => {
          const isMatched = matched.has(card.wordId);
          const isFlipped = flipped.some((f) => f.uid === card.uid);
          const isWrong = wrongPair !== null && wrongPair.includes(card.uid);
          const revealed = isMatched || isFlipped;
          const baseStyle =
            'min-h-20 px-2 py-3 rounded-xl text-sm font-medium transition active:scale-[0.97] flex items-center justify-center text-center';
          const stateStyle = isMatched
            ? 'bg-emerald-50 text-emerald-700 opacity-60 border-2 border-emerald-200'
            : isWrong
              ? 'bg-rose-100 text-rose-900 border-2 border-rose-400'
              : revealed
                ? 'bg-white text-slate-900 border-2 border-sky-400 shadow'
                : 'bg-sky-500 text-white border-2 border-sky-600 shadow text-2xl';
          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => onCardClick(card)}
              disabled={isMatched}
              className={`${baseStyle} ${stateStyle}`}
              aria-label={revealed ? card.text : 'Hidden card'}
            >
              {revealed ? card.text : '?'}
            </button>
          );
        })}
      </div>
    </main>
  );
}
