import { useState } from 'react';
import { useTasks, useUpdateTask, useDeleteTask } from './useTasks';
import TaskForm from './TaskForm';
import { recurrenceLabel, nextDueLabel } from '../../lib/format';
import {
  PlusIcon,
  EditIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  ErrorIcon,
  Spinner,
} from '../../components/icons';
import type { Task } from '../../api/types';

export default function TaskList() {
  const { data: tasks, isLoading, isError } = useTasks();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
        <Spinner />
        Loading tasks...
      </div>
    );
  }

  if (isError || !tasks) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-950 px-6 py-4 text-sm text-red-300">
        <ErrorIcon />
        Failed to load tasks. Check the server's Google connection and try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          data-testid="add-task"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <PlusIcon />
          New task
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {tasks.length === 0 && (
          <p className="py-8 text-center text-slate-400">
            No tasks yet — add one above or ask Google.
          </p>
        )}
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={() => setEditing(task)} />
        ))}
      </div>

      {creating && <TaskForm onClose={() => setCreating(false)} />}
      {editing && <TaskForm task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// One row in the task list with its edit/pause/delete actions.
function TaskRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const pausable = task.managed && task.recurrence_type !== 'once';

  return (
    <div className={`rounded-xl bg-slate-900 p-4 ${task.active ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xl font-semibold">{task.title}</span>
            {!task.active && (
              <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-semibold uppercase text-slate-300">
                paused
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {recurrenceLabel(task)}
            {task.active === 1 && task.next_due_at && <> · next {nextDueLabel(task)}</>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          >
            <EditIcon />
            Edit
          </button>
          {pausable && (
            <button
              type="button"
              onClick={() =>
                updateTask.mutate({ id: task.id, data: { active: task.active ? 0 : 1 } })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
            >
              {task.active ? <PauseIcon /> : <PlayIcon />}
              {task.active ? 'Pause' : 'Resume'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${task.title}" from Google Tasks?`)) {
                deleteTask.mutate(task.id);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-950"
          >
            <TrashIcon />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
