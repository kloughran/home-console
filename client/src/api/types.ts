// Domain types — matches the server's Google-Tasks-backed API shapes exactly.

export type RecurrenceType = 'once' | 'interval' | 'weekly';

export type Task = {
  id: string; // Google Tasks id
  title: string;
  recurrence_type: RecurrenceType; // plain (unmanaged) tasks report 'once'
  interval_days: number | null;
  days_of_week: string | null; // "mon,thu"
  time_of_day: string; // "HH:MM:SS"
  next_due_at: string | null; // null = undated personal task
  active: number; // 0 = paused
  managed: boolean; // true when the console owns its schedule ([hc] notes line)
  updated_at: string;
};

export type Completion = {
  id: string;
  title: string;
  completed_at: string;
  recurring: boolean; // true = occurrence of a recurring task (no undo — successor exists)
};

export type Dashboard = {
  overdue: Task[];
  dueToday: Task[];
  dueSoon: Task[]; // due within the next 7 days (after today)
  doneToday: Completion[];
  now: string;
};

export type CommandCandidate = {
  id: string;
  title: string;
  score: number;
};

// Result of POST /api/commands — `outcome` drives the toast, always HTTP 200.
export type CommandResult = {
  intent: 'add_task' | 'complete_task' | 'unknown';
  outcome: 'applied' | 'no_match' | 'ambiguous' | 'parse_failed' | 'error';
  task: Task | null;
  completion: Completion | null;
  message: string;
  candidates?: CommandCandidate[];
};

// In-memory on the server — survives only until restart.
export type CommandLogEntry = {
  id: number;
  source: 'voice' | 'text';
  raw_text: string;
  intent: CommandResult['intent'];
  outcome: CommandResult['outcome'];
  task_title: string | null;
  detail: { scores?: CommandCandidate[] } | null;
  created_at: string;
};

// Inputs for create/update mutations.

export type TaskInput = {
  title: string;
  recurrence_type: RecurrenceType;
  interval_days: number | null;
  days_of_week: string[];
  time_of_day: string;
};

export type UpdateTaskInput = Partial<TaskInput> & { active?: number };
