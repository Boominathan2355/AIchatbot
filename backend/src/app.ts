import express from 'express';
import cors from 'cors';
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

app.use(errorHandler);

export default app;
