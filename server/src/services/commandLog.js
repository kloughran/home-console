// In-memory command audit log (ring buffer, newest first). Volatile by design
// since MySQL is gone — the History view labels it "since restart".

const MAX_ENTRIES = 100;
const entries = [];
let seq = 0;

export function logCommand({ source, raw_text, intent, outcome, task_title = null, detail = null }) {
  entries.unshift({
    id: ++seq,
    source,
    raw_text: String(raw_text).slice(0, 500),
    intent,
    outcome,
    task_title,
    detail,
    created_at: new Date(),
  });
  if (entries.length > MAX_ENTRIES) entries.pop();
}

export function recentCommands(limit = MAX_ENTRIES) {
  return entries.slice(0, limit);
}
