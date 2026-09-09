import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config/environment';
import { isDatabaseConnected } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { createRateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import uploadRoutes from './routes/uploadRoutes';
import modelRoutes from './routes/modelRoutes';
import conversationRoutes from './routes/conversationRoutes';
import fileRoutes from './routes/fileRoutes';
import gitRoutes from './routes/gitRoutes';
import toolRoutes from './routes/toolRoutes';
import memoryRoutes from './routes/memoryRoutes';
import webRoutes from './routes/webRoutes';

const REQUEST_BODY_LIMIT = '50mb';
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Candidate locations of the built frontend, checked in order at startup. */
const FRONTEND_DIST_CANDIDATES = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), '../frontend/dist'),
];

function isOriginAllowed(origin: string): boolean {
  if (config.corsOrigins.includes(origin)) return true;
  return !config.isProduction && LOCALHOST_ORIGIN.test(origin);
}

function resolveFrontendDistPath(): string | undefined {
  return FRONTEND_DIST_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

const app = express();

// Behind a proxy (Render, nginx) req.ip must come from X-Forwarded-For,
// otherwise every client shares a single rate-limit bucket.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: same-origin navigation, curl, server-to-server.
      if (!origin || isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

app.use(createRateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: isDatabaseConnected() ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/web', webRoutes);

// Serve the built frontend from the same process in production.
const frontendDistPath = resolveFrontendDistPath();
if (frontendDistPath) {
  console.log('[server] serving frontend from:', frontendDistPath);
  app.use(express.static(frontendDistPath));
  // SPA fallback: serve index.html for non-API routes.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.log('[server] frontend build not found; API only. Checked:', FRONTEND_DIST_CANDIDATES);
}

app.use(errorHandler);

export default app;
