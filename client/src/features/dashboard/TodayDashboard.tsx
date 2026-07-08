import { useDashboard, useCompleteTask, useUndoCompletion } from './useDashboard';
import TaskCard from './TaskCard';
import { timeLabel } from '../../lib/format';
import { ErrorIcon, HistoryIcon, Spinner } from '../../components/icons';

type SectionProps = { title: string; tone?: 'red' | 'blue' | 'muted'; children: React.ReactNode };

function Section({ title, tone = 'muted', children }: SectionProps) {
  const color =
    tone === 'red' ? 'text-red-400' : tone === 'blue' ? 'text-blue-400' : 'text-slate-500';
  return (
    <section className="mt-6 first:mt-0">
      <h2 className={`mb-3 text-sm font-bold uppercase tracking-widest ${color}`}>{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function TodayDashboard() {
  const { data, isLoading, isError } = useDashboard();
  const complete = useCompleteTask();
  const undo = useUndoCompletion();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
        <Spinner />
        Loading tasks...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-950 px-6 py-4 text-sm text-red-300">
        <ErrorIcon />
        Failed to load the dashboard. Check the server's Google connection and try again.
      </div>
    );
  }

  const now = new Date();
  const dueNow = data.dueToday.filter((t) => new Date(t.next_due_at ?? 0) <= now);
  const later = data.dueToday.filter((t) => new Date(t.next_due_at ?? 0) > now);
  const allCaughtUp = data.overdue.length === 0 && dueNow.length === 0;

  return (
    <div>
      {allCaughtUp && (
        <div className="kiosk-card rounded-xl bg-slate-900 p-8 text-center">
          <div className="text-4xl">🎉</div>
          <div className="mt-2 text-2xl font-semibold">All caught up</div>
          {later.length > 0 && (
            <div className="mt-1 text-slate-400">
              {later.length} more task{later.length > 1 ? 's' : ''} later today
            </div>
          )}
        </div>
      )}

      {data.overdue.length > 0 && (
        <Section title="Overdue" tone="red">
          {data.overdue.map((t) => (
            <TaskCard key={t.id} task={t} variant="overdue" onDone={(id) => complete.mutate(id)} busy={complete.isPending} />
          ))}
        </Section>
      )}

      {dueNow.length > 0 && (
        <Section title="Due now" tone="blue">
          {dueNow.map((t) => (
            <TaskCard key={t.id} task={t} variant="now" onDone={(id) => complete.mutate(id)} busy={complete.isPending} />
          ))}
        </Section>
      )}

      {later.length > 0 && (
        <Section title="Later today">
          {later.map((t) => (
            <TaskCard key={t.id} task={t} variant="later" onDone={(id) => complete.mutate(id)} busy={complete.isPending} />
          ))}
        </Section>
      )}

      {data.dueSoon.length > 0 && (
        <Section title="Next 7 days">
          {data.dueSoon.map((t) => (
            <TaskCard key={t.id} task={t} variant="later" onDone={(id) => complete.mutate(id)} busy={complete.isPending} />
          ))}
        </Section>
      )}

      {data.doneToday.length > 0 && (
        <Section title="Done today">
          {data.doneToday.map((c) => (
            <div key={c.id} className="kiosk-card flex items-center gap-4 rounded-xl bg-slate-900/60 p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xl text-slate-400 line-through">{c.title}</div>
                <div className="mt-0.5 text-sm text-slate-500">at {timeLabel(c.completed_at)}</div>
              </div>
              {!c.recurring && (
                <button
                  type="button"
                  onClick={() => undo.mutate(c.id)}
                  disabled={undo.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  <HistoryIcon />
                  Undo
                </button>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
