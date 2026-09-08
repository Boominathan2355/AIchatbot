import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { resolveRequestPath } from '../utils/pathGuard';
import { sendData, sendError } from '../utils/apiResponse';
import * as gitService from '../services/gitService';

const STATUS_LOG_LIMIT = 10;

export async function getGitStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const guard = await resolveRequestPath(req, (req.query.path as string) || undefined);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    const status = await gitService.getStatus(guard.target);
    const log = await gitService.getLog(guard.target, STATUS_LOG_LIMIT).catch(() => '');
    sendData(res, { path: guard.target, status, log });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}

export async function getGitLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  const guard = await resolveRequestPath(req, (req.query.path as string) || undefined);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    const log = await gitService.getLog(guard.target);
    sendData(res, { path: guard.target, log });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}

export async function stageFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  const guard = await resolveRequestPath(req, req.body?.path);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    const stdout = await gitService.stageFiles(guard.target, req.body?.files);
    sendData(res, { success: true, stdout });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}

export async function commitChanges(req: AuthenticatedRequest, res: Response): Promise<void> {
  const message = req.body?.message;
  if (!message || typeof message !== 'string') {
    sendError(res, 400, 'commit message required');
    return;
  }

  const guard = await resolveRequestPath(req, req.body?.path);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    const stdout = await gitService.commit(guard.target, message);
    sendData(res, { success: true, stdout });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}

export async function initRepository(req: AuthenticatedRequest, res: Response): Promise<void> {
  const guard = await resolveRequestPath(req, req.body?.path);
  if (!guard.ok) {
    sendError(res, guard.status, guard.message);
    return;
  }

  try {
    const stdout = await gitService.initRepository(guard.target);
    sendData(res, { success: true, stdout });
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}
