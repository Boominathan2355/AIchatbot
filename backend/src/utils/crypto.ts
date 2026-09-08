import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'ai-agent-chatbot-encryption-key').digest();
const IV_LENGTH = 12;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decrypt(payload: string): string {
  try {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return '';
  }
}

export function hashValue(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function safeEncode(text: string): string {
  return Buffer.from(text).toString('base64');
}

export function safeDecode(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}
