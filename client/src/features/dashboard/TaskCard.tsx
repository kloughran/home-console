import { useState } from 'react';
import { CheckIcon, CloseIcon } from '../../components/icons';
import { useUpdateTask } from '../tasks/useTasks';
import { recurrenceLabel, dueLabelForTask } from '../../lib/format';
import type { Task } from '../../api/types';

type Props = {
  task: Task;
  variant: 'overdue' | 'now' | 'later';
  onDone: (id: string) => void;
  busy: boolean;
};

const ACCENTS = {
  overdue: 'border-red-500',
  now: 'border-blue-500',
  later: 'border-slate-700',
};

export default function TaskCard({ task, variant, onDone, busy }: Props) {
  const [draft, setDraft] = useState<string | null>(null); // null = not editing
  const updateTask = useUpdateTask();

  const save = () => {
    const title = (draft ?? '').trim();
    if (title && title !== task.title) updateTask.mutate({ id: task.id, data: { title } });
    setDraft(null);
  };

  return (
    <div className={`kiosk-card flex items-center gap-4 rounded-xl border-l-4 bg-slate-900 p-4 ${ACCENTS[variant]}`}>
      <div className="min-w-0 flex-1">
        {draft === null ? (
          <button
            type="button"
            onClick={() => setDraft(task.title)}
            title="Tap to edit"
            data-testid={`edit-task-${task.id}`}
            className="block w-full cursor-text truncate text-left text-2xl font-semibold"
          >
            {task.title}
          </button>
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setDraft(null);
            }}
            data-testid={`edit-task-input-${task.id}`}
            className="w-full rounded-lg bg-slate-800 px-3 py-1 text-2xl font-semibold outline-none ring-2 ring-blue-500"
          />
        )}
        <div className="mt-1 text-slate-400">
          {variant === 'overdue' ? (
            <span className="font-medium text-red-400">{dueLabelForTask(task)}</span>
          ) : (
            dueLabelForTask(task)
          )}
          <span className="mx-2">·</span>
          {recurrenceLabel(task)}
        </div>
      </div>
      {draft === null ? (
        <button
          type="button"
          onClick={() => onDone(task.id)}
          disabled={busy}
          data-testid={`complete-task-${task.id}`}
          className="inline-flex min-h-16 min-w-28 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xl font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckIcon />
          Done
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={save}
            disabled={updateTask.isPending}
            data-testid={`save-task-${task.id}`}
            className="inline-flex min-h-16 min-w-20 items-center justify-center gap-2 rounded-xl bg-blue-600 text-lg font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            <CheckIcon />
            Save
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setDraft(null)}
            className="inline-flex min-h-16 min-w-16 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700"
            aria-label="Cancel edit"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
