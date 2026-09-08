import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { config } from '../config/environment';
import { getFileExtension, getMimeType } from '../utils/fileHelpers';
import { sendData, sendError } from '../utils/apiResponse';

/** POST /api/upload - accepts one file and returns it as a base64 attachment payload. */
export async function uploadAttachment(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    sendError(res, 400, 'No file uploaded', 'NO_FILE');
    return;
  }

  if (file.size > config.maxFileSize) {
    sendError(res, 413, `File too large. Maximum size is ${config.maxFileSize / 1024 / 1024}MB`, 'FILE_TOO_LARGE');
    return;
  }

  const fileType = getFileExtension(file.originalname);

  sendData(
    res,
    {
      id: randomUUID(),
      fileName: file.originalname,
      fileType,
      fileSize: file.size,
      mimeType: getMimeType(fileType),
      base64Data: file.buffer.toString('base64'),
    },
    201
  );
}
