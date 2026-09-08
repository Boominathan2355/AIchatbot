import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { config } from './config/env';
import { connectDB } from './config/db';

async function startServer() {
  console.log('Starting Gemini Chatbot Backend...');

  try {
    await connectDB();
    console.log('Database: MongoDB connected');
  } catch (error) {
    console.error('Database: MongoDB connection failed:', error);
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Frontend URL: ${config.frontendUrl}`);
    console.log('Endpoints:');
    console.log(`  POST /api/auth/register        - Register user`);
    console.log(`  POST /api/auth/login           - Login user`);
    console.log(`  GET  /api/auth/profile         - Get profile`);
    console.log(`  POST /api/chat                 - Chat with streaming`);
    console.log(`  POST /api/upload               - Upload files`);
    console.log(`  GET  /api/models               - List models`);
    console.log(`  GET  /api/conversations        - List conversations`);
    console.log(`  POST /api/conversations        - Create conversation`);
    console.log(`  DELETE /api/conversations/:id  - Delete conversation`);
  });
}

startServer();
