import { useState } from 'react';
import { useCompletions, useCommandLog } from './useHistory';
import { dateTimeLabel } from '../../lib/format';
import { SourceIcon, Spinner } from '../../components/icons';
import type { CommandLogEntry } from '../../api/types';

const OUTCOME_TONES: Record<CommandLogEntry['outcome'], string> = {
  applied: 'bg-emerald-900 text-emerald-200',
  ambiguous: 'bg-amber-900 text-amber-200',
  no_match: 'bg-amber-900 text-amber-200',
  parse_failed: 'bg-red-900 text-red-200',
  error: 'bg-red-900 text-red-200',
};

function Loading() {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
      <Spinner />
      Loading...
    </div>
  );
}

function CompletionsList() {
  const { data, isLoading } = useCompletions();
  if (isLoading) return <Loading />;
  if (!data?.length) return <p className="py-8 text-center text-slate-400">Nothing completed yet.</p>;
  return (
    <div className="space-y-2">
      {data.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3">
          <span className="min-w-0 flex-1 truncate">{c.title}</span>
          <span className="whitespace-nowrap text-sm text-slate-400">{dateTimeLabel(c.completed_at)}</span>
        </div>
      ))}
    </div>
  );
}

function CommandLogList() {
  const { data, isLoading } = useCommandLog();
  if (isLoading) return <Loading />;
  if (!data?.length) return <p className="py-8 text-center text-slate-400">No commands since the server started.</p>;
  return (
    <div className="space-y-2">
      {data.map((entry) => (
        <div key={entry.id} className="rounded-xl bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              <SourceIcon via={entry.source} />
            </span>
            <span className="min-w-0 flex-1 truncate">“{entry.raw_text}”</span>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${OUTCOME_TONES[entry.outcome]}`}>
              {entry.outcome.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span>{dateTimeLabel(entry.created_at)}</span>
            {entry.task_title && <span>→ {entry.task_title}</span>}
            {entry.outcome === 'ambiguous' && entry.detail?.scores && (
              <span>
                candidates: {entry.detail.scores.slice(0, 3).map((s) => `${s.title} (${s.score})`).join(', ')}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HistoryView() {
  const [view, setView] = useState<'completions' | 'commands'>('completions');
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {(['completions', 'commands'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              view === v ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {v === 'completions' ? 'Completions' : 'Command log'}
          </button>
        ))}
        {view === 'commands' && <span className="text-xs text-slate-500">since server restart</span>}
      </div>
      {view === 'completions' ? <CompletionsList /> : <CommandLogList />}
    </div>
  );
}
