import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { gitStatus, gitLog, gitAdd, gitCommit, gitInit } from '../controllers/gitController';

const router = Router();
router.use(authMiddleware);

router.get('/status', gitStatus);
router.get('/log', gitLog);
router.post('/add', gitAdd);
router.post('/commit', gitCommit);
router.post('/init', gitInit);

export default router;
