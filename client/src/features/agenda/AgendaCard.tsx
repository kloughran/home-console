import { useAgenda } from './useAgenda';
import { timeLabel } from '../../lib/format';
import { Spinner } from '../../components/icons';
import type { AgendaEvent } from '../../api/types';

function EventRow({ event }: { event: AgendaEvent }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: event.color ?? '#64748b' }}
        title={event.calendar}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate">{event.title}</div>
        <div className="text-xs text-slate-500">
          {event.allDay ? 'All day' : timeLabel(event.start)}
        </div>
      </div>
    </div>
  );
}

export default function AgendaCard() {
  const { data, isLoading, isError } = useAgenda();

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

      {data && data.events.length === 0 && (
        <p className="text-sm text-slate-400">Nothing on the calendar today</p>
      )}

      {data && data.events.length > 0 && (
        <div className="space-y-2.5">
          {data.events.map((event) => (
            <EventRow key={`${event.calendar}-${event.id}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
