import { Router } from 'express';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
} from '../controllers/conversationController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listConversations));
router.post('/', asyncHandler(createConversation));
router.get('/:id', asyncHandler(getConversation));
router.patch('/:id', asyncHandler(updateConversation));
router.delete('/:id', asyncHandler(deleteConversation));

export default router;
