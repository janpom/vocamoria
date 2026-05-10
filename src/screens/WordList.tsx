import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { type Mastery, emptyWordMastery, masteryLabel, progressOf } from '../lib/mastery';
import {
  type PracticeState,
  dropWordMastery,
  loadPracticeState,
  savePracticeState,
} from '../lib/practice';
import type { Vocab } from '../lib/types';
import {
  VocabValidationError,
  addWord,
  loadVocab,
  removeWord,
  saveVocab,
  updateWord,
} from '../lib/vocab';

const MASTERY_STYLE: Record<Mastery, string> = {
  Learning: 'bg-amber-100 text-amber-800',
  Practicing: 'bg-sky-100 text-sky-800',
  Mastered: 'bg-emerald-100 text-emerald-800',
};

type Mode = { kind: 'view' } | { kind: 'add' } | { kind: 'edit'; id: string };

export default function WordList() {
  const [vocab, setVocab] = useState<Vocab>(() => loadVocab(localStorage));
  const [state, setState] = useState<PracticeState>(() => loadPracticeState(localStorage));
  const [mode, setMode] = useState<Mode>({ kind: 'view' });

  if (vocab.words.length === 0 && mode.kind !== 'add') {
    return <Navigate to="/import" replace />;
  }

  const persist = (v: Vocab) => {
    saveVocab(localStorage, v);
    setVocab(v);
  };

  const onAdd = (term: string, translation: string) => {
    const next = addWord(vocab, { term, translation });
    persist(next);
    setMode({ kind: 'view' });
  };

  const onEdit = (id: string, term: string, translation: string) => {
    const next = updateWord(vocab, id, { term, translation });
    persist(next);
    setMode({ kind: 'view' });
  };

  const onDelete = (id: string, label: string) => {
    if (!window.confirm(`Remove "${label}"? Its progress is lost.`)) return;
    const nextVocab = removeWord(vocab, id);
    persist(nextVocab);
    const nextState = dropWordMastery(state, id);
    if (nextState !== state) {
      savePracticeState(localStorage, nextState);
      setState(nextState);
    }
  };

  return (
    <main className="min-h-dvh p-6 bg-sky-50 text-slate-900">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Words ({vocab.words.length})</h1>
          <div className="flex items-center gap-3 text-sm">
            {mode.kind !== 'add' && (
              <button
                type="button"
                onClick={() => setMode({ kind: 'add' })}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-medium"
              >
                + Add word
              </button>
            )}
            <Link to="/" className="underline text-sky-700">
              Home
            </Link>
          </div>
        </header>

        {mode.kind === 'add' && (
          <WordForm
            initialTerm=""
            initialTranslation=""
            submitLabel="Add"
            onSubmit={(term, translation) => onAdd(term, translation)}
            onCancel={() => setMode({ kind: 'view' })}
          />
        )}

        <ul className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100">
          {vocab.words.map((w) => {
            const m = state.words[w.id] ?? emptyWordMastery();
            const progress = progressOf(m);
            const mastery = masteryLabel(progress);
            const isEditing = mode.kind === 'edit' && mode.id === w.id;

            if (isEditing) {
              return (
                <li key={w.id} className="p-3">
                  <WordForm
                    initialTerm={w.term}
                    initialTranslation={w.translation}
                    submitLabel="Save"
                    onSubmit={(term, translation) => onEdit(w.id, term, translation)}
                    onCancel={() => setMode({ kind: 'view' })}
                  />
                </li>
              );
            }

            return (
              <li key={w.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{w.term}</div>
                  <div className="text-sm text-slate-600 truncate">{w.translation}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${MASTERY_STYLE[mastery]}`}
                  >
                    {mastery}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {Math.round(progress * 100)}% · {m.successes}/{m.attempts}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setMode({ kind: 'edit', id: w.id })}
                    className="text-xs px-2 py-1 rounded border border-slate-200 text-sky-700 min-h-7"
                    aria-label={`Edit ${w.term}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(w.id, w.term)}
                    className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-700 min-h-7"
                    aria-label={`Remove ${w.term}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

type WordFormProps = {
  initialTerm: string;
  initialTranslation: string;
  submitLabel: string;
  onSubmit: (term: string, translation: string) => void;
  onCancel: () => void;
};

function WordForm({
  initialTerm,
  initialTranslation,
  submitLabel,
  onSubmit,
  onCancel,
}: WordFormProps) {
  const [term, setTerm] = useState(initialTerm);
  const [translation, setTranslation] = useState(initialTranslation);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onSubmit(term, translation);
    } catch (err) {
      if (err instanceof VocabValidationError) setError(err.message);
      else setError(`Unexpected error: ${(err as Error).message}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm p-4 mb-3 space-y-3 border border-sky-200"
    >
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Term (language being learned)</span>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
          className="mt-1 w-full min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white"
          placeholder="e.g. der Hund"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Translation (your language)</span>
        <input
          type="text"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="mt-1 w-full min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white"
          placeholder="e.g. pes"
        />
      </label>
      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!term.trim() || !translation.trim()}
          className="flex-1 min-h-11 py-2 rounded-lg bg-sky-600 text-white font-semibold disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-11 py-2 rounded-lg bg-white border border-slate-300 font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
