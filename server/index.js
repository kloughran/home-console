import 'dotenv/config';
import { createApp } from './src/app.js';
import { startBackgroundRefresh } from './src/google/store.js';
import { runPokeCheck } from './src/services/poke.service.js';

const PORT = process.env.PORT || 3001;

createApp().listen(PORT, () => {
  console.log(`Home console running on http://localhost:${PORT}`);
  startBackgroundRefresh(runPokeCheck);
});
