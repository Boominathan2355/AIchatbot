import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import uploadRoutes from './routes/upload';
import modelRoutes from './routes/models';
import conversationRoutes from './routes/conversations';

const app = express();

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(rateLimiter(100, 60000));

// Connect to MongoDB on startup
connectDB().catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
});

app.get('/api/health', async (_req, res) => {
  const mongoose = await import('mongoose');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.default.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/conversations', conversationRoutes);

// --- Serve frontend in production (single Node) ---
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback: serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
