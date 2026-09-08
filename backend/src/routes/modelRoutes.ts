import { Router } from 'express';
import { listModels } from '../controllers/modelController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listModels));

export default router;
