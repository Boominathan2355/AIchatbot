import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { listMcpTools, callMcpTool } from '../controllers/mcpController';

const router = Router();
router.use(authMiddleware);
router.get('/tools', listMcpTools);
router.post('/call', callMcpTool);
export default router;
