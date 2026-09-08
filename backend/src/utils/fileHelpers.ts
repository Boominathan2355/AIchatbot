import path from 'path';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** Lower-case extension without the leading dot, e.g. `report.PDF` -> `pdf`. */
export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase().replace('.', '');
}

export function getMimeType(fileType: string): string {
  return MIME_TYPES[fileType.toLowerCase()] || 'application/octet-stream';
}
