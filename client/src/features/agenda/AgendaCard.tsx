import { useAgenda } from './useAgenda';
import { timeLabel } from '../../lib/format';
import { Spinner } from '../../components/icons';
import type { AgendaEvent } from '../../api/types';

const RECENT_WINDOW_MS = 60 * 60_000;

// Timed events vanish an hour after they end; within that hour they linger
// with a highlight. All-day events always show.
function eventEnd(event: AgendaEvent): Date {
  return new Date(event.end ?? event.start);
}

function isVisible(event: AgendaEvent, now: Date): boolean {
  if (event.allDay) return true;
  return eventEnd(event).getTime() >= now.getTime() - RECENT_WINDOW_MS;
}

function hasEnded(event: AgendaEvent, now: Date): boolean {
  return !event.allDay && eventEnd(event) < now;
}

function EventRow({ event, ended }: { event: AgendaEvent; ended: boolean }) {
  return (
    <div
      className={`flex items-start gap-2.5 ${ended ? '-mx-2 rounded-lg bg-amber-500/10 px-2 py-1' : ''}`}
    >
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: event.color ?? '#64748b' }}
        title={event.calendar}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate">{event.title}</div>
        <div className={`text-xs ${ended ? 'text-amber-400' : 'text-slate-500'}`}>
          {event.allDay
            ? 'All day'
            : ended
              ? `Ended ${timeLabel(String(eventEnd(event)))}`
              : timeLabel(event.start)}
        </div>
      </div>
    </div>
  );
}

export default function AgendaCard() {
  const { data, isLoading, isError } = useAgenda();
  const now = new Date();
  const visible = data?.events.filter((e) => isVisible(e, now)) ?? [];

  return (
    <div className="kiosk-card rounded-xl bg-slate-900 p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">
        Today's calendar
      </h2>

      {isLoading && (
        <div className="flex items-center gap-3 py-2 text-slate-400">
          <Spinner />
          Loading...
        </div>
      )}

      {(isError || (!isLoading && !data)) && (
        <p className="text-sm text-slate-500">Calendar unavailable</p>
      )}

      {data && visible.length === 0 && (
        <p className="text-sm text-slate-400">Nothing on the calendar today</p>
      )}

      {visible.length > 0 && (
        <div className="space-y-2.5">
          {visible.map((event) => (
            <EventRow key={`${event.calendar}-${event.id}`} event={event} ended={hasEnded(event, now)} />
          ))}
        </div>
      )}
    </div>
  );
}
