import { Router } from 'express';
import * as store from '../google/store.js';
import { addDays } from '../time/schedule.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = addDays(startOfToday, 1);
    const endOfWeekOut = addDays(startOfToday, 8);

    const tasks = await store.listTasks({ active: 1 });
    const dated = tasks.filter((t) => t.next_due_at);
    const completions = await store.listCompletions({ limit: 100 });

    res.json({
      overdue: dated.filter((t) => t.next_due_at < startOfToday),
      dueToday: dated.filter((t) => t.next_due_at >= startOfToday && t.next_due_at < startOfTomorrow),
      dueSoon: dated.filter((t) => t.next_due_at >= startOfTomorrow && t.next_due_at < endOfWeekOut),
      doneToday: completions.filter((c) => c.completed_at >= startOfToday),
      now: now.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

export default router;
