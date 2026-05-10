import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { type PickedExercise, pickNextExercise } from '../lib/exerciseSelector';
import { type ExerciseType, applyExerciseResult, emptyWordMastery, overallProgress } from '../lib/mastery';
import {
  type PracticeState,
  loadPracticeState,
  savePracticeState,
} from '../lib/practice';
import { loadVocab } from '../lib/vocab';
import HangmanExercise from '../practice/HangmanExercise';
import PairsExercise from '../practice/PairsExercise';
import QuizExercise from '../practice/QuizExercise';
import TypingExercise from '../practice/TypingExercise';
import type { Direction, ExerciseOutcome } from '../practice/types';

function exerciseDirection(t: ExerciseType): Direction | null {
  if (t === 'pairs') return null;
  return t.endsWith('-l-n') ? 'l-n' : 'n-l';
}

export default function Practice() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const [state, setState] = useState<PracticeState>(() => loadPracticeState(localStorage));
  const counter = useRef(0);
  const [picked, setPicked] = useState<{ ex: PickedExercise; key: number } | null>(() => {
    if (vocab.words.length === 0) return null;
    return { ex: pickNextExercise(vocab, loadPracticeState(localStorage)), key: 0 };
  });

  if (vocab.words.length === 0) return <Navigate to="/import" replace />;
  if (!picked) return null;

  const overall = overallProgress(vocab, state.words);

  const onComplete = (outcome: ExerciseOutcome) => {
    let next = state;
    for (const r of outcome) {
      const prev = next.words[r.wordId] ?? emptyWordMastery();
      next = {
        ...next,
        words: {
          ...next.words,
          [r.wordId]: applyExerciseResult(prev, picked.ex.exType, r.success),
        },
      };
    }
    savePracticeState(localStorage, next);
    setState(next);
    counter.current += 1;
    setPicked({ ex: pickNextExercise(vocab, next), key: counter.current });
  };

  const dir = exerciseDirection(picked.ex.exType);

  let body;
  if (picked.ex.exType === 'pairs') {
    body = (
      <PairsExercise
        key={picked.key}
        words={picked.ex.words}
        vocab={vocab}
        onComplete={onComplete}
      />
    );
  } else if (picked.ex.exType.startsWith('quiz')) {
    body = (
      <QuizExercise
        key={picked.key}
        word={picked.ex.words[0]}
        vocab={vocab}
        direction={dir!}
        onComplete={onComplete}
      />
    );
  } else if (picked.ex.exType.startsWith('typing')) {
    body = (
      <TypingExercise
        key={picked.key}
        word={picked.ex.words[0]}
        vocab={vocab}
        direction={dir!}
        onComplete={onComplete}
      />
    );
  } else {
    body = (
      <HangmanExercise
        key={picked.key}
        word={picked.ex.words[0]}
        vocab={vocab}
        direction={dir!}
        onComplete={onComplete}
      />
    );
  }

  const pct = Math.round(overall * 100);

  return (
    <main className="min-h-dvh p-4 bg-sky-50 text-slate-900 flex flex-col">
      <header className="max-w-2xl w-full mx-auto mb-3 flex items-center justify-between text-sm text-slate-600">
        <button type="button" onClick={() => navigate('/')} className="underline text-sky-700">
          Home
        </button>
        <span className="tabular-nums">{pct}%</span>
      </header>

      <div className="max-w-2xl w-full mx-auto h-3 bg-white rounded-full overflow-hidden mb-4">
        <div
          className={`h-full ${overall >= 1 ? 'bg-emerald-500' : 'bg-sky-500'} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col">{body}</div>
    </main>
  );
}
