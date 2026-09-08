import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { getMimeType, getFileExtension } from '../utils/fileHelpers';
import { config } from '../config/env';

export async function handleUpload(req: Request, res: Response) {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400, 'NO_FILE');
  }

  const file = req.file;
  const fileType = getFileExtension(file.originalname);

  if (file.size > config.maxFileSize) {
    return sendError(res, `File too large. Maximum size is ${config.maxFileSize / 1024 / 1024}MB`, 413, 'FILE_TOO_LARGE');
  }

  const base64Data = file.buffer.toString('base64');

  const attachment = {
    id: uuidv4(),
    fileName: file.originalname,
    fileType,
    fileSize: file.size,
    mimeType: getMimeType(fileType),
    base64Data,
  };

  sendSuccess(res, attachment, 201);
}
