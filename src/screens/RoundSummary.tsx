import type { Word } from '../lib/types';

export type RoundResult = {
  word: Word;
  correct: boolean;
};

type Props = {
  results: RoundResult[];
  xpEarned: number;
  streakCount: number;
  streakBumped: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
};

export default function RoundSummary({
  results,
  xpEarned,
  streakCount,
  streakBumped,
  onPlayAgain,
  onHome,
}: Props) {
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const missed = results.filter((r) => !r.correct);
  const flawless = total > 0 && correct === total;

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900">
      <div className="max-w-md mx-auto text-center space-y-4">
        <h1 className="text-3xl font-bold">{flawless ? 'Flawless!' : 'Round done'}</h1>
        <div className="text-6xl font-bold text-sky-600">
          {correct}/{total}
        </div>
        <div className="text-xl font-medium text-emerald-700">+{xpEarned} XP</div>
        {streakCount > 0 && (
          <div className="text-lg">
            Day {streakCount} <span aria-hidden>🔥</span>
            {streakBumped && (
              <span className="ml-2 text-sm text-emerald-700 font-medium">streak +1</span>
            )}
          </div>
        )}

        {missed.length > 0 && (
          <section className="text-left bg-white rounded-2xl shadow-sm p-4 mt-6">
            <h2 className="font-semibold mb-2">To review</h2>
            <ul className="divide-y divide-slate-100">
              {missed.map((r) => (
                <li key={r.word.id} className="py-2 flex justify-between gap-3">
                  <span className="font-medium">{r.word.term}</span>
                  <span className="text-slate-600 text-right">{r.word.translation}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 min-h-11 py-3 rounded-xl bg-sky-600 text-white font-semibold active:scale-95 transition"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="flex-1 min-h-11 py-3 rounded-xl bg-white text-sky-700 font-semibold border border-sky-300 active:scale-95 transition"
          >
            Home
          </button>
        </div>
      </div>
    </main>
  );
}
