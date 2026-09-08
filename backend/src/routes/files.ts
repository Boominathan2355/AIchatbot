import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { listFiles, readFile, writeFile, deleteFile, mkdir } from '../controllers/fileController';

const router = Router();
router.use(authMiddleware);

router.get('/list', listFiles);
router.get('/read', readFile);
router.post('/write', writeFile);
router.post('/mkdir', mkdir);
router.delete('/delete', deleteFile);

export default router;
