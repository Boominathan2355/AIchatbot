import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { webSearch, webFetch, webWiki, webWeather, webNews, webDuck } from '../controllers/webController';

const router = Router();
router.use(authMiddleware);
router.get('/search', webSearch);
router.post('/search', webSearch);
router.get('/fetch', webFetch);
router.post('/fetch', webFetch);
router.get('/wiki', webWiki);
router.get('/weather', webWeather);
router.get('/news', webNews);
router.get('/duck', webDuck);
export default router;
