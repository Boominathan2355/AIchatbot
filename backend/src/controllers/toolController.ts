import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { TOOL_DEFINITIONS } from '../tools/toolDefinitions';
import { executeTool as runTool } from '../services/toolService';
import { readClientAllowedPath } from '../utils/pathGuard';
import { sendData, sendError } from '../utils/apiResponse';

export async function listTools(_req: AuthenticatedRequest, res: Response): Promise<void> {
  sendData(res, TOOL_DEFINITIONS);
}

export async function executeTool(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, arguments: args = {} } = req.body ?? {};

  try {
    const result = await runTool(name, args, { clientAllowedPath: readClientAllowedPath(req) });
    if (!result.ok) {
      sendError(res, result.status, result.message);
      return;
    }
    sendData(res, result.data);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
}
