import { Router } from 'express';
import {
  searchWeb,
  fetchWebPage,
  getWikipediaSummary,
  getWeatherForecast,
  getTopNews,
  searchDuckDuckGoInstant,
} from '../controllers/webController';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/search', asyncHandler(searchWeb));
router.post('/search', asyncHandler(searchWeb));
router.get('/fetch', asyncHandler(fetchWebPage));
router.post('/fetch', asyncHandler(fetchWebPage));
router.get('/wiki', asyncHandler(getWikipediaSummary));
router.get('/weather', asyncHandler(getWeatherForecast));
router.get('/news', asyncHandler(getTopNews));
router.get('/duck', asyncHandler(searchDuckDuckGoInstant));

export default router;
