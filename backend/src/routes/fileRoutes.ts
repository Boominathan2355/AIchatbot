import { Router } from 'express';
import { listDirectory, readFile, writeFile, deleteFile, createDirectory } from '../controllers/fileController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/list', asyncHandler(listDirectory));
router.get('/read', asyncHandler(readFile));
router.post('/write', asyncHandler(writeFile));
router.post('/mkdir', asyncHandler(createDirectory));
router.delete('/delete', asyncHandler(deleteFile));

export default router;
