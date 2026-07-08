import { useState } from 'react';
import Clock from './components/Clock';
import CommandBar from './features/commands/CommandBar';
import TodayDashboard from './features/dashboard/TodayDashboard';
import TaskList from './features/tasks/TaskList';
import HistoryView from './features/history/HistoryView';

type Tab = 'today' | 'tasks' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Up Next' },
  { id: 'tasks', label: 'All Tasks' },
  { id: 'history', label: 'History' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">🏠 Home Console</h1>
          <Clock />
        </div>

        <CommandBar />

        <nav className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              data-testid={`tab-${t.id}`}
              className={`min-h-14 flex-1 rounded-xl text-lg font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className="mt-6 pb-16">
          {tab === 'today' && <TodayDashboard />}
          {tab === 'tasks' && <TaskList />}
          {tab === 'history' && <HistoryView />}
        </main>
      </div>
    </div>
  );
}
