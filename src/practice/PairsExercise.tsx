import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
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
import { isValidPair } from '../lib/answers';
import { shuffle } from '../lib/selection';
import type { Word } from '../lib/types';
import type { ExerciseOutcome, PairsExerciseProps } from './types';

function shuffleAvoidingIdentity(words: Word[], reference: Word[]): Word[] {
  if (words.length < 2) return shuffle(words);
  let out = shuffle(words);
  let attempts = 0;
  while (attempts < 8 && out.every((w, i) => w.id === reference[i].id)) {
    out = shuffle(words);
    attempts += 1;
  }
  return out;
}

export default function PairsExercise({ words, vocab, onComplete }: PairsExerciseProps) {
  const leftCol = useMemo(() => shuffle(words), [words]);
  const initialRight = useMemo(
    () => shuffleAvoidingIdentity(words, leftCol),
    [words, leftCol],
  );

  const [rightCol, setRightCol] = useState<Word[]>(() => initialRight);
  const [submitted, setSubmitted] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (_event: DragStartEvent) => {
    setPickedId(null);
  };

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

  const onCellClick = (id: string) => {
    if (submitted) return;
    if (pickedId === null) {
      setPickedId(id);
      return;
    }
    if (pickedId === id) {
      setPickedId(null);
      return;
    }
    setRightCol((prev) => {
      const i = prev.findIndex((w) => w.id === pickedId);
      const j = prev.findIndex((w) => w.id === id);
      if (i < 0 || j < 0) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setPickedId(null);
  };

  const onSubmit = () => setSubmitted(true);

  const isRowCorrect = (i: number): boolean => {
    const right = rightCol[i];
    const leftWord = leftCol[i];
    if (!right) return false;
    return isValidPair(leftWord.term, right.translation, vocab);
  };

  const onContinue = () => {
    const out: ExerciseOutcome = leftCol.map((leftWord, i) => ({
      wordId: leftWord.id,
      success: isRowCorrect(i),
    }));
    onComplete(out);
  };

  const correctSoFar = submitted
    ? leftCol.reduce((acc, _w, i) => acc + (isRowCorrect(i) ? 1 : 0), 0)
    : 0;

  const cellBase =
    'min-h-14 px-3 py-2 rounded-xl text-sm font-medium border-2 flex items-center justify-center text-center break-words select-none';

  const styleFor = (isCorrect: boolean, isWrong: boolean, baseIdle: string): string => {
    if (isCorrect) return 'bg-emerald-50 border-emerald-400 text-emerald-900';
    if (isWrong) return 'bg-rose-50 border-rose-400 text-rose-900';
    return baseIdle;
  };

  return (
    <section className="max-w-md w-full mx-auto flex-1 flex flex-col">
      <p className="mb-3 text-xs text-slate-500 text-center">
        {submitted
          ? `${correctSoFar} / ${leftCol.length} correct. Green rows are right, red rows are wrong.`
          : 'Pairs · drag, or tap two cells in the right column to swap them. Match each row to the left, then Submit.'}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={rightCol.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 grid grid-cols-2 gap-2">
            {leftCol.map((leftWord, i) => {
              const right = rightCol[i];
              const isCorrect = submitted && isRowCorrect(i);
              const isWrong = submitted && !isCorrect;
              const isPicked = !submitted && pickedId === right.id;
              const rightIdle = submitted
                ? 'bg-white border-transparent shadow-sm'
                : isPicked
                  ? 'bg-sky-100 border-sky-500 text-sky-900 shadow-sm cursor-pointer'
                  : 'bg-white border-sky-200 shadow-sm cursor-grab active:cursor-grabbing';
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
                    onClick={() => onCellClick(right.id)}
                    className={`${cellBase} ${styleFor(isCorrect, isWrong, rightIdle)}`}
                  >
                    {right.translation}
                  </SortableCell>
                </Fragment>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4">
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
    </section>
  );
}

type SortableCellProps = {
  id: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
};

function SortableCell({ id, disabled, className, onClick, children }: SortableCellProps) {
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
      onClick={onClick}
      className={className}
    >
      {children}
    </div>
  );
}
