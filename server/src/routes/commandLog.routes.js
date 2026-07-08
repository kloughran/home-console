import { Router } from 'express';
import { recentCommands } from '../services/commandLog.js';

const router = Router();

router.get('/', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 100);
  res.json(recentCommands(limit));
});

export default router;
