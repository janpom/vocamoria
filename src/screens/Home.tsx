import { useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { isMastered, overallProgress } from '../lib/mastery';
import { loadPracticeState } from '../lib/practice';
import { loadVocab } from '../lib/vocab';
import RemoteLoader from './RemoteLoader';

export default function Home() {
  const [params] = useSearchParams();
  const remoteUrl = params.get('vocab');

  // Hooks must run in the same order every render — call them before any
  // conditional return. Key the memos off remoteUrl so when RemoteLoader
  // finishes and navigates back to `/`, the localStorage read picks up the
  // freshly-saved vocab.
  const vocab = useMemo(() => loadVocab(localStorage), [remoteUrl]);
  const state = useMemo(() => loadPracticeState(localStorage), [remoteUrl]);

  if (remoteUrl) return <RemoteLoader url={remoteUrl} />;

  if (vocab.words.length === 0) {
    return <Navigate to="/import" replace />;
  }

  const overall = overallProgress(vocab, state.words);
  const pct = Math.round(overall * 100);
  const mastered = vocab.words.filter((w) => {
    const m = state.words[w.id];
    return m ? isMastered(m) : false;
  }).length;
  const isDone = overall >= 1;

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900 flex flex-col">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <header className="text-center mb-8 mt-4">
          <div className="text-3xl font-bold mb-2">Vocamoria</div>
          <div className="text-sm text-slate-600">
            {mastered} / {vocab.words.length} words mastered
          </div>
        </header>

        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-slate-600">Progress</span>
            <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          </div>
          <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-sky-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isDone && (
            <p className="mt-3 text-center text-emerald-700 font-semibold">
              All words mastered! Practice on for review.
            </p>
          )}
        </section>

        <Link
          to="/practice"
          className="block w-full py-6 rounded-2xl bg-sky-600 text-white text-2xl font-bold text-center shadow-md active:scale-[0.98] transition"
        >
          Practice
        </Link>

        <footer className="mt-auto pt-8 text-center text-sm text-slate-600 flex items-center justify-center gap-4">
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
