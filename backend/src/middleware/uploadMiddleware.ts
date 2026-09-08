import multer from 'multer';
import { config } from '../config/environment';
import { getFileExtension } from '../utils/fileHelpers';

const fileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  const extension = getFileExtension(file.originalname);
  if (config.allowedFileTypes.includes(extension)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Unsupported file type: ${extension}. Allowed types: ${config.allowedFileTypes.join(', ')}`));
};

/** Multer instance for chat attachments: memory-backed, extension-filtered, size-capped. */
export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: config.maxFileSize },
});
