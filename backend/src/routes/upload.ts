import { Router } from 'express';
import { handleUpload } from '../controllers/uploadController';
import { upload } from '../middleware/fileUpload';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', upload.single('file'), asyncHandler(handleUpload));

export default router;
