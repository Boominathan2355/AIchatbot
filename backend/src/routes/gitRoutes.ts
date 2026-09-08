import { Router } from 'express';
import { getGitStatus, getGitLog, stageFiles, commitChanges, initRepository } from '../controllers/gitController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/status', asyncHandler(getGitStatus));
router.get('/log', asyncHandler(getGitLog));
router.post('/add', asyncHandler(stageFiles));
router.post('/commit', asyncHandler(commitChanges));
router.post('/init', asyncHandler(initRepository));

export default router;
