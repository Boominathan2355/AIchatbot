import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import uploadRoutes from './routes/upload';
import modelRoutes from './routes/models';
import conversationRoutes from './routes/conversations';
import fileRoutes from './routes/files';
import gitRoutes from './routes/git';
import mcpRoutes from './routes/mcp';
import webRoutes from './routes/web';

const app = express();

// Behind a proxy (Render, nginx) req.ip must come from X-Forwarded-For,
// otherwise every client shares a single rate-limit bucket.
app.set('trust proxy', 1);

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin: (origin, cb) => {
    // No Origin header: same-origin navigation, curl, server-to-server.
    if (!origin) return cb(null, true);
    if (config.corsOrigins.includes(origin)) return cb(null, true);
    if (!config.isProduction && LOCALHOST_ORIGIN.test(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(rateLimiter(100, 60000));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/web', webRoutes);

// --- Serve frontend in production (single Node) ---
const candidates = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), '../frontend/dist'),
];
const frontendDist = candidates.find(p => fs.existsSync(p));
if (frontendDist) {
  console.log('Serving frontend from:', frontendDist);
  app.use(express.static(frontendDist));
  // SPA fallback: serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  console.log('Frontend dist not found, checked:', candidates);
}

app.use(errorHandler);

export default app;
