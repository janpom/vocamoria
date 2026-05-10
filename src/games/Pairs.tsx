import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Fragment, type ReactNode, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { applyRoundResult, loadProgress, saveProgress } from '../lib/progress';
import { selectRound, shuffle } from '../lib/selection';
import { newWordStats, recordRecognition } from '../lib/srs';
import type { Progress, Word, WordStats } from '../lib/types';
import { loadVocab } from '../lib/vocab';
import RoundSummary, { type RoundResult } from '../screens/RoundSummary';

const PAIRS_ROUND_SIZE = 8;

type Finished = {
  progress: Progress;
  xpEarned: number;
  streakBumped: boolean;
  results: RoundResult[];
};

function shuffleAvoidingIdentity(round: Word[], reference: Word[]): Word[] {
  if (round.length < 2) return shuffle(round);
  let out = shuffle(round);
  let attempts = 0;
  while (attempts < 8 && out.every((w, i) => w.id === reference[i].id)) {
    out = shuffle(round);
    attempts += 1;
  }
  return out;
}

export default function Pairs() {
  const navigate = useNavigate();
  const vocab = useMemo(() => loadVocab(localStorage), []);
  const startingProgress = useMemo(() => loadProgress(localStorage), []);
  const round = useMemo(
    () => selectRound(vocab, startingProgress, new Date(), { size: PAIRS_ROUND_SIZE }),
    [vocab, startingProgress],
  );
  const leftCol = useMemo(() => shuffle(round), [round]);
  const initialRight = useMemo(
    () => shuffleAvoidingIdentity(round, leftCol),
    [round, leftCol],
  );

  const [rightCol, setRightCol] = useState<Word[]>(() => initialRight);
  const [submitted, setSubmitted] = useState(false);
  const [finished, setFinished] = useState<Finished | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRightCol((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id);
      const newIndex = prev.findIndex((w) => w.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const onSubmit = () => setSubmitted(true);

  const onContinue = () => {
    const now = new Date();
    const updates: Record<string, WordStats> = {};
    const results: RoundResult[] = [];
    let correctCount = 0;
    for (let i = 0; i < leftCol.length; i++) {
      const leftWord = leftCol[i];
      const right = rightCol[i];
      const isCorrect = right?.id === leftWord.id;
      results.push({ word: leftWord, correct: isCorrect });
      const prev = startingProgress.words[leftWord.id] ?? newWordStats(now);
      if (isCorrect) {
        updates[leftWord.id] = recordRecognition(prev, now);
        correctCount += 1;
      } else {
        updates[leftWord.id] = {
          ...prev,
          seen: prev.seen + 1,
          lastSeen: now.toISOString(),
        };
      }
    }
    const xpEarned = correctCount * 10 + 50;
    const newProgress = applyRoundResult(startingProgress, updates, xpEarned, now);
    saveProgress(localStorage, newProgress);
    setFinished({
      progress: newProgress,
      xpEarned,
      streakBumped: newProgress.streak.count > startingProgress.streak.count,
      results,
    });
  };

  const correctSoFar = submitted
    ? leftCol.reduce((acc, w, i) => acc + (rightCol[i]?.id === w.id ? 1 : 0), 0)
    : 0;

  const cellBase =
    'min-h-14 px-3 py-2 rounded-xl text-sm font-medium border-2 flex items-center justify-center text-center break-words select-none';

  const styleFor = (isCorrect: boolean, isWrong: boolean, baseIdle: string): string => {
    if (isCorrect) return 'bg-emerald-50 border-emerald-400 text-emerald-900';
    if (isWrong) return 'bg-rose-50 border-rose-400 text-rose-900';
    return baseIdle;
  };

  return (
    <main className="min-h-dvh p-4 bg-sky-50 text-slate-900 flex flex-col">
      <header className="max-w-md w-full mx-auto mb-3 flex items-center justify-between text-sm text-slate-600">
        <button type="button" onClick={() => navigate('/')} className="underline text-sky-700">
          Home
        </button>
        <span>
          {submitted ? `${correctSoFar} / ${leftCol.length} correct` : 'Reorder right column'}
        </span>
      </header>

      <p className="max-w-md w-full mx-auto mb-3 text-xs text-slate-500 text-center">
        {submitted
          ? 'Submitted. Green rows are correct, red rows are wrong.'
          : 'Drag the right-column items to align each row with the term on the left, then Submit.'}
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={rightCol.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="max-w-md w-full mx-auto flex-1 grid grid-cols-2 gap-2">
            {leftCol.map((leftWord, i) => {
              const right = rightCol[i];
              const isCorrect = submitted && right?.id === leftWord.id;
              const isWrong = submitted && !isCorrect;
              return (
                <Fragment key={`row-${i}`}>
                  <div
                    className={`${cellBase} ${styleFor(isCorrect, isWrong, 'bg-white border-transparent shadow-sm')}`}
                  >
                    {leftWord.term}
                  </div>
                  <SortableCell
                    id={right.id}
                    disabled={submitted}
                    className={`${cellBase} ${styleFor(isCorrect, isWrong, submitted ? 'bg-white border-transparent shadow-sm' : 'bg-white border-sky-200 shadow-sm cursor-grab active:cursor-grabbing')}`}
                  >
                    {right.translation}
                  </SortableCell>
                </Fragment>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="max-w-md w-full mx-auto mt-4">
        {!submitted ? (
          <button
            type="button"
            onClick={onSubmit}
            className="w-full min-h-12 py-3 rounded-xl bg-sky-600 text-white font-semibold"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            className="w-full min-h-12 py-3 rounded-xl bg-emerald-600 text-white font-semibold"
          >
            Continue
          </button>
        )}
      </div>
    </main>
  );
}

type SortableCellProps = {
  id: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

function SortableCell({ id, disabled, className, children }: SortableCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id,
    disabled,
    transition: null,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(disabled ? {} : listeners)}
      className={className}
    >
      {children}
    </div>
  );
}
