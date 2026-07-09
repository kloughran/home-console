import { Router } from 'express';
import { getTodayAgenda } from '../services/agenda.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json({ events: await getTodayAgenda() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load agenda' });
  }
});

export default router;
