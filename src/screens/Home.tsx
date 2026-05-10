import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { loadProgress } from '../lib/progress';
import { loadVocab } from '../lib/vocab';
import RemoteLoader from './RemoteLoader';

export default function Home() {
  const [params] = useSearchParams();
  const remoteUrl = params.get('vocab');
  if (remoteUrl) return <RemoteLoader url={remoteUrl} />;

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
          <GameCard label="Matching" to="/matching" />
          <GameCard label="Quiz" to="/quiz" />
          <GameCard label="Typing" to="/typing" />
        </div>

        <footer className="mt-8 text-center text-sm text-slate-600 flex items-center justify-center gap-4">
          <Link to="/words" className="underline text-sky-700">
            Words ({vocab.words.length})
          </Link>
          <Link to="/settings" className="underline text-sky-700" aria-label="Settings">
            Settings
          </Link>
        </footer>
      </div>
    </main>
  );
}

function GameCard({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="block w-full py-6 rounded-2xl bg-white shadow-sm text-2xl font-semibold text-sky-700 transition active:scale-[0.98] text-center"
    >
      {label}
    </Link>
  );
}
