import { Router } from 'express';
import { uploadAttachment } from '../controllers/uploadController';
import { attachmentUpload } from '../middleware/uploadMiddleware';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.post('/', attachmentUpload.single('file'), asyncHandler(uploadAttachment));

export default router;
