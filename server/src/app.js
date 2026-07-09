import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as store from './google/store.js';
import tasksRoutes from './routes/tasks.routes.js';
import commandsRoutes from './routes/commands.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import completionsRoutes from './routes/completions.routes.js';
import commandLogRoutes from './routes/commandLog.routes.js';
import agendaRoutes from './routes/agenda.routes.js';
import weatherRoutes from './routes/weather.routes.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', async (req, res) => {
    try {
      await store.ping();
      res.json({ status: 'ok', google: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', google: false, error: err.message });
    }
  });

  app.use('/api/tasks', tasksRoutes);
  app.use('/api/commands', commandsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/completions', completionsRoutes);
  app.use('/api/command-log', commandLogRoutes);
  app.use('/api/agenda', agendaRoutes);
  app.use('/api/weather', weatherRoutes);

  // In the Docker image the built React client sits in ../public; in dev the
  // folder doesn't exist and Vite serves the client instead.
  const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  return app;
}
