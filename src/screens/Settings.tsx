import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PROGRESS_KEY } from '../lib/progress';
import { VOCAB_KEY } from '../lib/vocab';

export default function Settings() {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<'progress' | 'vocab' | null>(null);

  const resetProgress = () => {
    localStorage.removeItem(PROGRESS_KEY);
    setConfirming(null);
    navigate('/');
  };

  const resetVocab = () => {
    localStorage.removeItem(VOCAB_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    setConfirming(null);
    navigate('/import');
  };

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Link to="/" className="underline text-sky-700 text-sm">
            Home
          </Link>
        </header>

        <section className="space-y-3">
          <Link
            to="/import"
            className="block w-full min-h-12 py-3 px-4 rounded-xl bg-white border border-slate-200 font-medium text-sky-700 text-center"
          >
            Import vocab
          </Link>

          <ResetButton
            label="Reset progress"
            confirm="Reset all word stats, streak, and XP? Your vocab list stays."
            confirming={confirming === 'progress'}
            onAsk={() => setConfirming('progress')}
            onCancel={() => setConfirming(null)}
            onConfirm={resetProgress}
          />

          <ResetButton
            label="Reset vocab and progress"
            confirm="Remove the entire vocab list and all progress? You will need to re-import."
            confirming={confirming === 'vocab'}
            onAsk={() => setConfirming('vocab')}
            onCancel={() => setConfirming(null)}
            onConfirm={resetVocab}
            destructive
          />
        </section>
      </div>
    </main>
  );
}

type ResetButtonProps = {
  label: string;
  confirm: string;
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
};

function ResetButton({
  label,
  confirm,
  confirming,
  onAsk,
  onCancel,
  onConfirm,
  destructive = false,
}: ResetButtonProps) {
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={onAsk}
        className={`block w-full min-h-12 py-3 px-4 rounded-xl border font-medium text-center ${
          destructive
            ? 'bg-white border-rose-300 text-rose-700'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        {label}
      </button>
    );
  }
  return (
    <div className="rounded-xl bg-white border border-rose-300 p-4 space-y-3">
      <p className="text-sm">{confirm}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 min-h-11 py-2 rounded-lg bg-rose-600 text-white font-semibold"
        >
          Yes, do it
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-11 py-2 rounded-lg bg-white border border-slate-300 font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
