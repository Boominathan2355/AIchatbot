import crypto from 'crypto';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * JWT secret. Required in production; in development a random per-process
 * secret is generated so a missing .env cannot silently fall back to a
 * publicly-known value (tokens simply stop working across restarts).
 */
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;
  if (isProduction) {
    throw new Error('JWT_SECRET is not set. Generate one with: openssl rand -hex 32');
  }
  console.warn('[config] JWT_SECRET not set - using a random secret for this process only. Sessions will not survive a restart.');
  return crypto.randomBytes(32).toString('hex');
}

function parseList(value: string | undefined, fallback: string): string[] {
  return (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Origins allowed to call the API. In development, localhost is always permitted. */
const corsOrigins = parseList(process.env.FRONTEND_URL, 'http://localhost:5173');

export const config = {
  port: parseInteger(process.env.PORT, 3001),
  nodeEnv,
  isProduction,

  mongodbUri: process.env.MONGODB_URI || '',

  /** Provider keys used when the client does not supply its own. */
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  jwtSecret: resolveJwtSecret(),

  corsOrigins,
  frontendUrl: corsOrigins[0],

  /**
   * Outer boundary for all local file and git access, set by the server
   * operator. When unset, those endpoints are disabled entirely - a client
   * cannot opt itself in. The per-user "Allowed Path" setting may only
   * narrow this, never widen it.
   */
  allowedBasePath: process.env.ALLOWED_BASE_PATH || '',

  maxFileSize: parseInteger(process.env.MAX_FILE_SIZE, 20 * 1024 * 1024),
  allowedFileTypes: parseList(process.env.ALLOWED_FILE_TYPES, 'pdf,docx,txt,png,jpg,jpeg,webp'),

  /**
   * Attachments above this size are persisted as metadata only. Conversations
   * are single MongoDB documents capped at 16MB, so embedding large base64
   * payloads makes them permanently unsaveable.
   */
  maxStoredAttachmentBytes: parseInteger(process.env.MAX_STORED_ATTACHMENT_BYTES, 1024 * 1024),
};

export type AppConfig = typeof config;
