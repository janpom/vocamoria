import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { type Mastery, masteryLabel } from '../lib/mastery';
import { loadPracticeState } from '../lib/practice';
import { loadVocab } from '../lib/vocab';

const MASTERY_STYLE: Record<Mastery, string> = {
  Learning: 'bg-amber-100 text-amber-800',
  Practicing: 'bg-sky-100 text-sky-800',
  Mastered: 'bg-emerald-100 text-emerald-800',
};

export default function WordList() {
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const state = useMemo(() => loadPracticeState(localStorage), []);

  if (vocab.words.length === 0) return <Navigate to="/import" replace />;

  const rows = vocab.words.map((w) => {
    const m = state.words[w.id];
    const progress = m?.progress ?? 0;
    return {
      word: w,
      progress,
      mastery: masteryLabel(progress),
      attempts: m?.attempts ?? 0,
      successes: m?.successes ?? 0,
    };
  });

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Words ({vocab.words.length})</h1>
          <Link to="/" className="underline text-sky-700 text-sm">
            Home
          </Link>
        </header>

        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.word.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.word.term}</div>
                <div className="text-sm text-slate-600 truncate">{r.word.translation}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${MASTERY_STYLE[r.mastery]}`}
                >
                  {r.mastery}
                </span>
                <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  {Math.round(r.progress * 100)}% · {r.successes}/{r.attempts}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
