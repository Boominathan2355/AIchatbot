import { Router } from 'express';
import { handleListModels } from '../controllers/modelController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(handleListModels));

export default router;
