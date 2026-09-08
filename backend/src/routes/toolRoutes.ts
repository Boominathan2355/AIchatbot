import { Router } from 'express';
import { listTools, executeTool } from '../controllers/toolController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listTools));
router.post('/execute', asyncHandler(executeTool));

export default router;
