import { useActionState, useEffect, useRef, useState } from 'react';
import { useCreateTask, useUpdateTask } from './useTasks';
import { CloseIcon } from '../../components/icons';
import type { Task, TaskInput, RecurrenceType } from '../../api/types';

// When `task` is provided the form is in edit mode (PUT); otherwise it
// creates a brand-new task (POST). Recurrence type and weekdays are
// controlled state because they drive which fields render.
type Props = { onClose: () => void; task?: Task };

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_LABELS: Record<string, string> = {
  sun: 'Su', mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa',
};

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'interval', label: 'Every N days' },
  { value: 'weekly', label: 'Days of week' },
];

export default function TaskForm({ onClose, task }: Props) {
  const isEdit = !!task;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: updateTask } = useUpdateTask();

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    task?.recurrence_type ?? 'interval'
  );
  const [days, setDays] = useState<string[]>(
    (task?.days_of_week ?? '').split(',').filter(Boolean)
  );

  const [error, formAction, isPending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      const input: TaskInput = {
        title: String(formData.get('title') ?? '').trim(),
        recurrence_type: recurrenceType,
        interval_days:
          recurrenceType === 'interval' ? Number(formData.get('interval_days') ?? 0) : null,
        days_of_week: recurrenceType === 'weekly' ? days : [],
        time_of_day: `${String(formData.get('time_of_day') ?? '09:00')}:00`,
      };

      if (recurrenceType === 'weekly' && days.length === 0) {
        return 'Pick at least one weekday';
      }

      try {
        if (isEdit && task) {
          await updateTask({ id: task.id, data: input });
        } else {
          await createTask(input);
        }
        onClose();
        return null;
      } catch (err) {
        const fallback = isEdit ? 'Failed to update task' : 'Failed to create task';
        return err instanceof Error ? err.message : fallback;
      }
    },
    null
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="rounded-xl shadow-2xl p-0 max-w-lg w-full bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <form action={formAction} className="p-6 space-y-4">
          <Field
            name="title"
            label="Title"
            placeholder="water my coleus"
            defaultValue={task?.title}
          />

          <div>
            <span className="block text-xs font-medium text-slate-400 mb-1">Repeats</span>
            <div className="flex gap-2">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecurrenceType(opt.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    recurrenceType === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {recurrenceType === 'interval' && (
            <Field
              name="interval_days"
              label="Every how many days?"
              type="number"
              min={1}
              defaultValue={String(task?.interval_days ?? 2)}
              narrow
            />
          )}

          {recurrenceType === 'weekly' && (
            <div>
              <span className="block text-xs font-medium text-slate-400 mb-1">On days</span>
              <div className="flex gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setDays((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                      )
                    }
                    className={`h-11 w-11 rounded-lg text-sm font-semibold transition-colors ${
                      days.includes(d)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field
            name="time_of_day"
            label="At time"
            type="time"
            defaultValue={(task?.time_of_day ?? '09:00:00').slice(0, 5)}
            narrow
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-950 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              data-testid="save-task"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// Small local Field component — keeps the form markup readable.
type FieldProps = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  min?: number;
  defaultValue?: string;
  narrow?: boolean;
};

function Field({ name, label, type = 'text', placeholder, min, defaultValue, narrow }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-slate-400 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        min={min}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`${narrow ? 'w-32' : 'w-full'} px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
      />
    </div>
  );
}
