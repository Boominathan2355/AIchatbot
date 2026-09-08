import { Router } from 'express';
import { getConversations, getConversation, createConversation, updateConversation, deleteConversation } from '../controllers/conversationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getConversations);
router.get('/:id', getConversation);
router.post('/', createConversation);
router.patch('/:id', updateConversation);
router.delete('/:id', deleteConversation);

export default router;
