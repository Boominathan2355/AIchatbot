import './config/load-env';

import app from './app';
import { config } from './config/environment';
import { connectDatabase } from './config/database';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    console.log('[database] connected');
  } catch (error) {
    console.error('[database] connection failed:', error);
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[server] listening on http://localhost:${config.port} (${config.nodeEnv})`);
    console.log(`[server] allowed origins: ${config.corsOrigins.join(', ')}`);
    console.log(`[server] local file access: ${config.allowedBasePath || 'disabled'}`);
  });
}

startServer();
