import { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { readLabels } from '../lib/labels';
import {
  type Direction,
  type DirectionGame,
  flipDirection,
  getDirection,
  setDirection,
} from '../lib/preferences';
import { loadProgress } from '../lib/progress';
import { loadVocab } from '../lib/vocab';
import RemoteLoader from './RemoteLoader';

export default function Home() {
  const [params] = useSearchParams();
  const remoteUrl = params.get('vocab');
  if (remoteUrl) return <RemoteLoader url={remoteUrl} />;

  const vocab = useMemo(() => loadVocab(localStorage), []);
  const progress = useMemo(() => loadProgress(localStorage), []);
  const labels = useMemo(() => readLabels(vocab, localStorage), [vocab]);
  const [quizDir, setQuizDir] = useState<Direction>(() => getDirection('quiz', localStorage));
  const [typingDir, setTypingDir] = useState<Direction>(() => getDirection('typing', localStorage));
  const [hangmanDir, setHangmanDir] = useState<Direction>(() =>
    getDirection('hangman', localStorage),
  );

  if (vocab.words.length === 0) {
    return <Navigate to="/import" replace />;
  }

  const toggle = (game: DirectionGame, current: Direction) => {
    const next = flipDirection(current);
    setDirection(game, next, localStorage);
    if (game === 'quiz') setQuizDir(next);
    else if (game === 'typing') setTypingDir(next);
    else setHangmanDir(next);
  };

  const directionLabel = (d: Direction) =>
    d === 'term-to-translation'
      ? `${labels.source} → ${labels.target}`
      : `${labels.target} → ${labels.source}`;

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-8">
          {progress.streak.count > 0 ? (
            <div className="text-5xl font-bold mb-1">
              Day {progress.streak.count} <span aria-hidden>🔥</span>
            </div>
          ) : (
            <div className="text-3xl font-bold mb-1">Vocamoria</div>
          )}
          <div className="text-slate-600">XP: {progress.totalXP}</div>
        </header>

        <div className="space-y-3">
          <SimpleCard label="Matching" to="/matching" />
          <SimpleCard label="Pairs" to="/pairs" />
          <DirectionCard
            label="Quiz"
            to="/quiz"
            directionLabel={directionLabel(quizDir)}
            onSwap={() => toggle('quiz', quizDir)}
          />
          <DirectionCard
            label="Typing"
            to="/typing"
            directionLabel={directionLabel(typingDir)}
            onSwap={() => toggle('typing', typingDir)}
          />
          <DirectionCard
            label="Hangman"
            to="/hangman"
            directionLabel={directionLabel(hangmanDir)}
            onSwap={() => toggle('hangman', hangmanDir)}
          />
        </div>

        <footer className="mt-8 text-center text-sm text-slate-600 flex items-center justify-center gap-4">
          <Link to="/words" className="underline text-sky-700">
            Words ({vocab.words.length})
          </Link>
          <Link to="/settings" className="underline text-sky-700">
            Settings
          </Link>
        </footer>
      </div>
    </main>
  );
}

function SimpleCard({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="block w-full py-6 rounded-2xl bg-white shadow-sm text-2xl font-semibold text-sky-700 transition active:scale-[0.98] text-center"
    >
      {label}
    </Link>
  );
}

function DirectionCard({
  label,
  to,
  directionLabel,
  onSwap,
}: {
  label: string;
  to: string;
  directionLabel: string;
  onSwap: () => void;
}) {
  return (
    <Link
      to={to}
      className="flex items-center w-full py-5 px-5 rounded-2xl bg-white shadow-sm transition active:scale-[0.98]"
    >
      <div className="flex-1 text-left">
        <div className="text-2xl font-semibold text-sky-700">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{directionLabel}</div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSwap();
        }}
        aria-label={`Swap direction (currently ${directionLabel})`}
        className="ml-3 min-w-11 min-h-11 rounded-lg border border-slate-200 text-slate-600 text-xl font-bold flex items-center justify-center hover:bg-slate-50"
      >
        ⇄
      </button>
    </Link>
  );
}
