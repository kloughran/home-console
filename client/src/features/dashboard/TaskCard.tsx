import { CheckIcon } from '../../components/icons';
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
  return (
    <div className={`kiosk-card flex items-center gap-4 rounded-xl border-l-4 bg-slate-900 p-4 ${ACCENTS[variant]}`}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-2xl font-semibold">{task.title}</div>
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
    </div>
  );
}
