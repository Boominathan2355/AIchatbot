export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10),
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,txt,png,jpg,jpeg,webp').split(','),
};
