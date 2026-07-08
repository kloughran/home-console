import { useEffect, useState } from 'react';
import { useSendCommand } from './useCommands';
import type { CommandResult } from '../../api/types';

const TONES: Record<CommandResult['outcome'], string> = {
  applied: 'bg-emerald-950 border-emerald-700 text-emerald-200',
  ambiguous: 'bg-amber-950 border-amber-700 text-amber-200',
  no_match: 'bg-amber-950 border-amber-700 text-amber-200',
  parse_failed: 'bg-red-950 border-red-700 text-red-200',
  error: 'bg-red-950 border-red-700 text-red-200',
};

export default function CommandBar() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const send = useSendCommand();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || send.isPending) return;
    try {
      const r = await send.mutateAsync(text.trim());
      setResult(r);
      if (r.outcome === 'applied') setText('');
    } catch {
      setResult({
        intent: 'unknown',
        outcome: 'error',
        task: null,
        completion: null,
        message: 'Server error — try again.',
      });
    }
  };

  // Toast auto-dismisses so stale results don't linger on the kiosk.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 6_000);
    return () => clearTimeout(timer);
  }, [result]);

  return (
    <div>
      <label htmlFor="command-input" className="mb-1 block text-sm text-slate-400">
        Add or complete tasks in plain English — synced with your Google Tasks list
      </label>
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          id="command-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Try: "move the laundry over every sunday at 3pm" or "I moved the laundry over"'
          data-testid="command-input"
          className="min-h-14 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={send.isPending || !text.trim()}
          data-testid="send-command"
          className="min-h-14 rounded-xl bg-blue-600 px-6 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {send.isPending ? '…' : 'Send'}
        </button>
      </form>

      {result && (
        <div
          data-testid="command-result"
          className={`mt-2 rounded-xl border px-4 py-3 ${TONES[result.outcome]}`}
        >
          {result.message}
          {result.candidates && result.candidates.length > 0 && (
            <span className="ml-1 opacity-80">(tap the task's Done button instead)</span>
          )}
        </div>
      )}
    </div>
  );
}
