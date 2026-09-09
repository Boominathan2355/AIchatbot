import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Memory } from '../models/memoryModel';
import { sendData, sendError } from '../utils/apiResponse';

export async function getMemory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
    return;
  }

  let memory = await Memory.findOne({ userId });
  if (!memory) {
    memory = await Memory.create({ userId });
  }

  sendData(res, {
    nickname: memory.nickname,
    occupation: memory.occupation,
    moreAbout: memory.moreAbout,
    enabled: memory.enabled,
  });
}

export async function saveMemory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 401, 'Not authenticated', 'UNAUTHORIZED');
    return;
  }

  const { nickname, occupation, moreAbout, enabled } = req.body;

  const memory = await Memory.findOneAndUpdate(
    { userId },
    {
      nickname: nickname ?? '',
      occupation: occupation ?? '',
      moreAbout: moreAbout ?? '',
      enabled: enabled !== false,
    },
    { upsert: true, new: true, runValidators: true }
  );

  sendData(res, {
    nickname: memory.nickname,
    occupation: memory.occupation,
    moreAbout: memory.moreAbout,
    enabled: memory.enabled,
  });
}
