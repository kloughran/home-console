import { useAgenda } from './useAgenda';
import { timeLabel } from '../../lib/format';
import { eventEnd, eventState, isVisible, type EventState } from '../../lib/agendaState';
import { Spinner } from '../../components/icons';
import type { AgendaEvent } from '../../api/types';

const ROW_TONES: Record<EventState, { row: string; time: string }> = {
  ended: { row: '-mx-2 rounded-lg bg-purple-500/10 px-2 py-1', time: 'text-purple-300' },
  active: { row: '-mx-2 rounded-lg bg-emerald-500/10 px-2 py-1', time: 'text-emerald-400' },
  normal: { row: '', time: 'text-slate-500' },
};

function timeText(event: AgendaEvent, state: EventState): string {
  if (event.allDay) return 'All day';
  if (state === 'ended') return `Ended ${timeLabel(String(eventEnd(event)))}`;
  if (state === 'active') return `Until ${timeLabel(String(eventEnd(event)))}`;
  return timeLabel(event.start);
}

function EventRow({ event, state }: { event: AgendaEvent; state: EventState }) {
  const tone = ROW_TONES[state];
  return (
    <div className={`flex items-start gap-2.5 ${tone.row}`}>
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: event.color ?? '#64748b' }}
        title={event.calendar}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate">{event.title}</div>
        <div className={`text-xs ${tone.time}`}>{timeText(event, state)}</div>
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
            <EventRow key={`${event.calendar}-${event.id}`} event={event} state={eventState(event, now)} />
          ))}
        </div>
      )}
    </div>
  );
}
