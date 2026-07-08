import { Router } from 'express';
import { processCommand } from '../services/commands.service.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const text = req.body?.text;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
    const result = await processCommand(text, { source: 'text' });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process command' });
  }
});

export default router;
