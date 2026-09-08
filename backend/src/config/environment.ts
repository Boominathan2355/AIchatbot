import crypto from 'crypto';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  return value.trim();
}

function getEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

function parseList(name: string): string[] {
  return requireEnv(name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInteger(name: string): number {
  const value = requireEnv(name);
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Environment variable ${name} must be a valid number. Received: ${value}`
    );
  }

  return parsed;
}

function resolveJwtSecret(): string {
  const secret = requireEnv('JWT_SECRET');

  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long'
    );
  }

  return secret;
}

const nodeEnv = getEnv('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

export const config = {
  // Server
  port: parseInteger('PORT'),
  nodeEnv,
  isProduction,

  // Database
  mongodbUri: requireEnv('MONGODB_URI'),

  // AI Providers
  geminiApiKey: getEnv('GEMINI_API_KEY'),
  openaiApiKey: getEnv('OPENAI_API_KEY'),

  // Authentication
  jwtSecret: resolveJwtSecret(),

  // Frontend / CORS
  corsOrigins: parseList('FRONTEND_URL'),
  frontendUrl: requireEnv('FRONTEND_URL')
    .split(',')[0]
    .trim(),

  // Application
  allowedBasePath: getEnv('ALLOWED_BASE_PATH'),

  // File Upload
  maxFileSize: parseInteger('MAX_FILE_SIZE'),
  allowedFileTypes: parseList('ALLOWED_FILE_TYPES'),

  // Storage
  maxStoredAttachmentBytes: parseInteger(
    'MAX_STORED_ATTACHMENT_BYTES'
  ),
};

export type AppConfig = typeof config;