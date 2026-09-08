import { Router } from 'express';
import { handleListModels } from '../controllers/modelController';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(handleListModels));

export default router;
