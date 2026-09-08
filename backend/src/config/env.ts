import crypto from 'crypto';

function requireEnv(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. ${hint}`);
  }
  return value;
}

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

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
  const ephemeral = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set - using a random secret for this process only. Sessions will not survive a restart.');
  return ephemeral;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  jwtSecret: resolveJwtSecret(),

  /**
   * Origins allowed to call the API. Comma-separated. In development,
   * localhost origins are always permitted.
   */
  corsOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim(),

  /**
   * Outer boundary for all local file and git access, set by the server
   * operator. When unset, those endpoints are disabled entirely - a client
   * cannot opt itself in. The per-user "Allowed Path" setting may only
   * narrow this, never widen it.
   */
  allowedBasePath: process.env.ALLOWED_BASE_PATH || '',

  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10),
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,txt,png,jpg,jpeg,webp').split(','),

  /**
   * Attachments above this size are persisted as metadata only. Conversations
   * are single MongoDB documents capped at 16MB, so embedding large base64
   * payloads makes them permanently unsaveable.
   */
  maxStoredAttachmentBytes: parseInt(process.env.MAX_STORED_ATTACHMENT_BYTES || '1048576', 10),
};

export { requireEnv };
