import path from 'path';

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase().replace('.', '');
}

export function isImageFile(fileType: string): boolean {
  return ['png', 'jpg', 'jpeg', 'webp'].includes(fileType.toLowerCase());
}

export function isDocumentFile(fileType: string): boolean {
  return ['pdf', 'docx', 'txt'].includes(fileType.toLowerCase());
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  };
  return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
