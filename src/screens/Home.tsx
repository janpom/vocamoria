import { Link, Navigate } from 'react-router-dom';
import { loadProgress } from '../lib/progress';
import { loadVocab } from '../lib/vocab';

export default function Home() {
  const vocab = loadVocab(localStorage);
  const progress = loadProgress(localStorage);

  if (vocab.words.length === 0) {
    return <Navigate to="/import" replace />;
  }

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
          <GameCard label="Matching" />
          <GameCard label="Quiz" to="/quiz" />
          <GameCard label="Typing" />
        </div>

        <footer className="mt-8 text-center text-sm text-slate-600 flex items-center justify-center gap-4">
          <span>{vocab.words.length} words loaded</span>
          <Link to="/import" className="underline text-sky-700">
            Re-import vocab
          </Link>
        </footer>
      </div>
    </main>
  );
}

function GameCard({ label, to }: { label: string; to?: string }) {
  const className =
    'w-full py-6 rounded-2xl bg-white shadow-sm text-2xl font-semibold text-sky-700 transition active:scale-[0.98] block text-center';
  if (to) {
    return (
      <Link to={to} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled
      className={`${className} opacity-60 cursor-not-allowed`}
    >
      {label}
      <span className="block text-xs font-normal text-slate-500 mt-1">coming soon</span>
    </button>
  );
}
