import { Router } from 'express';
import * as store from '../google/store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const active = req.query.active ?? 'all';
    res.json(await store.listTasks({ active }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, recurrence_type } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
    if (!['once', 'interval', 'weekly'].includes(recurrence_type)) {
      return res.status(400).json({ error: 'recurrence_type must be once, interval, or weekly' });
    }
    if (recurrence_type === 'interval' && !(Number(req.body.interval_days) >= 1)) {
      return res.status(400).json({ error: 'interval_days is required for interval tasks' });
    }
    if (recurrence_type === 'weekly' && !(req.body.days_of_week?.length >= 1)) {
      return res.status(400).json({ error: 'days_of_week is required for weekly tasks' });
    }
    const task = await store.createTask({ ...req.body, title: title.trim() });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const task = await store.updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await store.deleteTaskById(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const result = await store.completeTask(req.params.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Task not found' });
    if (result.error === 'inactive') return res.status(409).json({ error: 'Task is not active' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

export default router;
