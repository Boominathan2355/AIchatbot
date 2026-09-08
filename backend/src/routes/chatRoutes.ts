import { Router } from 'express';
import { streamChatCompletion, createChatCompletion } from '../controllers/chatController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.post('/', asyncHandler(streamChatCompletion));
router.post('/non-stream', asyncHandler(createChatCompletion));

export default router;
