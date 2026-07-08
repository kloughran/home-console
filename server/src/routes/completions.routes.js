import { Router } from 'express';
import * as store from '../google/store.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    res.json(await store.listCompletions({ limit }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list completions' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await store.undoCompletion(req.params.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Completion not found' });
    if (result.error === 'recurring') {
      return res.status(409).json({ error: 'Recurring completions cannot be undone — the next occurrence already exists' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to undo completion' });
  }
});

export default router;
