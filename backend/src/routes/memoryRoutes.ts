import { Router } from 'express';
import { getMemory, saveMemory } from '../controllers/memoryController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', requireAuth, asyncHandler(getMemory));
router.put('/', requireAuth, asyncHandler(saveMemory));

export default router;
