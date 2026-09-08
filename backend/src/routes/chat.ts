import { Router } from 'express';
import { handleChat, handleChatNonStream } from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', handleChat);
router.post('/non-stream', handleChatNonStream);

export default router;
