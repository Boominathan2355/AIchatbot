import { Router } from 'express';
import { handleChat, handleChatNonStream } from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.post('/', asyncHandler(handleChat));
router.post('/non-stream', asyncHandler(handleChatNonStream));

export default router;
