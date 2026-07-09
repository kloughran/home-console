import { Router } from 'express';
import { getWeather } from '../services/weather.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.json(await getWeather());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load weather' });
  }
});

export default router;
