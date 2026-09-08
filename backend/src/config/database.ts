import mongoose from 'mongoose';
import { config } from './environment';

const SERVER_SELECTION_TIMEOUT_MS = 5000;
const SOCKET_TIMEOUT_MS = 10000;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env (see .env.example).');
  }

  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: SOCKET_TIMEOUT_MS,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

mongoose.connection.on('error', (error) => {
  console.error('[database] connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[database] disconnected');
});
