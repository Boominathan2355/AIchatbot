import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { resolveRequestPath } from '../utils/pathGuard';
import { sendData, sendError } from '../utils/apiResponse';
import * as fileService from '../services/fileService';

function readRequestedPath(req: AuthenticatedRequest): string | undefined {
  return (req.query.path as string) || req.body?.path || undefined;
}

export async function listDirectory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const guard = await resolveRequestPath(req, readRequestedPath(req));
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    const files = await fileService.listDirectory(guard.target);
    sendData(res, { path: guard.target, files, allowedBase: guard.base });
  } catch (error: any) {
    sendError(res, 500, error.message || 'Failed to list files');
  }
}

export async function readFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const filePath = readRequestedPath(req);
  if (!filePath) {
    sendError(res, 400, 'path required');
    return;
  }

  const guard = await resolveRequestPath(req, filePath);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    const content = await fileService.readTextFile(guard.target);
    sendData(res, { path: guard.target, content });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}

export async function writeFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { path: filePath, content = '' } = req.body ?? {};
  if (!filePath) {
    sendError(res, 400, 'path required');
    return;
  }

  const guard = await resolveRequestPath(req, filePath);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    await fileService.writeTextFile(guard.target, content);
    sendData(res, { path: guard.target, success: true });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}

export async function deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const filePath = readRequestedPath(req);
  if (!filePath) {
    sendError(res, 400, 'path required');
    return;
  }

  const guard = await resolveRequestPath(req, filePath);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  // Deleting the allowed root itself would wipe the whole workspace.
  if (guard.target === guard.base) {
    sendError(res, 400, 'Refusing to delete the allowed root directory.');
    return;
  }

  try {
    await fileService.deletePath(guard.target);
    sendData(res, { success: true });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}

export async function createDirectory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const directoryPath = req.body?.path;
  if (!directoryPath) {
    sendError(res, 400, 'path required');
    return;
  }

  const guard = await resolveRequestPath(req, directoryPath);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    await fileService.createDirectory(guard.target);
    sendData(res, { path: guard.target, success: true });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}
